/**
 * Account Detail Page
 * Shows transactions for a specific account
 * Uses DataService for storage abstraction
 */

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, Search, ArrowUpRight, ArrowDownLeft, Loader2, Tag, X } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { formatMoney } from '@/lib/formatMoney'
import { useTransactionModal } from '@/contexts/TransactionModalContext'
import EditTransactionModal from '@/components/common/EditTransactionModal'
import { TransactionTags } from '@/components/common/TagManager'
import { useBudget } from '@/contexts/BudgetContext'
import { useData } from '@/contexts/DataContext'

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
    payeeName?: string
    categoryName?: string
}

interface Account {
    id: string
    name: string
    balance: number
}

interface TagItem {
    id: string
    name: string
    color: string
}

export default function AccountDetail() {
    const { id } = useParams<{ id: string }>()
    const { currency, dateFormat } = useSettings()
    const { openTransactionModal } = useTransactionModal()
    const { currentBudget } = useBudget()
    const { dataService, isInitialized } = useData()

    const [account, setAccount] = useState<Account | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [transactionTagsMap, setTransactionTagsMap] = useState<Record<string, string[]>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
    const [tagsRefreshKey, setTagsRefreshKey] = useState(0)
    const [availableTags, setAvailableTags] = useState<TagItem[]>([])
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)

    // Fetch data when account ID changes and service is initialized
    useEffect(() => {
        if (!id || !isInitialized) return
        fetchData()
    }, [id, isInitialized, dataService])

    // Fetch available tags when budget changes and service is initialized
    useEffect(() => {
        if (currentBudget && isInitialized) {
            fetchTags()
        }
    }, [currentBudget, isInitialized, dataService])

    const fetchTags = async () => {
        if (!currentBudget) return
        try {
            const tags = await dataService.getTags(currentBudget.id)
            setAvailableTags(tags as TagItem[])
        } catch (error) {
            console.error('Failed to fetch tags:', error)
        }
    }

    const fetchData = async () => {
        if (!id) return

        try {
            // Fetch account details
            const accountData = await dataService.getAccount(id)
            setAccount(accountData as Account | null)

            // Fetch transactions
            const txData = await dataService.getTransactions(id)

            // Fetch payee and category names for display
            if (currentBudget) {
                const payees = await dataService.getPayees(currentBudget.id)
                const categories = await dataService.getCategories(currentBudget.id)

                const payeeMap = new Map(payees.map(p => [p.id, p.name]))
                const categoryMap = new Map(categories.map(c => [c.id, c.name]))

                const enrichedTx = txData.map(tx => ({
                    ...tx,
                    payeeName: tx.payee_id ? payeeMap.get(tx.payee_id) : undefined,
                    categoryName: tx.category_id ? categoryMap.get(tx.category_id) : undefined
                }))
                setTransactions(enrichedTx as Transaction[])
            } else {
                setTransactions(txData as Transaction[])
            }

            // Fetch tags for all transactions
            if (txData.length > 0) {
                const tagsMap: Record<string, string[]> = {}
                for (const tx of txData) {
                    const tagIds = await dataService.getTransactionTags(tx.id)
                    if (tagIds.length > 0) {
                        tagsMap[tx.id] = tagIds
                    }
                }
                setTransactionTagsMap(tagsMap)
            }
        } catch (error) {
            console.error('Failed to fetch account data:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleCleared = async (e: React.MouseEvent, transactionId: string, currentCleared: boolean) => {
        e.stopPropagation()
        try {
            await dataService.updateTransaction(transactionId, { cleared: !currentCleared })
            setTransactions(prev =>
                prev.map(t => t.id === transactionId ? { ...t, cleared: !currentCleared } : t)
            )
        } catch (error) {
            console.error('Failed to toggle cleared:', error)
        }
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        switch (dateFormat) {
            case 'MM/DD/YYYY':
                return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
            case 'DD/MM/YYYY':
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
            default:
                return dateStr
        }
    }

    const filteredTransactions = transactions.filter(t => {
        // Text search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            const matchesSearch = (
                t.payeeName?.toLowerCase().includes(q) ||
                t.categoryName?.toLowerCase().includes(q) ||
                t.memo?.toLowerCase().includes(q)
            )
            if (!matchesSearch) return false
        }

        // Tag filter
        if (selectedTagFilter) {
            const txTags = transactionTagsMap[t.id] || []
            if (!txTags.includes(selectedTagFilter)) return false
        }

        return true
    })

    const handleTransactionClick = (transaction: Transaction) => {
        setEditingTransaction(transaction)
    }

    const handleTransactionUpdate = () => {
        fetchData() // Refresh data
        setTagsRefreshKey(prev => prev + 1) // Force tags to refresh
    }

    if (loading) {
        return (
            <div className="p-4 lg:p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link to="/app/accounts" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{account?.name}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{transactions.length} transactions</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Balance</p>
                    <p className={`text-2xl font-bold ${(account?.balance || 0) >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
                        {formatMoney(account?.balance || 0, currency)}
                    </p>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transactions..."
                        className="input pl-10"
                    />
                </div>

                {/* Tag Filter */}
                <div className="relative">
                    <select
                        value={selectedTagFilter || ''}
                        onChange={(e) => setSelectedTagFilter(e.target.value || null)}
                        className="input pl-9 pr-8 appearance-none min-w-[150px]"
                    >
                        <option value="">All Tags</option>
                        {availableTags.map(tag => (
                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                        ))}
                    </select>
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    {selectedTagFilter && (
                        <button
                            type="button"
                            onClick={() => setSelectedTagFilter(null)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                        >
                            <X className="w-3 h-3 text-slate-400" />
                        </button>
                    )}
                </div>

                <button onClick={() => openTransactionModal(id)} className="btn btn-primary">
                    Add Transaction
                </button>
            </div>

            {/* Transactions List */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="col-span-1"></div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-3">Payee</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2">Tags</div>
                    <div className="col-span-2 text-right">Amount</div>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-slate-500 dark:text-slate-400">No transactions yet</p>
                    </div>
                ) : (
                    filteredTransactions.map(transaction => (
                        <div
                            key={transaction.id}
                            onClick={() => handleTransactionClick(transaction)}
                            className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors items-center cursor-pointer"
                        >
                            <div className="col-span-1">
                                <button
                                    onClick={(e) => toggleCleared(e, transaction.id, transaction.cleared)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${transaction.cleared
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-emerald-300'
                                        }`}
                                >
                                    {transaction.cleared && <Check className="w-4 h-4 text-white" />}
                                </button>
                            </div>
                            <div className="col-span-2 text-sm text-slate-600 dark:text-slate-300">
                                {formatDate(transaction.date)}
                            </div>
                            <div className="col-span-3">
                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                    {transaction.payeeName || 'No payee'}
                                </p>
                                {transaction.memo && (
                                    <p className="text-xs text-slate-500 truncate">{transaction.memo}</p>
                                )}
                            </div>
                            <div className="col-span-2 text-sm text-slate-600 dark:text-slate-300">
                                {transaction.categoryName || (transaction.amount > 0 ? 'Income' : 'Uncategorized')}
                            </div>
                            <div className="col-span-2">
                                <TransactionTags key={`tags-${transaction.id}-${tagsRefreshKey}`} transactionId={transaction.id} />
                            </div>
                            <div className="col-span-2 text-right">
                                <span className={`font-medium ${transaction.amount >= 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                    {transaction.amount >= 0 ? (
                                        <span className="inline-flex items-center gap-1">
                                            <ArrowDownLeft className="w-4 h-4" />
                                            {formatMoney(transaction.amount, currency)}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1">
                                            <ArrowUpRight className="w-4 h-4 text-slate-400" />
                                            {formatMoney(Math.abs(transaction.amount), currency)}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Transaction Modal */}
            {editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    onClose={() => setEditingTransaction(null)}
                    onUpdate={handleTransactionUpdate}
                />
            )}
        </div>
    )
}
