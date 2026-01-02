/**
 * Passphrase Modal
 * Shows after login to set up or unlock encryption
 */

import { useState } from 'react'
import { Lock, Eye, EyeOff, Shield, AlertCircle, Loader2 } from 'lucide-react'
import { useEncryption } from '@/contexts/EncryptionContext'

export default function PassphraseModal() {
    const { isEncryptionSetup, setupEncryption, unlock, isLoading, error } = useEncryption()

    const [passphrase, setPassphrase] = useState('')
    const [confirmPassphrase, setConfirmPassphrase] = useState('')
    const [showPassphrase, setShowPassphrase] = useState(false)
    const [localError, setLocalError] = useState('')

    const isSetup = !isEncryptionSetup

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLocalError('')

        if (isSetup) {
            // Setting up encryption for the first time
            if (passphrase.length < 8) {
                setLocalError('Passphrase must be at least 8 characters')
                return
            }
            if (passphrase !== confirmPassphrase) {
                setLocalError('Passphrases do not match')
                return
            }

            try {
                await setupEncryption(passphrase)
            } catch (err) {
                setLocalError(err instanceof Error ? err.message : 'Failed to set up encryption')
            }
        } else {
            // Unlocking existing encryption
            const success = await unlock(passphrase)
            if (!success) {
                setLocalError('Invalid passphrase')
            }
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {isSetup ? 'Set Up Encryption' : 'Unlock Your Data'}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {isSetup
                                    ? 'Create a passphrase to encrypt your data'
                                    : 'Enter your passphrase to access your data'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {(error || localError) && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error || localError}</span>
                        </div>
                    )}

                    {isSetup && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                <strong>Important:</strong> If you forget this passphrase, your data cannot be recovered.
                            </p>
                        </div>
                    )}

                    {/* Passphrase Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {isSetup ? 'Create Passphrase' : 'Passphrase'}
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type={showPassphrase ? 'text' : 'password'}
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter your passphrase"
                                autoFocus
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Passphrase (setup only) */}
                    {isSetup && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Confirm Passphrase
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassphrase ? 'text' : 'password'}
                                    value={confirmPassphrase}
                                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Confirm your passphrase"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {isSetup ? 'Setting up...' : 'Unlocking...'}
                            </>
                        ) : (
                            <>
                                <Shield className="w-5 h-5" />
                                {isSetup ? 'Set Up Encryption' : 'Unlock'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
