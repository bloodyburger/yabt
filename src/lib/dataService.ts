/**
 * DataService Interface
 * Abstracts all database operations to support multiple storage backends
 */

// ============== Types ==============

export interface Budget {
    id: string
    name: string
    currency: string
    created_at: string
    user_id: string
}

export interface Account {
    id: string
    budget_id: string
    name: string
    account_type: string
    balance: number
    closed: boolean
    is_on_budget: boolean
    sort_order: number
}

export interface CategoryGroup {
    id: string
    budget_id: string
    name: string
    hidden: boolean
    sort_order: number
}

export interface Category {
    id: string
    category_group_id: string
    name: string
    target_type: string | null
    target_amount: number | null
    target_date: string | null
    sort_order: number
}

export interface Payee {
    id: string
    budget_id: string
    name: string
}

export interface Transaction {
    id: string
    account_id: string
    category_id: string | null
    payee_id: string | null
    transfer_account_id: string | null
    date: string
    amount: number
    memo: string | null
    cleared: boolean
    approved: boolean
    created_at: string
}

export interface MonthlyBudget {
    id: string
    category_id: string
    month: string
    budgeted: number
    activity: number
    available: number
}

export interface Tag {
    id: string
    budget_id: string
    name: string
    color: string
}

export interface TransactionTag {
    id: string
    transaction_id: string
    tag_id: string
}

export interface PayeeCategoryRule {
    id: string
    budget_id: string
    payee_name: string
    category_id: string
}

// ============== DataService Interface ==============

export interface DataService {
    // Initialization
    initialize(): Promise<void>

    // Budgets
    getBudgets(): Promise<Budget[]>
    getBudget(id: string): Promise<Budget | null>
    createBudget(data: Omit<Budget, 'id' | 'created_at'>): Promise<Budget>
    updateBudget(id: string, data: Partial<Budget>): Promise<void>
    deleteBudget(id: string): Promise<void>

    // Accounts
    getAccounts(budgetId: string): Promise<Account[]>
    getAccount(id: string): Promise<Account | null>
    createAccount(data: Omit<Account, 'id'>): Promise<Account>
    updateAccount(id: string, data: Partial<Account>): Promise<void>
    deleteAccount(id: string): Promise<void>

    // Category Groups
    getCategoryGroups(budgetId: string): Promise<CategoryGroup[]>
    createCategoryGroup(data: Omit<CategoryGroup, 'id'>): Promise<CategoryGroup>
    updateCategoryGroup(id: string, data: Partial<CategoryGroup>): Promise<void>
    deleteCategoryGroup(id: string): Promise<void>

    // Categories
    getCategories(budgetId: string): Promise<Category[]>
    getCategoriesByGroup(groupId: string): Promise<Category[]>
    createCategory(data: Omit<Category, 'id'>): Promise<Category>
    updateCategory(id: string, data: Partial<Category>): Promise<void>
    deleteCategory(id: string): Promise<void>

    // Payees
    getPayees(budgetId: string): Promise<Payee[]>
    getPayee(id: string): Promise<Payee | null>
    getPayeeByName(budgetId: string, name: string): Promise<Payee | null>
    createPayee(data: Omit<Payee, 'id'>): Promise<Payee>
    updatePayee(id: string, data: Partial<Payee>): Promise<void>
    deletePayee(id: string): Promise<void>

    // Transactions
    getTransactions(accountId: string): Promise<Transaction[]>
    getTransactionsByBudget(budgetId: string): Promise<Transaction[]>
    getTransactionsByCategory(categoryId: string, startDate: string, endDate: string): Promise<Transaction[]>
    getTransaction(id: string): Promise<Transaction | null>
    createTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction>
    updateTransaction(id: string, data: Partial<Transaction>): Promise<void>
    deleteTransaction(id: string): Promise<void>

    // Monthly Budgets
    getMonthlyBudgets(budgetId: string, month: string): Promise<MonthlyBudget[]>
    upsertMonthlyBudget(data: Omit<MonthlyBudget, 'id'>): Promise<MonthlyBudget>

    // Tags
    getTags(budgetId: string): Promise<Tag[]>
    createTag(data: Omit<Tag, 'id'>): Promise<Tag>
    updateTag(id: string, data: Partial<Tag>): Promise<void>
    deleteTag(id: string): Promise<void>

    // Transaction Tags
    getTransactionTags(transactionId: string): Promise<string[]>
    addTransactionTag(transactionId: string, tagId: string): Promise<void>
    removeTransactionTag(transactionId: string, tagId: string): Promise<void>

    // Payee Category Rules
    getPayeeCategoryRules(budgetId: string): Promise<PayeeCategoryRule[]>
    upsertPayeeCategoryRule(budgetId: string, payeeName: string, categoryId: string): Promise<void>

    // Sync (for Drive provider)
    sync?(): Promise<void>
    getLastSyncTime?(): Date | null
}

// ============== Storage Provider Type ==============

export type StorageProviderType = 'supabase' | 'local-drive'
