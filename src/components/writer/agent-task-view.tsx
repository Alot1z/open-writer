"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Check,
  X,
  Clock,
  ListChecks,
  Wrench,
  Eye,
  FileText,
  AlertTriangle,
  ChevronRight,
} from "lucide-react"

export interface AgentTask {
  id: string
  goal: string
  status: "pending" | "planning" | "running" | "completed" | "failed"
  plan: string[]
  currentStep: number
  permission: string
  toolCalls: { tool: string; args: string; result: string }[]
  observations: string[]
  errors: string[]
  artifacts: { name: string; type: string; content: string }[]
  result: string
  createdAt: string
  updatedAt: string
}

interface AgentTaskViewProps {
  task: AgentTask
}

const STATUS_CONFIG: Record<
  AgentTask["status"],
  { icon: typeof Clock; label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  pending: { icon: Clock, label: "Pending", variant: "outline", color: "text-muted-foreground" },
  planning: { icon: Loader2, label: "Planning", variant: "secondary", color: "text-amber-600" },
  running: { icon: Loader2, label: "Running", variant: "default", color: "text-emerald-600" },
  completed: { icon: Check, label: "Completed", variant: "default", color: "text-emerald-600" },
  failed: { icon: X, label: "Failed", variant: "destructive", color: "text-destructive" },
}

export function AgentTaskView({ task }: AgentTaskViewProps) {
  const statusConfig = STATUS_CONFIG[task.status]
  const StatusIcon = statusConfig.icon

  const planSteps = Array.isArray(task.plan) ? task.plan : []
  const toolCalls = Array.isArray(task.toolCalls) ? task.toolCalls : []
  const observations = Array.isArray(task.observations) ? task.observations : []
  const errors = Array.isArray(task.errors) ? task.errors : []
  const artifacts = Array.isArray(task.artifacts) ? task.artifacts : []

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold leading-tight">{task.goal}</h3>
            <Badge variant={statusConfig.variant} className="text-[10px] px-1.5 py-0 shrink-0">
              <StatusIcon className={`size-3 mr-1 ${task.status === "running" || task.status === "planning" ? "animate-spin" : ""}`} />
              {statusConfig.label}
            </Badge>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Permission: {task.permission} • Created {new Date(task.createdAt).toLocaleString()}
          </div>
        </div>

        <Separator />

        {/* Plan Steps */}
        {planSteps.length > 0 && (
          <Card className="border-none shadow-none bg-muted/30">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <ListChecks className="size-3.5" />
                Plan ({planSteps.length} steps)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-1.5">
                {planSteps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[11px]"
                  >
                    {i < task.currentStep ? (
                      <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : i === task.currentStep ? (
                      <ChevronRight className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <div className="size-3.5 shrink-0 mt-0.5 rounded-full border border-muted-foreground/30" />
                    )}
                    <span className={i < task.currentStep ? "line-through text-muted-foreground" : ""}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tool Calls */}
        {toolCalls.length > 0 && (
          <Card className="border-none shadow-none bg-muted/30">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Wrench className="size-3.5" />
                Tool Calls ({toolCalls.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                {toolCalls.map((call, i) => (
                  <div key={i} className="text-[11px] space-y-0.5">
                    <div className="font-medium text-foreground">{call.tool}</div>
                    {call.args && (
                      <div className="text-muted-foreground font-mono text-[10px] bg-background/50 p-1 rounded">
                        {call.args}
                      </div>
                    )}
                    {call.result && (
                      <div className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px] bg-background/50 p-1 rounded">
                        → {call.result}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observations */}
        {observations.length > 0 && (
          <Card className="border-none shadow-none bg-muted/30">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Eye className="size-3.5" />
                Observations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-1.5">
                {observations.map((obs, i) => (
                  <div key={i} className="text-[11px] text-muted-foreground">
                    {obs}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Card className="border-none shadow-none bg-destructive/5">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="size-3.5" />
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-1.5">
                {errors.map((err, i) => (
                  <div key={i} className="text-[11px] text-destructive">
                    {err}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Artifacts */}
        {artifacts.length > 0 && (
          <Card className="border-none shadow-none bg-muted/30">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <FileText className="size-3.5" />
                Artifacts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                {artifacts.map((artifact, i) => (
                  <div key={i} className="text-[11px] space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{artifact.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {artifact.type}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground font-mono text-[10px] bg-background/50 p-1.5 rounded max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {artifact.content}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {task.result && (
          <Card className="border-none shadow-none bg-emerald-500/5">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <Check className="size-3.5" />
                Result
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-[11px] whitespace-pre-wrap leading-relaxed">
                {task.result}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  )
}
