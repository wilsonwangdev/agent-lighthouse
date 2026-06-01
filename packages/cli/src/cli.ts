#!/usr/bin/env node
import { Command } from "commander"
import chalk from "chalk"
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
  .version("0.1.0")
  .argument("<url>", "URL to audit")
  .option("-j, --json", "Output raw JSON")
  .option("-q, --quiet", "Show only the score")
  .action(async (url, options) => {
    const target = url.startsWith("http") ? url : `https://${url}`

    if (!options.quiet) {
      console.log(chalk.dim("\n🔍 Agent Lighthouse v0.1.0"))
      console.log(chalk.dim(`   Auditing: ${target}\n`))
    }

    const spinner = !options.quiet ? startSpinner("Scanning...") : null

    try {
      const result = await auditUrl({ url: target, timeout: 15000 })

      if (spinner) spinner.stop()

      if (options.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }

      printReport(result)
    } catch (err) {
      if (spinner) spinner.stop()
      console.error(chalk.red(`\n❌ Audit failed: ${err instanceof Error ? err.message : err}`))
      process.exit(1)
    }
  })

// ── Spinner ──────────────────────────────────────────────

function startSpinner(text: string) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  let i = 0
  const timer = setInterval(() => {
    process.stderr.write(`\r${chalk.dim(frames[i++ % frames.length])} ${text}`)
  }, 80)
  return { stop: () => { clearInterval(timer); process.stderr.write("\r\x1b[K") } }
}

// ── Report Printer ──────────────────────────────────────

function printReport(result: Awaited<ReturnType<typeof auditUrl>>) {
  const gradeColor = GRADE_COLORS[result.grade] || chalk.white

  // Header
  console.log("")
  console.log("  ┌" + "─".repeat(56) + "┐")
  console.log(`  │  ${chalk.bold("Agent Readiness Report")}${" ".repeat(34)}│`)
  console.log(`  │  ${chalk.dim(result.url)}${" ".repeat(Math.max(0, 54 - result.url.length))}│`)
  console.log("  ├" + "─".repeat(56) + "┤")

  // Score
  const barLen = 30
  const filledLen = Math.round((result.overallScore / 100) * barLen)
  const bar = chalk.bgGreen(" ".repeat(Math.min(filledLen, barLen))) + chalk.bgGray(" ".repeat(Math.max(0, barLen - filledLen)))
  console.log(`  │  Score: ${gradeColor(`${result.overallScore}`)} / 100   Grade: ${gradeColor(result.grade)}${" ".repeat(22)}│`)
  console.log(`  │  ${bar}${" ".repeat(26)}│`)
  console.log(`  │${" ".repeat(56)}│`)
  console.log(`  │  ${chalk.dim(result.summary.slice(0, 52))}${" ".repeat(Math.max(0, 52 - result.summary.slice(0, 52).length))}│`)
  console.log("  ├" + "─".repeat(56) + "┤")

  // Categories
  console.log(`  │  ${chalk.bold("Categories")}${" ".repeat(45)}│`)
  console.log(`  │${" ".repeat(56)}│`)
  for (let i = 0; i < result.categories.length; i++) {
    const cat = result.categories[i]
    const color = CATEGORY_COLORS[i]
    const catBar = "█".repeat(Math.round(cat.score / 5)) + "░".repeat(20 - Math.round(cat.score / 5))
    const weightPct = Math.round(cat.weight * 100)
    console.log(`  │  ${color(cat.name.padEnd(16))} ${catBar} ${String(cat.score).padStart(3)}  (×${weightPct}%)${" ".repeat(4)}│`)
  }

  console.log("  ├" + "─".repeat(56) + "┤")

  // Checks
  console.log(`  │  ${chalk.bold("Checks")}${" ".repeat(49)}│`)
  console.log(`  │${" ".repeat(56)}│`)
  const allChecks = result.categories.flatMap((c) =>
    c.checks.map((ch) => ({ ...ch, category: c.name }))
  )
  for (const check of allChecks.slice(0, 15)) {
    const icon = check.passed ? chalk.green("✓") : chalk.red("✗")
    const name = check.name.slice(0, 28).padEnd(28)
    const score = String(check.score).padStart(3)
    console.log(`  │  ${icon} ${name} ${chalk.dim(score)}%${" ".repeat(14)}│`)
  }

  console.log("  ├" + "─".repeat(56) + "┤")

  // Recommendations
  if (result.recommendations.length > 0) {
    console.log(`  │  ${chalk.yellow.bold("Recommendations")}${" ".repeat(40)}│`)
    console.log(`  │${" ".repeat(56)}│`)
    for (const rec of result.recommendations.slice(0, 5)) {
      const wrapped = wrapText(rec, 50)
      for (const line of wrapped) {
        console.log(`  │  ${chalk.dim("•")} ${chalk.dim(line)}${" ".repeat(Math.max(0, 52 - line.length))}│`)
      }
    }
  }

  console.log("  └" + "─".repeat(56) + "┘")
  console.log("")

  // Quick re-run hint
  console.log(chalk.dim(`  💡 Run with --json for machine-readable output`))
  console.log("")
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
