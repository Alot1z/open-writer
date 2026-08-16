"use client"

import { useState, useEffect, useCallback } from "react"
import { useWriterStore } from "@/store/writer-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Heart,
  Frown,
  Handshake,
  Crown,
  ArrowRight,
  Plus,
  Search,
  Filter,
  Users,
  MapPin,
  Package,
  Globe,
  Loader2,
  X,
} from "lucide-react"

interface Relationship {
  id: string
  sourceId: string
  sourceType: string
  sourceName: string
  targetId: string
  targetType: string
  targetName: string
  type: string
  description: string
  strength: number
}

const RELATIONSHIP_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  loves: { bg: "bg-rose-100 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", icon: Heart },
  hates: { bg: "bg-zinc-200 dark:bg-zinc-800/50", text: "text-zinc-700 dark:text-zinc-300", icon: Frown },
  knows: { bg: "bg-sky-100 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300", icon: Handshake },
  owns: { bg: "bg-amber-100 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", icon: Crown },
  family: { bg: "bg-emerald-100 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", icon: Heart },
  rival: { bg: "bg-red-100 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", icon: Frown },
  friend: { bg: "bg-teal-100 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-300", icon: Handshake },
  mentor: { bg: "bg-violet-100 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", icon: Crown },
  ally: { bg: "bg-cyan-100 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-300", icon: Handshake },
  enemy: { bg: "bg-orange-100 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", icon: Frown },
}

const DEFAULT_REL_STYLE = { bg: "bg-muted", text: "text-muted-foreground", icon: ArrowRight }

const ENTITY_ICONS: Record<string, React.ElementType> = {
  character: Users,
  location: MapPin,
  object: Package,
  worldElement: Globe,
}

const RELATIONSHIP_TYPES = [
  "loves",
  "hates",
  "knows",
  "owns",
  "lives_at",
  "visits",
  "causes",
  "participates_in",
  "appears_in",
  "family",
  "rival",
  "friend",
  "mentor",
  "ally",
  "enemy",
  "works_with",
  "belongs_to",
  "located_in",
  "created_by",
  "related_to",
  "other",
]

export function RelationshipsPanel() {
  const { currentProjectId } = useWriterStore()

  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchFilter, setSearchFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newRel, setNewRel] = useState({
    sourceName: "",
    sourceType: "character",
    targetName: "",
    targetType: "character",
    type: "knows",
    description: "",
    strength: 5,
  })

  const fetchRelationships = useCallback(async () => {
    if (!currentProjectId) return
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/relationships?projectId=${currentProjectId}`
      )
      if (res.ok) {
        const data = await res.json()
        setRelationships(
          data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            sourceId: r.sourceId as string,
            sourceType: r.sourceType as string,
            sourceName: (r.sourceName as string) || `Entity ${(r.sourceId as string).slice(0, 6)}`,
            targetId: r.targetId as string,
            targetType: r.targetType as string,
            targetName: (r.targetName as string) || `Entity ${(r.targetId as string).slice(0, 6)}`,
            type: r.type as string,
            description: (r.description || "") as string,
            strength: (r.strength || 0) as number,
          }))
        )
      }
    } catch (error) {
      console.error("Failed to fetch relationships:", error)
    } finally {
      setIsLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchRelationships()
  }, [fetchRelationships])

  const handleAddRelationship = async () => {
    if (!currentProjectId || !newRel.sourceName || !newRel.targetName) return
    try {
      await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProjectId,
          sourceId: newRel.sourceName,
          sourceType: newRel.sourceType,
          targetId: newRel.targetName,
          targetType: newRel.targetType,
          type: newRel.type,
          description: newRel.description,
          strength: newRel.strength,
        }),
      })
      setShowAddDialog(false)
      setNewRel({
        sourceName: "",
        sourceType: "character",
        targetName: "",
        targetType: "character",
        type: "knows",
        description: "",
        strength: 5,
      })
      fetchRelationships()
    } catch (error) {
      console.error("Failed to add relationship:", error)
    }
  }

  const handleDeleteRelationship = async (id: string) => {
    try {
      const res = await fetch(`/api/relationships/${id}`, { method: "DELETE" })
      if (res.ok) {
        setRelationships((prev) => prev.filter((r) => r.id !== id))
      } else {
        console.error("Failed to delete relationship:", await res.text())
      }
    } catch (error) {
      console.error("Failed to delete relationship:", error)
    }
  }

  const filteredRelationships = relationships.filter((r) => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      if (
        !r.sourceName.toLowerCase().includes(q) &&
        !r.targetName.toLowerCase().includes(q) &&
        !r.type.toLowerCase().includes(q) &&
        !r.description.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    if (typeFilter !== "all" && r.type !== typeFilter) return false
    if (entityFilter !== "all") {
      if (
        r.sourceType !== entityFilter &&
        r.targetType !== entityFilter
      )
        return false
    }
    return true
  })

  const strengthToWidth = (strength: number) => {
    return Math.max(10, Math.min(100, strength * 10))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Relationships</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Filters */}
      <div className="border-b px-3 py-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter relationships..."
            className="h-7 pl-7 text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-6 text-[10px] flex-1">
              <Filter className="size-3 mr-1" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {RELATIONSHIP_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-6 text-[10px] flex-1">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="character">Characters</SelectItem>
              <SelectItem value="location">Locations</SelectItem>
              <SelectItem value="object">Objects</SelectItem>
              <SelectItem value="worldElement">World Elements</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRelationships.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {relationships.length === 0
                ? "No relationships yet. Add one to track connections between your story elements."
                : "No relationships match your filters."}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {filteredRelationships.map((rel) => {
              const style =
                RELATIONSHIP_COLORS[rel.type] || DEFAULT_REL_STYLE
              const RelIcon = style.icon
              const SourceIcon =
                ENTITY_ICONS[rel.sourceType] || ArrowRight
              const TargetIcon =
                ENTITY_ICONS[rel.targetType] || ArrowRight

              return (
                <div
                  key={rel.id}
                  className="rounded-lg border p-3 space-y-2 hover:bg-muted/20 transition-colors"
                >
                  {/* Source → Type → Target */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="flex items-center gap-1 min-w-0">
                      <SourceIcon className="size-3 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">
                        {rel.sourceName}
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${style.bg} ${style.text}`}
                    >
                      <RelIcon className="size-2.5" />
                      {rel.type}
                    </div>

                    <div className="flex items-center gap-1 min-w-0">
                      <TargetIcon className="size-3 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">
                        {rel.targetName}
                      </span>
                    </div>
                  </div>

                  {/* Strength indicator */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${style.bg}`}
                        style={{
                          width: `${strengthToWidth(rel.strength)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {rel.strength}/10
                    </span>
                  </div>

                  {/* Description */}
                  {rel.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {rel.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end pt-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[9px] gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteRelationship(rel.id)}
                    >
                      <X className="size-2.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Count */}
      <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
        {filteredRelationships.length} of {relationships.length} relationships
      </div>

      {/* Add Relationship Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Relationship</DialogTitle>
            <DialogDescription>
              Define a connection between two story elements
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Source</Label>
              <div className="flex gap-2">
                <Input
                  value={newRel.sourceName}
                  onChange={(e) =>
                    setNewRel({ ...newRel, sourceName: e.target.value })
                  }
                  placeholder="Source name or ID"
                  className="text-xs flex-1"
                />
                <Select
                  value={newRel.sourceType}
                  onValueChange={(v) =>
                    setNewRel({ ...newRel, sourceType: v })
                  }
                >
                  <SelectTrigger className="text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="character">Character</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                    <SelectItem value="worldElement">World</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Relationship Type</Label>
              <Select
                value={newRel.type}
                onValueChange={(v) => setNewRel({ ...newRel, type: v })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Target</Label>
              <div className="flex gap-2">
                <Input
                  value={newRel.targetName}
                  onChange={(e) =>
                    setNewRel({ ...newRel, targetName: e.target.value })
                  }
                  placeholder="Target name or ID"
                  className="text-xs flex-1"
                />
                <Select
                  value={newRel.targetType}
                  onValueChange={(v) =>
                    setNewRel({ ...newRel, targetType: v })
                  }
                >
                  <SelectTrigger className="text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="character">Character</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                    <SelectItem value="worldElement">World</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Strength: {newRel.strength}/10
              </Label>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    className={`flex-1 h-2 rounded-sm transition-colors ${
                      i < newRel.strength
                        ? "bg-emerald-500"
                        : "bg-muted"
                    }`}
                    onClick={() =>
                      setNewRel({ ...newRel, strength: i + 1 })
                    }
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={newRel.description}
                onChange={(e) =>
                  setNewRel({ ...newRel, description: e.target.value })
                }
                placeholder="Describe this relationship..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddRelationship}
              disabled={!newRel.sourceName || !newRel.targetName}
            >
              Add Relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
