import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Search, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBudget } from '@/contexts/BudgetContext'
import { useSettings } from '@/contexts/SettingsContext'

const currencySymbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
    CAD: '$', AUD: '$', CHF: 'CHF', CNY: '¥', SGD: '$', AED: 'د.إ',
}

interface Account {
    id: string
    name: string
    account_type: string
}

interface CategoryGroup {
    id: string
    name: string
    categories: { id: string; name: string }[]
}

interface Payee {
    id: string
    name: string
    isTransfer?: boolean
    transferAccountId?: string
}

interface AddTransactionModalProps {
    defaultAccountId?: string
    onClose: () => void
}

export default function AddTransactionModal({ defaultAccountId, onClose }: AddTransactionModalProps) {
    const { currentBudget } = useBudget()
    const { currency } = useSettings()
    const currencySymbol = currencySymbols[currency] || '$'

    const [accounts, setAccounts] = useState<Account[]>([])
    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([])
    const [payees, setPayees] = useState<Payee[]>([])
    const [allPayeeOptions, setAllPayeeOptions] = useState<Payee[]>([])

    const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense')
    const [accountId, setAccountId] = useState(defaultAccountId || '')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null)
    const [payeeSearch, setPayeeSearch] = useState('')
    const [showPayeeDropdown, setShowPayeeDropdown] = useState(false)
    const [categoryId, setCategoryId] = useState('')
    const [amount, setAmount] = useState('')
    const [memo, setMemo] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const payeeInputRef = useRef<HTMLInputElement>(null)
    const payeeDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!currentBudget) return

        // Fetch accounts
        supabase
            .from('accounts')
            .select('id, name, account_type')
            .eq('budget_id', currentBudget.id)
            .eq('closed', false)
            .then(({ data }) => {
                setAccounts(data || [])
                if (!defaultAccountId && data && data.length > 0) {
                    setAccountId(data[0].id)
                }
            })

        // Fetch categories
        supabase
            .from('category_groups')
            .select('id, name, categories(id, name)')
            .eq('budget_id', currentBudget.id)
            .then(({ data }) => setCategoryGroups(data || []))

        // Fetch payees
        supabase
            .from('payees')
            .select('id, name')
            .eq('budget_id', currentBudget.id)
            .order('name')
            .then(({ data }) => setPayees(data || []))
    }, [currentBudget, defaultAccountId])

    // Build combined payee options (accounts as transfers + regular payees)
    useEffect(() => {
        const transferPayees: Payee[] = accounts
            .filter(a => a.id !== accountId) // Exclude current account
            .map(a => ({
                id: `transfer-${a.id}`,
                name: `Transfer: ${a.name}`,
                isTransfer: true,
                transferAccountId: a.id
            }))

        const regularPayees: Payee[] = payees
            .filter(p => !p.name.startsWith('Transfer:')) // Filter out old transfer payees
            .map(p => ({ ...p, isTransfer: false }))

        setAllPayeeOptions([...transferPayees, ...regularPayees])
    }, [accounts, payees, accountId])

    // Filter payee options based on search
    const filteredPayees = payeeSearch
        ? allPayeeOptions.filter(p =>
            p.name.toLowerCase().includes(payeeSearch.toLowerCase())
        )
        : allPayeeOptions

    // Check if search term matches a new payee (not existing)
    const canCreatePayee = payeeSearch.trim() &&
        !allPayeeOptions.some(p => p.name.toLowerCase() === payeeSearch.toLowerCase())

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (payeeDropdownRef.current && !payeeDropdownRef.current.contains(e.target as Node) &&
                payeeInputRef.current && !payeeInputRef.current.contains(e.target as Node)) {
                setShowPayeeDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectPayee = (payee: Payee) => {
        setSelectedPayee(payee)
        setPayeeSearch(payee.name)
        setShowPayeeDropdown(false)
        // If it's a transfer, clear category
        if (payee.isTransfer) {
            setCategoryId('')
        }
    }

    const createAndSelectPayee = () => {
        const newPayee: Payee = {
            id: `new-${Date.now()}`,
            name: payeeSearch.trim(),
            isTransfer: false
        }
        setSelectedPayee(newPayee)
        setShowPayeeDropdown(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !accountId || !currentBudget) return

        setLoading(true)
        setError('')

        try {
            const amountValue = parseFloat(amount)
            const finalAmount = transactionType === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue)

            // Check if this is a transfer
            if (selectedPayee?.isTransfer && selectedPayee.transferAccountId) {
                const toAccountId = selectedPayee.transferAccountId
                const toAccount = accounts.find(a => a.id === toAccountId)

                // Get or create payee for "Transfer: AccountName"
                let transferPayeeId = null
                const existingPayee = payees.find(p => p.name === selectedPayee.name)
                if (existingPayee) {
                    transferPayeeId = existingPayee.id
                } else {
                    const { data: newPayee } = await supabase
                        .from('payees')
                        .insert({ budget_id: currentBudget.id, name: selectedPayee.name })
                        .select()
                        .single()
                    transferPayeeId = newPayee?.id
                }

                // Create outflow transaction from current account
                await supabase
                    .from('transactions')
                    .insert({
                        account_id: accountId,
                        payee_id: transferPayeeId,
                        transfer_account_id: toAccountId,
                        date,
                        amount: -Math.abs(amountValue),
                        memo: memo.trim() || null,
                        cleared: false,
                        approved: true
                    })

                // Create "Transfer: FromAccount" payee for destination
                const fromAccount = accounts.find(a => a.id === accountId)
                const reversePayeeName = `Transfer: ${fromAccount?.name}`
                let reversePayeeId = null
                const existingReversePayee = payees.find(p => p.name === reversePayeeName)
                if (existingReversePayee) {
                    reversePayeeId = existingReversePayee.id
                } else {
                    const { data: newPayee } = await supabase
                        .from('payees')
                        .insert({ budget_id: currentBudget.id, name: reversePayeeName })
                        .select()
                        .single()
                    reversePayeeId = newPayee?.id
                }

                // Create inflow transaction to destination account
                await supabase
                    .from('transactions')
                    .insert({
                        account_id: toAccountId,
                        payee_id: reversePayeeId,
                        transfer_account_id: accountId,
                        date,
                        amount: Math.abs(amountValue),
                        memo: memo.trim() || null,
                        cleared: false,
                        approved: true
                    })

                // Update both account balances
                const { data: fromAccData } = await supabase
                    .from('accounts')
                    .select('balance')
                    .eq('id', accountId)
                    .single()

                await supabase
                    .from('accounts')
                    .update({ balance: (fromAccData?.balance || 0) - Math.abs(amountValue) })
                    .eq('id', accountId)

                const { data: toAccData } = await supabase
                    .from('accounts')
                    .select('balance')
                    .eq('id', toAccountId)
                    .single()

                await supabase
                    .from('accounts')
                    .update({ balance: (toAccData?.balance || 0) + Math.abs(amountValue) })
                    .eq('id', toAccountId)
            } else {
                // Regular expense or income
                let payeeId = null
                if (selectedPayee) {
                    if (selectedPayee.id.startsWith('new-')) {
                        // Create new payee
                        const { data: newPayee } = await supabase
                            .from('payees')
                            .insert({ budget_id: currentBudget.id, name: selectedPayee.name })
                            .select()
                            .single()
                        payeeId = newPayee?.id
                    } else {
                        payeeId = selectedPayee.id
                    }
                }

                await supabase
                    .from('transactions')
                    .insert({
                        account_id: accountId,
                        category_id: categoryId || null,
                        payee_id: payeeId,
                        date,
                        amount: finalAmount,
                        memo: memo.trim() || null,
                        cleared: false,
                        approved: true
                    })

                // Update account balance
                const { data: accData } = await supabase
                    .from('accounts')
                    .select('balance')
                    .eq('id', accountId)
                    .single()

                await supabase
                    .from('accounts')
                    .update({ balance: (accData?.balance || 0) + finalAmount })
                    .eq('id', accountId)
            }

            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to add transaction')
        } finally {
            setLoading(false)
        }
    }

    // Is this a transfer transaction?
    const isTransfer = selectedPayee?.isTransfer

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Add Transaction
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Transaction Type Toggle */}
                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                        <button
                            type="button"
                            onClick={() => setTransactionType('expense')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${transactionType === 'expense'
                                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow'
                                : 'text-slate-600 dark:text-slate-300'
                                }`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionType('income')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${transactionType === 'income'
                                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow'
                                : 'text-slate-600 dark:text-slate-300'
                                }`}
                        >
                            Income
                        </button>
                    </div>

                    {/* Account Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Account
                        </label>
                        <select
                            value={accountId}
                            onChange={(e) => {
                                setAccountId(e.target.value)
                                // Reset payee if it was a transfer to avoid confusion
                                if (selectedPayee?.isTransfer) {
                                    setSelectedPayee(null)
                                    setPayeeSearch('')
                                }
                            }}
                            className="input"
                            required
                        >
                            <option value="">Select an account</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>{account.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Amount
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">{currencySymbol}</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    step="0.01"
                                    placeholder="0.00"
                                    className="input pl-7"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payee Selection with Inline Search and Account Transfers */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Payee
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                ref={payeeInputRef}
                                type="text"
                                value={payeeSearch}
                                onChange={(e) => {
                                    setPayeeSearch(e.target.value)
                                    setSelectedPayee(null)
                                    setShowPayeeDropdown(true)
                                }}
                                onFocus={() => setShowPayeeDropdown(true)}
                                placeholder="Search payee or type to add new..."
                                className="input pl-9"
                            />
                        </div>

                        {/* Payee Dropdown */}
                        {showPayeeDropdown && (
                            <div
                                ref={payeeDropdownRef}
                                className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                            >
                                {/* Transfer Options (Accounts) */}
                                {filteredPayees.filter(p => p.isTransfer).length > 0 && (
                                    <>
                                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                                            Transfer to Account
                                        </div>
                                        {filteredPayees.filter(p => p.isTransfer).map(payee => (
                                            <button
                                                key={payee.id}
                                                type="button"
                                                onClick={() => selectPayee(payee)}
                                                className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                                            >
                                                <span className="text-blue-500">↔</span>
                                                {payee.name}
                                            </button>
                                        ))}
                                    </>
                                )}

                                {/* Regular Payees */}
                                {filteredPayees.filter(p => !p.isTransfer).length > 0 && (
                                    <>
                                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                                            Payees
                                        </div>
                                        {filteredPayees.filter(p => !p.isTransfer).map(payee => (
                                            <button
                                                key={payee.id}
                                                type="button"
                                                onClick={() => selectPayee(payee)}
                                                className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                                {payee.name}
                                            </button>
                                        ))}
                                    </>
                                )}

                                {/* Create New Payee Option */}
                                {canCreatePayee && (
                                    <button
                                        type="button"
                                        onClick={createAndSelectPayee}
                                        className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add "{payeeSearch.trim()}" as new payee
                                    </button>
                                )}

                                {filteredPayees.length === 0 && !canCreatePayee && (
                                    <div className="px-3 py-4 text-sm text-slate-500 text-center">
                                        No payees found
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Transfer indicator */}
                        {isTransfer && (
                            <p className="text-xs text-blue-500 mt-1">
                                ↔ This is a transfer between accounts
                            </p>
                        )}
                    </div>

                    {/* Category - only for expenses, hidden for transfers */}
                    {transactionType === 'expense' && !isTransfer && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Category
                            </label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="input"
                            >
                                <option value="">Select a category</option>
                                {categoryGroups.map(group => (
                                    <optgroup key={group.id} label={group.name}>
                                        {group.categories?.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Memo (optional)
                        </label>
                        <input
                            type="text"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="Add a note"
                            className="input"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount || !accountId}
                            className="btn btn-primary flex-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Adding...
                                </>
                            ) : isTransfer ? 'Transfer' : 'Add Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
