'use client'

import React from 'react'
import { useWriterStore, PanelType } from '@/store/writer-store'
import { ChapterTree } from './chapter-tree'
import { CharactersPanel } from './characters-panel'
import { LocationsPanel } from './locations-panel'
import { ObjectsPanel } from './objects-panel'
import { WorldPanel } from './world-panel'
import { TimelinePanel } from './timeline-panel'
import { NotesPanel } from './notes-panel'
import { CommentsPanel } from './comments-panel'
import { AnalyticsPanel } from './analytics-panel'
import { AgentPanel } from './agent-panel'
import { RelationshipsPanel } from './relationships-panel'
import { HealthPanel } from './health-panel'
import { ContinuityPanel } from './continuity-panel'
import { VersionsPanel } from './versions-panel'
import { ExportSidePanel } from './export-side-panel'
import { DocsPanel } from './docs-panel'
import { GlobalSearch } from './global-search'
import { SettingsDialogWithTrigger } from './settings-dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  BookOpen,
  Users,
  MapPin,
  Package,
  Globe,
  Clock,
  StickyNote,
  BarChart3,
  Bot,
  Search,
  ShieldAlert,
  Settings,
  MessageSquare,
  GitBranch,
  Activity,
  Heart,
  Download,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const panelItems: { id: PanelType; icon: React.ElementType; label: string }[] = [
  // Writing
  { id: 'chapters', icon: BookOpen, label: 'Chapters' },
  { id: 'characters', icon: Users, label: 'Characters' },
  { id: 'locations', icon: MapPin, label: 'Locations' },
  { id: 'objects', icon: Package, label: 'Objects' },
  { id: 'world', icon: Globe, label: 'World' },
  { id: 'timeline', icon: Clock, label: 'Timeline' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'comments', icon: MessageSquare, label: 'Comments' },
  // separator after index 7
  // Intelligence
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'versions', icon: GitBranch, label: 'Versions' },
  { id: 'agent', icon: Bot, label: 'AI Agent' },
  { id: 'relationships', icon: Heart, label: 'Relationships' },
  { id: 'health', icon: Activity, label: 'Health' },
  { id: 'continuity', icon: ShieldAlert, label: 'Continuity' },
  // separator after index 13
  // Tools
  { id: 'export', icon: Download, label: 'Export' },
  { id: 'docs', icon: FileText, label: 'Docs' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

// Indices where separators should appear AFTER the item
const SEPARATOR_AFTER = new Set([7, 13])

interface LeftSidebarProps {
  className?: string
}

export function LeftSidebar({ className }: LeftSidebarProps) {
  const { leftPanel, setLeftPanel } = useWriterStore()

  const renderContent = () => {
    switch (leftPanel) {
      case 'chapters':
        return <ChapterTree />
      case 'characters':
        return <CharactersPanel />
      case 'locations':
        return <LocationsPanel />
      case 'objects':
        return <ObjectsPanel />
      case 'world':
        return <WorldPanel />
      case 'timeline':
        return <TimelinePanel />
      case 'notes':
        return <NotesPanel />
      case 'comments':
        return <CommentsPanel />
      case 'analytics':
        return <AnalyticsPanel />
      case 'versions':
        return <VersionsPanel />
      case 'agent':
        return <AgentPanel />
      case 'relationships':
        return <RelationshipsPanel />
      case 'health':
        return <HealthPanel />
      case 'continuity':
        return <ContinuityPanel />
      case 'export':
        return <ExportSidePanel />
      case 'docs':
        return <DocsPanel />
      case 'search':
        return <GlobalSearch />
      case 'settings':
        return (
          <div className="p-4">
            <SettingsDialogWithTrigger />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={cn('flex h-full', className)}>
      {/* Icon Tab Bar */}
      <div className="flex flex-col items-center w-10 py-2 gap-0.5 border-r border-writer-border bg-writer-surface/30">
        {panelItems.map((item, idx) => {
          const Icon = item.icon
          const isActive = leftPanel === item.id
          return (
            <React.Fragment key={item.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={item.label}
                    title={item.label}
                    className={cn(
                      'h-7 w-7 rounded-md transition-all duration-150',
                      isActive
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
                    )}
                    onClick={() => setLeftPanel(item.id)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
              {SEPARATOR_AFTER.has(idx) && <Separator className="w-5 my-1" />}
            </React.Fragment>
          )
        })}
      </div>

      {/* Panel Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-2 text-xs font-semibold text-foreground/80 uppercase tracking-wider border-b border-writer-border bg-writer-surface/20">
          {panelItems.find((p) => p.id === leftPanel)?.label || 'Chapters'}
        </div>
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
