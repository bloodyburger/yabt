<script lang="ts">
    import { goto } from "$app/navigation";
    import {
        Wallet,
        PieChart,
        Target,
        TrendingUp,
        ArrowRight,
        Check,
    } from "lucide-svelte";

    let { data } = $props();

    // If user is logged in, redirect to budget
    $effect(() => {
        if (data.session) {
            goto("/budget");
        }
    });

    const features = [
        {
            icon: Wallet,
            title: "Give Every Dollar a Job",
            description:
                "Assign your income to categories before spending. Know exactly where your money goes.",
        },
        {
            icon: Target,
            title: "Set Savings Goals",
            description:
                "Create targets for savings, big purchases, or monthly spending limits with visual progress tracking.",
        },
        {
            icon: PieChart,
            title: "Spending Reports",
            description:
                "Beautiful charts show where your money goes. Track trends and make informed decisions.",
        },
        {
            icon: TrendingUp,
            title: "Track Net Worth",
            description:
                "Watch your wealth grow over time. See the big picture of your financial health.",
        },
    ];

    const benefits = [
        "Zero-based budgeting methodology",
        "Unlimited accounts and categories",
        "Real-time budget calculations",
        "Works on all devices",
        "Dark mode support",
        "Export your data anytime",
    ];
</script>

<div
    class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
>
    <!-- Navigation -->
    <nav
        class="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10"
    >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center gap-2">
                    <div
                        class="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center"
                    >
                        <Wallet class="w-5 h-5 text-white" />
                    </div>
                    <span class="text-xl font-bold text-white">YABT</span>
                </div>
                <div class="flex items-center gap-4">
                    <a
                        href="/auth/login"
                        class="text-slate-300 hover:text-white transition-colors"
                    >
                        Log In
                    </a>
                    <a href="/auth/signup" class="btn btn-primary">
                        Get Started
                        <ArrowRight class="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="pt-32 pb-20 px-4">
        <div class="max-w-4xl mx-auto text-center">
            <div
                class="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full text-sm mb-8"
            >
                <span class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                ></span>
                Free & Open Source
            </div>
            <h1
                class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
            >
                Take Control of
                <span
                    class="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent"
                >
                    Your Money
                </span>
            </h1>
            <p
                class="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
                A zero-based envelope budgeting app that helps you give every
                dollar a purpose. Stop wondering where your money went and start
                telling it where to go.
            </p>
            <div
                class="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
                <a
                    href="/auth/signup"
                    class="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                    Start Budgeting Free
                    <ArrowRight class="w-5 h-5" />
                </a>
                <a
                    href="#features"
                    class="w-full sm:w-auto px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/20 text-center"
                >
                    See How It Works
                </a>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 px-4">
        <div class="max-w-6xl mx-auto">
            <h2
                class="text-3xl md:text-4xl font-bold text-white text-center mb-4"
            >
                Everything You Need to Budget
            </h2>
            <p class="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
                Simple yet powerful tools to help you understand your spending,
                save for goals, and build lasting financial habits.
            </p>
            <div class="grid md:grid-cols-2 gap-6">
                {#each features as feature, i}
                    <div
                        class="group bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300"
                        style="animation-delay: {i * 100}ms"
                    >
                        <div
                            class="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                        >
                            <svelte:component
                                this={feature.icon}
                                class="w-7 h-7 text-white"
                            />
                        </div>
                        <h3 class="text-xl font-semibold text-white mb-3">
                            {feature.title}
                        </h3>
                        <p class="text-slate-400 leading-relaxed">
                            {feature.description}
                        </p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Benefits Section -->
    <section
        class="py-20 px-4 bg-gradient-to-b from-transparent to-slate-900/50"
    >
        <div class="max-w-4xl mx-auto">
            <div
                class="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-white/10 rounded-3xl p-8 md:p-12"
            >
                <h2 class="text-3xl font-bold text-white text-center mb-10">
                    Why Choose YABT?
                </h2>
                <div class="grid md:grid-cols-2 gap-4">
                    {#each benefits as benefit}
                        <div class="flex items-center gap-3 text-slate-300">
                            <div
                                class="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0"
                            >
                                <Check class="w-4 h-4 text-emerald-400" />
                            </div>
                            <span>{benefit}</span>
                        </div>
                    {/each}
                </div>
                <div class="text-center mt-10">
                    <a
                        href="/auth/signup"
                        class="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all"
                    >
                        Create Free Account
                        <ArrowRight class="w-5 h-5" />
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 px-4 border-t border-white/10">
        <div
            class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6"
        >
            <div class="flex items-center gap-2">
                <div
                    class="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center"
                >
                    <Wallet class="w-5 h-5 text-white" />
                </div>
                <span class="text-lg font-bold text-white">YABT</span>
                <span class="text-slate-500 text-sm"
                    >- Yet Another Budget Tool</span
                >
            </div>
            <p class="text-slate-500 text-sm">
                Built with ❤️ using SvelteKit & Supabase
            </p>
        </div>
    </footer>
</div>
