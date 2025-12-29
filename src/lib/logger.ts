import { supabase } from './supabase'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class Logger {
    private async ship(level: LogLevel, message: string, meta: any = {}) {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user?.email || null

            // Log to console in development
            if (import.meta.env.DEV) {
                console.log(`[${level.toUpperCase()}] ${message}`, meta)
            }

            await fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level,
                    message,
                    user,
                    meta
                })
            })
        } catch (e) {
            console.error('Failed to ship log', e)
        }
    }

    info(message: string, meta?: any) {
        this.ship('info', message, meta)
    }

    warn(message: string, meta?: any) {
        this.ship('warn', message, meta)
    }

    error(message: string, meta?: any) {
        this.ship('error', message, meta)
    }

    debug(message: string, meta?: any) {
        this.ship('debug', message, meta)
    }
}

export const logger = new Logger()
