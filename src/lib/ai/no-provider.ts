import type { AIProvider } from "./provider"

export class NoProvider implements AIProvider {
  name = "None"
  isAvailable = false

  async chat(): Promise<string> {
    throw new Error(
      "AI is unavailable. Please configure an AI provider in Settings → AI."
    )
  }
}
