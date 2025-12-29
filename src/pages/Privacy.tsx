import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import logo from '@/assets/logo.png'

export default function Privacy() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-slate-950/70 border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logo} alt="YABT" className="h-10 w-auto" />
                    </Link>
                    <Link to="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
                <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-slate-400 mb-12">Last updated: December 29, 2024</p>

                <div className="prose prose-invert prose-slate max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">1. Introduction</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Welcome to YABT (Yet Another Budgeting Tool). We respect your privacy and are committed to protecting your personal data.
                            This privacy policy explains how we collect, use, and safeguard your information when you use our budgeting application.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">2. Information We Collect</h2>
                        <p className="text-slate-300 leading-relaxed mb-4">We collect and process the following types of information:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li><strong className="text-white">Account Information:</strong> Email address and password (encrypted) when you create an account</li>
                            <li><strong className="text-white">Financial Data:</strong> Transaction details, account balances, budgets, and categories you enter into the app</li>
                            <li><strong className="text-white">Usage Data:</strong> How you interact with the app to improve our services</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">3. How We Use Your Information</h2>
                        <p className="text-slate-300 leading-relaxed mb-4">Your information is used to:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Provide and maintain the budgeting service</li>
                            <li>Process your transactions and generate reports</li>
                            <li>Send you important service updates</li>
                            <li>Improve and personalize your experience</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">4. Data Security</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We implement industry-standard security measures to protect your data. All data is encrypted in transit using TLS
                            and at rest. We use Supabase for secure data storage with row-level security policies to ensure your data
                            is only accessible to you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">5. Data Sharing</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We do not sell, trade, or rent your personal information to third parties. Your financial data stays private
                            and is never shared with advertisers or data brokers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">6. Your Rights</h2>
                        <p className="text-slate-300 leading-relaxed mb-4">You have the right to:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Export your data in a portable format</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">7. Cookies</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We use essential cookies to maintain your session and remember your preferences. We do not use tracking
                            or advertising cookies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">8. Contact Us</h2>
                        <p className="text-slate-300 leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at{' '}
                            <a href="mailto:privacy@yabt.app" className="text-purple-400 hover:text-purple-300">privacy@yabt.app</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
