import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

// Create the base Supabase client
const baseClient = createClient(supabaseUrl, supabaseAnonKey)

// Debug logging wrapper
const isDev = import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGGING === 'true'

// Logger utility
export const logger = {
    info: (message: string, data?: unknown) => {
        if (isDev) {
            console.log(`[YABT] ${new Date().toISOString()} INFO: ${message}`, data !== undefined ? data : '')
        }
    },
    error: (message: string, error?: unknown) => {
        console.error(`[YABT] ${new Date().toISOString()} ERROR: ${message}`, error !== undefined ? error : '')
    },
    debug: (message: string, data?: unknown) => {
        if (isDev) {
            console.debug(`[YABT] ${new Date().toISOString()} DEBUG: ${message}`, data !== undefined ? data : '')
        }
    },
    warn: (message: string, data?: unknown) => {
        if (isDev) {
            console.warn(`[YABT] ${new Date().toISOString()} WARN: ${message}`, data !== undefined ? data : '')
        }
    },
    table: (tableName: string, operation: string, query: unknown, result: { data: unknown; error: unknown; count?: number }) => {
        if (isDev) {
            const status = result.error ? '❌ FAILED' : '✅ OK'
            console.groupCollapsed(`[YABT] ${status} ${operation} ${tableName}`)
            console.log('Query:', query)
            console.log('Result:', result.data)
            if (result.error) console.error('Error:', result.error)
            if (result.count !== undefined) console.log('Count:', result.count)
            console.groupEnd()
        }
    }
}

// Log Supabase initialization
logger.info('Supabase client initialized', { url: supabaseUrl })

export const supabase = baseClient
