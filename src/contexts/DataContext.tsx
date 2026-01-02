/**
 * Data Context
 * Provides the DataService to all components
 * Uses SupabaseDataService for all data operations
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import type { DataService } from '../lib/dataService'
import { SupabaseDataService } from '../lib/SupabaseDataService'

interface DataContextType {
    // Active data service
    dataService: DataService

    // State
    isInitialized: boolean
    isLoading: boolean
    error: string | null

    // Actions
    clearError: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
    // Service
    const [supabaseService] = useState(() => new SupabaseDataService())

    // State
    const [isInitialized, setIsInitialized] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Initialize service
    useEffect(() => {
        async function init() {
            setIsLoading(true)
            try {
                await supabaseService.initialize()
                setIsInitialized(true)
            } catch (err) {
                console.error('Failed to initialize data service:', err)
                setError('Failed to initialize. Please refresh.')
            } finally {
                setIsLoading(false)
            }
        }
        init()
    }, [])

    const clearError = useCallback(() => setError(null), [])

    return (
        <DataContext.Provider
            value={{
                dataService: supabaseService,
                isInitialized,
                isLoading,
                error,
                clearError
            }}
        >
            {children}
        </DataContext.Provider>
    )
}

export function useData() {
    const context = useContext(DataContext)
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider')
    }
    return context
}

// Hook to get just the data service (for components that just need to read/write data)
export function useDataService(): DataService {
    const { dataService } = useData()
    return dataService
}
