import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface Profile {
    id: string
    email: string
    currency_code: string
    date_format: string
    month_start_day: number
}

interface SettingsContextType {
    currency: string
    dateFormat: string
    monthStartDay: number
    loading: boolean
    updateSettings: (currency: string, dateFormat: string, monthStartDay: number) => Promise<{ error: Error | null }>
    refetch: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [currency, setCurrency] = useState('USD')
    const [dateFormat, setDateFormat] = useState('YYYY-MM-DD')
    const [monthStartDay, setMonthStartDay] = useState(1)
    const [loading, setLoading] = useState(true)

    const fetchSettings = async () => {
        if (!user) {
            setLoading(false)
            return
        }

        const { data } = await supabase
            .from('profiles')
            .select('currency_code, date_format, month_start_day')
            .eq('id', user.id)
            .single()

        if (data) {
            setCurrency(data.currency_code || 'USD')
            setDateFormat(data.date_format || 'YYYY-MM-DD')
            setMonthStartDay(data.month_start_day ?? 1)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchSettings()
    }, [user])

    const updateSettings = async (newCurrency: string, newDateFormat: string, newMonthStartDay: number) => {
        if (!user) return { error: new Error('Not authenticated') }

        const { error } = await supabase
            .from('profiles')
            .update({
                currency_code: newCurrency,
                date_format: newDateFormat,
                month_start_day: newMonthStartDay,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (!error) {
            setCurrency(newCurrency)
            setDateFormat(newDateFormat)
            setMonthStartDay(newMonthStartDay)
        }

        return { error }
    }

    return (
        <SettingsContext.Provider value={{
            currency,
            dateFormat,
            monthStartDay,
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
