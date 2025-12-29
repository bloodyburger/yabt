import { useState, useEffect } from 'react'
import { TrendingUp, PieChart, BarChart3, Calendar, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBudget } from '@/contexts/BudgetContext'
import { useSettings } from '@/contexts/SettingsContext'
import { formatMoney } from '@/lib/formatMoney'

interface CategorySpending {
    category_name: string
    category_group: string
    total: number
    color: string
}

interface MonthlyTrend {
    month: string
    income: number
    expenses: number
}

const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

export default function Reports() {
    const { currentBudget } = useBudget()
    const { currency } = useSettings()

    const [dateRange, setDateRange] = useState('month')
    const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
    const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([])
    const [totals, setTotals] = useState({ income: 0, expenses: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!currentBudget) return
        fetchReportData()
    }, [currentBudget, dateRange])

    const getDateRange = () => {
        const now = new Date()
        let startDate: Date

        switch (dateRange) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
                break
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1)
                break
            case 'all':
                startDate = new Date(2000, 0, 1)
                break
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        return {
            start: startDate.toISOString().split('T')[0],
            end: now.toISOString().split('T')[0]
        }
    }

    const fetchReportData = async () => {
        if (!currentBudget) return
        setLoading(true)

        const { start, end } = getDateRange()

        // Fetch transactions with category info
        const { data: transactions } = await supabase
            .from('transactions')
            .select(`
                amount,
                date,
                category_id,
                categories(name, category_groups(name))
            `)
            .gte('date', start)
            .lte('date', end)
            .in('account_id', await getAccountIds())

        if (transactions) {
            // Calculate totals
            let income = 0
            let expenses = 0

            transactions.forEach((t: any) => {
                if (t.amount > 0) {
                    income += t.amount
                } else {
                    expenses += Math.abs(t.amount)
                }
            })

            setTotals({ income, expenses })

            // Group by category
            const categoryMap = new Map<string, CategorySpending>()

            transactions.forEach((t: any, index: number) => {
                if (t.amount < 0) {
                    const catName = t.categories?.name || 'Uncategorized'
                    const groupName = t.categories?.category_groups?.name || 'Other'
                    const key = catName

                    if (categoryMap.has(key)) {
                        categoryMap.get(key)!.total += Math.abs(t.amount)
                    } else {
                        categoryMap.set(key, {
                            category_name: catName,
                            category_group: groupName,
                            total: Math.abs(t.amount),
                            color: COLORS[categoryMap.size % COLORS.length]
                        })
                    }
                }
            })

            const spending = Array.from(categoryMap.values())
                .sort((a, b) => b.total - a.total)
            setCategorySpending(spending)

            // Group by month for trend
            const monthMap = new Map<string, MonthlyTrend>()

            transactions.forEach((t: any) => {
                const monthKey = t.date.substring(0, 7)

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, { month: monthKey, income: 0, expenses: 0 })
                }

                if (t.amount > 0) {
                    monthMap.get(monthKey)!.income += t.amount
                } else {
                    monthMap.get(monthKey)!.expenses += Math.abs(t.amount)
                }
            })

            const trend = Array.from(monthMap.values())
                .sort((a, b) => a.month.localeCompare(b.month))
            setMonthlyTrend(trend)
        }

        setLoading(false)
    }

    const getAccountIds = async (): Promise<string[]> => {
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('budget_id', currentBudget!.id)

        return accounts?.map(a => a.id) || []
    }

    const formatMonthLabel = (month: string) => {
        const [year, m] = month.split('-')
        const date = new Date(parseInt(year), parseInt(m) - 1)
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }

    const totalSpending = categorySpending.reduce((sum, c) => sum + c.total, 0)

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
                    <p className="text-slate-500 dark:text-slate-400">Analyze your spending patterns</p>
                </div>

                {/* Date Range Selector */}
                <div className="relative">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                        <option value="all">All Time</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Income</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(totals.income, currency)}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Expenses</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatMoney(totals.expenses, currency)}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${totals.income - totals.expenses >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                            <Calendar className={`w-5 h-5 ${totals.income - totals.expenses >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
                        </div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Net</span>
                    </div>
                    <p className={`text-2xl font-bold ${totals.income - totals.expenses >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {formatMoney(totals.income - totals.expenses, currency)}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="py-16 text-center text-slate-500">Loading reports...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Spending by Category */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <PieChart className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Spending by Category</h2>
                        </div>

                        {categorySpending.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No spending data available</p>
                        ) : (
                            <div className="space-y-3">
                                {categorySpending.slice(0, 8).map((cat, index) => {
                                    const percentage = totalSpending > 0 ? (cat.total / totalSpending) * 100 : 0
                                    return (
                                        <div key={cat.category_name}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-700 dark:text-slate-300">{cat.category_name}</span>
                                                <span className="font-medium text-slate-900 dark:text-white">
                                                    {formatMoney(cat.total, currency)}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: cat.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Monthly Trend */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Monthly Trend</h2>
                        </div>

                        {monthlyTrend.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No trend data available</p>
                        ) : (
                            <div className="space-y-4">
                                {monthlyTrend.map(month => {
                                    const maxValue = Math.max(...monthlyTrend.map(m => Math.max(m.income, m.expenses)))
                                    const incomeWidth = maxValue > 0 ? (month.income / maxValue) * 100 : 0
                                    const expenseWidth = maxValue > 0 ? (month.expenses / maxValue) * 100 : 0

                                    return (
                                        <div key={month.month}>
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>{formatMonthLabel(month.month)}</span>
                                                <span className="text-emerald-600">+{formatMoney(month.income, currency)}</span>
                                            </div>
                                            <div className="flex gap-1 h-4">
                                                <div
                                                    className="bg-emerald-500 rounded transition-all duration-500"
                                                    style={{ width: `${incomeWidth}%` }}
                                                />
                                                <div
                                                    className="bg-red-500 rounded transition-all duration-500"
                                                    style={{ width: `${expenseWidth}%` }}
                                                />
                                            </div>
                                            <div className="text-right text-xs text-red-600">
                                                -{formatMoney(month.expenses, currency)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
