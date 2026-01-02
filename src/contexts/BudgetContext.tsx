/**
 * Budget Context
 * Manages the current budget selection and budget CRUD operations
 * Uses DataService from DataContext for storage abstraction
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'

interface Budget {
    id: string
    user_id: string
    name: string
    currency: string
    created_at: string
}

interface BudgetContextType {
    currentBudget: Budget | null
    allBudgets: Budget[]
    loading: boolean
    switchBudget: (budgetId: string) => void
    createBudget: (name: string) => Promise<{ data: Budget | null; error: Error | null }>
    refetch: () => Promise<void>
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

const SELECTED_BUDGET_KEY = 'selectedBudgetId'

export function BudgetProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const { dataService, isInitialized } = useData()
    const [currentBudget, setCurrentBudget] = useState<Budget | null>(null)
    const [allBudgets, setAllBudgets] = useState<Budget[]>([])
    const [loading, setLoading] = useState(true)

    const fetchBudgets = async () => {
        if (!user || !isInitialized) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const budgets = await dataService.getBudgets()
            setAllBudgets(budgets as Budget[])

            // Get selected budget from localStorage or use first
            const savedBudgetId = localStorage.getItem(SELECTED_BUDGET_KEY)
            const selected = budgets.find(b => b.id === savedBudgetId) || budgets[0] || null
            setCurrentBudget(selected as Budget | null)
        } catch (error) {
            console.error('Failed to fetch budgets:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Only fetch when user exists AND data service is initialized
        if (user && isInitialized) {
            fetchBudgets()
        }
    }, [user, isInitialized, dataService])

    const switchBudget = (budgetId: string) => {
        const budget = allBudgets.find(b => b.id === budgetId)
        if (budget) {
            setCurrentBudget(budget)
            localStorage.setItem(SELECTED_BUDGET_KEY, budgetId)
        }
    }

    const createBudget = async (name: string): Promise<{ data: Budget | null; error: Error | null }> => {
        if (!user) return { data: null, error: new Error('Not authenticated') }

        try {
            const budget = await dataService.createBudget({
                user_id: user.id,
                name,
                currency: currentBudget?.currency || 'USD'
            })

            setAllBudgets(prev => [...prev, budget as Budget])
            setCurrentBudget(budget as Budget)
            localStorage.setItem(SELECTED_BUDGET_KEY, budget.id)

            return { data: budget as Budget, error: null }
        } catch (error) {
            return { data: null, error: error as Error }
        }
    }

    return (
        <BudgetContext.Provider value={{
            currentBudget,
            allBudgets,
            loading,
            switchBudget,
            createBudget,
            refetch: fetchBudgets
        }}>
            {children}
        </BudgetContext.Provider>
    )
}

export function useBudget() {
    const context = useContext(BudgetContext)
    if (context === undefined) {
        throw new Error('useBudget must be used within a BudgetProvider')
    }
    return context
}
