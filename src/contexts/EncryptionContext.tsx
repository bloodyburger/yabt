/**
 * Encryption Context
 * Manages per-user encryption key and passphrase
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'
import {
    generateSalt,
    generateDataKey,
    encryptDataKey,
    decryptDataKey
} from '@/lib/encryption'

const PASSPHRASE_SESSION_KEY = 'yabt_encryption_passphrase_hash'

interface EncryptionContextType {
    isEncryptionSetup: boolean  // Has user set up encryption?
    isUnlocked: boolean         // Is encryption key available?
    isLoading: boolean
    error: string | null

    // Actions
    setupEncryption: (passphrase: string) => Promise<void>
    unlock: (passphrase: string) => Promise<boolean>
    lock: () => void
    getEncryptionKey: () => CryptoKey | null
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined)

export function EncryptionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()

    const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
    const [isEncryptionSetup, setIsEncryptionSetup] = useState(false)
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Check if user has encryption set up
    useEffect(() => {
        async function checkEncryptionStatus() {
            if (!user) {
                setIsLoading(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from('user_encryption_keys')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    console.error('Error checking encryption status:', error)
                }

                setIsEncryptionSetup(!!data)
            } catch (err) {
                console.error('Failed to check encryption status:', err)
            } finally {
                setIsLoading(false)
            }
        }

        checkEncryptionStatus()
    }, [user])

    // Set up encryption for the first time
    const setupEncryption = useCallback(async (passphrase: string) => {
        if (!user) throw new Error('Not authenticated')
        if (isEncryptionSetup) throw new Error('Encryption already set up')

        setIsLoading(true)
        setError(null)

        try {
            // Generate a new data key
            const dataKey = await generateDataKey()

            // Generate salt and encrypt the data key
            const salt = generateSalt()
            const encryptedKey = await encryptDataKey(dataKey, passphrase, salt)

            // Store in database
            const { error } = await supabase
                .from('user_encryption_keys')
                .insert({
                    user_id: user.id,
                    encrypted_key: encryptedKey,
                    key_version: 1
                })

            if (error) throw error

            // Set state
            setEncryptionKey(dataKey)
            setIsEncryptionSetup(true)
            setIsUnlocked(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to set up encryption')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [user, isEncryptionSetup])

    // Unlock encryption with passphrase
    const unlock = useCallback(async (passphrase: string): Promise<boolean> => {
        if (!user) throw new Error('Not authenticated')
        if (!isEncryptionSetup) throw new Error('Encryption not set up')

        setIsLoading(true)
        setError(null)

        try {
            // Get encrypted key from database
            const { data, error } = await supabase
                .from('user_encryption_keys')
                .select('encrypted_key')
                .eq('user_id', user.id)
                .single()

            if (error || !data) {
                throw new Error('Encryption key not found')
            }

            // Decrypt the data key
            const dataKey = await decryptDataKey(data.encrypted_key, passphrase)

            setEncryptionKey(dataKey)
            setIsUnlocked(true)
            return true
        } catch (err) {
            setError('Invalid passphrase')
            setIsUnlocked(false)
            return false
        } finally {
            setIsLoading(false)
        }
    }, [user, isEncryptionSetup])

    // Lock encryption (clear key from memory)
    const lock = useCallback(() => {
        setEncryptionKey(null)
        setIsUnlocked(false)
    }, [])

    // Get the encryption key (for use in data services)
    const getEncryptionKey = useCallback(() => {
        return encryptionKey
    }, [encryptionKey])

    return (
        <EncryptionContext.Provider
            value={{
                isEncryptionSetup,
                isUnlocked,
                isLoading,
                error,
                setupEncryption,
                unlock,
                lock,
                getEncryptionKey
            }}
        >
            {children}
        </EncryptionContext.Provider>
    )
}

export function useEncryption() {
    const context = useContext(EncryptionContext)
    if (context === undefined) {
        throw new Error('useEncryption must be used within an EncryptionProvider')
    }
    return context
}
