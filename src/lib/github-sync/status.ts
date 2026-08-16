/**
 * User-facing storage states. The UI shows these labels and the
 * plain-language explanation — never raw Git/GitHub terminology.
 */

import { SyncStatus } from "./engine"

export interface StatusInfo {
  label: string
  tone: "neutral" | "brand" | "success" | "warning" | "danger" | "muted"
  whatHappened: string
  whatItMeans: string
  whatOpenWriterIsDoing: string
  whatYouCanDo: string
}

export const STATUS_INFO: Record<SyncStatus, StatusInfo> = {
  "local-only": {
    label: "Local only",
    tone: "muted",
    whatHappened: "Your projects are stored on this device only.",
    whatItMeans: "Nothing has been backed up to the cloud yet.",
    whatOpenWriterIsDoing: "Waiting for you to connect private cloud storage.",
    whatYouCanDo: "Connect GitHub from Settings → Storage to protect your projects.",
  },
  connecting: {
    label: "Connecting…",
    tone: "brand",
    whatHappened: "Open Writer is connecting to your private cloud storage.",
    whatItMeans: "This takes a moment.",
    whatOpenWriterIsDoing: "Checking your GitHub account and preparing a private space.",
    whatYouCanDo: "Follow the code shown on screen to authorize.",
  },
  syncing: {
    label: "Syncing…",
    tone: "brand",
    whatHappened: "Open Writer is saving your latest changes to the cloud.",
    whatItMeans: "Your writing is safe on this device either way.",
    whatOpenWriterIsDoing: "Preparing, compressing, uploading and verifying your changes.",
    whatYouCanDo: "Keep writing — this happens in the background.",
  },
  synced: {
    label: "Synced",
    tone: "success",
    whatHappened: "Everything is up to date.",
    whatItMeans: "Your projects are backed up privately to GitHub.",
    whatOpenWriterIsDoing: "Watching for new changes to sync automatically.",
    whatYouCanDo: "Nothing — you're all set.",
  },
  offline: {
    label: "Offline — saved on this device",
    tone: "muted",
    whatHappened: "Open Writer can't reach the internet right now.",
    whatItMeans: "Nothing is lost: every change is saved on this device.",
    whatOpenWriterIsDoing: "Retrying in the background automatically.",
    whatYouCanDo: "Nothing — it will sync when the connection returns.",
  },
  paused: {
    label: "Sync paused",
    tone: "warning",
    whatHappened: "Open Writer paused syncing after several failed attempts.",
    whatItMeans: "Your writing is safe on this device.",
    whatOpenWriterIsDoing: "Waiting before trying again.",
    whatYouCanDo: "Check your connection, or press Sync now.",
  },
  attention: {
    label: "Needs attention",
    tone: "warning",
    whatHappened: "Something needs a quick look.",
    whatItMeans: "Your local projects are safe.",
    whatOpenWriterIsDoing: "Waiting for your input before continuing.",
    whatYouCanDo: "Reconnect GitHub to restore access.",
  },
  conflict: {
    label: "Conflict detected",
    tone: "danger",
    whatHappened: "Open Writer found changes on another device that also differ from what's on this device.",
    whatItMeans: "Both versions exist — nothing was deleted.",
    whatOpenWriterIsDoing: "Keeping both versions until you choose.",
    whatYouCanDo: "Review and choose: keep this version, keep the other, or save both.",
  },
  full: {
    label: "Storage is full for now",
    tone: "warning",
    whatHappened: "GitHub is limiting how much Open Writer can use right now.",
    whatItMeans: "Your writing stays saved on this device.",
    whatOpenWriterIsDoing: "Retrying automatically later.",
    whatYouCanDo: "Keep writing — it will catch up.",
  },
  unavailable: {
    label: "Storage unavailable",
    tone: "danger",
    whatHappened: "Your private cloud storage could not be reached.",
    whatItMeans: "Your local projects are safe.",
    whatOpenWriterIsDoing: "Retrying automatically.",
    whatYouCanDo: "Check your connection or reconnect GitHub.",
  },
}

export function statusLabel(status: SyncStatus): string {
  return STATUS_INFO[status].label
}
