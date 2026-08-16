"use client"

import { useEffect, useMemo, useState } from "react"
import { useSync } from "@/hooks/use-sync"
import { STATUS_INFO } from "@/lib/github-sync"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Cloud,
  CloudOff,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Loader2,
  KeyRound,
  Github,
  ChevronDown,
  ChevronRight,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Phase =
  | { name: "idle" }
  | { name: "starting" }
  | { name: "code"; userCode: string; verificationUri: string; expiresAt: number }
  | { name: "token" }

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  muted: "bg-muted text-muted-foreground",
}

export function StoragePanel() {
  const { snapshot, engine } = useSync()
  const [phase, setPhase] = useState<Phase>({ name: "idle" })
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  // Auto-hide the code card once the user authorizes
  const connected = snapshot.connected
  useEffect(() => {
    if (connected && phase.name !== "idle") setPhase({ name: "idle" })
  }, [connected, phase.name])

  const info = STATUS_INFO[snapshot.status]
  const projectCount = Object.keys(snapshot.projects).length

  const conflictProject = useMemo(() => {
    const entry = Object.entries(snapshot.projects).find(([, ps]) => ps.status === "conflict")
    return entry ? { id: entry[0], state: entry[1] } : null
  }, [snapshot.projects])

  const handleConnect = async () => {
    setError(null)
    if (engine.isDeviceFlowAvailable) {
      try {
        setPhase({ name: "starting" })
        const start = await engine.startDeviceFlow()
        setPhase({
          name: "code",
          userCode: start.userCode,
          verificationUri: start.verificationUri,
          expiresAt: Date.now() + start.expiresIn * 1000,
        })
        void engine.finishDeviceFlow(start.userCode, 5, Date.now() + start.expiresIn * 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start GitHub authorization.")
        setPhase({ name: "idle" })
      }
    } else {
      setPhase({ name: "token" })
    }
  }

  const handleTokenConnect = async () => {
    setError(null)
    setBusy(true)
    try {
      await engine.connectWithToken(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect.")
    } finally {
      setBusy(false)
    }
  }

  const handleSyncNow = async () => {
    setBusy(true)
    try {
      await engine.syncNow()
      await engine.checkRemote()
    } finally {
      setBusy(false)
    }
  }

  if (connected) {
    return (
      <div className="space-y-4 py-2">
        {/* Status header */}
        <div className="flex items-start gap-3 rounded-lg border border-writer-border bg-muted/20 p-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              TONE_CLASSES[info.tone]
            )}
          >
            {snapshot.status === "synced" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : snapshot.status === "conflict" ? (
              <AlertTriangle className="h-5 w-5" />
            ) : snapshot.status === "offline" ? (
              <CloudOff className="h-5 w-5" />
            ) : (
              <Cloud className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{info.label}</span>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Github className="h-3 w-3" />
                {snapshot.username ? `Connected as @${snapshot.username}` : "Connected"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{info.whatItMeans}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{info.whatOpenWriterIsDoing}</p>
          </div>
        </div>

        {/* Connection details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-writer-border p-3">
            <div className="text-muted-foreground">Private storage</div>
            <div className="flex items-center gap-1.5 font-medium mt-0.5 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-3.5 w-3.5" /> Enabled
            </div>
          </div>
          <div className="rounded-lg border border-writer-border p-3">
            <div className="text-muted-foreground">Last synced</div>
            <div className="font-medium mt-0.5">
              {snapshot.lastSyncedAt
                ? new Date(snapshot.lastSyncedAt).toLocaleString()
                : "Not yet"}
            </div>
          </div>
          <div className="rounded-lg border border-writer-border p-3">
            <div className="text-muted-foreground">Projects</div>
            <div className="font-medium mt-0.5">{projectCount}</div>
          </div>
          <div className="rounded-lg border border-writer-border p-3">
            <div className="text-muted-foreground">Storage</div>
            <div className="font-medium mt-0.5">{formatBytes(snapshot.storageBytes)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleSyncNow}
            disabled={busy}
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync now
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              window.open(
                `https://github.com/${snapshot.repoFullName ?? ""}`,
                "_blank",
                "noopener"
              )
            }
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open GitHub
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Advanced
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setConfirmDisconnect(true)}
          >
            Disconnect
          </Button>
        </div>

        {/* Advanced diagnostics */}
        {showAdvanced && (
          <div className="rounded-lg border border-writer-border bg-muted/10 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Storage repository</span><span className="font-mono">{snapshot.repoFullName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">API calls this window</span><span>{snapshot.apiCalls}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Content chunks</span><span>{snapshot.chunkCount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">This device id</span><span className="font-mono">{snapshot.deviceId.slice(0, 12)}…</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Compressed payload</span><span>{formatBytes(snapshot.storageBytes)}</span></div>
          </div>
        )}

        {/* Conflict dialog */}
        <Dialog open={conflictProject !== null} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Changes found on another device
              </DialogTitle>
              <DialogDescription>
                {conflictProject
                  ? `“${conflictProject.state.name}” was changed here and on another device. Nothing was deleted — choose what to keep.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => conflictProject && engine.resolveConflict(conflictProject.id, "keep-local")}
              >
                Keep this version
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => conflictProject && engine.resolveConflict(conflictProject.id, "keep-remote")}
              >
                Keep the other device's version
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => conflictProject && engine.resolveConflict(conflictProject.id, "save-both")}
              >
                Save both versions
              </Button>
            </div>
            <DialogFooter className="text-xs text-muted-foreground">
              Both versions are safe until you choose.
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Disconnect confirmation */}
        <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Disconnect GitHub storage?</DialogTitle>
              <DialogDescription>
                Disconnecting stops synchronization on this device. Your private
                GitHub storage remains intact.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmDisconnect(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => { engine.disconnect(); setConfirmDisconnect(false) }}>
                Disconnect only
              </Button>
            </DialogFooter>
            <p className="text-xs text-muted-foreground">
              Your private GitHub storage stays on GitHub. To remove it, delete the
              storage repository from GitHub itself.
            </p>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ── Not connected ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4 py-2">
      {/* Pitch */}
      <div className="rounded-lg border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Private cloud storage for your projects</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your projects stay on this device, and Open Writer keeps a private,
              encrypted-at-rest backup on GitHub — automatically. You can continue
              writing on another device and pick up right where you left off.
            </p>
          </div>
        </div>
      </div>

      {phase.name === "idle" && (
        <Button
          onClick={handleConnect}
          className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <CloudUpload className="h-4 w-4" />
          Connect GitHub
        </Button>
      )}

      {/* Device flow code */}
      {phase.name === "code" && (
        <div className="space-y-3 rounded-lg border border-writer-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Authorize Open Writer on GitHub — enter this code:
          </p>
          <div className="inline-block rounded-lg border border-dashed border-amber-400 bg-muted/20 px-6 py-3 text-2xl font-mono font-bold tracking-[0.3em]">
            {phase.userCode}
          </div>
          <a
            href={phase.verificationUri}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-amber-700 dark:text-amber-400 hover:underline"
          >
            {phase.verificationUri}
          </a>
          <p className="text-xs text-muted-foreground">
            Waiting for authorization… this device will connect automatically.
          </p>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { engine.cancelDeviceFlow(); setPhase({ name: "idle" }) }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Token fallback */}
      {phase.name === "token" && (
        <div className="space-y-3 rounded-lg border border-writer-border p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            One-time GitHub token (Settings → Developer settings → Fine-grained tokens, with access to a private repo of your choice)
          </div>
          <div className="space-y-2">
            <Label className="text-xs">GitHub token</Label>
            <Input
              type="password"
              placeholder="ghp_… / github_pat_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTokenConnect()}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleTokenConnect}
              disabled={busy || !token.trim()}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Connect
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPhase({ name: "idle" })}>
              Back
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900 p-3">
          {error}
        </p>
      )}

      <Separator />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Your project data is stored in a private GitHub repository that only your
        GitHub account and Open Writer can access. Open Writer never sees or stores
        your password or token in your project data, backups, or logs.
      </p>
    </div>
  )
}

function formatBytes(n: number): string {
  if (n <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
