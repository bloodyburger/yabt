/**
 * Activity Modal
 * Shows transactions for a specific category in a month
 * Uses DataService for storage abstraction
 */

import { useState, useEffect } from 'react'
import { X, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useDataService } from '@/contexts/DataContext'
import { formatMoney } from '@/lib/formatMoney'

interface Transaction {
    id: string
    date: string
    amount: number
    memo: string | null
    payeeName?: string
}

interface ActivityModalProps {
    categoryId: string
    categoryName: string
    month: Date
    monthStartDay: number
    onClose: () => void
}

export default function ActivityModal({ categoryId, categoryName, month, monthStartDay, onClose }: ActivityModalProps) {
    const { currency, dateFormat } = useSettings()
    const dataService = useDataService()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [totalActivity, setTotalActivity] = useState(0)

    useEffect(() => {
        fetchTransactions()
    }, [categoryId, month, dataService])

    const getBudgetMonthRange = (baseDate: Date) => {
        const year = baseDate.getFullYear()
        const m = baseDate.getMonth()

        let startDate: Date
        let endDate: Date

        if (monthStartDay === 1) {
            startDate = new Date(year, m, 1)
            endDate = new Date(year, m + 1, 0)
        } else {
            startDate = new Date(year, m, monthStartDay)
            endDate = new Date(year, m + 1, monthStartDay - 1)
        }

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        }
    }

    const fetchTransactions = async () => {
        setLoading(true)

        // Handle case where categoryId might not be set
        if (!categoryId) {
            console.warn('ActivityModal: No categoryId provided')
            setLoading(false)
            return
        }

        try {
            const { start, end } = getBudgetMonthRange(month)

            // Fetch transactions by category
            const data = await dataService.getTransactionsByCategory(categoryId, start, end)

            // Get payees to map names
            // Note: We'd need the budget ID here - for simplicity, we'll skip payee names for now
            const mappedData: Transaction[] = data.map(tx => ({
                id: tx.id,
                date: tx.date,
                amount: tx.amount,
                memo: tx.memo,
                payeeName: undefined
            }))

            setTransactions(mappedData)
            const total = data.reduce((sum, tx) => sum + tx.amount, 0)
            setTotalActivity(total)
        } catch (error) {
            console.error('Error fetching transactions:', error)
        }

        setLoading(false)
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {categoryName} Activity
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500 dark:text-slate-400">No transactions this month</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map(tx => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white truncate">
                                            {tx.payeeName || 'Transaction'}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <span>{formatDate(tx.date)}</span>
                                            {tx.memo && (
                                                <>
                                                    <span>•</span>
                                                    <span className="truncate">{tx.memo}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 font-medium ${tx.amount >= 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                        {tx.amount >= 0 ? (
                                            <ArrowDownLeft className="w-4 h-4" />
                                        ) : (
                                            <ArrowUpRight className="w-4 h-4 text-slate-400" />
                                        )}
                                        {formatMoney(Math.abs(tx.amount), currency)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && transactions.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                        </span>
                        <div className="text-right">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Activity</p>
                            <p className={`text-lg font-bold ${totalActivity >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {formatMoney(totalActivity, currency)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
