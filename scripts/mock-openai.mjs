/**
 * Tiny OpenAI-compatible mock server for verifying Open Writer's AI client
 * against the same contract Ollama / LM Studio / Z.ai / OpenAI speak:
 *
 *   POST /v1/chat/completions   (JSON or SSE when stream=true)
 *   GET  /v1/models
 *   GET  /api/tags              (Ollama-native model listing)
 *
 * Run:  node scripts/mock-openai.mjs [port]
 */

import http from "node:http"

const port = Number(process.argv[2] || 9911)
const MODELS = [
  { id: "mock-llama-3.1-8b", name: "mock-llama-3.1-8b", size: 4700000000 },
  { id: "mock-qwen-2.5-7b", name: "mock-qwen-2.5-7b", size: 4400000000 },
]

function json(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) })
  res.end(data)
}

function echoResponse(messages) {
  const last = [...messages].reverse().find((m) => m.role !== "system")
  const content = `[mock-ai] You asked: ${(last?.content ?? "").slice(0, 200)}. The deterministic agent tools already gathered the evidence; here is the composed report for you.`
  return content
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") {
    res.writeHead(204)
    return res.end()
  }
  const url = new URL(req.url, `http://${req.headers.host}`)

  // Model listing — both contracts
  if (req.method === "GET" && url.pathname === "/v1/models") {
    return json(res, 200, { object: "list", data: MODELS.map((m) => ({ id: m.id, object: "model", owned_by: "mock" })) })
  }
  if (req.method === "GET" && url.pathname === "/api/tags") {
    return json(res, 200, { models: MODELS.map((m) => ({ name: m.name, model: m.name, size: m.size })) })
  }

  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      let body = {}
      try {
        body = JSON.parse(raw)
      } catch {
        return json(res, 400, { error: { message: "invalid JSON" } })
      }
      const stream = body.stream === true
      const content = echoResponse(body.messages ?? [])
      const id = `chatcmpl-mock-${Date.now()}`
      const model = body.model ?? "mock"

      if (!stream) {
        return json(res, 200, {
          id,
          object: "chat.completion",
          model,
          choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        })
      }

      // SSE stream
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      })
      const chunks = content.match(/.{1,12}/gs) ?? [content]
      let i = 0
      const timer = setInterval(() => {
        if (i >= chunks.length) {
          res.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`)
          res.write("data: [DONE]\n\n")
          clearInterval(timer)
          res.end()
          return
        }
        const delta = chunks[i++]
        res.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", model, choices: [{ index: 0, delta: { content: delta }, finish_reason: null }] })}\n\n`)
      }, 15)
      return undefined
    })
    return undefined
  }

  json(res, 404, { error: { message: `not found: ${req.method} ${url.pathname}` } })
})

server.listen(port, "127.0.0.1", () => {
  console.log(`mock-openai listening on http://127.0.0.1:${port}`)
})
