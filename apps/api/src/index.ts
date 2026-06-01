import { Hono } from "hono"
import { cors } from "hono/cors"
import { auditUrl } from "@agent-lighthouse/core"

const app = new Hono()
app.use(cors())

// ── Audit endpoint ───────────────────────────────────────
app.get("/api/audit", async (c) => {
  const url = c.req.query("url")
  if (!url) {
    return c.json({ error: "Missing ?url parameter" }, 400)
  }

  try {
    const target = url.startsWith("http") ? url : `https://${url}`
    const result = await auditUrl({ url: target, timeout: 15000 })
    return c.json(result)
  } catch (err) {
    return c.json({ error: `Audit failed: ${err instanceof Error ? err.message : err}` }, 500)
  }
})

app.get("/", (c) => c.json({ status: "ok", name: "Agent Lighthouse API" }))

export default app
