import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { TransactionModalProvider } from '@/contexts/TransactionModalContext'

export default function Layout() {
    return (
        <TransactionModalProvider>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
                <Sidebar />

                {/* Main Content */}
                <main className="flex-1 lg:ml-64 transition-all duration-300">
                    <div className="min-h-screen">
                        <Outlet />
                    </div>
                </main>
            </div>
        </TransactionModalProvider>
    )
}
