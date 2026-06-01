"use client"

import { useState, useRef, useEffect } from "react"

// ── Constants ────────────────────────────────────────────

const SCORE_COLORS: Record<
  string,
  { ring: string; track: string; bg: string; text: string }
> = {
  A: { ring: "#22c55e", track: "rgba(34,197,94,0.15)", bg: "#22c55e", text: "#052e16" },
  B: { ring: "#6366f1", track: "rgba(99,102,241,0.15)", bg: "#6366f1", text: "#fafafa" },
  C: { ring: "#f59e0b", track: "rgba(245,158,11,0.15)", bg: "#f59e0b", text: "#1a1a1a" },
  D: { ring: "#f97316", track: "rgba(249,115,22,0.15)", bg: "#f97316", text: "#1a1a1a" },
  F: { ring: "#ef4444", track: "rgba(239,68,68,0.15)", bg: "#ef4444", text: "#fafafa" },
}

const CAT_COLORS = ["#6366f1", "#a855f7", "#22c55e", "#f59e0b", "#3b82f6"]
const CAT_ICONS = ["🔍", "🪪", "🔐", "🔌", "🎯"]

const DEMO_URLS = [
  { name: "Vercel", url: "vercel.com" },
  { name: "Stripe", url: "stripe.com" },
  { name: "GitHub", url: "github.com" },
  { name: "Linear", url: "linear.app" },
]

const GAUGE_SIZE = 160
const GAUGE_STROKE = 10
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS

// ── Types ────────────────────────────────────────────────

interface Check {
  id: string
  name: string
  passed: boolean
  score: number
  details: string
  suggestion?: string
  verifiedUrl: string
  httpStatus: number
  displayValue: string
  docsUrl: string
}

interface Category {
  name: string
  description: string
  weight: number
  checks: Check[]
  score: number
  icon: string
}

interface AuditResult {
  url: string
  timestamp: string
  overallScore: number
  grade: "A" | "B" | "C" | "D" | "F"
  categories: Category[]
  summary: string
  recommendations: string[]
}

// ── Sub-components ──────────────────────────────────────

/** Circular SVG score gauge */
function ScoreGauge({
  score,
  grade,
  animate,
}: {
  score: number
  grade: string
  animate: boolean
}) {
  const colors = SCORE_COLORS[grade] || SCORE_COLORS.F
  const offset =
    GAUGE_CIRCUMFERENCE - (score / 100) * GAUGE_CIRCUMFERENCE

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={GAUGE_SIZE}
        height={GAUGE_SIZE}
        viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
      >
        {/* Track */}
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke={colors.track}
          strokeWidth={GAUGE_STROKE}
        />
        {/* Progress ring */}
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke={colors.ring}
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={animate ? offset : GAUGE_CIRCUMFERENCE}
          className="gauge-ring"
          style={
            {
              "--gauge-offset": offset,
              "--gauge-circumference": GAUGE_CIRCUMFERENCE,
            } as React.CSSProperties
          }
          transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold tracking-tighter">{score}</span>
        <span className="text-xs text-[#71717a] mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

/** Category score card with progress bar */
function CategoryCard({
  cat,
  index,
}: {
  cat: Category
  index: number
}) {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#111113] p-5 hover:border-[#3f3f46] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{cat.icon} {cat.name}</span>
        <span
          className="text-lg font-bold"
          style={{ color: CAT_COLORS[index] }}
        >
          {cat.score}
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[#27272a] mb-2 overflow-hidden">
        <div
          className="cat-bar-fill h-full rounded-full"
          style={{ width: `${cat.score}%`, backgroundColor: CAT_COLORS[index] }}
        />
      </div>
      <p className="text-xs text-[#71717a] leading-relaxed">{cat.description}</p>
      <div className="flex items-center gap-1 mt-2">
        <span className="text-[10px] text-[#52525b]">
          {cat.checks.filter((c) => c.passed).length}/{cat.checks.length} passed
        </span>
        <span className="text-[10px] text-[#52525b]">·</span>
        <span className="text-[10px] text-[#52525b]">
          ×{cat.weight.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

/** Individual audit check row */
function CheckRow({ check, categoryName }: { check: Check; categoryName: string }) {
  const [expanded, setExpanded] = useState(false)
  const statusColor = check.passed ? "#22c55e" : check.score >= 50 ? "#f59e0b" : "#ef4444"

  return (
    <div className="audit-row">
      <div
        className="px-5 py-3 flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status icon */}
        <span
          className="shrink-0 size-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: `${statusColor}18`,
            color: statusColor,
          }}
        >
          {check.passed ? "✓" : check.score >= 50 ? "~" : "✗"}
        </span>

        {/* Check name + verified URL */}
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{check.name}</div>
          <a
            href={check.verifiedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-[#52525b] hover:text-[#a1a1aa] truncate block transition-colors"
            title={check.verifiedUrl}
          >
            {check.verifiedUrl.replace(/^https?:\/\//, "")}
          </a>
        </div>

        {/* HTTP status + display value */}
        <div className="flex items-center gap-2 shrink-0">
          {check.httpStatus > 0 && (
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                check.httpStatus === 200
                  ? "bg-[#22c55e]/10 text-[#22c55e]"
                  : check.httpStatus === 404
                    ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                    : "bg-[#ef4444]/10 text-[#ef4444]"
              }`}
            >
              {check.httpStatus}
            </span>
          )}
          <span className="text-xs text-[#a1a1aa] font-mono w-16 text-right">
            {check.displayValue}
          </span>
          <span className="text-[11px] text-[#52525b] w-8 text-right font-mono">
            {check.score}%
          </span>
          {/* Expand icon */}
          <span
            className="text-[#52525b] text-xs transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "" }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-4 pl-14 space-y-2">
          <p className="text-xs text-[#a1a1aa] leading-relaxed">{check.details}</p>
          <div className="flex items-center gap-3 flex-wrap">
            {check.suggestion && (
              <span className="text-xs text-[#f59e0b]">💡 {check.suggestion}</span>
            )}
            <a
              href={check.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
            >
              Learn more →
            </a>
            <a
              href={check.verifiedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#52525b] hover:text-[#a1a1aa] transition-colors"
            >
              Verify ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/** Loading skeleton */
function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Hero skeleton */}
      <div className="flex flex-col items-center gap-4">
        <div className="skeleton-ring" />
        <div className="skeleton w-48 h-4" />
      </div>
      {/* Category cards */}
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-xl" />
        ))}
      </div>
      {/* Check rows */}
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton h-12" />
        ))}
      </div>
    </div>
  )
}

/** Error state */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="size-16 rounded-full bg-[#ef4444]/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">Audit Failed</h3>
      <p className="text-sm text-[#a1a1aa] mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-lg bg-[#27272a] text-sm hover:bg-[#3f3f46] transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}

/** Empty state */
function EmptyState() {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="text-6xl mb-4">🔦</div>
      <h3 className="text-lg font-semibold mb-2">Agent Lighthouse</h3>
      <p className="text-sm text-[#a1a1aa] mb-3">
        Audit any website for AI Agent Readiness. Measure how well your
        application serves AI agents — the Lighthouse for the Agent Era.
      </p>
      <p className="text-xs text-[#52525b]">
        Enter a URL above or try one of the quick examples.
      </p>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────

export default function Home() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState("")
  const [animateGauge, setAnimateGauge] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Re-trigger gauge animation when result changes
  useEffect(() => {
    if (result) {
      setAnimateGauge(false)
      requestAnimationFrame(() => setAnimateGauge(true))
    }
  }, [result])

  async function runAudit(target: string) {
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch(`/api/audit?url=${encodeURIComponent(target)}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      setResult(data)
    } catch {
      setError("Failed to connect to audit engine. Is the API running?")
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const target = url.trim()
    if (target) runAudit(target)
  }

  return (
    <div className="min-h-screen">
      {/* ── Header ──────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 border-b border-[#27272a] bg-[#0a0a0b]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2.5 font-semibold text-sm tracking-tight"
            onClick={(e) => {
              e.preventDefault()
              setResult(null)
              setError("")
              setUrl("")
              inputRef.current?.focus()
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#6366f1]"
            >
              <path
                d="M12 2L4 7v10l8 5 8-5V7l-8-5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 9l-4 2.5v5l4 2.5 4-2.5v-5L12 9z"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
            <span>Agent Lighthouse</span>
          </a>
          <nav className="flex items-center gap-6 text-sm text-[#a1a1aa]">
            <a
              href="https://github.com/wilsonwangdev/agent-lighthouse"
              target="_blank"
              className="hover:text-[#fafafa] transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────── */}
      <main className="pt-14">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* URL Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto mb-10"
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#52525b]">
                  🔗
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to audit (e.g. vercel.com)"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#27272a] bg-[#111113] text-sm placeholder:text-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="h-12 px-6 rounded-xl bg-[#6366f1] text-sm font-semibold hover:bg-[#5558e6] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Auditing...
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    Audit
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick examples */}
          {!result && !loading && (
            <div className="flex gap-2 justify-center flex-wrap mb-10">
              <span className="text-xs text-[#52525b] self-center mr-1">
                Quick audit:
              </span>
              {DEMO_URLS.map((demo) => (
                <button
                  key={demo.url}
                  onClick={() => {
                    setUrl(demo.url)
                    runAudit(demo.url)
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#fafafa] bg-[#111113] transition-all"
                >
                  {demo.name}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && <LoadingSkeleton />}

          {/* Error */}
          {error && (
            <ErrorState
              message={error}
              onRetry={() => url.trim() && runAudit(url.trim())}
            />
          )}

          {/* Empty state */}
          {!result && !loading && !error && <EmptyState />}

          {/* ── Results ──────────────────────────── */}
          {result && (
            <div className="space-y-8">
              {/* Hero: Score Gauge + Summary */}
              <div className="animate-in fade-in">
                <div className="rounded-2xl border border-[#27272a] bg-[#111113] p-8 md:p-10">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Gauge */}
                    <ScoreGauge
                      score={result.overallScore}
                      grade={result.grade}
                      animate={animateGauge}
                    />

                    {/* Score info */}
                    <div className="flex-1 text-center md:text-left min-w-0">
                      <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                        <span
                          className="px-3 py-1 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor:
                              SCORE_COLORS[result.grade]?.bg,
                            color: SCORE_COLORS[result.grade]?.text,
                          }}
                        >
                          Grade {result.grade}
                        </span>
                        <span className="text-xs text-[#52525b] font-mono">
                          {new Date(result.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold mb-1">
                        {result.summary}
                      </h2>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#6366f1] hover:text-[#818cf8] transition-colors break-all"
                      >
                        {result.url} ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Cards */}
              <div className="animate-in fade-in stagger-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {result.categories.map((cat, i) => (
                    <CategoryCard key={cat.name} cat={cat} index={i} />
                  ))}
                </div>
              </div>

              {/* Detailed Audits */}
              <div className="animate-in fade-in stagger-2 space-y-4">
                {result.categories.map((cat, catIdx) => (
                  <details
                    key={cat.name}
                    className="audit-section rounded-xl border border-[#27272a] bg-[#111113] overflow-hidden"
                    open={catIdx < 2}
                  >
                    <summary className="px-5 py-3.5 flex items-center gap-3 text-sm font-medium hover:bg-[#18181b] transition-colors">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                      <span
                        className="text-xs font-bold ml-auto mr-2"
                        style={{ color: CAT_COLORS[catIdx] }}
                      >
                        {cat.score}
                      </span>
                      <span className="text-[11px] text-[#52525b]">
                        {cat.checks.filter((c) => c.passed).length}/
                        {cat.checks.length}
                      </span>
                    </summary>
                    <div className="divide-y divide-[#27272a] border-t border-[#27272a]">
                      {cat.checks.map((check) => (
                        <CheckRow
                          key={check.id}
                          check={check}
                          categoryName={cat.name}
                        />
                      ))}
                    </div>
                  </details>
                ))}
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="animate-in fade-in stagger-4">
                  <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/3 overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#f59e0b]/10 flex items-center gap-2">
                      <span className="text-sm">💡</span>
                      <span className="text-sm font-medium text-[#f59e0b]">
                        Recommendations
                      </span>
                      <span className="text-xs text-[#52525b] ml-auto">
                        {result.recommendations.length} items
                      </span>
                    </div>
                    <div className="p-5">
                      <ol className="space-y-3">
                        {result.recommendations.map((rec, i) => (
                          <li
                            key={i}
                            className="flex gap-3 text-sm text-[#a1a1aa]"
                          >
                            <span className="text-[#f59e0b] font-mono shrink-0 mt-0.5">
                              {i + 1}.
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="animate-in fade-in stagger-5 text-center pb-8">
                <div className="text-xs text-[#52525b] space-y-1.5">
                  <p>
                    Powered by{" "}
                    <a
                      href="https://ora.sh"
                      target="_blank"
                      rel="noopener"
                      className="underline hover:text-[#a1a1aa]"
                    >
                      ora
                    </a>{" "}
                    Agent Readiness Framework
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
