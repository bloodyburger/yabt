/**
 * NLP Transaction Input
 * Natural language transaction creation with AI parsing
 * Uses DataService for storage abstraction
 */

import { useState } from 'react'
import { Loader2, Wand2, X, Mic, MicOff } from 'lucide-react'
import { useBudget } from '@/contexts/BudgetContext'
import { useData } from '@/contexts/DataContext'

interface NLPTransactionInputProps {
    onClose: () => void
    onSuccess: () => void
}

export default function NLPTransactionInput({ onClose, onSuccess }: NLPTransactionInputProps) {
    const { currentBudget } = useBudget()
    const { dataService, isInitialized } = useData()
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [recordingError, setRecordingError] = useState('')
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
    const [error, setError] = useState('')
    const [parsedResult, setParsedResult] = useState<any>(null)

    const parseTransaction = async () => {
        if (!text.trim() || !currentBudget || !isInitialized) return

        setLoading(true)
        setError('')
        setParsedResult(null)

        try {
            // Call our backend proxy (which forwards to Ollama Cloud API)
            const response = await fetch(
                '/api/ai/chat',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-oss:20b-cloud',
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
                        stream: false,
                        options: {
                            temperature: 0.1,
                            num_predict: 500
                        }
                    })
                }
            )

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `API Error: ${response.status}`)
            }

            const data = await response.json()
            const resultText = data.message?.content || data.choices?.[0]?.message?.content || ''

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
            const allAccounts = await dataService.getAccounts(currentBudget.id)
            const openAccounts = allAccounts.filter(a => !a.closed)

            let accountId: string | null = null

            // Try to match parsed account name
            if (parsed.account && openAccounts.length > 0) {
                const matchingAccount = openAccounts.find(a =>
                    a.name.toLowerCase().includes(parsed.account.toLowerCase()) ||
                    parsed.account.toLowerCase().includes(a.name.toLowerCase())
                )
                if (matchingAccount) {
                    accountId = matchingAccount.id
                }
            }

            // If no account matched, use or create "Inbox"
            if (!accountId) {
                const inboxAccount = openAccounts.find(a => a.name === 'Inbox')
                if (inboxAccount) {
                    accountId = inboxAccount.id
                } else {
                    // Create Inbox savings account
                    const newInbox = await dataService.createAccount({
                        budget_id: currentBudget.id,
                        name: 'Inbox',
                        type: 'savings',
                        balance: 0,
                        on_budget: true,
                        closed: false,
                        sort_order: 999
                    })
                    accountId = newInbox.id
                }
            }

            if (!accountId) {
                setError('Failed to create or find account')
                return
            }

            // Find or create category
            let categoryId: string | null = null
            let usedLearnedCategory = false

            // LEARNING: First check if we have a learned rule for this payee
            if (parsed.payee) {
                const normalizedPayee = parsed.payee.toLowerCase().trim()
                const rules = await dataService.getPayeeCategoryRules(currentBudget.id)
                const learnedRule = rules.find(r => r.payee_name === normalizedPayee)

                if (learnedRule?.category_id) {
                    categoryId = learnedRule.category_id
                    usedLearnedCategory = true
                }
            }

            // If no learned rule, use AI-suggested category
            if (!categoryId && parsed.category) {
                const categories = await dataService.getCategories(currentBudget.id)

                const matchingCategory = categories.find(c =>
                    c.name.toLowerCase().includes(parsed.category.toLowerCase()) ||
                    parsed.category.toLowerCase().includes(c.name.toLowerCase())
                )

                if (matchingCategory) {
                    categoryId = matchingCategory.id
                } else {
                    // Use Uncategorized if exists
                    const uncategorized = categories.find(c => c.name === 'Uncategorized')
                    categoryId = uncategorized?.id || null
                }
            }

            // Get or create payee
            let payeeId: string | null = null
            if (parsed.payee) {
                const existingPayee = await dataService.getPayeeByName(currentBudget.id, parsed.payee)

                if (existingPayee) {
                    payeeId = existingPayee.id
                } else {
                    const newPayee = await dataService.createPayee({
                        budget_id: currentBudget.id,
                        name: parsed.payee
                    })
                    payeeId = newPayee.id
                }
            }

            const finalAmount = parsed.type === 'expense' ? -Math.abs(parsed.amount) : Math.abs(parsed.amount)
            const transactionDate = parsed.date || new Date().toISOString().split('T')[0]

            // Create transaction
            await dataService.createTransaction({
                account_id: accountId,
                category_id: categoryId,
                payee_id: payeeId,
                transfer_account_id: null,
                date: transactionDate,
                amount: finalAmount,
                memo: parsed.memo || `[NLP] ${text.substring(0, 50)}`,
                cleared: false,
                approved: true
            })

            // Update account balance
            const account = await dataService.getAccount(accountId)
            if (account) {
                await dataService.updateAccount(accountId, {
                    balance: account.balance + finalAmount
                })
            }

            // LEARNING: Save payee-category rule for future use
            if (parsed.payee && categoryId && !usedLearnedCategory) {
                const normalizedPayee = parsed.payee.toLowerCase().trim()
                await dataService.upsertPayeeCategoryRule(currentBudget.id, normalizedPayee, categoryId)
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to parse transaction')
        } finally {
            setLoading(false)
        }
    }

    const startRecording = async () => {
        try {
            setRecordingError('')
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            const chunks: Blob[] = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data)
                }
            }

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' })
                await transcribeAudio(audioBlob)
                stream.getTracks().forEach(track => track.stop())
            }

            recorder.start()
            setMediaRecorder(recorder)
            setIsListening(true)
        } catch (err: any) {
            console.error('Error accessing microphone:', err)
            setRecordingError('Could not access microphone. Please check permissions.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorder && isListening) {
            mediaRecorder.stop()
            setIsListening(false)
            setMediaRecorder(null)
        }
    }

    const transcribeAudio = async (audioBlob: Blob) => {
        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', audioBlob, 'recording.webm')

            const response = await fetch('/api/ai/transcribe', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Transcription failed')
            }

            const data = await response.json()
            const transcript = data.text
            if (transcript) {
                setText((prev) => (prev ? `${prev} ${transcript}` : transcript))
            }
        } catch (err: any) {
            console.error('Transcription error:', err)
            setError('Failed to transcribe audio. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const toggleListening = () => {
        if (isListening) {
            stopRecording()
        } else {
            startRecording()
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

                    {recordingError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {recordingError}
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Describe your transaction
                            </label>
                            <button
                                onClick={toggleListening}
                                className={`p-2 rounded-full transition-colors ${isListening
                                    ? 'bg-red-100 text-red-600 animate-pulse'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                                    }`}
                                title={isListening ? 'Stop listening' : 'Start listening'}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={isListening ? "Listening..." : "e.g., Spent $25 on coffee at Starbucks today"}
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
