import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import logo from '@/assets/logo.png'

export default function Terms() {
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
                <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
                <p className="text-slate-400 mb-12">Last updated: December 29, 2024</p>

                <div className="prose prose-invert prose-slate max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
                        <p className="text-slate-300 leading-relaxed">
                            By accessing and using YABT (Yet Another Budgeting Tool), you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use our service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">2. Description of Service</h2>
                        <p className="text-slate-300 leading-relaxed">
                            YABT is a personal finance and budgeting application that helps you track income, expenses, and manage
                            your budget. The service is provided free of charge with optional donations to support development.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">3. User Accounts</h2>
                        <p className="text-slate-300 leading-relaxed mb-4">When creating an account, you agree to:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Provide accurate and complete information</li>
                            <li>Maintain the security of your password</li>
                            <li>Accept responsibility for all activities under your account</li>
                            <li>Notify us immediately of any unauthorized access</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">4. Acceptable Use</h2>
                        <p className="text-slate-300 leading-relaxed mb-4">You agree not to:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Use the service for any illegal purpose</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with or disrupt the service</li>
                            <li>Upload malicious code or content</li>
                            <li>Violate any applicable laws or regulations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">5. Data Accuracy</h2>
                        <p className="text-slate-300 leading-relaxed">
                            YABT is a tool to help you manage your finances, but we do not guarantee the accuracy of calculations
                            or financial advice. You are responsible for verifying all financial data and decisions. This service
                            does not constitute financial, tax, or legal advice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">6. Intellectual Property</h2>
                        <p className="text-slate-300 leading-relaxed">
                            The YABT name, logo, and all content within the application are protected by intellectual property laws.
                            You may not copy, modify, or distribute our content without permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">7. Limitation of Liability</h2>
                        <p className="text-slate-300 leading-relaxed">
                            YABT is provided "as is" without warranties of any kind. We are not liable for any damages arising from
                            your use of the service, including but not limited to direct, indirect, incidental, or consequential damages.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">8. Service Modifications</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We reserve the right to modify, suspend, or discontinue any part of the service at any time. We will
                            make reasonable efforts to notify users of significant changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">9. Termination</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We may terminate or suspend your account at any time for violations of these terms. You may also
                            delete your account at any time through the settings page.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-white">10. Contact</h2>
                        <p className="text-slate-300 leading-relaxed">
                            For questions about these Terms of Service, please contact us at{' '}
                            <a href="mailto:legal@yabt.app" className="text-purple-400 hover:text-purple-300">legal@yabt.app</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
