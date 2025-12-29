import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MessageCircle, Clock } from 'lucide-react'
import logo from '@/assets/logo.png'

export default function Contact() {
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
                <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
                <p className="text-slate-400 text-lg mb-12">
                    Have questions, suggestions, or feedback? We'd love to hear from you!
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Email Support */}
                    <div className="p-8 bg-slate-900/50 border border-white/10 rounded-2xl">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                            <Mail className="w-6 h-6 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Email Support</h2>
                        <p className="text-slate-400 mb-4">
                            For general inquiries, feature requests, or support questions.
                        </p>
                        <a
                            href="mailto:hello@yabt.app"
                            className="text-purple-400 hover:text-purple-300 font-medium"
                        >
                            hello@yabt.app
                        </a>
                    </div>

                    {/* Feedback */}
                    <div className="p-8 bg-slate-900/50 border border-white/10 rounded-2xl">
                        <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                            <MessageCircle className="w-6 h-6 text-pink-400" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Feedback & Ideas</h2>
                        <p className="text-slate-400 mb-4">
                            Share your ideas for new features or improvements to YABT.
                        </p>
                        <a
                            href="mailto:feedback@yabt.app"
                            className="text-pink-400 hover:text-pink-300 font-medium"
                        >
                            feedback@yabt.app
                        </a>
                    </div>

                    {/* Response Time */}
                    <div className="p-8 bg-slate-900/50 border border-white/10 rounded-2xl">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                            <Clock className="w-6 h-6 text-orange-400" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Response Time</h2>
                        <p className="text-slate-400 mb-4">
                            We typically respond within 24-48 hours. For urgent matters,
                            please include "URGENT" in your email subject line.
                        </p>
                    </div>

                    {/* About Us */}
                    <div className="p-8 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl">
                        <h2 className="text-xl font-semibold mb-2">About YABT</h2>
                        <p className="text-slate-300 mb-4">
                            YABT is a passion project built to help people take control of their finances.
                            We believe budgeting should be simple, powerful, and free for everyone.
                        </p>
                        <p className="text-slate-400 text-sm">
                            We're a small team passionate about helping you manage your finances better.
                            Thank you for your support!
                        </p>
                    </div>
                </div>

                {/* FAQ Link */}
                <div className="mt-12 text-center">
                    <p className="text-slate-400">
                        Before reaching out, you might find your answer in our app's help section or
                        check the settings page for common configurations.
                    </p>
                </div>
            </div>
        </div>
    )
}
