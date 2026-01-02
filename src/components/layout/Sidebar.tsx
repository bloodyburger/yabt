import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
    LayoutDashboard,
    CreditCard,
    PieChart,
    TrendingUp,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    FolderOpen,
    ChevronDown,
    Plus,
    History
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useBudget } from '@/contexts/BudgetContext'
import NotificationBell from '@/components/common/NotificationBell'
import logo from '@/assets/logo.png'

const navItems = [
    { href: '/app/budget', icon: LayoutDashboard, label: 'Budget' },
    { href: '/app/accounts', icon: CreditCard, label: 'Accounts' },
    { href: '/app/reports', icon: PieChart, label: 'Reports' },
    { href: '/app/net-worth', icon: TrendingUp, label: 'Net Worth' },
    { href: '/app/activity', icon: History, label: 'Activity Log' },
    { href: '/app/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, signOut } = useAuth()
    const { currentBudget, allBudgets, switchBudget, createBudget } = useBudget()

    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [mobileClosing, setMobileClosing] = useState(false)
    const mobileCloseTimer = useRef<number | null>(null)
    const [showBudgetMenu, setShowBudgetMenu] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newBudgetName, setNewBudgetName] = useState('')
    const [createBudgetError, setCreateBudgetError] = useState('')
    const [isCreatingBudget, setIsCreatingBudget] = useState(false)

    const openMobileMenu = () => {
        if (mobileCloseTimer.current) {
            window.clearTimeout(mobileCloseTimer.current)
            mobileCloseTimer.current = null
        }
        setMobileClosing(false)
        setMobileOpen(true)
    }

    const closeMobileMenu = () => {
        if (!mobileOpen) return
        setMobileClosing(true)
        if (mobileCloseTimer.current) {
            window.clearTimeout(mobileCloseTimer.current)
        }
        mobileCloseTimer.current = window.setTimeout(() => {
            setMobileOpen(false)
            setMobileClosing(false)
            mobileCloseTimer.current = null
        }, 200)
    }

    // Close mobile menu on route change
    useEffect(() => {
        closeMobileMenu()
        return () => {
            if (mobileCloseTimer.current) {
                window.clearTimeout(mobileCloseTimer.current)
                mobileCloseTimer.current = null
            }
        }
    }, [location.pathname])

    const handleLogout = async () => {
        await signOut()
        navigate('/auth/login')
    }

    const handleCreateBudget = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newBudgetName.trim()) return

        setCreateBudgetError('')
        setIsCreatingBudget(true)

        try {
            const { data, error } = await createBudget(newBudgetName.trim())

            if (error) {
                console.error('Failed to create budget:', error)
                setCreateBudgetError(error.message || 'Failed to create budget')
                setIsCreatingBudget(false)
                return
            }

            if (!data) {
                setCreateBudgetError('Failed to create budget - no data returned')
                setIsCreatingBudget(false)
                return
            }

            setNewBudgetName('')
            setShowCreateModal(false)
            setShowBudgetMenu(false)
        } catch (err) {
            console.error('Failed to create budget:', err)
            setCreateBudgetError(err instanceof Error ? err.message : 'Failed to create budget')
        } finally {
            setIsCreatingBudget(false)
        }
    }

    // Shared sidebar content
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                {(!collapsed || isMobile) && (
                    <a href="/app/budget" className="flex items-center gap-2">
                        <img src={logo} alt="YABT" className="h-10 w-auto" />
                    </a>
                )}
                {collapsed && !isMobile && (
                    <a href="/app/budget">
                        <img src={logo} alt="YABT" className="h-10 w-10 object-contain mx-auto" />
                    </a>
                )}
                <div className="flex items-center gap-1">
                    <NotificationBell />
                    {isMobile ? (
                        <button
                            onClick={closeMobileMenu}
                            className="text-slate-400 hover:text-white transition-colors p-1"
                            aria-label="Close menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="text-slate-400 hover:text-white transition-colors p-1"
                        >
                            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Budget Selector */}
            <div className="px-2 py-2 border-b border-slate-800">
                <div className="relative">
                    <button
                        onClick={() => setShowBudgetMenu(!showBudgetMenu)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    >
                        <FolderOpen className="w-5 h-5 flex-shrink-0" />
                        {(!collapsed || isMobile) && (
                            <>
                                <span className="flex-1 text-left text-sm font-medium truncate">
                                    {currentBudget?.name || 'Select Budget'}
                                </span>
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showBudgetMenu ? 'rotate-180' : ''}`} />
                            </>
                        )}
                    </button>

                    {showBudgetMenu && (!collapsed || isMobile) && (
                        <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="max-h-48 overflow-y-auto">
                                {allBudgets.map(budget => (
                                    <button
                                        key={budget.id}
                                        onClick={() => {
                                            switchBudget(budget.id)
                                            setShowBudgetMenu(false)
                                        }}
                                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${budget.id === currentBudget?.id
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-300 hover:bg-slate-700'
                                            }`}
                                    >
                                        {budget.name}
                                    </button>
                                ))}
                            </div>
                            <div className="border-t border-slate-700 p-2">
                                <button
                                    onClick={() => { setShowBudgetMenu(false); setShowCreateModal(true); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Budget
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1 px-2">
                    {navItems.map(item => (
                        <li key={item.href}>
                            <NavLink
                                to={item.href}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {(!collapsed || isMobile) && <span className="font-medium">{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-slate-800">
                {(!collapsed || isMobile) && (
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            <p className="text-xs text-slate-400 truncate">{currentBudget?.name || 'My Budget'}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    {(!collapsed || isMobile) && <span className="font-medium">Log Out</span>}
                </button>
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile Header with Hamburger */}
            <div className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-slate-900 border-b border-slate-800">
                <div className="flex items-center justify-between h-14 px-4">
                    <button
                        onClick={openMobileMenu}
                        className="text-slate-400 hover:text-white transition-colors p-2 -ml-2"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <a href="/app/budget" className="flex items-center">
                        <img src={logo} alt="YABT" className="h-8 w-auto" />
                    </a>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className={`absolute inset-0 bg-black/50 ${mobileClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
                        onClick={closeMobileMenu}
                    />
                    <aside className={`absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-xl ${mobileClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
                        <SidebarContent isMobile={true} />
                    </aside>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 bg-slate-900 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} hidden lg:block`}>
                <SidebarContent isMobile={false} />
            </aside>

            {/* Create Budget Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                                Create New Budget
                            </h2>
                            <form onSubmit={handleCreateBudget} className="space-y-4">
                                {createBudgetError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                        {createBudgetError}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Budget Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newBudgetName}
                                        onChange={(e) => setNewBudgetName(e.target.value)}
                                        placeholder="e.g., Personal, Business, Joint"
                                        className="input"
                                        required
                                        disabled={isCreatingBudget}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowCreateModal(false); setCreateBudgetError(''); }}
                                        className="btn btn-secondary flex-1"
                                        disabled={isCreatingBudget}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary flex-1" disabled={isCreatingBudget}>
                                        {isCreatingBudget ? 'Creating...' : 'Create Budget'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
