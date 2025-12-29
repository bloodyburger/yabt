import { useState, useEffect } from 'react'
import { History, Search, Filter, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/contexts/SettingsContext'

interface ActivityLogEntry {
    id: string
    action: string
    entity_type: string | null
    entity_id: string | null
    details: any
    status: string
    error_message: string | null
    created_at: string
}

const actionLabels: Record<string, string> = {
    transaction_created: 'Transaction Created',
    transaction_updated: 'Transaction Updated',
    transaction_deleted: 'Transaction Deleted',
    nlp_transaction_created: 'NLP Transaction Created',
    nlp_transaction_failed: 'NLP Transaction Failed',
    email_transaction_created: 'Email Transaction Created',
    email_transaction_failed: 'Email Transaction Failed',
}

const actionColors: Record<string, string> = {
    transaction_created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    transaction_updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    transaction_deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    nlp_transaction_created: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    nlp_transaction_failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    email_transaction_created: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    email_transaction_failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function Activity() {
    const { dateFormat } = useSettings()
    const [activities, setActivities] = useState<ActivityLogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterAction, setFilterAction] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => {
        fetchActivities()
    }, [])

    const fetchActivities = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('activity_log')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100)

        setActivities(data || [])
        setLoading(false)
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        switch (dateFormat) {
            case 'MM/DD/YYYY':
                return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${time}`
            case 'DD/MM/YYYY':
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${time}`
            default:
                return `${dateStr.split('T')[0]} ${time}`
        }
    }

    const filteredActivities = activities.filter(a => {
        if (filterAction && a.action !== filterAction) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return (
                a.action.toLowerCase().includes(q) ||
                JSON.stringify(a.details).toLowerCase().includes(q)
            )
        }
        return true
    })

    const uniqueActions = [...new Set(activities.map(a => a.action))]

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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <History className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Log</h1>
                    <p className="text-slate-500 dark:text-slate-400">Track all changes made to your budget</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search activity..."
                        className="input pl-10"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="input pl-9 pr-8 min-w-[180px]"
                    >
                        <option value="">All Actions</option>
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>
                                {actionLabels[action] || action}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Activity List */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {filteredActivities.length === 0 ? (
                    <div className="py-16 text-center">
                        <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No activity yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredActivities.map(activity => (
                            <div key={activity.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div
                                    className="flex items-center gap-4 cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-medium px-2 py-1 rounded ${actionColors[activity.action] || 'bg-slate-100 text-slate-600'}`}>
                                                {actionLabels[activity.action] || activity.action}
                                            </span>
                                            {activity.status === 'error' && (
                                                <span className="text-xs text-red-500">Failed</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            {activity.entity_type && `${activity.entity_type}`}
                                            {activity.error_message && ` - ${activity.error_message}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500">{formatDate(activity.created_at)}</p>
                                    </div>
                                    <button className="p-1 text-slate-400">
                                        {expandedId === activity.id ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Expanded Details */}
                                {expandedId === activity.id && activity.details && (
                                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                        <p className="text-xs font-medium text-slate-500 mb-2">Details</p>
                                        <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(activity.details, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
