#!/usr/bin/env node
import { Command } from "commander"
import chalk from "chalk"
import { readFileSync } from "node:fs"
import { auditUrl } from "@agent-lighthouse/core"

const program = new Command()

const GRADE_COLORS: Record<string, (s: string) => string> = {
  A: chalk.green.bold,
  B: chalk.blue.bold,
  C: chalk.yellow.bold,
  D: chalk.yellow.bold,
  F: chalk.red.bold,
}

const CATEGORY_COLORS = [chalk.cyan, chalk.magenta, chalk.yellow, chalk.blue, chalk.green]

program
  .name("agent-lighthouse")
  .description("Audit any website for AI Agent Readiness — the Lighthouse for the Agent Era")
  .version("1.0.0")
  .argument("[urls...]", "URL(s) to audit")
  .option("-j, --json", "Output raw JSON")
  .option("--csv", "Output CSV format")
  .option("-q, --quiet", "Show only the score")
  .option("-t, --threshold <number>", "Exit with code 1 if score is below threshold (CI mode)", parseInt)
  .option("--ci", "Shorthand for --threshold=80 --quiet")
  .option("--batch <file>", "Audit multiple URLs from a file (one per line)")
  .action(async (urls: string[], options) => {
    // Resolve URLs
    let targets: string[] = urls

    if (options.batch) {
      try {
        const content = readFileSync(options.batch, "utf-8")
        targets = content
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .filter((l) => !l.startsWith("#"))
        if (targets.length === 0) {
          console.error(chalk.red("No URLs found in batch file"))
          process.exit(1)
        }
      } catch {
        console.error(chalk.red(`Cannot read batch file: ${options.batch}`))
        process.exit(1)
      }
    }

    if (targets.length === 0) {
      console.error(chalk.red("No URLs provided. Usage: agent-lighthouse <url> [urls...]"))
      console.error(chalk.dim("  or: agent-lighthouse --batch urls.txt"))
      process.exit(1)
    }

    // CI shorthand
    if (options.ci) {
      options.threshold = 80
      options.quiet = true
    }

    // Batch mode
    if (targets.length > 1) {
      if (options.csv) {
        await runBatchCSV(targets)
      } else if (options.json) {
        await runBatchJSON(targets)
      } else if (options.quiet) {
        await runBatchQuiet(targets, options.threshold)
      } else {
        await runBatchReport(targets)
      }
      return
    }

    // Single URL mode
    const target = targets[0]!.startsWith("http") ? targets[0]! : `https://${targets[0]}`

    if (!options.quiet) {
      console.log(chalk.dim("\n🔍 Agent Lighthouse v1.0.0"))
      console.log(chalk.dim(`   Auditing: ${target}\n`))
    }

    const spinner = !options.quiet ? startSpinner("Scanning...") : null

    try {
      const result = await auditUrl({ url: target, timeout: 15000 })
      if (spinner) spinner.stop()

      if (options.json) {
        console.log(JSON.stringify(result, null, 2))
      } else if (options.csv) {
        printCSV(result)
      } else if (options.quiet) {
        console.log(String(result.overallScore))
      } else {
        printReport(result)
      }

      // CI threshold check
      if (options.threshold !== undefined && result.overallScore < options.threshold) {
        process.exitCode = 1
      }
    } catch (err) {
      if (spinner) spinner.stop()
      console.error(chalk.red(`\n❌ ${target} — Audit failed: ${err instanceof Error ? err.message : err}`))
      process.exit(1)
    }
  })

// ── Batch Runners ──────────────────────────────────────────

async function runBatchReport(targets: string[]) {
  console.log(chalk.dim(`\n🔍 Agent Lighthouse v1.0.0`))
  console.log(chalk.dim(`   Batch audit: ${targets.length} URLs\n`))

  const results: Awaited<ReturnType<typeof auditUrl>>[] = []
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!.startsWith("http") ? targets[i]! : `https://${targets[i]}`
    const label = `[${i + 1}/${targets.length}]`
    process.stderr.write(`\r${chalk.dim(label)} Auditing ${target.slice(0, 40).padEnd(40)}`)

    try {
      const result = await auditUrl({ url: target, timeout: 15000 })
      results.push(result)
    } catch (err) {
      process.stderr.write(`\r${chalk.red(label)} ✗ ${target.slice(0, 50)} — ${err instanceof Error ? err.message : "failed"}\n`)
    }
  }
  process.stderr.write("\r\x1b[K")

  // Summary table
  console.log("")
  console.log("  " + "─".repeat(70))
  console.log(`  ${chalk.bold("Batch Audit Results".padEnd(40))} ${chalk.dim(`${results.length} sites`)}`)
  console.log("  " + "─".repeat(70))

  // Sort by score descending
  results.sort((a, b) => b.overallScore - a.overallScore)

  for (const r of results) {
    const gradeColor = GRADE_COLORS[r.grade] ?? chalk.white
    const bar = "█".repeat(Math.round(r.overallScore / 5)) + "░".repeat(20 - Math.round(r.overallScore / 5))
    console.log(`  ${gradeColor(String(r.overallScore).padStart(3))} ${gradeColor(r.grade)}  ${bar}  ${chalk.dim(r.url.slice(0, 35))}`)
  }

  // Average
  const avg = Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length)
  console.log("  " + "─".repeat(70))
  console.log(`  ${chalk.bold("Average:")} ${avg}/100  ·  ${results.length} sites`)
  console.log("")
}

async function runBatchJSON(targets: string[]) {
  const results: Record<string, any> = {}
  const label = (i: number) => `[${i + 1}/${targets.length}]`

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!.startsWith("http") ? targets[i]! : `https://${targets[i]}`
    process.stderr.write(`\r${chalk.dim(label(i))} ${target.slice(0, 40)}`)

    try {
      results[target] = await auditUrl({ url: target, timeout: 15000 })
    } catch (err) {
      results[target] = { error: err instanceof Error ? err.message : String(err) }
    }
  }
  process.stderr.write("\r\x1b[K")
  console.log(JSON.stringify(results, null, 2))
}

async function runBatchCSV(targets: string[]) {
  // Header
  console.log("url,grade,score,discovery,identity,auth,integration,ux")
  const label = (i: number) => `[${i + 1}/${targets.length}]`

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!.startsWith("http") ? targets[i]! : `https://${targets[i]}`
    process.stderr.write(`\r${chalk.dim(label(i))} ${target.slice(0, 40)}`)

    try {
      const r = await auditUrl({ url: target, timeout: 15000 })
      const cats = r.categories.map((c) => c.score).join(",")
      console.log(`${r.url},${r.grade},${r.overallScore},${cats}`)
    } catch (err) {
      console.log(`${target},ERR,0,0,0,0,0,0`)
    }
  }
  process.stderr.write("\r\x1b[K")
}

async function runBatchQuiet(targets: string[], threshold?: number) {
  let failed = 0
  const label = (i: number) => `[${i + 1}/${targets.length}]`

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!.startsWith("http") ? targets[i]! : `https://${targets[i]}`
    process.stderr.write(`\r${chalk.dim(label(i))} ${target.slice(0, 40)}`)

    try {
      const r = await auditUrl({ url: target, timeout: 15000 })
      if (threshold !== undefined && r.overallScore < threshold) {
        failed++
      }
    } catch {
      failed++
    }
  }
  process.stderr.write("\r\x1b[K")

  if (failed > 0) {
    console.log(`${failed}/${targets.length} sites below threshold or failed`)
    process.exitCode = 1
  } else {
    console.log(`${targets.length} sites passed`)
  }
}

// ── Spinner ─────────────────────────────────────────────────

function startSpinner(text: string) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  let i = 0
  const timer = setInterval(() => {
    process.stderr.write(`\r${chalk.dim(frames[i++ % frames.length]!)} ${text}`)
  }, 80)
  return { stop: () => { clearInterval(timer); process.stderr.write("\r\x1b[K") } }
}

// ── Report Printer ──────────────────────────────────────────

function printReport(result: Awaited<ReturnType<typeof auditUrl>>) {
  const gradeColor = GRADE_COLORS[result.grade] ?? chalk.white

  console.log("")
  console.log("  ┌" + "─".repeat(56) + "┐")
  console.log(`  │  ${chalk.bold("Agent Readiness Report")}${" ".repeat(34)}│`)
  console.log(`  │  ${chalk.dim(result.url)}${" ".repeat(Math.max(0, 54 - result.url.length))}│`)
  console.log("  ├" + "─".repeat(56) + "┤")

  const barLen = 30
  const filledLen = Math.round((result.overallScore / 100) * barLen)
  const bar = chalk.bgGreen(" ".repeat(Math.min(filledLen, barLen))) + chalk.bgGray(" ".repeat(Math.max(0, barLen - filledLen)))
  console.log(`  │  Score: ${gradeColor(`${result.overallScore}`)} / 100   Grade: ${gradeColor(result.grade)}${" ".repeat(22)}│`)
  console.log(`  │  ${bar}${" ".repeat(26)}│`)
  console.log(`  │${" ".repeat(56)}│`)
  console.log(`  │  ${chalk.dim(result.summary.slice(0, 52))}${" ".repeat(Math.max(0, 52 - result.summary.slice(0, 52).length))}│`)
  console.log("  ├" + "─".repeat(56) + "┤")

  console.log(`  │  ${chalk.bold("Categories")}${" ".repeat(45)}│`)
  console.log(`  │${" ".repeat(56)}│`)
  for (let i = 0; i < result.categories.length; i++) {
    const cat = result.categories[i]!
    const color = CATEGORY_COLORS[i]
    const catBar = "█".repeat(Math.round(cat.score / 5)) + "░".repeat(20 - Math.round(cat.score / 5))
    const weightPct = Math.round(cat.weight * 100)
    console.log(`  │  ${color(cat.name.padEnd(16))} ${catBar} ${String(cat.score).padStart(3)}  (×${weightPct}%)${" ".repeat(4)}│`)
  }

  console.log("  ├" + "─".repeat(56) + "┤")
  console.log(`  │  ${chalk.bold("Checks")}${" ".repeat(49)}│`)
  console.log(`  │${" ".repeat(56)}│`)
  const allChecks = result.categories.flatMap((c) => c.checks.map((ch) => ({ ...ch, category: c.name })))
  for (const check of allChecks.slice(0, 15)) {
    const icon = check.passed ? chalk.green("✓") : chalk.red("✗")
    const name = check.name.slice(0, 28).padEnd(28)
    const score = String(check.score).padStart(3)
    console.log(`  │  ${icon} ${name} ${chalk.dim(score)}%${" ".repeat(14)}│`)
  }

  console.log("  ├" + "─".repeat(56) + "┤")
  if (result.recommendations.length > 0) {
    console.log(`  │  ${chalk.yellow.bold("Recommendations")}${" ".repeat(40)}│`)
    console.log(`  │${" ".repeat(56)}│`)
    for (const rec of result.recommendations.slice(0, 5)) {
      for (const line of wrapText(rec, 50)) {
        console.log(`  │  ${chalk.dim("•")} ${chalk.dim(line)}${" ".repeat(Math.max(0, 52 - line.length))}│`)
      }
    }
  }

  console.log("  └" + "─".repeat(56) + "┘")
  console.log("")
  console.log(chalk.dim("  💡 Run with --json for machine-readable output"))
  console.log(chalk.dim("  💡 Run with --ci to enforce score threshold"))
  console.log("")
}

function printCSV(result: Awaited<ReturnType<typeof auditUrl>>) {
  const cats = result.categories.map((c) => c.score).join(",")
  console.log(`url,grade,score,discovery,identity,auth,integration,ux`)
  console.log(`${result.url},${result.grade},${result.overallScore},${cats}`)
}

function wrapText(text: string, width: number): string[] {
  if (text.length <= width) return [text]
  const lines: string[] = []
  let remaining = text
  while (remaining.length > width) {
    let cut = remaining.lastIndexOf(" ", width)
    if (cut === -1) cut = width
    lines.push(remaining.slice(0, cut))
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) lines.push(remaining)
  return lines
}

program.parse()
