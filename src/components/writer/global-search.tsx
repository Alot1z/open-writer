"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useWriterStore } from "@/store/writer-store"
import { useSearch } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Users,
  MapPin,
  Package,
  StickyNote,
  Globe,
  Clock,
  Search,
} from "lucide-react"

interface SearchResult {
  id: string
  name: string
  description?: string
  type: string
}

interface GroupedResults {
  scenes: SearchResult[]
  characters: SearchResult[]
  locations: SearchResult[]
  objects: SearchResult[]
  notes: SearchResult[]
  worldElements: SearchResult[]
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  scenes: { label: "Scenes", icon: FileText, color: "text-emerald-600" },
  characters: { label: "Characters", icon: Users, color: "text-violet-600" },
  locations: { label: "Locations", icon: MapPin, color: "text-amber-600" },
  objects: { label: "Objects", icon: Package, color: "text-teal-600" },
  notes: { label: "Notes", icon: StickyNote, color: "text-orange-600" },
  worldElements: {
    label: "World Elements",
    icon: Globe,
    color: "text-rose-600",
  },
  timelineEvents: {
    label: "Timeline Events",
    icon: Clock,
    color: "text-cyan-600",
  },
}

const EMPTY_RESULTS: GroupedResults = {
  scenes: [],
  characters: [],
  locations: [],
  objects: [],
  notes: [],
  worldElements: [],
}

export function GlobalSearch() {
  const { isSearchOpen, setSearchOpen, searchQuery, setSearchQuery, currentProjectId } =
    useWriterStore()
  const searchHelper = useSearch()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isSearchOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(!isSearchOpen)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isSearchOpen, setSearchOpen])

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  // Perform search reactively via data store
  const results = useMemo<GroupedResults>(() => {
    if (!debouncedQuery.trim() || !currentProjectId) return EMPTY_RESULTS

    const raw = searchHelper.search(debouncedQuery, currentProjectId)

    const grouped: GroupedResults = {
      scenes: [],
      characters: [],
      locations: [],
      objects: [],
      notes: [],
      worldElements: [],
    }

    for (const r of raw) {
      const item: SearchResult = {
        id: r.id,
        name: r.title,
        description: r.preview || undefined,
        type: r.type,
      }
      if (r.type === 'scene' || r.type === 'chapter') {
        grouped.scenes.push(item)
      } else if (r.type === 'character') {
        grouped.characters.push(item)
      } else if (r.type === 'location') {
        grouped.locations.push(item)
      } else if (r.type === 'object' || r.type === 'storyObject') {
        grouped.objects.push(item)
      } else if (r.type === 'note') {
        grouped.notes.push(item)
      } else if (r.type === 'world') {
        grouped.worldElements.push(item)
      }
    }

    return grouped
  }, [debouncedQuery, currentProjectId, searchHelper])

  const allResults = Object.entries(results).flatMap(([, items]) => items)
  const totalResults = allResults.length

  const handleSelect = (result: SearchResult) => {
    const panelMap: Record<string, string> = {
      scenes: "chapters",
      characters: "characters",
      locations: "locations",
      objects: "objects",
      notes: "notes",
      worldElements: "world",
    }
    const panel = panelMap[result.type]
    if (panel) {
      useWriterStore.getState().setLeftPanel(panel as never)
    }
    setSearchOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex])
      }
    }
  }

  let flatIndex = 0

  return (
    <Dialog open={isSearchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Search across all entities in your project
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center border-b px-3">
          <Search className="size-4 text-muted-foreground mr-2" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search scenes, characters, locations, notes..."
            className="border-none focus-visible:ring-0 h-10 text-sm"
          />
        </div>
        <ScrollArea className="max-h-[400px]">
          {searchQuery && totalResults === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{searchQuery}&rdquo;
            </div>
          )}
          {!searchQuery && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Start typing to search across your project
            </div>
          )}
          {Object.entries(results).map(([type, items]) => {
            if (items.length === 0) return null
            const config = TYPE_CONFIG[type]
            if (!config) return null
            const Icon = config.icon

            return (
              <div key={type} className="px-2 py-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <Icon className={`size-3 ${config.color}`} />
                  {config.label}
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1 py-0 ml-1"
                  >
                    {items.length}
                  </Badge>
                </div>
                {items.map((item) => {
                  const currentIndex = flatIndex++
                  const isSelected = currentIndex === selectedIndex
                  return (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-sm transition-colors ${
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      <Icon className={`size-3.5 shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-xs font-medium">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="truncate text-[10px] text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </ScrollArea>
        {totalResults > 0 && (
          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-3">
            <span>{totalResults} results</span>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
