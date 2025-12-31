import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Sparkles, Zap, Shield, PiggyBank, TrendingUp, ChevronRight,
    Check, Star, ArrowRight, Infinity, Smartphone, Cloud, Users, Mail,
    Mic, Lightbulb, Brain, Command
} from 'lucide-react'
import logo from '@/assets/logo.png'

// Intersection Observer hook for scroll animations
function useInView(threshold = 0.1) {
    const [isInView, setIsInView] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsInView(entry.isIntersecting),
            { threshold, rootMargin: '0px 0px -100px 0px' }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [threshold])

    return { ref, isInView }
}

export default function Landing() {
    const [scrollY, setScrollY] = useState(0)

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const features = [
        {
            icon: Mic,
            title: 'Voice-to-Budget',
            description: 'Just say "spent 50 rupees on chai" and it\'s logged. Powered by Whisper AI for any language.'
        },
        {
            icon: Zap,
            title: 'AI-Powered Transactions',
            description: 'Type or speak naturally. "Coffee 100 at Starbucks from HDFC" - AI handles the rest.'
        },
        {
            icon: Brain,
            title: 'Smart Auto-Categorization',
            description: 'Learns your habits. Bought at Starbucks before? It remembers and auto-categorizes.'
        },
        {
            icon: Command,
            title: 'One-Tap Logging',
            description: 'Press Cmd+K anywhere to instantly add a transaction. No friction, just logging.'
        },
        {
            icon: Lightbulb,
            title: 'Smart Insights',
            description: 'Get alerted before you overspend. "You\'re at 85% of your Food budget"—actionable warnings.'
        },
        {
            icon: PiggyBank,
            title: 'Zero-Based Budgeting',
            description: 'Give every rupee a job. Budget to zero and take control of your money.'
        },
        {
            icon: TrendingUp,
            title: 'Real-Time Reports',
            description: 'Beautiful charts and analytics. Track net worth, spending patterns, and trends.'
        },
        {
            icon: Shield,
            title: 'Privacy First',
            description: 'Your data stays yours. Self-host option available for complete control.'
        }
    ]

    // Scroll-linked opacity for hero elements
    const heroOpacity = Math.max(0, 1 - scrollY / 600)
    const heroScale = Math.max(0.8, 1 - scrollY / 3000)

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden scroll-smooth">
            {/* Fixed Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logo} alt="YABT" className="h-12 w-auto" />
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-zinc-400 hover:text-white transition-colors uppercase text-sm tracking-wider font-medium">Features</a>
                        <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors uppercase text-sm tracking-wider font-medium">Pricing</a>
                        <a href="#roadmap" className="text-zinc-400 hover:text-white transition-colors uppercase text-sm tracking-wider font-medium">Roadmap</a>
                        <Link
                            to="/auth/login"
                            className="px-6 py-2.5 bg-white text-black font-bold uppercase text-sm tracking-wider hover:bg-zinc-200 transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Full Viewport */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                {/* Gradient Background */}
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.3) 0%, rgba(0,0,0,0) 70%)',
                        transform: `scale(${1 + scrollY / 2000})`
                    }}
                />

                <div
                    className="relative z-10 text-center px-6 max-w-6xl mx-auto"
                    style={{
                        opacity: heroOpacity,
                        transform: `translateY(${scrollY * 0.4}px) scale(${heroScale})`
                    }}
                >
                    {/* Free Badge */}
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-none mb-10">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 text-sm font-bold uppercase tracking-widest">100% Free Forever</span>
                    </div>

                    {/* Main Heading - Bold dbrand style */}
                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-8 leading-[0.9] tracking-tight">
                        <span className="block bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                            BUDGET
                        </span>
                        <span className="block text-white">SMARTER.</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Voice-powered budgeting that learns your habits. Track every penny
                        in any language—<strong className="text-white">completely free</strong>.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/auth/signup"
                            className="group px-10 py-4 bg-white text-black font-black uppercase text-lg tracking-wider hover:bg-zinc-200 transition-all flex items-center gap-3"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#features"
                            className="px-10 py-4 border-2 border-zinc-700 text-white font-bold uppercase text-lg tracking-wider hover:border-zinc-500 hover:bg-zinc-900 transition-all"
                        >
                            Learn More
                        </a>
                    </div>

                    {/* iOS Coming Soon Badge */}
                    <div className="mt-16 inline-flex items-center gap-3 px-6 py-3 bg-zinc-900/80 border border-zinc-700 rounded-none">
                        <Smartphone className="w-5 h-5 text-zinc-400" />
                        <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider">iOS App Coming Soon</span>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                    style={{ opacity: heroOpacity }}
                >
                    <span className="text-zinc-500 text-xs uppercase tracking-widest">Scroll</span>
                    <div className="w-6 h-10 border-2 border-zinc-600 rounded-full flex items-start justify-center p-2">
                        <div className="w-1 h-2 bg-zinc-400 rounded-full animate-bounce" />
                    </div>
                </div>
            </section>

            {/* Features Section - Each feature gets prominent treatment */}
            <section id="features" className="relative bg-zinc-950">
                {/* Section Header */}
                <FeatureHeader />

                {/* Feature Cards */}
                <div className="max-w-7xl mx-auto px-6 py-20">
                    <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-1">
                        {features.map((feature, index) => (
                            <FeatureCard key={feature.title} feature={feature} index={index} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section - High contrast */}
            <section id="pricing" className="relative bg-black py-32">
                <PricingSection />
            </section>

            {/* Roadmap Section */}
            <section id="roadmap" className="relative bg-zinc-950 py-32 border-y border-zinc-800">
                <RoadmapSection />
            </section>

            {/* CTA Section */}
            <section className="relative bg-zinc-950 py-32">
                <CTASection />
            </section>

            {/* Footer */}
            <footer className="bg-black border-t border-zinc-800 py-16">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-4">
                            <img src={logo} alt="YABT" className="h-10 w-auto" />
                            <span className="text-zinc-500 text-sm">© 2024 YABT. Made with ❤️</span>
                        </div>
                        <div className="flex items-center gap-8 text-zinc-500 text-sm uppercase tracking-wider">
                            <Link to="/help" className="hover:text-white transition-colors">Help</Link>
                            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

// Feature Header Component with scroll animation
function FeatureHeader() {
    const { ref, isInView } = useInView(0.3)

    return (
        <div
            ref={ref}
            className="min-h-[60vh] flex items-center justify-center border-b border-zinc-800"
        >
            <div
                className={`text-center px-6 transition-all duration-1000 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                    }`}
            >
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6">
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Features
                    </span>{' '}
                    That Deliver
                </h2>
                <p className="text-xl text-zinc-400 max-w-xl mx-auto">
                    No gimmicks. No subscriptions. Just powerful budgeting tools.
                </p>
            </div>
        </div>
    )
}

// Feature Card Component with scroll animation
function FeatureCard({ feature, index }: { feature: { icon: any; title: string; description: string }; index: number }) {
    const { ref, isInView } = useInView(0.2)
    const Icon = feature.icon

    return (
        <div
            ref={ref}
            className={`group p-12 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all duration-500 cursor-default ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
                }`}
            style={{ transitionDelay: `${index * 100}ms` }}
        >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">{feature.title}</h3>
            <p className="text-zinc-400 text-lg leading-relaxed">{feature.description}</p>
        </div>
    )
}

// Pricing Section Component
function PricingSection() {
    const { ref, isInView } = useInView(0.2)

    return (
        <div ref={ref} className="max-w-7xl mx-auto px-6">
            <div
                className={`text-center mb-20 transition-all duration-1000 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                    }`}
            >
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6">
                    Completely{' '}
                    <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                        Free
                    </span>
                </h2>
                <p className="text-xl text-zinc-400">No subscriptions. No limits. No catch.</p>
            </div>

            <div
                className={`grid md:grid-cols-2 gap-1 max-w-4xl mx-auto transition-all duration-1000 delay-300 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                    }`}
            >
                {/* Free Card */}
                <div className="p-10 bg-emerald-950/50 border border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-6">
                        <Infinity className="w-6 h-6 text-emerald-400" />
                        <span className="text-emerald-400 font-bold uppercase tracking-wider text-sm">Full Access</span>
                    </div>
                    <div className="text-6xl font-black mb-2">$0</div>
                    <p className="text-emerald-400 text-sm mb-8 uppercase tracking-wider">Forever Free</p>
                    <ul className="space-y-4 mb-10">
                        {['Unlimited transactions', 'Voice AI in any language', 'Smart auto-categorization', 'One-tap logging (Cmd+K)', 'Smart overspend alerts', 'Full reports & analytics'].map(item => (
                            <li key={item} className="flex items-center gap-3 text-zinc-200">
                                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <Link
                        to="/auth/signup"
                        className="block text-center py-4 bg-emerald-500 text-black font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors"
                    >
                        Start Now
                    </Link>
                </div>

                {/* Donate Card */}
                <div className="p-10 bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-6">
                        <Star className="w-6 h-6 text-yellow-400" />
                        <span className="text-zinc-400 font-bold uppercase tracking-wider text-sm">Support Us</span>
                    </div>
                    <div className="text-5xl font-black mb-2">Donate</div>
                    <p className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">Keep YABT Free</p>
                    <p className="text-zinc-400 mb-8 leading-relaxed">
                        Love YABT? Your contribution helps cover server costs and keeps the app running for everyone.
                    </p>
                    <div className="space-y-3 mb-10">
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <Check className="w-4 h-4 text-yellow-400" />
                            <span>Minimum: $10</span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <Check className="w-4 h-4 text-yellow-400" />
                            <span>Secure via PayPal</span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <Check className="w-4 h-4 text-yellow-400" />
                            <span>100% optional</span>
                        </div>
                    </div>
                    <a
                        href="#"
                        className="block text-center py-4 border-2 border-yellow-500/50 text-yellow-400 font-bold uppercase tracking-wider hover:bg-yellow-500/10 transition-colors"
                    >
                        ☕ Donate via PayPal
                    </a>
                    <p className="text-zinc-600 text-xs text-center mt-4 uppercase tracking-wider">Coming Soon</p>
                </div>
            </div>
        </div>
    )
}

// Roadmap Section Component
function RoadmapSection() {
    const { ref, isInView } = useInView(0.2)

    const roadmapItems = [
        {
            icon: Smartphone,
            title: 'Native Mobile Apps',
            description: 'iOS and Android apps for seamless tracking on the go.',
            status: 'Coming Soon'
        },
        {
            icon: Cloud,
            title: 'BYO Cloud Storage',
            description: 'Sync your data with Dropbox, Google Drive, or OneDrive.',
            status: 'In Progress'
        },
        {
            icon: Users,
            title: 'Shared Budgets',
            description: 'Manage finances together with your partner or family.',
            status: 'Planned'
        },
        {
            icon: Mail,
            title: 'Email Integration',
            description: 'Send your expense reports and budget alerts via email.',
            status: 'Planned'
        }
    ]

    return (
        <div ref={ref} className="max-w-7xl mx-auto px-6">
            <div
                className={`text-center mb-20 transition-all duration-1000 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                    }`}
            >
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6">
                    The{' '}
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Roadmap
                    </span>
                </h2>
                <p className="text-xl text-zinc-400">Where we're headed next.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-1">
                {roadmapItems.map((item, index) => {
                    const Icon = item.icon
                    return (
                        <div
                            key={item.title}
                            className={`p-10 bg-zinc-900 border border-zinc-800 transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                                }`}
                            style={{ transitionDelay: `${index * 150}ms` }}
                        >
                            <div className="w-12 h-12 bg-white/5 flex items-center justify-center mb-6">
                                <Icon className="w-6 h-6 text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">{item.title}</h3>
                            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">{item.description}</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-none">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'In Progress' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-600'
                                    }`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{item.status}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// CTA Section Component
function CTASection() {
    const { ref, isInView } = useInView(0.3)

    return (
        <div ref={ref} className="max-w-4xl mx-auto px-6 text-center">
            <div
                className={`transition-all duration-1000 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                    }`}
            >
                <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tight mb-8">
                    Ready to take control?
                </h2>
                <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto">
                    Join thousands who've already transformed their financial habits. Start your journey today.
                </p>
                <Link
                    to="/auth/signup"
                    className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 font-black uppercase text-xl tracking-wider hover:opacity-90 transition-opacity"
                >
                    Get Started Free
                    <ChevronRight className="w-6 h-6" />
                </Link>
            </div>
        </div>
    )
}
