import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Lightbulb, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBudget } from '@/contexts/BudgetContext'
import { useSettings } from '@/contexts/SettingsContext'
import { formatMoney } from '@/lib/formatMoney'

interface Insight {
    id: string
    type: 'warning' | 'info' | 'tip'
    title: string
    message: string
    category?: string
    value?: number
}

export default function Insights() {
    const { currentBudget } = useBudget()
    const { currency } = useSettings()
    const [insights, setInsights] = useState<Insight[]>([])
    const [loading, setLoading] = useState(true)
    const [dismissed, setDismissed] = useState<string[]>([])

    useEffect(() => {
        if (currentBudget) {
            fetchInsights()
        }
    }, [currentBudget])

    const fetchInsights = async () => {
        if (!currentBudget) return
        setLoading(true)

        try {
            const now = new Date()
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const firstOfMonthStr = firstOfMonth.toISOString().split('T')[0]

            // Fetch monthly budgets with category info
            const { data: monthlyBudgets } = await supabase
                .from('monthly_budgets')
                .select(`
                    category_id,
                    budgeted,
                    activity,
                    available,
                    categories!inner (
                        id,
                        name,
                        category_groups!inner (
                            budget_id
                        )
                    )
                `)
                .eq('month', firstOfMonthStr)
                .eq('categories.category_groups.budget_id', currentBudget.id)

            const newInsights: Insight[] = []

            if (monthlyBudgets) {
                monthlyBudgets.forEach((mb: any) => {
                    const budgeted = mb.budgeted || 0
                    const spent = Math.abs(mb.activity || 0)
                    const categoryName = mb.categories?.name || 'Unknown'

                    if (budgeted > 0) {
                        const percentUsed = (spent / budgeted) * 100

                        // Over 100% - already overspent
                        if (percentUsed >= 100) {
                            newInsights.push({
                                id: `overspent-${mb.category_id}`,
                                type: 'warning',
                                title: `Overspent: ${categoryName}`,
                                message: `You've exceeded your budget by ${formatMoney(spent - budgeted, currency)}`,
                                category: categoryName,
                                value: spent - budgeted
                            })
                        }
                        // Between 80-100% - at risk
                        else if (percentUsed >= 80) {
                            const remaining = budgeted - spent
                            newInsights.push({
                                id: `atrisk-${mb.category_id}`,
                                type: 'info',
                                title: `${categoryName}: ${Math.round(percentUsed)}% used`,
                                message: `Only ${formatMoney(remaining, currency)} remaining this month`,
                                category: categoryName,
                                value: remaining
                            })
                        }
                    }

                    // Negative available balance
                    if (mb.available < 0) {
                        const existingOverspent = newInsights.find(i => i.id === `overspent-${mb.category_id}`)
                        if (!existingOverspent) {
                            newInsights.push({
                                id: `negative-${mb.category_id}`,
                                type: 'warning',
                                title: `${categoryName} is overbudget`,
                                message: `Cover ${formatMoney(Math.abs(mb.available), currency)} from another category`,
                                category: categoryName,
                                value: mb.available
                            })
                        }
                    }
                })
            }

            // Fetch last month's data for trend comparison
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastMonthStr = lastMonth.toISOString().split('T')[0]

            const { data: lastMonthBudgets } = await supabase
                .from('monthly_budgets')
                .select(`
                    category_id,
                    activity,
                    categories!inner (
                        id,
                        name,
                        category_groups!inner (
                            budget_id
                        )
                    )
                `)
                .eq('month', lastMonthStr)
                .eq('categories.category_groups.budget_id', currentBudget.id)

            // Compare spending trends
            if (monthlyBudgets && lastMonthBudgets) {
                const dayOfMonth = now.getDate()
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                const progressRatio = dayOfMonth / daysInMonth

                monthlyBudgets.forEach((mb: any) => {
                    const lastMonthData = lastMonthBudgets.find(
                        (lm: any) => lm.category_id === mb.category_id
                    )
                    if (lastMonthData) {
                        const currentSpent = Math.abs(mb.activity || 0)
                        const lastMonthSpent = Math.abs(lastMonthData.activity || 0)
                        const projectedSpent = lastMonthSpent * progressRatio

                        // Spending 30%+ more than projected
                        if (currentSpent > projectedSpent * 1.3 && currentSpent > 100) {
                            const pctIncrease = Math.round(((currentSpent / projectedSpent) - 1) * 100)
                            const categoryName = mb.categories?.name || 'Unknown'

                            // Avoid duplicate insights
                            const hasRelatedInsight = newInsights.some(
                                i => i.category === categoryName
                            )
                            if (!hasRelatedInsight && pctIncrease > 30) {
                                newInsights.push({
                                    id: `trend-${mb.category_id}`,
                                    type: 'tip',
                                    title: `Spending up in ${categoryName}`,
                                    message: `${pctIncrease}% higher than this time last month`,
                                    category: categoryName,
                                    value: pctIncrease
                                })
                            }
                        }
                    }
                })
            }

            // Sort by severity: warnings first, then info, then tips
            newInsights.sort((a, b) => {
                const order = { warning: 0, info: 1, tip: 2 }
                return order[a.type] - order[b.type]
            })

            setInsights(newInsights.slice(0, 5)) // Limit to 5 insights
        } catch (error) {
            console.error('Error fetching insights:', error)
        } finally {
            setLoading(false)
        }
    }

    const dismissInsight = (id: string) => {
        setDismissed([...dismissed, id])
    }

    const visibleInsights = insights.filter(i => !dismissed.includes(i.id))

    if (loading || visibleInsights.length === 0) {
        return null
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-red-500" />
            case 'info':
                return <TrendingDown className="w-5 h-5 text-amber-500" />
            case 'tip':
                return <Lightbulb className="w-5 h-5 text-blue-500" />
            default:
                return <TrendingUp className="w-5 h-5 text-slate-500" />
        }
    }

    const getBgColor = (type: string) => {
        switch (type) {
            case 'warning':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            case 'info':
                return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            case 'tip':
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            default:
                return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }
    }

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Smart Insights</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleInsights.map(insight => (
                    <div
                        key={insight.id}
                        className={`relative p-4 rounded-xl border ${getBgColor(insight.type)} transition-all hover:shadow-md`}
                    >
                        <button
                            onClick={() => dismissInsight(insight.id)}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                        <div className="flex items-start gap-3">
                            {getIcon(insight.type)}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 dark:text-white text-sm">
                                    {insight.title}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    {insight.message}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
