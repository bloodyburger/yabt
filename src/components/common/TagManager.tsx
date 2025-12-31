import { useState, useEffect } from 'react'
import { Tag, Plus, X, Check, Palette } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBudget } from '@/contexts/BudgetContext'

interface TagItem {
    id: string
    name: string
    color: string
}

interface TagManagerProps {
    transactionId?: string
    selectedTagIds?: string[]
    onTagsChange?: (tagIds: string[]) => void
    mode?: 'manage' | 'select'
}

const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E'
]

export default function TagManager({ transactionId, selectedTagIds = [], onTagsChange, mode = 'select' }: TagManagerProps) {
    const { currentBudget } = useBudget()
    const [tags, setTags] = useState<TagItem[]>([])
    const [selected, setSelected] = useState<string[]>(selectedTagIds)
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newTagName, setNewTagName] = useState('')
    const [newTagColor, setNewTagColor] = useState(COLORS[0])
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (currentBudget) {
            fetchTags()
        }
    }, [currentBudget])

    useEffect(() => {
        if (transactionId) {
            fetchTransactionTags()
        }
    }, [transactionId])

    const fetchTags = async () => {
        if (!currentBudget) return
        setLoading(true)

        const { data } = await supabase
            .from('tags')
            .select('id, name, color')
            .eq('budget_id', currentBudget.id)
            .order('name')

        if (data) {
            setTags(data)
        }
        setLoading(false)
    }

    const fetchTransactionTags = async () => {
        if (!transactionId) return

        const { data } = await supabase
            .from('transaction_tags')
            .select('tag_id')
            .eq('transaction_id', transactionId)

        if (data) {
            setSelected(data.map((t: { tag_id: string }) => t.tag_id))
        }
    }

    const createTag = async () => {
        if (!currentBudget || !newTagName.trim()) return
        setCreating(true)

        const { data, error } = await supabase
            .from('tags')
            .insert({
                budget_id: currentBudget.id,
                name: newTagName.trim(),
                color: newTagColor
            })
            .select()
            .single()

        if (data && !error) {
            setTags([...tags, data])
            setNewTagName('')
            setShowCreate(false)
        }
        setCreating(false)
    }

    const deleteTag = async (tagId: string) => {
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', tagId)

        if (!error) {
            setTags(tags.filter(t => t.id !== tagId))
            setSelected(selected.filter(id => id !== tagId))
        }
    }

    const toggleTag = async (tagId: string) => {
        const isSelected = selected.includes(tagId)
        const newSelected = isSelected
            ? selected.filter(id => id !== tagId)
            : [...selected, tagId]

        setSelected(newSelected)

        if (transactionId) {
            if (isSelected) {
                await supabase
                    .from('transaction_tags')
                    .delete()
                    .eq('transaction_id', transactionId)
                    .eq('tag_id', tagId)
            } else {
                await supabase
                    .from('transaction_tags')
                    .insert({
                        transaction_id: transactionId,
                        tag_id: tagId
                    })
            }
        }

        if (onTagsChange) {
            onTagsChange(newSelected)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Tag className="w-4 h-4 animate-pulse" />
                Loading tags...
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Tag List */}
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                    const isSelected = selected.includes(tag.id)
                    return (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleTag(tag.id)
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected
                                ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800'
                                : 'opacity-60 hover:opacity-100'
                                }`}
                            style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                                boxShadow: isSelected ? `0 0 0 2px ${tag.color}` : undefined
                            }}
                        >
                            {isSelected && <Check className="w-3 h-3" />}
                            {tag.name}
                            {mode === 'manage' && (
                                <X
                                    className="w-3 h-3 ml-1 hover:scale-125 transition-transform"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteTag(tag.id)
                                    }}
                                />
                            )}
                        </button>
                    )
                })}

                {/* Add Tag Button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowCreate(!showCreate)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    New Tag
                </button>
            </div>

            {/* Create New Tag Form */}
            {showCreate && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="Tag name..."
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    createTag()
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                createTag()
                            }}
                            disabled={creating || !newTagName.trim()}
                            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {creating ? 'Creating...' : 'Create'}
                        </button>
                    </div>

                    {/* Color Picker */}
                    <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-wrap gap-1.5">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setNewTagColor(color)
                                    }}
                                    className={`w-6 h-6 rounded-full transition-transform ${newTagColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {tags.length === 0 && !showCreate && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    No tags yet. Create one to organize your transactions.
                </p>
            )}
        </div>
    )
}

// Compact tag display for transaction rows
export function TransactionTags({ transactionId }: { transactionId: string }) {
    const [tags, setTags] = useState<TagItem[]>([])

    useEffect(() => {
        fetchTransactionTags()
    }, [transactionId])

    const fetchTransactionTags = async () => {
        const { data } = await supabase
            .from('transaction_tags')
            .select('tags(id, name, color)')
            .eq('transaction_id', transactionId)

        if (data) {
            setTags(data.map((t: any) => t.tags).filter(Boolean))
        }
    }

    if (tags.length === 0) return null

    return (
        <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
                <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color
                    }}
                >
                    {tag.name}
                </span>
            ))}
        </div>
    )
}
