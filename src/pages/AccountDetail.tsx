import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, Search, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/contexts/SettingsContext'
import { formatMoney } from '@/lib/formatMoney'
import { useTransactionModal } from '@/contexts/TransactionModalContext'
import EditTransactionModal from '@/components/common/EditTransactionModal'

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
    payee: { name: string } | null
    category: { name: string } | null
}

interface Account {
    id: string
    name: string
    balance: number
}

export default function AccountDetail() {
    const { id } = useParams<{ id: string }>()
    const { currency, dateFormat } = useSettings()
    const { openTransactionModal } = useTransactionModal()

    const [account, setAccount] = useState<Account | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

    useEffect(() => {
        if (!id) return
        fetchData()
    }, [id])

    const fetchData = async () => {
        if (!id) return

        const { data: accountData } = await supabase
            .from('accounts')
            .select('id, name, balance')
            .eq('id', id)
            .single()

        setAccount(accountData)

        const { data: txData } = await supabase
            .from('transactions')
            .select('id, account_id, category_id, payee_id, transfer_account_id, date, amount, memo, cleared, payee:payees(name), category:categories(name)')
            .eq('account_id', id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

        setTransactions(txData || [])
        setLoading(false)
    }

    const toggleCleared = async (e: React.MouseEvent, transactionId: string, currentCleared: boolean) => {
        e.stopPropagation() // Prevent row click
        await supabase
            .from('transactions')
            .update({ cleared: !currentCleared })
            .eq('id', transactionId)

        setTransactions(prev =>
            prev.map(t => t.id === transactionId ? { ...t, cleared: !currentCleared } : t)
        )
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
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            t.payee?.name?.toLowerCase().includes(q) ||
            t.category?.name?.toLowerCase().includes(q) ||
            t.memo?.toLowerCase().includes(q)
        )
    })

    const handleTransactionClick = (transaction: Transaction) => {
        setEditingTransaction(transaction)
    }

    const handleTransactionUpdate = () => {
        fetchData() // Refresh data
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
                <Link to="/accounts" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
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
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transactions..."
                        className="input pl-10"
                    />
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
                    <div className="col-span-3">Category</div>
                    <div className="col-span-3 text-right">Amount</div>
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
                                    {transaction.payee?.name || 'No payee'}
                                </p>
                                {transaction.memo && (
                                    <p className="text-xs text-slate-500 truncate">{transaction.memo}</p>
                                )}
                            </div>
                            <div className="col-span-3 text-sm text-slate-600 dark:text-slate-300">
                                {transaction.category?.name || (transaction.amount > 0 ? 'Income' : 'Uncategorized')}
                            </div>
                            <div className="col-span-3 text-right">
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
