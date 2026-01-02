/**
 * Tag Manager
 * Manage and select tags for transactions
 * Uses DataService for storage abstraction
 */

import { useState, useEffect } from 'react'
import { Tag, Plus, X, Check, Palette } from 'lucide-react'
import { useBudget } from '@/contexts/BudgetContext'
import { useDataService } from '@/contexts/DataContext'

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
    const dataService = useDataService()
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
    }, [currentBudget, dataService])

    useEffect(() => {
        if (transactionId) {
            fetchTransactionTags()
        }
    }, [transactionId, dataService])

    const fetchTags = async () => {
        if (!currentBudget) return
        setLoading(true)

        try {
            const data = await dataService.getTags(currentBudget.id)
            setTags(data.map(t => ({ id: t.id, name: t.name, color: t.color })))
        } catch (error) {
            console.error('Error fetching tags:', error)
        }
        setLoading(false)
    }

    const fetchTransactionTags = async () => {
        if (!transactionId) return

        try {
            const tagIds = await dataService.getTransactionTags(transactionId)
            setSelected(tagIds)
        } catch (error) {
            console.error('Error fetching transaction tags:', error)
        }
    }

    const createTag = async () => {
        if (!currentBudget || !newTagName.trim()) return
        setCreating(true)

        try {
            const newTag = await dataService.createTag({
                budget_id: currentBudget.id,
                name: newTagName.trim(),
                color: newTagColor
            })
            setTags([...tags, { id: newTag.id, name: newTag.name, color: newTag.color }])
            setNewTagName('')
            setShowCreate(false)
        } catch (error) {
            console.error('Error creating tag:', error)
        }
        setCreating(false)
    }

    const deleteTag = async (tagId: string) => {
        try {
            await dataService.deleteTag(tagId)
            setTags(tags.filter(t => t.id !== tagId))
            setSelected(selected.filter(id => id !== tagId))
        } catch (error) {
            console.error('Error deleting tag:', error)
        }
    }

    const toggleTag = async (tagId: string) => {
        const isSelected = selected.includes(tagId)
        const newSelected = isSelected
            ? selected.filter(id => id !== tagId)
            : [...selected, tagId]

        setSelected(newSelected)

        if (transactionId) {
            try {
                if (isSelected) {
                    await dataService.removeTransactionTag(transactionId, tagId)
                } else {
                    await dataService.addTransactionTag(transactionId, tagId)
                }
            } catch (error) {
                console.error('Error updating transaction tag:', error)
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
    const { currentBudget } = useBudget()
    const dataService = useDataService()
    const [tags, setTags] = useState<TagItem[]>([])

    useEffect(() => {
        fetchTransactionTags()
    }, [transactionId, dataService, currentBudget])

    const fetchTransactionTags = async () => {
        if (!currentBudget) return

        try {
            // Get tag IDs for this transaction
            const tagIds = await dataService.getTransactionTags(transactionId)

            if (tagIds.length > 0) {
                // Get all tags for the budget and filter to the ones we need
                const allTags = await dataService.getTags(currentBudget.id)
                const transactionTags = allTags
                    .filter(t => tagIds.includes(t.id))
                    .map(t => ({ id: t.id, name: t.name, color: t.color }))
                setTags(transactionTags)
            } else {
                setTags([])
            }
        } catch (error) {
            console.error('Error fetching transaction tags:', error)
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
