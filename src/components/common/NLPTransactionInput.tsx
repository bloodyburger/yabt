import { useState } from 'react'
import { Loader2, Wand2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBudget } from '@/contexts/BudgetContext'

interface NLPTransactionInputProps {
    onClose: () => void
    onSuccess: () => void
}

export default function NLPTransactionInput({ onClose, onSuccess }: NLPTransactionInputProps) {
    const { currentBudget } = useBudget()
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [parsedResult, setParsedResult] = useState<any>(null)

    const parseTransaction = async () => {
        if (!text.trim() || !currentBudget) return

        setLoading(true)
        setError('')
        setParsedResult(null)

        try {
            // Call Ollama Cloud API (OpenAI-compatible)
            const apiKey = import.meta.env.VITE_OLLAMA_API_KEY
            if (!apiKey) {
                throw new Error('Ollama API key not configured')
            }

            const response = await fetch(
                'https://api.ollama.com/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'llama3.2',
                        messages: [{
                            role: 'user',
                            content: `Parse this text into a financial transaction. Respond ONLY with valid JSON, no markdown.

Text: "${text}"

Response format:
{
  "amount": <number or null>,
  "payee": "<string or null>",
  "category": "<string or null>",
  "account": "<string or null>",
  "date": "<YYYY-MM-DD or null>",
  "memo": "<string or null>",
  "type": "<expense or income>"
}

Rules:
- amount: Extract the monetary value (just the number, no currency symbols)
- payee: The merchant or person
- category: Best guess for spending category (e.g., Food, Transport, Entertainment)
- account: Extract account name if mentioned (e.g., "from HDFC", "using Cash", "paid with SBI")
- date: Parse any date mentioned, or use null for today
- type: "expense" for spending, "income" for receiving money
- If any field cannot be determined, use null`
                        }],
                        temperature: 0.1,
                        max_tokens: 250
                    })
                }
            )

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error?.message || `API Error: ${response.status}`)
            }

            const data = await response.json()
            const resultText = data.choices?.[0]?.message?.content || ''

            // Parse JSON from response
            const jsonMatch = resultText.match(/\{[\s\S]*\}/)
            if (!jsonMatch) throw new Error('Failed to parse response')

            const parsed = JSON.parse(jsonMatch[0])
            setParsedResult(parsed)

            // Validate required fields
            if (parsed.amount === null) {
                setError('Could not determine amount. Please specify the amount.')
                return
            }

            // Get all accounts for matching
            const { data: allAccounts } = await supabase
                .from('accounts')
                .select('id, name')
                .eq('budget_id', currentBudget.id)
                .eq('closed', false)

            let accountId: string | null = null

            // Try to match parsed account name
            if (parsed.account && allAccounts) {
                const matchingAccount = allAccounts.find((a: any) =>
                    a.name.toLowerCase().includes(parsed.account.toLowerCase()) ||
                    parsed.account.toLowerCase().includes(a.name.toLowerCase())
                )
                if (matchingAccount) {
                    accountId = matchingAccount.id
                }
            }

            // If no account matched, use or create "Inbox"
            if (!accountId) {
                const inboxAccount = allAccounts?.find((a: any) => a.name === 'Inbox')
                if (inboxAccount) {
                    accountId = inboxAccount.id
                } else {
                    // Create Inbox savings account
                    const { data: newInbox } = await supabase
                        .from('accounts')
                        .insert({
                            budget_id: currentBudget.id,
                            name: 'Inbox',
                            account_type: 'savings',
                            balance: 0,
                            is_on_budget: true,
                            closed: false
                        })
                        .select()
                        .single()

                    if (newInbox) {
                        accountId = newInbox.id
                    }
                }
            }

            if (!accountId) {
                setError('Failed to create or find account')
                return
            }

            // Find or create category
            let categoryId = null
            if (parsed.category) {
                // Try to find matching category
                const { data: categories } = await supabase
                    .from('categories')
                    .select('id, name, category_group_id, category_groups!inner(budget_id)')
                    .eq('category_groups.budget_id', currentBudget.id)

                const matchingCategory = categories?.find(c =>
                    c.name.toLowerCase().includes(parsed.category.toLowerCase()) ||
                    parsed.category.toLowerCase().includes(c.name.toLowerCase())
                )

                if (matchingCategory) {
                    categoryId = matchingCategory.id
                } else {
                    // Use Assorted/Uncategorized
                    const assortedCat = categories?.find(c => c.name === 'Uncategorized')
                    categoryId = assortedCat?.id || null
                }
            }

            // Get or create payee
            let payeeId = null
            if (parsed.payee) {
                const { data: existingPayee } = await supabase
                    .from('payees')
                    .select('id')
                    .eq('budget_id', currentBudget.id)
                    .ilike('name', parsed.payee)
                    .limit(1)

                if (existingPayee && existingPayee.length > 0) {
                    payeeId = existingPayee[0].id
                } else {
                    const { data: newPayee } = await supabase
                        .from('payees')
                        .insert({ budget_id: currentBudget.id, name: parsed.payee })
                        .select()
                        .single()
                    payeeId = newPayee?.id
                }
            }

            const finalAmount = parsed.type === 'expense' ? -Math.abs(parsed.amount) : Math.abs(parsed.amount)
            const transactionDate = parsed.date || new Date().toISOString().split('T')[0]

            // Create transaction
            await supabase.from('transactions').insert({
                account_id: accountId,
                category_id: categoryId,
                payee_id: payeeId,
                date: transactionDate,
                amount: finalAmount,
                memo: parsed.memo || `[NLP] ${text.substring(0, 50)}`,
                cleared: false,
                approved: true
            })

            // Update account balance
            const { data: accData } = await supabase
                .from('accounts')
                .select('balance')
                .eq('id', accountId)
                .single()

            await supabase
                .from('accounts')
                .update({ balance: (accData?.balance || 0) + finalAmount })
                .eq('id', accountId)

            // Log activity
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('activity_log').insert({
                user_id: user?.id,
                action: 'nlp_transaction_created',
                entity_type: 'transaction',
                details: { input_text: text, parsed_result: parsed }
            })

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to parse transaction')

            // Log failure
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('activity_log').insert({
                user_id: user?.id,
                action: 'nlp_transaction_failed',
                status: 'error',
                error_message: err.message,
                details: { input_text: text }
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Quick Add (Natural Language)
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Describe your transaction
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="e.g., Spent $25 on coffee at Starbucks today"
                            className="input min-h-[100px] resize-none"
                            rows={4}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Include amount, payee, and any other details. AI will parse and create the transaction.
                        </p>
                    </div>

                    {parsedResult && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm">
                            <p className="font-medium mb-2">Parsed Result:</p>
                            <div className="space-y-1 text-slate-600 dark:text-slate-400">
                                <p>Amount: {parsedResult.amount}</p>
                                <p>Payee: {parsedResult.payee || 'Not specified'}</p>
                                <p>Category: {parsedResult.category || 'Uncategorized'}</p>
                                <p>Type: {parsedResult.type}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button
                            onClick={parseTransaction}
                            disabled={loading || !text.trim()}
                            className="btn bg-purple-500 hover:bg-purple-600 text-white flex-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Parsing...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-4 h-4" />
                                    Add Transaction
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
