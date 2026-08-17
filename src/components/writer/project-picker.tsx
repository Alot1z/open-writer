'use client'

import React, { useEffect, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useSync } from '@/hooks/use-sync'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  BookOpen,
  Plus,
  FolderOpen,
  PenLine,
  Shield,
  WifiOff,
  Lock,
  CloudUpload,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CloudDownload,
  RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProjectInfo {
  id: string
  name: string
  description: string
  genre: string
  updatedAt: string
  _count: { chapters: number; characters: number }
  totalWordCount: number
}

interface ProjectPickerProps {
  onProjectSelect?: (id: string, name: string) => void
}

export function ProjectPicker({ onProjectSelect }: ProjectPickerProps) {
  const { snapshot: syncSnapshot, projectStatus, engine } = useSync()
  const { setCurrentProject } = useWriterStore()
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGenre, setNewGenre] = useState('')
  const [remoteProjects, setRemoteProjects] = useState<Array<{ id: string; name: string; updatedAt: string; alreadyLocal: boolean }>>([])
  const [restoringId, setRestoringId] = useState<string | null>(null)

  // Load cloud projects when connected so they can be restored on this device
  useEffect(() => {
    if (syncSnapshot.connected) {
      void engine.listRemoteProjects().then(setRemoteProjects).catch(() => {})
    } else {
      setRemoteProjects([])
    }
  }, [syncSnapshot.connected, engine])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleSelect = (project: ProjectInfo) => {
    setCurrentProject(project.id, project.name)
    onProjectSelect?.(project.id, project.name)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          genre: newGenre.trim(),
        }),
      })
      if (res.ok) {
        const project = await res.json()
        setCurrentProject(project.id, project.name)
        onProjectSelect?.(project.id, project.name)
      }
    } catch (err) {
      console.error('Failed to create project:', err)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="min-h-screen flex items-center justify-center p-6 bg-writer-bg"
        role="main"
        aria-label="Open Writer projects"
      >
        <div className="w-full max-w-xl">
          {/* Hero Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-center mb-8"
          >
            {/* Pen icon in a bold amber badge */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500 mb-5 shadow-lg shadow-amber-500/20">
              <PenLine className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Georgia', 'Merriweather', serif" }}>
              Open Writer
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-sm mx-auto">
              Local-first, open-source writing studio with story intelligence
            </p>

            {/* Feature badges */}
            <div className="flex items-center justify-center gap-2 mt-5">
              <Badge variant="outline" className="gap-1.5 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-xs border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30">
                <Shield className="h-3 w-3" />
                Yours
              </Badge>
            </div>
          </motion.div>

          {/* Project List */}
          <Card className="border-writer-border shadow-md">
            <CardContent className="p-0">
  {!syncSnapshot.connected && (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-writer-border bg-amber-50/60 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 min-w-0">
        <CloudUpload className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
        <span className="text-[11px] text-amber-800 dark:text-amber-300 truncate">Protect your projects with private GitHub storage</span>
      </div>
      <button
        onClick={() => useWriterStore.getState().setSettingsOpen(true, 'storage')}
        className="shrink-0 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline"
      >
        Enable
      </button>
    </div>
  )}
              <ScrollArea className="max-h-80">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <FolderOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    No projects yet. Create your first one!
                  </div>
                ) : (
                  <div className="divide-y divide-writer-border">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleSelect(project)}
                        className="flex items-center gap-3 w-full p-4 text-left hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-colors group"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                          <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                            {project.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {project.genre && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                {project.genre}
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {project._count.chapters} chapter{project._count.chapters !== 1 ? 's' : ''}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {project.totalWordCount.toLocaleString()} words
                            </span>
                          </div>
                        </div>
                        {(() => { const b = projectStatus(project.id); return (
            <Badge variant="secondary" className="text-[10px] shrink-0 gap-1" title={b.label}>
              {b.status === "synced" ? <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> :
               b.status === "conflict" ? <AlertTriangle className="h-3 w-3 text-red-500" /> :
               b.status === "offline" ? <CloudOff className="h-3 w-3 text-muted-foreground" /> :
               b.status === "syncing" ? <Loader2 className="h-3 w-3 animate-spin" /> :
               <Cloud className="h-3 w-3 text-muted-foreground" />}
              {b.label}
            </Badge>
          )})()}
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* From the cloud */}
          {syncSnapshot.connected && remoteProjects.filter((rp) => !rp.alreadyLocal).length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <Cloud className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-muted-foreground">From the cloud</span>
                <span className="text-[10px] text-muted-foreground">— on another device, ready to restore here</span>
              </div>
              <div className="divide-y divide-writer-border rounded-lg border border-writer-border bg-card">
                {remoteProjects.filter((rp) => !rp.alreadyLocal).map((rp) => (
                  <div key={rp.id} className="flex items-center gap-3 p-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 shrink-0">
                      <CloudDownload className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{rp.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Updated {new Date(rp.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restoringId !== null}
                      className="shrink-0 text-xs"
                      onClick={async () => {
                        setRestoringId(rp.id)
                        try {
                          const restored = await engine.restoreRemoteProject(rp.id)
                          setCurrentProject(restored.id, restored.name)
                          onProjectSelect?.(restored.id, restored.name)
                          await fetchProjects()
                        } finally {
                          setRestoringId(null)
                        }
                      }}
                    >
                      {restoringId === rp.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CloudDownload className="h-3.5 w-3.5" />
                      )}
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Button */}
          <Button
            onClick={() => setCreateOpen(true)}
            className="w-full mt-4 gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm h-10 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Create New Project
          </Button>

          <Separator className="my-6" />

          {/* Footer tagline */}
          <p className="text-center text-xs text-muted-foreground">
            Your words. Your data. Your rules.
          </p>
        </div>

        {/* Create Project Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder="Project name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <Input
                placeholder="Genre (optional)..."
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  )
}
