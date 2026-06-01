import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agent Lighthouse",
  description: "Measure AI agent engineering maturity across your projects",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <header className="fixed top-0 w-full z-50 border-b border-[#262626] bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-semibold text-sm tracking-tight">
              <span className="size-2 rounded-full bg-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              Agent Lighthouse
            </a>
            <nav className="flex items-center gap-6 text-sm text-[#a3a3a3]">
              <a href="/" className="hover:text-[#fafafa] transition-colors">Dashboard</a>
              <a href="https://github.com/wilsonwangdev/agent-lighthouse" target="_blank" className="hover:text-[#fafafa] transition-colors">GitHub</a>
            </nav>
          </div>
        </header>
        <main className="pt-14">{children}</main>
      </body>
    </html>
  )
}
