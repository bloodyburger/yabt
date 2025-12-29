import { createContext, useContext, useState, ReactNode } from 'react'
import { Plus, Wand2 } from 'lucide-react'
import AddTransactionModal from '@/components/common/AddTransactionModal'
import NLPTransactionInput from '@/components/common/NLPTransactionInput'

interface TransactionModalContextType {
    openTransactionModal: (accountId?: string) => void
    openNLPInput: () => void
}

const TransactionModalContext = createContext<TransactionModalContextType | undefined>(undefined)

export function TransactionModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isNLPOpen, setIsNLPOpen] = useState(false)
    const [showFabMenu, setShowFabMenu] = useState(false)
    const [defaultAccountId, setDefaultAccountId] = useState<string | undefined>(undefined)

    const openTransactionModal = (accountId?: string) => {
        setDefaultAccountId(accountId)
        setIsOpen(true)
        setShowFabMenu(false)
    }

    const openNLPInput = () => {
        setIsNLPOpen(true)
        setShowFabMenu(false)
    }

    return (
        <TransactionModalContext.Provider value={{ openTransactionModal, openNLPInput }}>
            {children}

            {/* FAB Menu Backdrop */}
            {showFabMenu && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowFabMenu(false)}
                />
            )}

            {/* FAB with Expandable Options */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
                {showFabMenu && (
                    <>
                        {/* NLP Option */}
                        <button
                            onClick={openNLPInput}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-600 transition-all animate-fade-in"
                        >
                            <Wand2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Quick Add (AI)</span>
                        </button>

                        {/* Manual Entry Option */}
                        <button
                            onClick={() => openTransactionModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all animate-fade-in"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-medium">Add Manually</span>
                        </button>
                    </>
                )}

                {/* Main FAB */}
                <button
                    onClick={() => setShowFabMenu(!showFabMenu)}
                    className={`w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center ${showFabMenu ? 'rotate-45' : ''}`}
                    title="Add Transaction"
                >
                    <Plus className="w-6 h-6 transition-transform" />
                </button>
            </div>

            {/* Transaction Modal */}
            {isOpen && (
                <AddTransactionModal
                    defaultAccountId={defaultAccountId}
                    onClose={() => {
                        setIsOpen(false)
                        setDefaultAccountId(undefined)
                    }}
                />
            )}

            {/* NLP Input Modal */}
            {isNLPOpen && (
                <NLPTransactionInput
                    onClose={() => setIsNLPOpen(false)}
                    onSuccess={() => {
                        // Could trigger refresh here
                    }}
                />
            )}
        </TransactionModalContext.Provider>
    )
}

export function useTransactionModal() {
    const context = useContext(TransactionModalContext)
    if (context === undefined) {
        throw new Error('useTransactionModal must be used within a TransactionModalProvider')
    }
    return context
}
