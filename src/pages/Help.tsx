import { Link } from 'react-router-dom'
import {
    ArrowLeft, Zap, PiggyBank, Wallet, TrendingUp, BarChart3,
    Plus, MessageSquare, Settings, CreditCard, Target, ArrowRightLeft,
    ChevronDown, Sparkles, HelpCircle, BookOpen
} from 'lucide-react'
import logo from '@/assets/logo.png'
import { useState } from 'react'

// Collapsible Section Component
function HelpSection({ title, icon: Icon, children, defaultOpen = false }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="border border-white/10 rounded-xl overflow-hidden mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 bg-slate-900/50 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-white">{title}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-6 py-6 bg-slate-950/50 border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    )
}

export default function Help() {
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
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                        <BookOpen className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold">Help Center</h1>
                        <p className="text-slate-400">Learn how to use YABT effectively</p>
                    </div>
                </div>

                <div className="mt-12 space-y-2">
                    {/* Getting Started */}
                    <HelpSection title="Getting Started" icon={Sparkles} defaultOpen={true}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Welcome to YABT!</h4>
                                <p className="leading-relaxed">
                                    YABT (Yet Another Budgeting Tool) uses the zero-based budgeting method, where every dollar/rupee
                                    has a job. This means you allocate your income to specific categories until you have ₹0 left to assign.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Step 1: Create Your Account</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Click "Get Started" or "Sign Up" on the landing page</li>
                                    <li>Enter your email and create a password</li>
                                    <li>Verify your email if required</li>
                                    <li>You'll be directed to your budget dashboard</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Step 2: Set Up Your Accounts</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Navigate to the <strong className="text-white">Accounts</strong> page from the sidebar</li>
                                    <li>Click <strong className="text-white">"Add Account"</strong></li>
                                    <li>Choose account type (Checking, Savings, Credit Card, Cash, Investment)</li>
                                    <li>Enter a name and starting balance</li>
                                    <li>Your accounts will appear in the sidebar for quick access</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Step 3: Create Budget Categories</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>On the <strong className="text-white">Budget</strong> page, you'll see default category groups</li>
                                    <li>Click <strong className="text-white">"Add Category"</strong> to create custom categories</li>
                                    <li>Organize categories into groups (e.g., Bills, Food, Entertainment)</li>
                                    <li>Common categories include: Rent, Groceries, Utilities, Transport, Subscriptions</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Step 4: Assign Your Money</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Your total account balances show as <strong className="text-white">"Ready to Assign"</strong> at the top</li>
                                    <li>Click on any category's <strong className="text-white">Budget</strong> column</li>
                                    <li>Enter the amount you want to budget for that category</li>
                                    <li>Press Enter to save</li>
                                    <li>Continue until "Ready to Assign" reaches ₹0</li>
                                </ol>
                            </div>
                        </div>
                    </HelpSection>

                    {/* Adding Transactions */}
                    <HelpSection title="Adding Transactions" icon={Plus}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Two Ways to Add Transactions</h4>
                                <p className="leading-relaxed mb-4">
                                    YABT offers both manual entry and AI-powered quick add for adding transactions.
                                </p>
                            </div>

                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                                <h4 className="text-purple-300 font-semibold mb-2 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    AI-Powered Quick Add (Recommended)
                                </h4>
                                <p className="text-slate-300 mb-3">
                                    Click the floating <strong className="text-white">+ button</strong> at the bottom right,
                                    then select <strong className="text-white">"Quick Add (AI)"</strong>.
                                </p>
                                <p className="text-slate-400 mb-3">Simply type naturally, for example:</p>
                                <ul className="space-y-2 text-sm">
                                    <li className="bg-slate-800 rounded px-3 py-2 font-mono">"Spent 500 at Starbucks from HDFC"</li>
                                    <li className="bg-slate-800 rounded px-3 py-2 font-mono">"Received salary 50000 in SBI"</li>
                                    <li className="bg-slate-800 rounded px-3 py-2 font-mono">"Paid 2000 for groceries using cash"</li>
                                    <li className="bg-slate-800 rounded px-3 py-2 font-mono">"Netflix subscription 199 from ICICI"</li>
                                </ul>
                                <p className="text-slate-400 text-sm mt-3">
                                    The AI will parse your text and pre-fill the transaction form for you to review and confirm.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Manual Entry</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Click the <strong className="text-white">+ button</strong> → "Add Manually"</li>
                                    <li>Select <strong className="text-white">Expense</strong> or <strong className="text-white">Income</strong></li>
                                    <li>Enter the payee name (who you paid or received from)</li>
                                    <li>Enter the amount</li>
                                    <li>Select the category</li>
                                    <li>Choose the account</li>
                                    <li>Add an optional memo for notes</li>
                                    <li>Click <strong className="text-white">"Add Transaction"</strong></li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Editing Transactions</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Go to any account page or the Accounts list</li>
                                    <li>Click on any transaction row to open the edit modal</li>
                                    <li>Modify any field as needed</li>
                                    <li>Click <strong className="text-white">"Save Changes"</strong></li>
                                </ol>
                            </div>
                        </div>
                    </HelpSection>

                    {/* Budget Management */}
                    <HelpSection title="Budget Management" icon={PiggyBank}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Understanding Your Budget View</h4>
                                <p className="leading-relaxed">
                                    The Budget page shows three key columns for each category:
                                </p>
                                <ul className="mt-3 space-y-3">
                                    <li className="flex items-start gap-3">
                                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm font-medium">Budgeted</span>
                                        <span>How much you've assigned to this category for the month</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-sm font-medium">Spent</span>
                                        <span>Total expenses in this category for the month</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">Available</span>
                                        <span>Money left to spend (Budgeted - Spent)</span>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Editing Budgeted Amounts</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Click on any <strong className="text-white">Budgeted</strong> amount in a category row</li>
                                    <li>The field becomes editable - type your new amount</li>
                                    <li>Press <strong className="text-white">Enter</strong> to save or <strong className="text-white">Escape</strong> to cancel</li>
                                    <li>The "Ready to Assign" amount updates automatically</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Monthly Navigation</h4>
                                <p className="leading-relaxed">
                                    Use the <strong className="text-white">← and →</strong> arrows at the top of the Budget page to navigate
                                    between months. Each month has its own budget allocations.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Category Groups</h4>
                                <p className="leading-relaxed">
                                    Categories are organized into groups for better organization. Default groups include:
                                </p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Bills & Utilities</li>
                                    <li>Food & Dining</li>
                                    <li>Transportation</li>
                                    <li>Entertainment</li>
                                    <li>Savings & Goals</li>
                                </ul>
                            </div>
                        </div>
                    </HelpSection>

                    {/* Account Types */}
                    <HelpSection title="Account Types" icon={Wallet}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Supported Account Types</h4>
                                <div className="grid gap-4 mt-4">
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <h5 className="text-white font-medium mb-1">💳 Checking</h5>
                                        <p className="text-sm text-slate-400">Your primary transactional accounts (salary accounts, daily use accounts)</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <h5 className="text-white font-medium mb-1">🏦 Savings</h5>
                                        <p className="text-sm text-slate-400">Savings accounts, fixed deposits, or emergency funds</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <h5 className="text-white font-medium mb-1">💳 Credit Card</h5>
                                        <p className="text-sm text-slate-400">Credit cards show as negative balances (what you owe)</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <h5 className="text-white font-medium mb-1">💵 Cash</h5>
                                        <p className="text-sm text-slate-400">Physical cash, wallet money</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <h5 className="text-white font-medium mb-1">📈 Investment</h5>
                                        <p className="text-sm text-slate-400">Stocks, mutual funds, crypto - tracked for net worth</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Adding a New Account</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Go to <strong className="text-white">Accounts</strong> in the sidebar</li>
                                    <li>Click <strong className="text-white">"Add Account"</strong></li>
                                    <li>Select the account type</li>
                                    <li>Enter account name (e.g., "HDFC Savings", "ICICI Credit Card")</li>
                                    <li>Enter current balance</li>
                                    <li>Click <strong className="text-white">"Create Account"</strong></li>
                                </ol>
                            </div>
                        </div>
                    </HelpSection>

                    {/* Transfers */}
                    <HelpSection title="Transfers Between Accounts" icon={ArrowRightLeft}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">How Transfers Work</h4>
                                <p className="leading-relaxed">
                                    When you move money between your own accounts (like from Checking to Savings),
                                    it's a transfer, not an expense. Transfers don't affect your budget.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Creating a Transfer</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Click the <strong className="text-white">+ button</strong> → "Add Manually"</li>
                                    <li>Select <strong className="text-white">"Transfer"</strong> as the transaction type</li>
                                    <li>Choose the <strong className="text-white">From</strong> account</li>
                                    <li>Choose the <strong className="text-white">To</strong> account</li>
                                    <li>Enter the amount</li>
                                    <li>Click <strong className="text-white">"Add Transfer"</strong></li>
                                </ol>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                                <p className="text-yellow-300 text-sm">
                                    <strong>Tip:</strong> Paying off a credit card? Transfer from your Checking account
                                    to your Credit Card account to record the payment.
                                </p>
                            </div>
                        </div>
                    </HelpSection>

                    {/* Reports & Analytics */}
                    <HelpSection title="Reports & Analytics" icon={BarChart3}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Available Reports</h4>
                                <p className="leading-relaxed">
                                    Access the <strong className="text-white">Reports</strong> page from the sidebar to view:
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h5 className="text-white font-medium mb-2">📊 Spending by Category</h5>
                                    <p className="text-sm text-slate-400">
                                        Visual breakdown of where your money goes. See which categories consume the most of your budget.
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h5 className="text-white font-medium mb-2">📈 Monthly Trends</h5>
                                    <p className="text-sm text-slate-400">
                                        Track your income vs expenses over time. Identify patterns and seasonal spending habits.
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h5 className="text-white font-medium mb-2">💰 Income vs Expenses</h5>
                                    <p className="text-sm text-slate-400">
                                        Summary cards showing total income, total expenses, and net savings for the selected period.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Date Range Filter</h4>
                                <p className="leading-relaxed">
                                    Use the date picker at the top of the Reports page to filter data by specific time periods.
                                    View reports for this month, last month, or any custom date range.
                                </p>
                            </div>
                        </div>
                    </HelpSection>

                    {/* Net Worth */}
                    <HelpSection title="Net Worth Tracking" icon={TrendingUp}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Understanding Net Worth</h4>
                                <p className="leading-relaxed">
                                    Net Worth = <strong className="text-green-400">Total Assets</strong> - <strong className="text-red-400">Total Liabilities</strong>
                                </p>
                                <ul className="mt-3 space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-400">•</span>
                                        <span><strong className="text-white">Assets:</strong> Checking, Savings, Cash, Investments (positive balances)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-red-400">•</span>
                                        <span><strong className="text-white">Liabilities:</strong> Credit Cards, Loans (negative balances)</span>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Net Worth Page Features</h4>
                                <ul className="list-disc list-inside space-y-2">
                                    <li>Total Net Worth displayed prominently</li>
                                    <li>Breakdown of all assets by account</li>
                                    <li>Breakdown of all liabilities by account</li>
                                    <li>Historical trend chart showing net worth over time</li>
                                    <li>Track your wealth-building progress</li>
                                </ul>
                            </div>
                        </div>
                    </HelpSection>

                    {/* Settings */}
                    <HelpSection title="Settings & Preferences" icon={Settings}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Available Settings</h4>
                                <p className="leading-relaxed">
                                    Access <strong className="text-white">Settings</strong> from the sidebar to customize your experience:
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h5 className="text-white font-medium mb-2">💱 Currency</h5>
                                    <p className="text-sm text-slate-400">
                                        Set your preferred currency (INR, USD, EUR, etc.). All amounts will display in your chosen currency.
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h5 className="text-white font-medium mb-2">📅 Date Format</h5>
                                    <p className="text-sm text-slate-400">
                                        Choose between DD/MM/YYYY, MM/DD/YYYY, or other date formats.
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <h5 className="text-white font-medium mb-2">🔐 Account Security</h5>
                                    <p className="text-sm text-slate-400">
                                        Change your password and manage your account security settings.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </HelpSection>

                    {/* Tips & Best Practices */}
                    <HelpSection title="Tips & Best Practices" icon={Target}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Getting the Most from YABT</h4>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
                                    <h5 className="text-purple-300 font-medium mb-2">✨ Budget to Zero</h5>
                                    <p className="text-sm text-slate-300">
                                        Allocate every rupee until "Ready to Assign" shows ₹0. This ensures you have a plan for all your money.
                                    </p>
                                </div>
                                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                                    <h5 className="text-green-300 font-medium mb-2">📝 Log Transactions Daily</h5>
                                    <p className="text-sm text-slate-300">
                                        Use the AI Quick Add feature to log transactions as they happen. It takes just seconds!
                                    </p>
                                </div>
                                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                                    <h5 className="text-blue-300 font-medium mb-2">🎯 Create Savings Goals</h5>
                                    <p className="text-sm text-slate-300">
                                        Create categories for your goals (Emergency Fund, Vacation, New Phone) and budget towards them monthly.
                                    </p>
                                </div>
                                <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-xl p-4">
                                    <h5 className="text-orange-300 font-medium mb-2">📊 Review Weekly</h5>
                                    <p className="text-sm text-slate-300">
                                        Spend 10 minutes each week reviewing your spending. Adjust budgets as needed and plan for upcoming expenses.
                                    </p>
                                </div>
                                <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/30 rounded-xl p-4">
                                    <h5 className="text-pink-300 font-medium mb-2">💡 Roll with the Punches</h5>
                                    <p className="text-sm text-slate-300">
                                        Overspent in one category? Move money from another category to cover it. Budgets are flexible!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </HelpSection>

                    {/* FAQ */}
                    <HelpSection title="Frequently Asked Questions" icon={HelpCircle}>
                        <div className="space-y-6 text-slate-300">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Is YABT really free?</h4>
                                <p className="leading-relaxed">
                                    Yes! YABT is 100% free with no limits. All features are available to everyone.
                                    We accept optional donations to help cover server costs, but the app will always be free.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Is my financial data secure?</h4>
                                <p className="leading-relaxed">
                                    Absolutely. Your data is encrypted in transit and at rest. We use Supabase with row-level security,
                                    meaning only you can access your own data. We never sell or share your information.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Can I export my data?</h4>
                                <p className="leading-relaxed">
                                    Yes, you can export your transactions and budget data from the Settings page.
                                    Your data belongs to you, and you can take it with you anytime.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Does YABT connect to my bank?</h4>
                                <p className="leading-relaxed">
                                    Currently, YABT uses manual transaction entry (with AI assistance).
                                    This gives you more control and awareness of your spending. Bank sync may be added in the future.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">I made a mistake - how do I fix it?</h4>
                                <p className="leading-relaxed">
                                    Click on any transaction to edit or delete it. You can also edit budgeted amounts
                                    by clicking directly on them. All changes are saved automatically.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-white font-semibold mb-2">Is there an iOS app?</h4>
                                <p className="leading-relaxed">
                                    An iOS app is coming soon! For now, YABT works great on mobile browsers.
                                    Add it to your home screen for an app-like experience.
                                </p>
                            </div>
                        </div>
                    </HelpSection>
                </div>

                {/* Still Need Help */}
                <div className="mt-12 text-center p-8 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl">
                    <h3 className="text-xl font-bold mb-2">Still need help?</h3>
                    <p className="text-slate-400 mb-4">
                        Can't find what you're looking for? Reach out to us and we'll help you out!
                    </p>
                    <Link
                        to="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    )
}
