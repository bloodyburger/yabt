/**
 * Insights Component
 * Shows smart budget insights and warnings
 * Uses DataService for storage abstraction
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Lightbulb, X } from 'lucide-react'
import { useBudget } from '@/contexts/BudgetContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useDataService } from '@/contexts/DataContext'
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
    const dataService = useDataService()
    const [insights, setInsights] = useState<Insight[]>([])
    const [loading, setLoading] = useState(true)
    const [dismissed, setDismissed] = useState<string[]>([])

    useEffect(() => {
        if (currentBudget) {
            fetchInsights()
        }
    }, [currentBudget, dataService])

    const fetchInsights = async () => {
        if (!currentBudget) return
        setLoading(true)

        try {
            const now = new Date()
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const firstOfMonthStr = `${firstOfMonth.getFullYear()}-${String(firstOfMonth.getMonth() + 1).padStart(2, '0')}-01`
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            const lastOfMonthStr = lastOfMonth.toISOString().split('T')[0]

            // Fetch categories and monthly budgets
            const categories = await dataService.getCategories(currentBudget.id)
            const monthlyBudgets = await dataService.getMonthlyBudgets(currentBudget.id, firstOfMonthStr)

            const newInsights: Insight[] = []

            // Calculate activity from transactions for each category
            for (const cat of categories) {
                const transactions = await dataService.getTransactionsByCategory(cat.id, firstOfMonthStr, lastOfMonthStr)
                const activity = transactions.reduce((sum, t) => sum + t.amount, 0)

                const mb = monthlyBudgets.find(m => m.category_id === cat.id)
                const budgeted = mb?.budgeted || 0
                const spent = Math.abs(activity)
                const available = budgeted + activity // activity is negative for expenses

                if (budgeted > 0) {
                    const percentUsed = (spent / budgeted) * 100

                    // Over 100% - already overspent
                    if (percentUsed >= 100) {
                        newInsights.push({
                            id: `overspent-${cat.id}`,
                            type: 'warning',
                            title: `Overspent: ${cat.name}`,
                            message: `You've exceeded your budget by ${formatMoney(spent - budgeted, currency)}`,
                            category: cat.name,
                            value: spent - budgeted
                        })
                    }
                    // Between 80-100% - at risk
                    else if (percentUsed >= 80) {
                        const remaining = budgeted - spent
                        newInsights.push({
                            id: `atrisk-${cat.id}`,
                            type: 'info',
                            title: `${cat.name}: ${Math.round(percentUsed)}% used`,
                            message: `Only ${formatMoney(remaining, currency)} remaining this month`,
                            category: cat.name,
                            value: remaining
                        })
                    }
                }

                // Negative available balance
                if (available < 0) {
                    const existingOverspent = newInsights.find(i => i.id === `overspent-${cat.id}`)
                    if (!existingOverspent) {
                        newInsights.push({
                            id: `negative-${cat.id}`,
                            type: 'warning',
                            title: `${cat.name} is overbudget`,
                            message: `Cover ${formatMoney(Math.abs(available), currency)} from another category`,
                            category: cat.name,
                            value: available
                        })
                    }
                }
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
