/**
 * Budget Page
 * Main budget management view with categories and monthly allocations
 * Uses DataService for storage abstraction
 */

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, ChevronDown, ChevronUp, Target, Loader2 } from 'lucide-react'
import { useBudget } from '@/contexts/BudgetContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useDataService } from '@/contexts/DataContext'
import { formatMoney, getMoneyColorClass } from '@/lib/formatMoney'
import Insights from '@/components/common/Insights'
import ActivityModal from '@/components/common/ActivityModal'

interface Category {
    id: string
    name: string
    target_type: string | null
    target_amount: number | null
    target_date: string | null
}

interface CategoryGroupDisplay {
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
    const { currency, monthStartDay } = useSettings()
    const dataService = useDataService()

    // Calculate the correct initial month based on monthStartDay
    // If today is before monthStartDay, we're in the previous month's budget period
    const getInitialMonth = () => {
        const today = new Date()
        const currentDay = today.getDate()

        if (currentDay < monthStartDay) {
            // We're in the previous month's budget period
            return new Date(today.getFullYear(), today.getMonth() - 1, 1)
        }
        return new Date(today.getFullYear(), today.getMonth(), 1)
    }

    const [currentMonth, setCurrentMonth] = useState(getInitialMonth)
    const [categoryGroups, setCategoryGroups] = useState<CategoryGroupDisplay[]>([])
    const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([])
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
    const [readyToAssign, setReadyToAssign] = useState(0)
    const [loading, setLoading] = useState(true)
    const [editingCategory, setEditingCategory] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [saving, setSaving] = useState(false)
    const [activityCategory, setActivityCategory] = useState<{ id: string; name: string } | null>(null)
    const [showAddGroupModal, setShowAddGroupModal] = useState(false)
    const [addingCategoryToGroup, setAddingCategoryToGroup] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Helper to get budget month date range based on monthStartDay setting
    const getBudgetMonthRange = (baseDate: Date) => {
        const year = baseDate.getFullYear()
        const month = baseDate.getMonth()

        // Start date: monthStartDay of current month
        const startDate = new Date(year, month, monthStartDay)

        // End date: day before monthStartDay of next month
        const endDate = new Date(year, month + 1, monthStartDay - 1)

        return { startDate, endDate }
    }

    // Format the budget month range for display
    const formatBudgetPeriod = (baseDate: Date) => {
        const { startDate, endDate } = getBudgetMonthRange(baseDate)
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })

        if (monthStartDay === 1) {
            // Standard month - just show month name
            return baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }

        // Custom date range
        return `${formatDate(startDate)} - ${formatDate(endDate)}, ${endDate.getFullYear()}`
    }

    useEffect(() => {
        if (!currentBudget) return
        fetchBudgetData()
    }, [currentBudget, currentMonth, monthStartDay, dataService])

    useEffect(() => {
        if (editingCategory && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [editingCategory])

    const fetchBudgetData = async () => {
        if (!currentBudget) return
        setLoading(true)

        try {
            const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`

            // Get custom budget month date range
            const { startDate, endDate } = getBudgetMonthRange(currentMonth)
            const firstDayStr = startDate.toISOString().split('T')[0]
            const lastDayStr = endDate.toISOString().split('T')[0]

            // Fetch category groups
            const groups = await dataService.getCategoryGroups(currentBudget.id)

            // Fetch all categories for this budget
            const categories = await dataService.getCategories(currentBudget.id)

            // Build category groups with categories
            const groupsWithCategories: CategoryGroupDisplay[] = groups.map(g => ({
                id: g.id,
                name: g.name,
                categories: categories
                    .filter(c => c.category_group_id === g.id)
                    .map(c => ({
                        id: c.id,
                        name: c.name,
                        target_type: c.target_type,
                        target_amount: c.target_amount,
                        target_date: c.target_date
                    }))
            }))

            setCategoryGroups(groupsWithCategories)
            setExpandedGroups(new Set(groups.map(g => g.id)))

            // Get all category IDs for this budget
            const categoryIds = categories.map(c => c.id)

            // Fetch monthly budgets
            const budgets = await dataService.getMonthlyBudgets(currentBudget.id, monthStr)

            // Calculate activity per category from transactions
            const activityByCategory: Record<string, number> = {}
            for (const catId of categoryIds) {
                const transactions = await dataService.getTransactionsByCategory(catId, firstDayStr, lastDayStr)
                activityByCategory[catId] = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
            }

            // Merge budgets with calculated activity
            const mergedBudgets = categoryIds.map(catId => {
                const existing = budgets.find(b => b.category_id === catId)
                return {
                    category_id: catId,
                    budgeted: existing?.budgeted || 0,
                    activity: activityByCategory[catId] || 0
                }
            })

            setMonthlyBudgets(mergedBudgets)

            // Calculate ready to assign
            const accounts = await dataService.getAccounts(currentBudget.id)
            const onBudgetAccounts = accounts.filter(a => a.is_on_budget)
            const totalBalance = onBudgetAccounts.reduce((sum, a) => sum + Number(a.balance), 0)
            const totalBudgeted = mergedBudgets.reduce((sum, b) => sum + Number(b.budgeted), 0)
            setReadyToAssign(totalBalance - totalBudgeted)
        } catch (error) {
            console.error('Failed to fetch budget data:', error)
        } finally {
            setLoading(false)
        }
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

    const prevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    const nextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
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

        try {
            // Upsert monthly budget
            await dataService.upsertMonthlyBudget({
                category_id: categoryId,
                month: monthStr,
                budgeted: newBudgeted,
                activity: getCategoryActivity(categoryId),
                available: newBudgeted + getCategoryActivity(categoryId)
            })

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
            const accounts = await dataService.getAccounts(currentBudget.id)
            const onBudgetAccounts = accounts.filter(a => a.is_on_budget)
            const totalBalance = onBudgetAccounts.reduce((sum, a) => sum + Number(a.balance), 0)

            // Get updated total budgeted
            const updatedBudgets = await dataService.getMonthlyBudgets(currentBudget.id, monthStr)
            const totalBudgeted = updatedBudgets.reduce((sum, b) => sum + Number(b.budgeted), 0)
            setReadyToAssign(totalBalance - totalBudgeted)
        } catch (error) {
            console.error('Failed to save budget:', error)
        } finally {
            setSaving(false)
            setEditingCategory(null)
            setEditValue('')
        }
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
                    <span className="px-4 py-2 font-medium text-slate-900 dark:text-white min-w-[200px] text-center">
                        {formatBudgetPeriod(currentMonth)}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                </div>

                {/* Add Category Group Button */}
                <button
                    onClick={() => setShowAddGroupModal(true)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Add Group
                </button>
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

            {/* Smart Insights */}
            <Insights />

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
                                className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="col-span-5 flex items-center gap-2" onClick={() => toggleGroup(group.id)}>
                                    {expandedGroups.has(group.id) ? (
                                        <ChevronUp className="w-4 h-4 text-slate-500" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-500" />
                                    )}
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{group.name}</span>
                                </div>
                                <div className="col-span-7 flex justify-end">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setAddingCategoryToGroup(group.id); }}
                                        className="text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                                    >
                                        + Add Category
                                    </button>
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
                                        <div
                                            className="col-span-2 text-right text-slate-600 dark:text-slate-300 cursor-pointer hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 -mx-2 -my-1 rounded transition-colors"
                                            onClick={() => setActivityCategory({ id: category.id, name: category.name })}
                                        >
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

            {/* Activity Modal */}
            {activityCategory && (
                <ActivityModal
                    categoryId={activityCategory.id}
                    categoryName={activityCategory.name}
                    month={currentMonth}
                    monthStartDay={monthStartDay}
                    onClose={() => setActivityCategory(null)}
                />
            )}

            {/* Add Category Group Modal */}
            {showAddGroupModal && currentBudget && (
                <AddCategoryGroupModal
                    budgetId={currentBudget.id}
                    dataService={dataService}
                    onClose={() => { setShowAddGroupModal(false); fetchBudgetData(); }}
                />
            )}

            {/* Add Category Modal */}
            {addingCategoryToGroup && (
                <AddCategoryModal
                    groupId={addingCategoryToGroup}
                    dataService={dataService}
                    onClose={() => { setAddingCategoryToGroup(null); fetchBudgetData(); }}
                />
            )}
        </div>
    )
}

// ============== Add Category Group Modal ==============
interface AddCategoryGroupModalProps {
    budgetId: string
    dataService: ReturnType<typeof useDataService>
    onClose: () => void
}

function AddCategoryGroupModal({ budgetId, dataService, onClose }: AddCategoryGroupModalProps) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError('')

        try {
            await dataService.createCategoryGroup({
                budget_id: budgetId,
                name: name.trim(),
                hidden: false,
                sort_order: 0
            })
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create category group')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add Category Group</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Group Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Fixed Expenses, Savings Goals"
                                className="input"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary flex-1">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Group'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

// ============== Add Category Modal ==============
interface AddCategoryModalProps {
    groupId: string
    dataService: ReturnType<typeof useDataService>
    onClose: () => void
}

function AddCategoryModal({ groupId, dataService, onClose }: AddCategoryModalProps) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError('')

        try {
            await dataService.createCategory({
                category_group_id: groupId,
                name: name.trim(),
                target_type: null,
                target_amount: null,
                target_date: null,
                sort_order: 0
            })
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create category')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add Category</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Category Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Rent, Groceries, Entertainment"
                                className="input"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary flex-1">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Category'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

