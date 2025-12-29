import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { BudgetProvider } from '@/contexts/BudgetContext'
import Layout from '@/components/layout/Layout'
import Landing from '@/pages/Landing'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import Budget from '@/pages/Budget'
import Accounts from '@/pages/Accounts'
import AccountDetail from '@/pages/AccountDetail'
import Settings from '@/pages/Settings'
import Reports from '@/pages/Reports'
import NetWorth from '@/pages/NetWorth'
import Activity from '@/pages/Activity'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import Contact from '@/pages/Contact'
import Help from '@/pages/Help'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/auth/login" replace />
    }

    return <>{children}</>
}

function AppRoutes() {
    return (
        <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<Landing />} />

            {/* Legal & Info Pages */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/help" element={<Help />} />

            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
                path="/app"
                element={
                    <ProtectedRoute>
                        <SettingsProvider>
                            <BudgetProvider>
                                <Layout />
                            </BudgetProvider>
                        </SettingsProvider>
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/app/budget" replace />} />
                <Route path="budget" element={<Budget />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="accounts/:id" element={<AccountDetail />} />
                <Route path="settings" element={<Settings />} />
                <Route path="reports" element={<Reports />} />
                <Route path="net-worth" element={<NetWorth />} />
                <Route path="activity" element={<Activity />} />
            </Route>

            {/* Legacy route redirects */}
            <Route path="/budget" element={<Navigate to="/app/budget" replace />} />
            <Route path="/accounts" element={<Navigate to="/app/accounts" replace />} />
            <Route path="/accounts/:id" element={<Navigate to="/app/accounts/:id" replace />} />
            <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
            <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
            <Route path="/net-worth" element={<Navigate to="/app/net-worth" replace />} />
            <Route path="/activity" element={<Navigate to="/app/activity" replace />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    )
}
