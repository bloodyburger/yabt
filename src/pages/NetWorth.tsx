import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Building2, CreditCard, PiggyBank, Landmark } from 'lucide-react'
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

interface NetWorthSnapshot {
    date: string
    assets: number
    liabilities: number
    netWorth: number
}

const ACCOUNT_ICONS: Record<string, any> = {
    checking: Wallet,
    savings: PiggyBank,
    credit: CreditCard,
    investment: TrendingUp,
    loan: Landmark,
    asset: Building2
}

const ASSET_TYPES = ['checking', 'savings', 'investment', 'asset', 'cash']
const LIABILITY_TYPES = ['credit', 'loan', 'mortgage', 'line_of_credit']

export default function NetWorth() {
    const { currentBudget } = useBudget()
    const { currency } = useSettings()

    const [accounts, setAccounts] = useState<Account[]>([])
    const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!currentBudget) return
        fetchNetWorthData()
    }, [currentBudget])

    const fetchNetWorthData = async () => {
        if (!currentBudget) return
        setLoading(true)

        // Fetch all accounts
        const { data: accountData } = await supabase
            .from('accounts')
            .select('id, name, account_type, balance, is_on_budget')
            .eq('budget_id', currentBudget.id)
            .eq('closed', false)
            .order('name')

        if (accountData) {
            setAccounts(accountData)
        }

        // Generate net worth snapshots from transactions
        // Group transactions by month to calculate running balance
        const { data: transactions } = await supabase
            .from('transactions')
            .select('date, amount, accounts!inner(budget_id, account_type)')
            .eq('accounts.budget_id', currentBudget.id)
            .order('date')

        if (transactions && transactions.length > 0) {
            // Get starting balances (current balance minus all transactions)
            const startingBalances: Record<string, number> = {}
            accountData?.forEach(acc => {
                startingBalances[acc.account_type] = (startingBalances[acc.account_type] || 0) + acc.balance
            })

            // Work backwards to get starting balance
            const totalTransactionsByType: Record<string, number> = {}
            transactions.forEach((t: any) => {
                const type = t.accounts?.account_type || 'checking'
                totalTransactionsByType[type] = (totalTransactionsByType[type] || 0) + t.amount
            })

            // Generate monthly snapshots
            const monthMap = new Map<string, { assets: number, liabilities: number }>()
            const runningBalances: Record<string, number> = {}

            // Initialize with starting balances minus all future transactions
            Object.entries(startingBalances).forEach(([type, balance]) => {
                runningBalances[type] = balance - (totalTransactionsByType[type] || 0)
            })

            transactions.forEach((t: any) => {
                const monthKey = t.date.substring(0, 7)
                const type = t.accounts?.account_type || 'checking'

                runningBalances[type] = (runningBalances[type] || 0) + t.amount

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, { assets: 0, liabilities: 0 })
                }

                // Calculate totals for this point
                let assets = 0
                let liabilities = 0

                Object.entries(runningBalances).forEach(([accType, balance]) => {
                    if (ASSET_TYPES.includes(accType)) {
                        assets += balance
                    } else if (LIABILITY_TYPES.includes(accType)) {
                        liabilities += Math.abs(balance)
                    }
                })

                monthMap.set(monthKey, { assets, liabilities })
            })

            // Convert to array
            const snapshotData = Array.from(monthMap.entries())
                .map(([date, data]) => ({
                    date,
                    assets: data.assets,
                    liabilities: data.liabilities,
                    netWorth: data.assets - data.liabilities
                }))
                .sort((a, b) => a.date.localeCompare(b.date))

            setSnapshots(snapshotData)
        } else {
            // No transactions, just use current balances
            let assets = 0
            let liabilities = 0

            accountData?.forEach(acc => {
                if (ASSET_TYPES.includes(acc.account_type)) {
                    assets += acc.balance
                } else if (LIABILITY_TYPES.includes(acc.account_type)) {
                    liabilities += Math.abs(acc.balance)
                }
            })

            const now = new Date()
            setSnapshots([{
                date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
                assets,
                liabilities,
                netWorth: assets - liabilities
            }])
        }

        setLoading(false)
    }

    const totalAssets = accounts
        .filter(a => ASSET_TYPES.includes(a.account_type))
        .reduce((sum, a) => sum + a.balance, 0)

    const totalLiabilities = accounts
        .filter(a => LIABILITY_TYPES.includes(a.account_type))
        .reduce((sum, a) => sum + Math.abs(a.balance), 0)

    const netWorth = totalAssets - totalLiabilities

    const assetAccounts = accounts.filter(a => ASSET_TYPES.includes(a.account_type))
    const liabilityAccounts = accounts.filter(a => LIABILITY_TYPES.includes(a.account_type))

    const formatMonthLabel = (month: string) => {
        const [year, m] = month.split('-')
        const date = new Date(parseInt(year), parseInt(m) - 1)
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }

    const getIcon = (type: string) => {
        const Icon = ACCOUNT_ICONS[type] || Wallet
        return <Icon className="w-5 h-5" />
    }

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Net Worth</h1>
                <p className="text-slate-500 dark:text-slate-400">Track your financial health over time</p>
            </div>

            {/* Net Worth Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Assets</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(totalAssets, currency)}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Liabilities</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatMoney(totalLiabilities, currency)}
                    </p>
                </div>

                <div className={`border rounded-xl p-6 ${netWorth >= 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800' : 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${netWorth >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                            <Wallet className={`w-5 h-5 ${netWorth >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
                        </div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Net Worth</span>
                    </div>
                    <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {formatMoney(netWorth, currency)}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="py-16 text-center text-slate-500">Loading...</div>
            ) : (
                <>
                    {/* Net Worth Trend */}
                    {snapshots.length > 1 && (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Net Worth Over Time</h2>
                            <div className="h-48 flex items-end gap-2">
                                {snapshots.slice(-12).map((snapshot, index) => {
                                    const maxNW = Math.max(...snapshots.map(s => Math.abs(s.netWorth)))
                                    const height = maxNW > 0 ? (Math.abs(snapshot.netWorth) / maxNW) * 100 : 0
                                    const isPositive = snapshot.netWorth >= 0

                                    return (
                                        <div key={snapshot.date} className="flex-1 flex flex-col items-center gap-2">
                                            <div className="w-full flex flex-col items-center h-40">
                                                <div
                                                    className={`w-full rounded-t transition-all duration-500 ${isPositive ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                    style={{ height: `${height}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500 rotate-[-45deg] origin-top-left whitespace-nowrap">
                                                {formatMonthLabel(snapshot.date)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Account Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Assets */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assets</h2>
                            </div>

                            {assetAccounts.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">No asset accounts</p>
                            ) : (
                                <div className="space-y-3">
                                    {assetAccounts.map(account => (
                                        <div key={account.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                    {getIcon(account.account_type)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{account.name}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{account.account_type}</p>
                                                </div>
                                            </div>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                {formatMoney(account.balance, currency)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Liabilities */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingDown className="w-5 h-5 text-red-500" />
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Liabilities</h2>
                            </div>

                            {liabilityAccounts.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">No liability accounts</p>
                            ) : (
                                <div className="space-y-3">
                                    {liabilityAccounts.map(account => (
                                        <div key={account.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400">
                                                    {getIcon(account.account_type)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{account.name}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{account.account_type}</p>
                                                </div>
                                            </div>
                                            <span className="font-semibold text-red-600 dark:text-red-400">
                                                {formatMoney(Math.abs(account.balance), currency)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
