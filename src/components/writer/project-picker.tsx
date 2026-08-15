'use client'

import React, { useEffect, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
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
  const { setCurrentProject } = useWriterStore()
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGenre, setNewGenre] = useState('')

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
