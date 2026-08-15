'use client'

import { useState, useMemo } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Plus, Search, Globe, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'faction', label: 'Factions' },
  { value: 'culture', label: 'Cultures' },
  { value: 'religion', label: 'Religions' },
  { value: 'organization', label: 'Organizations' },
  { value: 'government', label: 'Governments' },
  { value: 'technology', label: 'Technology' },
  { value: 'magic', label: 'Magic' },
  { value: 'species', label: 'Species' },
  { value: 'rule', label: 'Rules' },
  { value: 'concept', label: 'Concepts' },
]

const CATEGORY_COLORS: Record<string, string> = {
  faction: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  culture: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  religion: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  organization: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  government: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
  technology: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  magic: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  species: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  rule: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  concept: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
}

export function WorldPanel() {
  const { currentProjectId, setRightPanel, setSelectedWorld, selectedWorldId } = useWriterStore()
  const store = useDataStore()
  const [search, setSearch] = useState('')
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [newCategory, setNewCategory] = useState('faction')

  const elements = currentProjectId ? store.getWorldByProject(currentProjectId) : []

  // Auto-open categories that have elements (computed once from data)
  const autoOpenCategories = useMemo(() => {
    const cats = new Set(elements.map((e) => e.category).filter(Boolean))
    return cats
  }, [elements])

  // Merge auto-opened with manually toggled
  const effectiveOpenCategories = useMemo(() => {
    // If user hasn't manually toggled, use auto-opened
    if (openCategories.size === 0 && autoOpenCategories.size > 0) {
      return autoOpenCategories
    }
    return openCategories
  }, [openCategories, autoOpenCategories])

  const handleAdd = () => {
    if (!currentProjectId) return
    const newEl = store.addWorldElement({
      projectId: currentProjectId,
      name: 'New Element',
      category: newCategory,
      description: '',
      rules: '',
    })
    setSelectedWorld(newEl.id)
    setRightPanel('world-detail', newEl.id)
  }

  const handleClick = (id: string) => {
    setSelectedWorld(id)
    setRightPanel('world-detail', id)
  }

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Group elements by category
  const grouped: Record<string, typeof elements> = {}
  const filtered = elements.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )
  for (const el of filtered) {
    const cat = el.category || 'uncategorized'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(el)
  }

  // Merge with all known categories
  const allCategories = CATEGORIES.map((c) => c.value)
  const displayCategories = [...new Set([...allCategories, ...Object.keys(grouped)])]

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">World</h2>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add World Element</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleAdd}>Create</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <Input
            placeholder="Search world elements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {elements.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No world elements yet. Create one to build your world.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {displayCategories.map((cat) => {
              const catElements = grouped[cat] || []
              const catLabel = CATEGORIES.find((c) => c.value === cat)?.label || cat
              const isOpen = effectiveOpenCategories.has(cat)

              return (
                <Collapsible
                  key={cat}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(cat)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-1.5 p-2 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                      )}
                      <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        {catLabel}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] px-1.5 py-0 h-4 ml-auto font-normal',
                          CATEGORY_COLORS[cat] || ''
                        )}
                      >
                        {catElements.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 space-y-0.5">
                      {catElements.map((el) => (
                        <button
                          key={el.id}
                          onClick={() => handleClick(el.id)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 ${
                            selectedWorldId === el.id
                              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                              : ''
                          }`}
                        >
                          <Globe className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          <span className="text-sm text-stone-900 dark:text-stone-100 truncate">
                            {el.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
