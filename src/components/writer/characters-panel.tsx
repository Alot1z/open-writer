'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Users } from 'lucide-react'

interface Character {
  id: string
  name: string
  role: string
  description: string
  age: string
  occupation: string
  tags: string
}

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'protagonist', label: 'Protagonist' },
  { value: 'antagonist', label: 'Antagonist' },
  { value: 'supporting', label: 'Supporting' },
  { value: 'minor', label: 'Minor' },
]

const ROLE_COLORS: Record<string, string> = {
  protagonist: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  antagonist: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  supporting: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  minor: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
}

export function CharactersPanel() {
  const { currentProjectId, setRightPanel, setSelectedCharacter, selectedCharacterId } = useWriterStore()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const fetchCharacters = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/characters?projectId=${currentProjectId}`)
      if (res.ok) {
        const data = await res.json()
        setCharacters(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchCharacters()
  }, [fetchCharacters])

  const handleAdd = async () => {
    if (!currentProjectId) return
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          name: 'New Character',
          role: 'supporting',
        }),
      })
      if (res.ok) {
        const newChar = await res.json()
        setCharacters((prev) => [...prev, newChar])
        setSelectedCharacter(newChar.id)
        setRightPanel('character-detail', newChar.id)
      }
    } catch {
      // silent
    }
  }

  const handleClick = (id: string) => {
    setSelectedCharacter(id)
    setRightPanel('character-detail', id)
  }

  const filtered = characters.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || c.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Characters</h2>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <Input
            placeholder="Search characters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {characters.length === 0
                ? 'No characters yet. Create one to start building your story.'
                : 'No characters match your filter.'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filtered.map((char) => (
              <button
                key={char.id}
                onClick={() => handleClick(char.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  selectedCharacterId === char.id
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    : ''
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-600 dark:text-stone-300 shrink-0">
                  {char.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {char.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {char.role && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 font-normal ${ROLE_COLORS[char.role] || ''}`}
                      >
                        {char.role}
                      </Badge>
                    )}
                    {char.occupation && (
                      <span className="text-[10px] text-stone-400 truncate">{char.occupation}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
