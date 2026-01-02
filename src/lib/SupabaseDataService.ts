/**
 * Supabase Data Service
 * Implements DataService interface using Supabase as the backend
 */

import { supabase } from './supabase'
import type {
    DataService,
    Budget,
    Account,
    CategoryGroup,
    Category,
    Payee,
    Transaction,
    MonthlyBudget,
    Tag,
    PayeeCategoryRule
} from './dataService'

export class SupabaseDataService implements DataService {
    private userId: string | null = null

    async initialize(): Promise<void> {
        const { data } = await supabase.auth.getUser()
        this.userId = data.user?.id || null
    }

    // ============== Budgets ==============

    async getBudgets(): Promise<Budget[]> {
        const { data, error } = await supabase
            .from('budgets')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) throw error
        return data || []
    }

    async getBudget(id: string): Promise<Budget | null> {
        const { data, error } = await supabase
            .from('budgets')
            .select('*')
            .eq('id', id)
            .single()
        if (error) return null
        return data
    }

    async createBudget(data: Omit<Budget, 'id' | 'created_at'>): Promise<Budget> {
        const { data: budget, error } = await supabase
            .from('budgets')
            .insert(data)
            .select()
            .single()
        if (error) throw error
        return budget
    }

    async updateBudget(id: string, data: Partial<Budget>): Promise<void> {
        const { error } = await supabase
            .from('budgets')
            .update(data)
            .eq('id', id)
        if (error) throw error
    }

    async deleteBudget(id: string): Promise<void> {
        const { error } = await supabase.from('budgets').delete().eq('id', id)
        if (error) throw error
    }

    // ============== Accounts ==============

    async getAccounts(budgetId: string): Promise<Account[]> {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('budget_id', budgetId)
            .order('sort_order')
        if (error) throw error
        return data || []
    }

    async getAccount(id: string): Promise<Account | null> {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .single()
        if (error) return null
        return data
    }

    async createAccount(data: Omit<Account, 'id'>): Promise<Account> {
        const { data: account, error } = await supabase
            .from('accounts')
            .insert(data)
            .select()
            .single()
        if (error) throw error
        return account
    }

    async updateAccount(id: string, data: Partial<Account>): Promise<void> {
        const { error } = await supabase
            .from('accounts')
            .update(data)
            .eq('id', id)
        if (error) throw error
    }

    async deleteAccount(id: string): Promise<void> {
        const { error } = await supabase.from('accounts').delete().eq('id', id)
        if (error) throw error
    }

    // ============== Category Groups ==============

    async getCategoryGroups(budgetId: string): Promise<CategoryGroup[]> {
        const { data, error } = await supabase
            .from('category_groups')
            .select('*')
            .eq('budget_id', budgetId)
            .order('sort_order')
        if (error) throw error
        return data || []
    }

    async createCategoryGroup(data: Omit<CategoryGroup, 'id'>): Promise<CategoryGroup> {
        const { data: group, error } = await supabase
            .from('category_groups')
            .insert(data)
            .select()
            .single()
        if (error) throw error
        return group
    }

    async updateCategoryGroup(id: string, data: Partial<CategoryGroup>): Promise<void> {
        const { error } = await supabase
            .from('category_groups')
            .update(data)
            .eq('id', id)
        if (error) throw error
    }

    async deleteCategoryGroup(id: string): Promise<void> {
        const { error } = await supabase.from('category_groups').delete().eq('id', id)
        if (error) throw error
    }

    // ============== Categories ==============

    async getCategories(budgetId: string): Promise<Category[]> {
        const { data: groups } = await supabase
            .from('category_groups')
            .select('id')
            .eq('budget_id', budgetId)

        if (!groups?.length) return []

        const groupIds = groups.map(g => g.id)
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .in('category_group_id', groupIds)
            .order('sort_order')
        if (error) throw error
        return data || []
    }

    async getCategoriesByGroup(groupId: string): Promise<Category[]> {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('category_group_id', groupId)
            .order('sort_order')
        if (error) throw error
        return data || []
    }

    async createCategory(data: Omit<Category, 'id'>): Promise<Category> {
        const { data: category, error } = await supabase
            .from('categories')
            .insert(data)
            .select()
            .single()
        if (error) throw error
        return category
    }

    async updateCategory(id: string, data: Partial<Category>): Promise<void> {
        const { error } = await supabase
            .from('categories')
            .update(data)
            .eq('id', id)
        if (error) throw error
    }

    async deleteCategory(id: string): Promise<void> {
        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (error) throw error
    }

    // ============== Payees ==============

    async getPayees(budgetId: string): Promise<Payee[]> {
        const { data, error } = await supabase
            .from('payees')
            .select('*')
            .eq('budget_id', budgetId)
            .order('name')
        if (error) throw error
        return data || []
    }

    async getPayee(id: string): Promise<Payee | null> {
        const { data, error } = await supabase
            .from('payees')
            .select('*')
            .eq('id', id)
            .single()
        if (error) return null
        return data
    }

    async getPayeeByName(budgetId: string, name: string): Promise<Payee | null> {
        const { data, error } = await supabase
            .from('payees')
            .select('*')
            .eq('budget_id', budgetId)
            .ilike('name', name)
            .single()
        if (error) return null
        return data
    }

    async createPayee(data: Omit<Payee, 'id'>): Promise<Payee> {
        const { data: payee, error } = await supabase
            .from('payees')
            .insert(data)
            .select()
            .single()
        if (error) throw error
        return payee
    }

    async updatePayee(id: string, data: Partial<Payee>): Promise<void> {
        const { error } = await supabase
            .from('payees')
            .update(data)
            .eq('id', id)
        if (error) throw error
    }

    async deletePayee(id: string): Promise<void> {
        const { error } = await supabase.from('payees').delete().eq('id', id)
        if (error) throw error
    }

    // ============== Transactions ==============

    async getTransactions(accountId: string): Promise<Transaction[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('account_id', accountId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
        if (error) throw error
        return data || []
    }

    async getTransactionsByBudget(budgetId: string): Promise<Transaction[]> {
        const accounts = await this.getAccounts(budgetId)
        if (!accounts.length) return []

        const accountIds = accounts.map(a => a.id)
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .in('account_id', accountIds)
            .order('date', { ascending: false })
        if (error) throw error
        return data || []
    }

    async getTransactionsByCategory(categoryId: string, startDate: string, endDate: string): Promise<Transaction[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('category_id', categoryId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false })
        if (error) throw error
        return data || []
    }

    async getTransaction(id: string): Promise<Transaction | null> {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .single()
        if (error) return null
        return data
    }

    async createTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
        const { data: tx, error } = await supabase
            .from('transactions')
            .insert(data)
            .select()
            .single()
        if (error) throw error
        return tx
    }

    async updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
        const { error } = await supabase
            .from('transactions')
            .update(data)
            .eq('id', id)
        if (error) throw error
    }

    async deleteTransaction(id: string): Promise<void> {
        const { error } = await supabase.from('transactions').delete().eq('id', id)
        if (error) throw error
    }

    // ============== Monthly Budgets ==============

    async getMonthlyBudgets(budgetId: string, month: string): Promise<MonthlyBudget[]> {
        const categories = await this.getCategories(budgetId)
        if (!categories.length) return []

        const categoryIds = categories.map(c => c.id)
        const { data, error } = await supabase
            .from('monthly_budgets')
            .select('*')
            .in('category_id', categoryIds)
            .eq('month', month)
        if (error) throw error
        return data || []
    }

    async upsertMonthlyBudget(data: Omit<MonthlyBudget, 'id'>): Promise<MonthlyBudget> {
        const { data: mb, error } = await supabase
            .from('monthly_budgets')
            .upsert(data, { onConflict: 'category_id,month' })
            .select()
            .single()
        if (error) throw error
        return mb
    }

    // ============== Tags ==============

    async getTags(budgetId: string): Promise<Tag[]> {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('budget_id', budgetId)
            .order('name')
        if (error) throw error
        return data || []
    }

    async createTag(data: Omit<Tag, 'id'>): Promise<Tag> {
        const { data: tag, error } = await supabase
            .from('tags')
            .insert(data)
            .select()
            .single()
        if (error) throw error
        return tag
    }

    async updateTag(id: string, data: Partial<Tag>): Promise<void> {
        const { error } = await supabase
            .from('tags')
            .update(data)
            .eq('id', id)
        if (error) throw error
    }

    async deleteTag(id: string): Promise<void> {
        const { error } = await supabase.from('tags').delete().eq('id', id)
        if (error) throw error
    }

    // ============== Transaction Tags ==============

    async getTransactionTags(transactionId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('transaction_tags')
            .select('tag_id')
            .eq('transaction_id', transactionId)
        if (error) throw error
        return (data || []).map(t => t.tag_id)
    }

    async addTransactionTag(transactionId: string, tagId: string): Promise<void> {
        const { error } = await supabase
            .from('transaction_tags')
            .insert({ transaction_id: transactionId, tag_id: tagId })
        if (error) throw error
    }

    async removeTransactionTag(transactionId: string, tagId: string): Promise<void> {
        const { error } = await supabase
            .from('transaction_tags')
            .delete()
            .eq('transaction_id', transactionId)
            .eq('tag_id', tagId)
        if (error) throw error
    }

    // ============== Payee Category Rules ==============

    async getPayeeCategoryRules(budgetId: string): Promise<PayeeCategoryRule[]> {
        const { data, error } = await supabase
            .from('payee_category_rules')
            .select('*')
            .eq('budget_id', budgetId)
        if (error) throw error
        return data || []
    }

    async upsertPayeeCategoryRule(budgetId: string, payeeName: string, categoryId: string): Promise<void> {
        const { error } = await supabase
            .from('payee_category_rules')
            .upsert(
                { budget_id: budgetId, payee_name: payeeName, category_id: categoryId },
                { onConflict: 'budget_id,payee_name' }
            )
        if (error) throw error
    }
}
