import { useEffect, useState } from 'react'
import { User, Palette, Check, Loader2, Tag as TagIcon, Key, Copy, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useBudget } from '@/contexts/BudgetContext'
import { useDataService } from '@/contexts/DataContext'
import type { ApiKey } from '@/lib/dataService'
import TagManager from '@/components/common/TagManager'

const currencies = [
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'JPY', name: 'Japanese Yen (¥)' },
    { code: 'CAD', name: 'Canadian Dollar ($)' },
    { code: 'AUD', name: 'Australian Dollar ($)' },
    { code: 'CHF', name: 'Swiss Franc (CHF)' },
    { code: 'CNY', name: 'Chinese Yuan (¥)' },
    { code: 'SGD', name: 'Singapore Dollar ($)' },
    { code: 'AED', name: 'UAE Dirham (د.إ)' },
]

const dateFormats = [
    { value: 'YYYY-MM-DD', label: '2024-01-15' },
    { value: 'MM/DD/YYYY', label: '01/15/2024' },
    { value: 'DD/MM/YYYY', label: '15/01/2024' },
    { value: 'DD-MM-YYYY', label: '15-01-2024' },
]

// Generate days 1-28 for month start day options
const monthStartDays = Array.from({ length: 28 }, (_, i) => i + 1)

export default function Settings() {
    const { user } = useAuth()
    const { currency, dateFormat, monthStartDay, updateSettings } = useSettings()
    const { currentBudget } = useBudget()
    const dataService = useDataService()

    const [selectedCurrency, setSelectedCurrency] = useState(currency)
    const [selectedDateFormat, setSelectedDateFormat] = useState(dateFormat)
    const [selectedMonthStartDay, setSelectedMonthStartDay] = useState(monthStartDay)
    const [saving, setSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [error, setError] = useState('')
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [apiKeysLoading, setApiKeysLoading] = useState(true)
    const [apiKeyError, setApiKeyError] = useState('')
    const [creatingKey, setCreatingKey] = useState(false)
    const [keyName, setKeyName] = useState('iOS Shortcut')
    const [newApiKey, setNewApiKey] = useState('')
    const [copiedKey, setCopiedKey] = useState(false)
    const apiKeyLimitReached = apiKeys.length >= 2

    const handleSave = async () => {
        setSaving(true)
        setError('')

        const { error: updateError } = await updateSettings(selectedCurrency, selectedDateFormat, selectedMonthStartDay)

        if (updateError) {
            setError(updateError.message)
        } else {
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
        }
        setSaving(false)
    }

    const loadApiKeys = async () => {
        if (!currentBudget) {
            setApiKeys([])
            setApiKeysLoading(false)
            return
        }

        setApiKeysLoading(true)
        setApiKeyError('')
        try {
            const keys = await dataService.getApiKeys(currentBudget.id)
            setApiKeys(keys as ApiKey[])
        } catch (err) {
            setApiKeyError(err instanceof Error ? err.message : 'Failed to load API keys')
        } finally {
            setApiKeysLoading(false)
        }
    }

    useEffect(() => {
        loadApiKeys()
    }, [currentBudget?.id, dataService])

    const toBase64Url = (bytes: Uint8Array) => {
        let binary = ''
        bytes.forEach((b) => {
            binary += String.fromCharCode(b)
        })
        const base64 = btoa(binary)
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    }

    const generateApiKeyValue = () => {
        if (!window.crypto?.getRandomValues) {
            throw new Error('Secure random generator not available')
        }
        const bytes = new Uint8Array(32)
        window.crypto.getRandomValues(bytes)
        return `yabt_${toBase64Url(bytes)}`
    }

    const hashApiKey = async (value: string) => {
        if (!window.crypto?.subtle) {
            throw new Error('Secure hashing not available')
        }
        const data = new TextEncoder().encode(value)
        const digest = await window.crypto.subtle.digest('SHA-256', data)
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
    }

    const handleGenerateKey = async () => {
        if (!user || !currentBudget) {
            setApiKeyError('Select a budget before generating a key.')
            return
        }

        setCreatingKey(true)
        setApiKeyError('')
        setNewApiKey('')
        setCopiedKey(false)

        try {
            const existingKeys = await dataService.getApiKeys(currentBudget.id)
            if (existingKeys.length >= 2) {
                setApiKeys(existingKeys as ApiKey[])
                setApiKeyError('API key limit reached. Revoke a key to create another.')
                return
            }

            const keyValue = generateApiKeyValue()
            const keyHash = await hashApiKey(keyValue)
            const name = keyName.trim() || 'iOS Shortcut'

            await dataService.createApiKey({
                user_id: user.id,
                budget_id: currentBudget.id,
                name,
                key_hash: keyHash
            })

            setNewApiKey(keyValue)
            setKeyName('iOS Shortcut')
            await loadApiKeys()
        } catch (err) {
            setApiKeyError(err instanceof Error ? err.message : 'Failed to generate API key')
        } finally {
            setCreatingKey(false)
        }
    }

    const handleCopyKey = async () => {
        if (!newApiKey) return
        try {
            await navigator.clipboard.writeText(newApiKey)
            setCopiedKey(true)
            setTimeout(() => setCopiedKey(false), 2000)
        } catch (err) {
            setApiKeyError('Failed to copy API key')
        }
    }

    const handleDeleteKey = async (keyId: string) => {
        if (!window.confirm('Revoke this API key?')) return
        try {
            await dataService.deleteApiKey(keyId)
            setApiKeys(prev => prev.filter(k => k.id !== keyId))
        } catch (err) {
            setApiKeyError(err instanceof Error ? err.message : 'Failed to revoke API key')
        }
    }

    const formatKeyDate = (value: string | null) => {
        if (!value) return 'Never'
        const date = new Date(value)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    return (
        <div className="p-4 lg:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account and preferences</p>
                </div>

                {/* Success Toast */}
                {showSuccess && (
                    <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
                        <Check className="w-5 h-5" />
                        Settings saved successfully!
                    </div>
                )}

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900 dark:text-white">Profile</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Your account information</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
                                <p className="text-slate-900 dark:text-white">{user?.email}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Member since</label>
                                <p className="text-slate-900 dark:text-white">
                                    {new Date(user?.created_at || '').toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <Palette className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900 dark:text-white">Preferences</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Customize your experience</p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Currency</label>
                                <select
                                    value={selectedCurrency}
                                    onChange={(e) => setSelectedCurrency(e.target.value)}
                                    className="input"
                                >
                                    {currencies.map(c => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Format</label>
                                <select
                                    value={selectedDateFormat}
                                    onChange={(e) => setSelectedDateFormat(e.target.value)}
                                    className="input"
                                >
                                    {dateFormats.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Month Start Day</label>
                                <select
                                    value={selectedMonthStartDay}
                                    onChange={(e) => setSelectedMonthStartDay(Number(e.target.value))}
                                    className="input"
                                >
                                    {monthStartDays.map(day => (
                                        <option key={day} value={day}>
                                            {day === 1 ? '1st (Default)' : `${day}${day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}`}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Your budget month runs from this day to the day before next month's start.
                                </p>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn btn-primary w-full sm:w-auto"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Preferences'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* iOS Shortcuts API Section */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                <Key className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900 dark:text-white">iOS Shortcuts</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Generate API keys for quick transaction logging</p>
                            </div>
                        </div>

                        {apiKeyError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                                {apiKeyError}
                            </div>
                        )}

                        {!currentBudget ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Select a budget to create a shortcut key.</p>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Key Name</label>
                                    <input
                                        type="text"
                                        value={keyName}
                                        onChange={(e) => setKeyName(e.target.value)}
                                        className="input"
                                        placeholder="e.g., iPhone Shortcut"
                                        disabled={creatingKey}
                                    />
                                </div>

                                <button
                                    onClick={handleGenerateKey}
                                    disabled={creatingKey || apiKeyLimitReached}
                                    className="btn btn-primary w-full sm:w-auto"
                                >
                                    {creatingKey ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate API Key'
                                    )}
                                </button>
                                {apiKeyLimitReached && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        You can have up to 2 API keys per budget. Revoke one to add another.
                                    </p>
                                )}

                                {newApiKey && (
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">New API Key</p>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={newApiKey}
                                                className="input font-mono text-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopyKey}
                                                className="btn btn-secondary w-full sm:w-auto"
                                            >
                                                <Copy className="w-4 h-4" />
                                                {copiedKey ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                            Save this key now — you won't be able to view it again.
                                        </p>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Active Keys</h3>
                                    {apiKeysLoading ? (
                                        <div className="text-sm text-slate-500 dark:text-slate-400">Loading keys...</div>
                                    ) : apiKeys.length === 0 ? (
                                        <div className="text-sm text-slate-500 dark:text-slate-400">No API keys yet.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {apiKeys.map((key) => (
                                                <div key={key.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{key.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            Created {formatKeyDate(key.created_at)} • Last used {formatKeyDate(key.last_used_at)}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteKey(key.id)}
                                                        className="btn btn-secondary w-full sm:w-auto"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Revoke
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tags Section */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <TagIcon className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900 dark:text-white">Tags</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Organize transactions with custom tags</p>
                            </div>
                        </div>

                        <TagManager mode="manage" />
                    </div>
                </div>
            </div>
        </div>
    )
}
