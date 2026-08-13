import type { AIProvider, AIOptions } from "./provider"

/**
 * Z.ai Provider - Server-side only
 *
 * This provider uses the z-ai-web-dev-sdk which requires Node.js APIs (fs/promises).
 * It should ONLY be used in API routes (server-side), not in client components.
 * The client-side uses the /api/agent route to communicate with this provider.
 */
export class ZAIProvider implements AIProvider {
  name = "Z.ai"
  isAvailable = true

  async chat(
    messages: { role: string; content: string }[],
    options?: AIOptions
  ): Promise<string> {
    // This is a server-side only implementation
    // Client components should use the /api/agent route instead
    throw new Error(
      "ZAIProvider.chat() should only be called from server-side code (API routes). " +
      "Use the /api/agent endpoint from client components."
    )
  }
}
