import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface Budget {
    id: string
    user_id: string
    name: string
    currency_code: string
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
    const [currentBudget, setCurrentBudget] = useState<Budget | null>(null)
    const [allBudgets, setAllBudgets] = useState<Budget[]>([])
    const [loading, setLoading] = useState(true)

    const fetchBudgets = async () => {
        if (!user) {
            setLoading(false)
            return
        }

        const { data } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

        const budgets = data || []
        setAllBudgets(budgets)

        // Get selected budget from localStorage or use first
        const savedBudgetId = localStorage.getItem(SELECTED_BUDGET_KEY)
        const selected = budgets.find(b => b.id === savedBudgetId) || budgets[0] || null
        setCurrentBudget(selected)
        setLoading(false)
    }

    useEffect(() => {
        fetchBudgets()
    }, [user])

    const switchBudget = (budgetId: string) => {
        const budget = allBudgets.find(b => b.id === budgetId)
        if (budget) {
            setCurrentBudget(budget)
            localStorage.setItem(SELECTED_BUDGET_KEY, budgetId)
        }
    }

    const createBudget = async (name: string) => {
        if (!user) return { data: null, error: new Error('Not authenticated') }

        const { data, error } = await supabase
            .from('budgets')
            .insert({
                user_id: user.id,
                name,
                currency_code: currentBudget?.currency_code || 'USD'
            })
            .select()
            .single()

        if (data) {
            setAllBudgets(prev => [...prev, data])
            setCurrentBudget(data)
            localStorage.setItem(SELECTED_BUDGET_KEY, data.id)
        }

        return { data, error }
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
