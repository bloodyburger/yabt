import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, captchaToken?: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string, captchaToken?: string) => {
        const options: { email: string; password: string; options?: { captchaToken?: string } } = { email, password }
        if (captchaToken) {
            options.options = { captchaToken }
        }
        const { error } = await supabase.auth.signInWithPassword(options)
        if (!error) {
            logger.info('User signed in', { email })
        }
        return { error }
    }

    const signUp = async (email: string, password: string, captchaToken?: string) => {
        const options: { email: string; password: string; options?: { captchaToken?: string } } = { email, password }
        if (captchaToken) {
            options.options = { captchaToken }
        }
        const { error } = await supabase.auth.signUp(options)
        if (!error) {
            logger.info('User signed up', { email })
        }
        return { error }
    }

    const signOut = async () => {
        const email = user?.email
        await supabase.auth.signOut()
        logger.info('User signed out', { email })
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
