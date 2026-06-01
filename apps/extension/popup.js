// Agent Lighthouse — Browser Extension Popup

const AUDIT = AgentLighthouse

const GRADE_COLORS = {
  A: { bg: "#22c55e", text: "#052e16" },
  B: { bg: "#6366f1", text: "#fafafa" },
  C: { bg: "#f59e0b", text: "#1a1a1a" },
  D: { bg: "#f97316", text: "#1a1a1a" },
  F: { bg: "#ef4444", text: "#fafafa" },
}

const CAT_COLORS = ["#6366f1", "#a855f7", "#22c55e", "#f59e0b", "#3b82f6"]

// DOM
const urlInput = document.getElementById("urlInput")
const auditBtn = document.getElementById("auditBtn")
const loading = document.getElementById("loading")
const errorEl = document.getElementById("error")
const resultEl = document.getElementById("result")

// Auto-fill current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
    urlInput.value = tab.url
    auditBtn.disabled = false
  }
})

// Enable button on input
urlInput.addEventListener("input", () => {
  auditBtn.disabled = !urlInput.value.trim() || auditBtn.disabled && !urlInput.value.trim()
})

// Audit button
auditBtn.addEventListener("click", () => runAudit(urlInput.value.trim()))

// Quick actions
document.getElementById("auditCurrent").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.url) {
      urlInput.value = tab.url
      runAudit(tab.url)
    }
  })
})
document.getElementById("auditVercel").addEventListener("click", () => {
  urlInput.value = "vercel.com"
  runAudit("vercel.com")
})
document.getElementById("auditGitHub").addEventListener("click", () => {
  urlInput.value = "github.com"
  runAudit("github.com")
})

// Enter key submits
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && urlInput.value.trim()) {
    runAudit(urlInput.value.trim())
  }
})

async function runAudit(target) {
  resultEl.classList.remove("show")
  errorEl.classList.remove("show")
  loading.classList.add("show")
  auditBtn.disabled = true

  try {
    const url = target.startsWith("http") ? target : "https://" + target
    const result = await AUDIT.auditUrl({ url, timeout: 10000 })

    loading.classList.remove("show")
    renderResult(result)
  } catch (err) {
    loading.classList.remove("show")
    errorEl.textContent = "❌ " + (err.message || "Audit failed")
    errorEl.classList.add("show")
    auditBtn.disabled = false
  }
}

function renderResult(result) {
  const colors = GRADE_COLORS[result.grade] || GRADE_COLORS.F

  // Score circle
  document.getElementById("scoreCircle").style.background = colors.bg
  document.getElementById("scoreCircle").style.color = colors.text
  document.getElementById("scoreCircle").textContent = result.overallScore
  document.getElementById("gradeLabel").textContent = "Grade " + result.grade + " · " + result.overallScore + "/100"
  document.getElementById("summaryText").textContent = result.summary
  document.getElementById("auditedUrl").textContent = result.url

  // Categories
  const catsEl = document.getElementById("categories")
  catsEl.innerHTML = result.categories.map((cat, i) => `
    <div class="cat-card">
      <div class="cat-header">
        <span class="cat-name">${cat.icon} ${cat.name}</span>
        <span class="cat-score" style="color:${CAT_COLORS[i]}">${cat.score}</span>
      </div>
      <div class="cat-bar">
        <div class="cat-bar-fill" style="width:${cat.score}%;background:${CAT_COLORS[i]}"></div>
      </div>
      <div class="cat-passed">${cat.checks.filter(c => c.passed).length}/${cat.checks.length} · ×${cat.weight.toFixed(2)}</div>
    </div>
  `).join("")

  // Checks
  const checksEl = document.getElementById("checks")
  checksEl.innerHTML = result.categories.flatMap(cat =>
    cat.checks.map(check => {
      const statusColor = check.passed ? "#22c55e" : check.score >= 50 ? "#f59e0b" : "#ef4444"
      const icon = check.passed ? "✓" : check.score >= 50 ? "~" : "✗"
      return `
        <div class="check-row">
          <span class="status" style="color:${statusColor}">${icon}</span>
          <span class="name">${check.name}</span>
          <a class="url-link" href="${check.verifiedUrl}" target="_blank" title="${check.verifiedUrl}">↗ verify</a>
          <span class="score">${check.score}%</span>
        </div>
      `
    })
  ).join("")

  resultEl.classList.add("show")
  auditBtn.disabled = false
}
