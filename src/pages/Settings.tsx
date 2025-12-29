import { useState } from 'react'
import { User, Palette, Check, Loader2, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'

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

    const [selectedCurrency, setSelectedCurrency] = useState(currency)
    const [selectedDateFormat, setSelectedDateFormat] = useState(dateFormat)
    const [selectedMonthStartDay, setSelectedMonthStartDay] = useState(monthStartDay)
    const [saving, setSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [error, setError] = useState('')

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
                </div>
            </div>
        </div>
    )
}
