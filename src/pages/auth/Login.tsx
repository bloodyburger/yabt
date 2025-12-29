import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/logo.png'

// Get Turnstile site key from environment
const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '')

// Turnstile type declarations
declare global {
    interface Window {
        turnstile?: {
            render: (element: string | HTMLElement, options: {
                sitekey: string
                callback: (token: string) => void
                'error-callback'?: (errorCode?: string) => void
                'expired-callback'?: () => void
                theme?: 'light' | 'dark' | 'auto'
                retry?: 'auto' | 'never'
                'retry-interval'?: number
            }) => string
            reset: (widgetId: string) => void
            remove: (widgetId: string) => void
        }
    }
}

export default function Login() {
    const navigate = useNavigate()
    const { signIn } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // CAPTCHA state
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const [captchaLoaded, setCaptchaLoaded] = useState(false)
    const captchaRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)

    // Load Turnstile script
    useEffect(() => {
        if (!TURNSTILE_SITE_KEY) {
            console.warn('[YABT] VITE_TURNSTILE_SITE_KEY not set, CAPTCHA disabled')
            setCaptchaLoaded(true) // Allow form submission without CAPTCHA
            setCaptchaToken('disabled')
            return
        }

        // Check if already loaded
        if (window.turnstile) {
            setCaptchaLoaded(true)
            return
        }

        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
        script.async = true
        script.onload = () => {
            setCaptchaLoaded(true)
        }
        script.onerror = () => {
            console.error('[YABT] Failed to load Turnstile script')
            setCaptchaLoaded(true)
            setCaptchaToken('disabled')
        }
        document.body.appendChild(script)

        return () => {
            // Cleanup widget on unmount
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current)
            }
        }
    }, [])

    // Render Turnstile widget
    useEffect(() => {
        if (!captchaLoaded || !captchaRef.current || !window.turnstile || !TURNSTILE_SITE_KEY) {
            return
        }

        // Don't re-render if already rendered
        if (widgetIdRef.current) {
            return
        }

        const timeout = setTimeout(() => {
            if (!captchaRef.current || !window.turnstile) return

            try {
                widgetIdRef.current = window.turnstile.render(captchaRef.current, {
                    sitekey: TURNSTILE_SITE_KEY,
                    callback: (token: string) => {
                        setCaptchaToken(token)
                    },
                    'error-callback': (errorCode?: string) => {
                        console.error('[YABT] Turnstile error:', errorCode)
                        setCaptchaToken(null)
                    },
                    'expired-callback': () => {
                        setCaptchaToken(null)
                    },
                    theme: 'dark',
                    retry: 'auto',
                    'retry-interval': 2000
                })
            } catch (err) {
                console.error('[YABT] Failed to render Turnstile:', err)
            }
        }, 100)

        return () => clearTimeout(timeout)
    }, [captchaLoaded])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate captcha (skip if disabled)
        if (!captchaToken) {
            setError('Please complete the CAPTCHA verification.')
            return
        }

        setLoading(true)
        setError('')

        // Pass captcha token (or undefined if disabled)
        const tokenToSend = captchaToken === 'disabled' ? undefined : captchaToken
        const { error } = await signIn(email, password, tokenToSend)

        if (error) {
            setError(error.message)
            setLoading(false)
            // Reset captcha on error
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current)
                setCaptchaToken(null)
            }
        } else {
            navigate('/app/budget')
        }
    }

    const resetCaptcha = () => {
        if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
            setCaptchaToken(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link to="/">
                        <img src={logo} alt="YABT" className="h-20 w-auto mx-auto mb-4" />
                    </Link>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-slate-400">Sign in to your YABT account</p>
                </div>

                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/10">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {/* CAPTCHA Widget */}
                        {TURNSTILE_SITE_KEY && (
                            <div className="space-y-2">
                                <div
                                    ref={captchaRef}
                                    className="flex justify-center"
                                />
                                {captchaToken && captchaToken !== 'disabled' && (
                                    <button
                                        type="button"
                                        onClick={resetCaptcha}
                                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 mx-auto"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Reset CAPTCHA
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (!captchaToken && TURNSTILE_SITE_KEY !== '')}
                            className="w-full py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-medium rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400">
                            Don't have an account?{' '}
                            <Link to="/auth/signup" className="text-purple-400 hover:text-purple-300 font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <Link to="/" className="text-slate-500 hover:text-slate-400 text-sm">
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    )
}
