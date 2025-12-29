import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/logo.png'

export default function Signup() {
    const navigate = useNavigate()
    const { signUp } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await signUp(email, password)

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-full blur-3xl" />

                <div className="w-full max-w-md text-center relative z-10">
                    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/10">
                        <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                        <p className="text-slate-400 mb-6">
                            We've sent you a confirmation link. Please check your email to complete signup.
                        </p>
                        <Link
                            to="/auth/login"
                            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-medium rounded-lg hover:opacity-90 transition-all"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        )
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
                    <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-slate-400">Start your budgeting journey with YABT — it's free!</p>
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
                                minLength={6}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-medium rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400">
                            Already have an account?{' '}
                            <Link to="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium">
                                Sign in
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
