/**
 * Encryption Utilities
 * Client-side AES-256-GCM encryption with PBKDF2 key derivation
 * Used for per-account encryption of sensitive data
 */

// Constants
const SALT_LENGTH = 16
const IV_LENGTH = 12
const TAG_LENGTH = 16
const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 256

/**
 * Generate a random salt
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

/**
 * Derive an encryption key from a passphrase using PBKDF2
 */
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    )

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        passphraseKey,
        { name: 'AES-GCM', length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    )
}

/**
 * Generate a random AES-256 key for data encryption
 */
export async function generateDataKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: 'AES-GCM', length: KEY_LENGTH },
        true, // extractable - needed to store encrypted in DB
        ['encrypt', 'decrypt']
    )
}

/**
 * Export a CryptoKey to raw bytes
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
    const exported = await crypto.subtle.exportKey('raw', key)
    return new Uint8Array(exported)
}

/**
 * Import raw bytes as a CryptoKey
 */
export async function importKey(keyBytes: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM', length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    )
}

/**
 * Encrypt data using AES-256-GCM
 * Returns: base64(iv + ciphertext + authTag)
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext)
    )

    // Combine IV + ciphertext (which includes auth tag)
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.length)

    return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using AES-256-GCM
 * Input: base64(iv + ciphertext + authTag)
 */
export async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
    const decoder = new TextDecoder()
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))

    const iv = combined.slice(0, IV_LENGTH)
    const encryptedData = combined.slice(IV_LENGTH)

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
    )

    return decoder.decode(decrypted)
}

/**
 * Encrypt a number (for amounts, balances)
 */
export async function encryptNumber(value: number, key: CryptoKey): Promise<string> {
    return encrypt(value.toString(), key)
}

/**
 * Decrypt a number
 */
export async function decryptNumber(ciphertext: string, key: CryptoKey): Promise<number> {
    const plaintext = await decrypt(ciphertext, key)
    return parseFloat(plaintext)
}

/**
 * Check if a string looks like encrypted data (base64 with correct prefix length)
 */
export function isEncrypted(value: string): boolean {
    if (!value || typeof value !== 'string') return false
    try {
        const decoded = atob(value)
        // Minimum length: IV (12) + some ciphertext + auth tag (16)
        return decoded.length >= IV_LENGTH + TAG_LENGTH + 1
    } catch {
        return false
    }
}

/**
 * Encrypt user's data key with their passphrase for storage
 */
export async function encryptDataKey(dataKey: CryptoKey, passphrase: string, salt: Uint8Array): Promise<string> {
    const passphraseKey = await deriveKey(passphrase, salt)
    const keyBytes = await exportKey(dataKey)

    // Encrypt the data key with the passphrase-derived key
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        passphraseKey,
        keyBytes
    )

    // Combine salt + iv + encrypted key
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt user's data key with their passphrase
 */
export async function decryptDataKey(encryptedKey: string, passphrase: string): Promise<CryptoKey> {
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0))

    const salt = combined.slice(0, SALT_LENGTH)
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH)

    const passphraseKey = await deriveKey(passphrase, salt)

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        passphraseKey,
        encrypted
    )

    return importKey(new Uint8Array(decrypted))
}
