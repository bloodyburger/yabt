import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Search, Plus, Trash2 } from 'lucide-react'
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

interface Transaction {
    id: string
    account_id: string
    category_id: string | null
    payee_id: string | null
    transfer_account_id: string | null
    date: string
    amount: number
    memo: string | null
    cleared: boolean
    payee?: { name: string } | null
    category?: { name: string } | null
}

interface EditTransactionModalProps {
    transaction: Transaction
    onClose: () => void
    onUpdate: () => void
}

export default function EditTransactionModal({ transaction, onClose, onUpdate }: EditTransactionModalProps) {
    const { currentBudget } = useBudget()
    const { currency } = useSettings()
    const currencySymbol = currencySymbols[currency] || '$'

    const [accounts, setAccounts] = useState<Account[]>([])
    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([])
    const [payees, setPayees] = useState<Payee[]>([])
    const [allPayeeOptions, setAllPayeeOptions] = useState<Payee[]>([])

    const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
        transaction.amount >= 0 ? 'income' : 'expense'
    )
    const [accountId, setAccountId] = useState(transaction.account_id)
    const [date, setDate] = useState(transaction.date)
    const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null)
    const [payeeSearch, setPayeeSearch] = useState('')
    const [showPayeeDropdown, setShowPayeeDropdown] = useState(false)
    const [categoryId, setCategoryId] = useState(transaction.category_id || '')
    const [amount, setAmount] = useState(Math.abs(transaction.amount).toString())
    const [memo, setMemo] = useState(transaction.memo || '')
    const [cleared, setCleared] = useState(transaction.cleared)
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const payeeInputRef = useRef<HTMLInputElement>(null)
    const payeeDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!currentBudget) return

        supabase
            .from('accounts')
            .select('id, name')
            .eq('budget_id', currentBudget.id)
            .eq('closed', false)
            .then(({ data }) => setAccounts(data || []))

        supabase
            .from('category_groups')
            .select('id, name, categories(id, name)')
            .eq('budget_id', currentBudget.id)
            .then(({ data }) => setCategoryGroups(data || []))

        supabase
            .from('payees')
            .select('id, name')
            .eq('budget_id', currentBudget.id)
            .order('name')
            .then(({ data }) => {
                setPayees(data || [])
                // Set initial payee
                if (transaction.payee_id) {
                    const existingPayee = data?.find(p => p.id === transaction.payee_id)
                    if (existingPayee) {
                        setSelectedPayee(existingPayee)
                        setPayeeSearch(existingPayee.name)
                    }
                }
            })
    }, [currentBudget, transaction])

    useEffect(() => {
        const transferPayees: Payee[] = accounts
            .filter(a => a.id !== accountId)
            .map(a => ({
                id: `transfer-${a.id}`,
                name: `Transfer: ${a.name}`,
                isTransfer: true,
                transferAccountId: a.id
            }))

        const regularPayees: Payee[] = payees
            .filter(p => !p.name.startsWith('Transfer:'))
            .map(p => ({ ...p, isTransfer: false }))

        setAllPayeeOptions([...transferPayees, ...regularPayees])
    }, [accounts, payees, accountId])

    const filteredPayees = payeeSearch
        ? allPayeeOptions.filter(p => p.name.toLowerCase().includes(payeeSearch.toLowerCase()))
        : allPayeeOptions

    const canCreatePayee = payeeSearch.trim() &&
        !allPayeeOptions.some(p => p.name.toLowerCase() === payeeSearch.toLowerCase())

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
        if (payee.isTransfer) setCategoryId('')
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

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const oldAmount = transaction.amount

            // Delete transaction
            await supabase.from('transactions').delete().eq('id', transaction.id)

            // Update account balance (reverse the original amount)
            const { data: accData } = await supabase
                .from('accounts')
                .select('balance')
                .eq('id', transaction.account_id)
                .single()

            await supabase
                .from('accounts')
                .update({ balance: (accData?.balance || 0) - oldAmount })
                .eq('id', transaction.account_id)

            // Log activity
            await supabase.from('activity_log').insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                action: 'transaction_deleted',
                entity_type: 'transaction',
                entity_id: transaction.id,
                details: { deleted_transaction: transaction }
            })

            onUpdate()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to delete')
            setDeleting(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !accountId || !currentBudget) return

        setLoading(true)
        setError('')

        try {
            const amountValue = parseFloat(amount)
            const finalAmount = transactionType === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue)
            const oldAmount = transaction.amount

            // Get or create payee
            let payeeId = null
            if (selectedPayee) {
                if (selectedPayee.id.startsWith('new-')) {
                    const { data: newPayee } = await supabase
                        .from('payees')
                        .insert({ budget_id: currentBudget.id, name: selectedPayee.name })
                        .select()
                        .single()
                    payeeId = newPayee?.id
                } else if (!selectedPayee.isTransfer) {
                    payeeId = selectedPayee.id
                } else {
                    // Find or create transfer payee
                    const existing = payees.find(p => p.name === selectedPayee.name)
                    if (existing) {
                        payeeId = existing.id
                    } else {
                        const { data: newPayee } = await supabase
                            .from('payees')
                            .insert({ budget_id: currentBudget.id, name: selectedPayee.name })
                            .select()
                            .single()
                        payeeId = newPayee?.id
                    }
                }
            }

            // Update transaction
            await supabase
                .from('transactions')
                .update({
                    account_id: accountId,
                    category_id: selectedPayee?.isTransfer ? null : (categoryId || null),
                    payee_id: payeeId,
                    transfer_account_id: selectedPayee?.transferAccountId || null,
                    date,
                    amount: finalAmount,
                    memo: memo.trim() || null,
                    cleared
                })
                .eq('id', transaction.id)

            // Update account balance (difference)
            const balanceChange = finalAmount - oldAmount
            if (balanceChange !== 0) {
                const { data: accData } = await supabase
                    .from('accounts')
                    .select('balance')
                    .eq('id', accountId)
                    .single()

                await supabase
                    .from('accounts')
                    .update({ balance: (accData?.balance || 0) + balanceChange })
                    .eq('id', accountId)
            }

            // Log activity
            await supabase.from('activity_log').insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                action: 'transaction_updated',
                entity_type: 'transaction',
                entity_id: transaction.id,
                details: {
                    before: transaction,
                    after: { accountId, categoryId, payeeId, date, amount: finalAmount, memo, cleared }
                }
            })

            onUpdate()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to update')
        } finally {
            setLoading(false)
        }
    }

    const isTransfer = selectedPayee?.isTransfer

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Edit Transaction
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Type Toggle */}
                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                        <button
                            type="button"
                            onClick={() => setTransactionType('expense')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${transactionType === 'expense' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionType('income')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${transactionType === 'income' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                            Income
                        </button>
                    </div>

                    {/* Account */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Account</label>
                        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input" required>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>

                    {/* Date & Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Amount</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">{currencySymbol}</span>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" className="input pl-7" required />
                            </div>
                        </div>
                    </div>

                    {/* Payee */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Payee</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                ref={payeeInputRef}
                                type="text"
                                value={payeeSearch}
                                onChange={(e) => { setPayeeSearch(e.target.value); setSelectedPayee(null); setShowPayeeDropdown(true) }}
                                onFocus={() => setShowPayeeDropdown(true)}
                                placeholder="Search or add payee..."
                                className="input pl-9"
                            />
                        </div>

                        {showPayeeDropdown && (
                            <div ref={payeeDropdownRef} className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredPayees.filter(p => p.isTransfer).length > 0 && (
                                    <>
                                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900">Transfer</div>
                                        {filteredPayees.filter(p => p.isTransfer).map(p => (
                                            <button key={p.id} type="button" onClick={() => selectPayee(p)} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                ↔ {p.name}
                                            </button>
                                        ))}
                                    </>
                                )}
                                {filteredPayees.filter(p => !p.isTransfer).length > 0 && (
                                    <>
                                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900">Payees</div>
                                        {filteredPayees.filter(p => !p.isTransfer).map(p => (
                                            <button key={p.id} type="button" onClick={() => selectPayee(p)} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20">{p.name}</button>
                                        ))}
                                    </>
                                )}
                                {canCreatePayee && (
                                    <button type="button" onClick={createAndSelectPayee} className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t">
                                        <Plus className="w-4 h-4" /> Add "{payeeSearch.trim()}"
                                    </button>
                                )}
                            </div>
                        )}
                        {isTransfer && <p className="text-xs text-blue-500 mt-1">↔ Transfer between accounts</p>}
                    </div>

                    {/* Category */}
                    {transactionType === 'expense' && !isTransfer && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
                                <option value="">Select category</option>
                                {categoryGroups.map(g => (
                                    <optgroup key={g.id} label={g.name}>
                                        {g.categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Memo */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Memo</label>
                        <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Add a note" className="input" />
                    </div>

                    {/* Cleared */}
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="cleared" checked={cleared} onChange={(e) => setCleared(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                        <label htmlFor="cleared" className="text-sm text-slate-700 dark:text-slate-300">Cleared</label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="btn bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={loading || !amount} className="btn btn-primary flex-1">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl m-4 max-w-sm">
                            <h3 className="text-lg font-semibold mb-2">Delete Transaction?</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary flex-1">Cancel</button>
                                <button onClick={handleDelete} disabled={deleting} className="btn bg-red-500 hover:bg-red-600 text-white flex-1">
                                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
