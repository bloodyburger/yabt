import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface Profile {
    id: string
    email: string
    currency_code: string
    date_format: string
}

interface SettingsContextType {
    currency: string
    dateFormat: string
    loading: boolean
    updateSettings: (currency: string, dateFormat: string) => Promise<{ error: Error | null }>
    refetch: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [currency, setCurrency] = useState('USD')
    const [dateFormat, setDateFormat] = useState('YYYY-MM-DD')
    const [loading, setLoading] = useState(true)

    const fetchSettings = async () => {
        if (!user) {
            setLoading(false)
            return
        }

        const { data } = await supabase
            .from('profiles')
            .select('currency_code, date_format')
            .eq('id', user.id)
            .single()

        if (data) {
            setCurrency(data.currency_code || 'USD')
            setDateFormat(data.date_format || 'YYYY-MM-DD')
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchSettings()
    }, [user])

    const updateSettings = async (newCurrency: string, newDateFormat: string) => {
        if (!user) return { error: new Error('Not authenticated') }

        const { error } = await supabase
            .from('profiles')
            .update({
                currency_code: newCurrency,
                date_format: newDateFormat,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (!error) {
            setCurrency(newCurrency)
            setDateFormat(newDateFormat)
        }

        return { error }
    }

    return (
        <SettingsContext.Provider value={{
            currency,
            dateFormat,
            loading,
            updateSettings,
            refetch: fetchSettings
        }}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
