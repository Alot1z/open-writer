'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Save, Link2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Relationship {
  id: string
  sourceId: string
  sourceType: string
  targetId: string
  targetType: string
  type: string
  description: string
  strength: number
}

interface Character {
  id: string
  name: string
  role: string
  description: string
  age: string
  occupation: string
  personality: string
  appearance: string
  backstory: string
  motivation: string
  goals: string
  fears: string
  tags: string
  relationships: Relationship[]
}

const ROLE_OPTIONS = ['protagonist', 'antagonist', 'supporting', 'minor']

interface CharacterDetailProps {
  characterId?: string
}

export function CharacterDetail({ characterId: characterIdProp }: CharacterDetailProps = {}) {
  const { selectedCharacterId, setRightPanel, setSelectedCharacter, currentProjectId } = useWriterStore()
  const effectiveId = characterIdProp ?? selectedCharacterId
  const { toast } = useToast()
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCharacter = useCallback(async () => {
    if (!effectiveId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/characters/${effectiveId}`)
      if (res.ok) {
        const data = await res.json()
        setCharacter(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [effectiveId])

  useEffect(() => {
    fetchCharacter()
  }, [fetchCharacter])

  const saveField = useCallback(
    (field: string, value: string) => {
      if (!character) return
      setCharacter((prev) => (prev ? { ...prev, [field]: value } : prev))

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaving(true)
        try {
          const res = await fetch(`/api/characters/${character.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
          })
          if (res.ok) {
            toast({ title: 'Saved', description: 'Character updated' })
          }
        } catch {
          // silent
        } finally {
          setSaving(false)
        }
      }, 800)
    },
    [character, toast]
  )

  const handleDelete = async () => {
    if (!character) return
    try {
      const res = await fetch(`/api/characters/${character.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSelectedCharacter(null)
        setRightPanel('none')
        toast({ title: 'Deleted', description: 'Character removed' })
      }
    } catch {
      // silent
    }
  }

  const parseTags = (tagsStr: string): string[] => {
    try {
      return JSON.parse(tagsStr || '[]')
    } catch {
      return []
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
        <Separator />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!character) {
    return (
      <div className="p-6 text-center text-sm text-stone-500">
        Select a character to view details
      </div>
    )
  }

  const tags = parseTags(character.tags)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Input
              value={character.name}
              onChange={(e) => saveField('name', e.target.value)}
              className="text-lg font-semibold border-transparent hover:border-stone-300 focus:border-stone-400 bg-transparent h-8 px-1"
            />
            <div className="flex items-center gap-2 mt-1 px-1">
              <Select value={character.role} onValueChange={(v) => saveField('role', v)}>
                <SelectTrigger className="h-6 w-32 text-xs border-transparent hover:border-stone-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving && (
                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                  <Save className="h-3 w-3" /> Saving...
                </span>
              )}
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Character</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{character.name}&rdquo;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator />

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Age</Label>
            <Input
              value={character.age}
              onChange={(e) => saveField('age', e.target.value)}
              placeholder="Age"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Occupation</Label>
            <Input
              value={character.occupation}
              onChange={(e) => saveField('occupation', e.target.value)}
              placeholder="Occupation"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Description</Label>
          <Textarea
            value={character.description}
            onChange={(e) => saveField('description', e.target.value)}
            placeholder="Brief description of the character..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        <Separator />

        {/* Personality & Appearance */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Personality</Label>
          <Textarea
            value={character.personality}
            onChange={(e) => saveField('personality', e.target.value)}
            placeholder="Character traits and personality..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Appearance</Label>
          <Textarea
            value={character.appearance}
            onChange={(e) => saveField('appearance', e.target.value)}
            placeholder="Physical appearance..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        <Separator />

        {/* Backstory */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Backstory</Label>
          <Textarea
            value={character.backstory}
            onChange={(e) => saveField('backstory', e.target.value)}
            placeholder="Character backstory..."
            className="text-sm min-h-[80px] resize-y"
          />
        </div>

        {/* Motivation, Goals, Fears */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Motivation</Label>
          <Textarea
            value={character.motivation}
            onChange={(e) => saveField('motivation', e.target.value)}
            placeholder="What drives this character..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Goals</Label>
          <Textarea
            value={character.goals}
            onChange={(e) => saveField('goals', e.target.value)}
            placeholder="Character goals..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Fears</Label>
          <Textarea
            value={character.fears}
            onChange={(e) => saveField('fears', e.target.value)}
            placeholder="Character fears..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-xs text-stone-500">Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.length > 0 ? (
              tags.map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-stone-400">No tags</span>
            )}
          </div>
          <Input
            placeholder="Add tag and press Enter"
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const newTags = [...tags, e.currentTarget.value.trim()]
                saveField('tags', JSON.stringify(newTags))
                e.currentTarget.value = ''
              }
            }}
          />
        </div>

        <Separator />

        {/* Relationships */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-stone-500" />
            <Label className="text-xs text-stone-500">Relationships</Label>
          </div>
          {character.relationships && character.relationships.length > 0 ? (
            <div className="space-y-1.5">
              {character.relationships.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-stone-50 dark:bg-stone-800/50 text-xs"
                >
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {rel.type}
                  </Badge>
                  <span className="text-stone-600 dark:text-stone-300 flex-1 truncate">
                    {rel.description || `${rel.targetType}: ${rel.targetId}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400">No relationships defined</p>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
