import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/logo.png'

export default function Login() {
    const navigate = useNavigate()
    const { signIn } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await signIn(email, password)

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate('/app/budget')
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

                        <button
                            type="submit"
                            disabled={loading}
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
