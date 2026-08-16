"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Sandbox-safe preload. With contextIsolation + sandbox enabled, this
 * script is the only bridge between the renderer (the Open Writer web
 * app) and the native side (tray menu, external links).
 *
 * Exposes window.openWriter:
 *   onSyncCommand(cb)   — subscribe to tray menu commands
 *   sendSyncStatus(s)   — report sync status to the tray
 *   openExternal(url)   — open a URL in the system browser
 */

const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("openWriter", {
  onSyncCommand: (callback) => {
    const handler = (_event, command) => callback(command)
    ipcRenderer.on("ow:sync-command", handler)
    return () => ipcRenderer.removeListener("ow:sync-command", handler)
  },
  sendSyncStatus: (status) => ipcRenderer.send("ow:sync-status", status),
  openExternal: (url) => ipcRenderer.send("ow:open-external", url),
  platform: process.platform,
})
