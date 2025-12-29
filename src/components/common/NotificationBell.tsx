import { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
    id: string
    type: string
    title: string
    message: string | null
    read: boolean
    created_at: string
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [loading, setLoading] = useState(true)

    const unreadCount = notifications.filter(n => !n.read).length

    useEffect(() => {
        fetchNotifications()

        // Subscribe to new notifications
        const channel = supabase
            .channel('notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications'
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        setNotifications(data || [])
        setLoading(false)
    }

    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'transaction_failed':
                return <AlertCircle className="w-4 h-4 text-red-500" />
            case 'success':
                return <Check className="w-4 h-4 text-emerald-500" />
            default:
                return <Info className="w-4 h-4 text-blue-500" />
        }
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-500 hover:text-blue-600"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-slate-500">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={`p-3 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">{getIcon(notification.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {notification.title}
                                                </p>
                                                {notification.message && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
