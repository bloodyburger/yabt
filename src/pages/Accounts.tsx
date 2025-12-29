import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CreditCard, Wallet, Building, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBudget } from '@/contexts/BudgetContext'
import { useSettings } from '@/contexts/SettingsContext'
import { formatMoney, getMoneyColorClass } from '@/lib/formatMoney'

interface Account {
    id: string
    name: string
    account_type: string
    balance: number
    is_on_budget: boolean
}

export default function Accounts() {
    const { currentBudget } = useBudget()
    const { currency } = useSettings()

    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)

    useEffect(() => {
        if (!currentBudget) return
        fetchAccounts()
    }, [currentBudget])

    const fetchAccounts = async () => {
        if (!currentBudget) return

        const { data } = await supabase
            .from('accounts')
            .select('*')
            .eq('budget_id', currentBudget.id)
            .eq('closed', false)
            .order('sort_order')

        setAccounts(data || [])
        setLoading(false)
    }

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'credit':
                return <CreditCard className="w-5 h-5" />
            case 'savings':
                return <Building className="w-5 h-5" />
            default:
                return <Wallet className="w-5 h-5" />
        }
    }

    const totalBalance = accounts.filter(a => a.is_on_budget).reduce((sum, a) => sum + a.balance, 0)

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accounts</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage your financial accounts</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Add Account
                </button>
            </div>

            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 mb-6 text-white">
                <p className="text-blue-100 mb-1">Total Balance (On Budget)</p>
                <p className="text-3xl font-bold">{formatMoney(totalBalance, currency)}</p>
            </div>

            {/* Accounts List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : accounts.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wallet className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">No accounts yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">Add your first account to start tracking</p>
                    <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                        <Plus className="w-4 h-4" />
                        Add Account
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {accounts.map(account => (
                        <Link
                            key={account.id}
                            to={`/accounts/${account.id}`}
                            className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 transition-colors">
                                        {getAccountIcon(account.account_type)}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-900 dark:text-white">{account.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                                            {account.account_type} • {account.is_on_budget ? 'On Budget' : 'Tracking'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-semibold ${getMoneyColorClass(account.balance)}`}>
                                        {formatMoney(account.balance, currency)}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Add Account Modal */}
            {showAddModal && (
                <AddAccountModal
                    budgetId={currentBudget?.id || ''}
                    onClose={() => { setShowAddModal(false); fetchAccounts(); }}
                />
            )}
        </div>
    )
}

function AddAccountModal({ budgetId, onClose }: { budgetId: string; onClose: () => void }) {
    const { currency } = useSettings()

    const currencySymbols: Record<string, string> = {
        USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
        CAD: '$', AUD: '$', CHF: 'CHF', CNY: '¥', SGD: '$', AED: 'د.إ',
    }
    const currencySymbol = currencySymbols[currency] || '$'

    const [name, setName] = useState('')
    const [accountType, setAccountType] = useState('checking')
    const [balance, setBalance] = useState('')
    const [isOnBudget, setIsOnBudget] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError('')

        const { error: insertError } = await supabase
            .from('accounts')
            .insert({
                budget_id: budgetId,
                name: name.trim(),
                account_type: accountType,
                balance: parseFloat(balance) || 0,
                is_on_budget: isOnBudget,
                closed: false
            })

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
        } else {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add Account</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Account Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Checking, Savings, Credit Card"
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Account Type
                            </label>
                            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="input">
                                <option value="checking">Checking</option>
                                <option value="savings">Savings</option>
                                <option value="credit">Credit Card</option>
                                <option value="cash">Cash</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Current Balance
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">{currencySymbol}</span>
                                <input
                                    type="number"
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                    step="0.01"
                                    placeholder="0.00"
                                    className="input pl-7"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isOnBudget"
                                checked={isOnBudget}
                                onChange={(e) => setIsOnBudget(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isOnBudget" className="text-sm text-slate-700 dark:text-slate-300">
                                Include in budget calculations
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary flex-1">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
