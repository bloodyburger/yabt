import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, ChevronDown, ChevronUp, Target, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBudget } from '@/contexts/BudgetContext'
import { useSettings } from '@/contexts/SettingsContext'
import { formatMoney, getMoneyColorClass } from '@/lib/formatMoney'

interface Category {
    id: string
    name: string
    target_type: string | null
    target_amount: number | null
    target_date: string | null
}

interface CategoryGroup {
    id: string
    name: string
    categories: Category[]
}

interface MonthlyBudget {
    category_id: string
    budgeted: number
    activity: number
}

export default function Budget() {
    const { currentBudget } = useBudget()
    const { currency } = useSettings()

    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([])
    const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([])
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
    const [readyToAssign, setReadyToAssign] = useState(0)
    const [loading, setLoading] = useState(true)
    const [editingCategory, setEditingCategory] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [saving, setSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!currentBudget) return
        fetchBudgetData()
    }, [currentBudget, currentMonth])

    useEffect(() => {
        if (editingCategory && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [editingCategory])

    const fetchBudgetData = async () => {
        if (!currentBudget) return
        setLoading(true)

        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`

        // Fetch category groups with categories
        const { data: groups } = await supabase
            .from('category_groups')
            .select('id, name, categories(id, name, target_type, target_amount, target_date)')
            .eq('budget_id', currentBudget.id)
            .order('sort_order')

        if (groups) {
            setCategoryGroups(groups)
            setExpandedGroups(new Set(groups.map(g => g.id)))
        }

        // Fetch monthly budgets
        const { data: budgets } = await supabase
            .from('monthly_budgets')
            .select('category_id, budgeted, activity')
            .eq('month', monthStr)
            .in('category_id', groups?.flatMap(g => g.categories?.map(c => c.id) || []) || [])

        setMonthlyBudgets(budgets || [])

        // Calculate ready to assign
        const { data: accounts } = await supabase
            .from('accounts')
            .select('balance')
            .eq('budget_id', currentBudget.id)
            .eq('is_on_budget', true)

        const totalBalance = accounts?.reduce((sum, a) => sum + Number(a.balance), 0) || 0
        const totalBudgeted = budgets?.reduce((sum, b) => sum + Number(b.budgeted), 0) || 0
        setReadyToAssign(totalBalance - totalBudgeted)

        setLoading(false)
    }

    const getCategoryBudgeted = (categoryId: string) => {
        return monthlyBudgets.find(b => b.category_id === categoryId)?.budgeted || 0
    }

    const getCategoryActivity = (categoryId: string) => {
        return monthlyBudgets.find(b => b.category_id === categoryId)?.activity || 0
    }

    const getCategoryAvailable = (categoryId: string) => {
        return getCategoryBudgeted(categoryId) + getCategoryActivity(categoryId)
    }

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            if (next.has(groupId)) {
                next.delete(groupId)
            } else {
                next.add(groupId)
            }
            return next
        })
    }

    const formatMonth = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    const prevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
    }

    const nextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
    }

    const startEditing = (categoryId: string, currentValue: number) => {
        setEditingCategory(categoryId)
        setEditValue(currentValue === 0 ? '' : currentValue.toString())
    }

    const cancelEditing = () => {
        setEditingCategory(null)
        setEditValue('')
    }

    const saveBudget = async (categoryId: string) => {
        if (!currentBudget) return

        setSaving(true)
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`
        const newBudgeted = parseFloat(editValue) || 0

        // Upsert monthly budget
        const { error } = await supabase
            .from('monthly_budgets')
            .upsert({
                category_id: categoryId,
                month: monthStr,
                budgeted: newBudgeted
            }, {
                onConflict: 'category_id,month'
            })

        if (!error) {
            // Update local state
            setMonthlyBudgets(prev => {
                const existing = prev.find(b => b.category_id === categoryId)
                if (existing) {
                    return prev.map(b =>
                        b.category_id === categoryId
                            ? { ...b, budgeted: newBudgeted }
                            : b
                    )
                } else {
                    return [...prev, { category_id: categoryId, budgeted: newBudgeted, activity: 0 }]
                }
            })

            // Recalculate ready to assign
            const { data: accounts } = await supabase
                .from('accounts')
                .select('balance')
                .eq('budget_id', currentBudget.id)
                .eq('is_on_budget', true)

            const totalBalance = accounts?.reduce((sum, a) => sum + Number(a.balance), 0) || 0

            // Get updated budgets
            const { data: updatedBudgets } = await supabase
                .from('monthly_budgets')
                .select('budgeted')
                .eq('month', monthStr)
                .in('category_id', categoryGroups.flatMap(g => g.categories?.map(c => c.id) || []))

            const totalBudgeted = updatedBudgets?.reduce((sum, b) => sum + Number(b.budgeted), 0) || 0
            setReadyToAssign(totalBalance - totalBudgeted)
        }

        setSaving(false)
        setEditingCategory(null)
        setEditValue('')
    }

    const handleKeyDown = (e: React.KeyboardEvent, categoryId: string) => {
        if (e.key === 'Enter') {
            saveBudget(categoryId)
        } else if (e.key === 'Escape') {
            cancelEditing()
        }
    }

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Budget</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage your spending plan</p>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <span className="px-4 py-2 font-medium text-slate-900 dark:text-white min-w-[160px] text-center">
                        {formatMonth(currentMonth)}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Ready to Assign */}
            <div className={`mb-6 p-4 rounded-xl ${readyToAssign >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'} border`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Ready to Assign</p>
                        <p className={`text-2xl font-bold ${readyToAssign >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatMoney(readyToAssign, currency)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Budget Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="col-span-5">Category</div>
                    <div className="col-span-2 text-right">Budgeted</div>
                    <div className="col-span-2 text-right">Activity</div>
                    <div className="col-span-3 text-right">Available</div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-500">Loading...</div>
                ) : categoryGroups.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">No categories yet</h3>
                        <p className="text-slate-500 dark:text-slate-400">Create category groups and categories to start budgeting</p>
                    </div>
                ) : (
                    categoryGroups.map(group => (
                        <div key={group.id}>
                            {/* Group Header */}
                            <div
                                onClick={() => toggleGroup(group.id)}
                                className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="col-span-5 flex items-center gap-2">
                                    {expandedGroups.has(group.id) ? (
                                        <ChevronUp className="w-4 h-4 text-slate-500" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-500" />
                                    )}
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{group.name}</span>
                                </div>
                            </div>

                            {/* Categories */}
                            {expandedGroups.has(group.id) && group.categories?.map(category => {
                                const available = getCategoryAvailable(category.id)
                                const budgeted = getCategoryBudgeted(category.id)
                                const activity = getCategoryActivity(category.id)
                                const hasTarget = category.target_type && category.target_type !== 'none'
                                const isEditing = editingCategory === category.id

                                return (
                                    <div
                                        key={category.id}
                                        className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                    >
                                        <div className="col-span-5 pl-6 flex items-center gap-2">
                                            <span className="text-slate-700 dark:text-slate-200">{category.name}</span>
                                            {hasTarget && <Target className="w-4 h-4 text-blue-500" />}
                                        </div>
                                        <div className="col-span-2 text-right">
                                            {isEditing ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <input
                                                        ref={inputRef}
                                                        type="number"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, category.id)}
                                                        onBlur={() => saveBudget(category.id)}
                                                        className="w-20 px-2 py-1 text-right text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                        disabled={saving}
                                                    />
                                                    {saving && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(category.id, budgeted)}
                                                    className="text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors cursor-pointer"
                                                >
                                                    {formatMoney(budgeted, currency)}
                                                </button>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-right text-slate-600 dark:text-slate-300">
                                            {formatMoney(activity, currency)}
                                        </div>
                                        <div className={`col-span-3 text-right font-medium ${getMoneyColorClass(available)}`}>
                                            {formatMoney(available, currency)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
