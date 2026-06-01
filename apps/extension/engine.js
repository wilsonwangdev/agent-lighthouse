"use strict";
var AgentLighthouse = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/core/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    auditUrl: () => auditUrl
  });
  function getGrade(score) {
    if (score >= 80) return "A";
    if (score >= 65) return "B";
    if (score >= 50) return "C";
    if (score >= 35) return "D";
    return "F";
  }
  async function fetchWithStatus(url, timeout = 1e4, method = "GET") {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        redirect: "follow"
      });
      clearTimeout(timer);
      const body = method === "GET" ? await res.text() : null;
      return { body, status: res.status, ok: res.ok, url: res.url };
    } catch {
      return { body: null, status: 0, ok: false, url };
    }
  }
  async function auditUrl(options) {
    const { url, timeout = 1e4 } = options;
    const baseUrl = new URL(url).origin;
    const htmlResult = await fetchWithStatus(url, timeout);
    const robotsResult = await fetchWithStatus(`${baseUrl}/robots.txt`, timeout);
    const checks = {
      discovery: await auditDiscovery(baseUrl, htmlResult, robotsResult),
      identity: await auditIdentity(htmlResult),
      auth: await auditAuth(baseUrl),
      integration: await auditIntegration(baseUrl, htmlResult),
      ux: await auditUX(htmlResult)
    };
    const categories = [
      {
        name: "Discovery",
        description: "Can AI agents find and understand your site's structure?",
        weight: 0.25,
        checks: checks.discovery,
        score: avgScore(checks.discovery),
        icon: "\u{1F50D}"
      },
      {
        name: "Identity",
        description: "Do agents know what your site is and who it belongs to?",
        weight: 0.2,
        checks: checks.identity,
        score: avgScore(checks.identity),
        icon: "\u{1FAAA}"
      },
      {
        name: "Auth & Access",
        description: "Can agents authenticate and access your resources?",
        weight: 0.2,
        checks: checks.auth,
        score: avgScore(checks.auth),
        icon: "\u{1F510}"
      },
      {
        name: "Integration",
        description: "Can agents integrate via protocols, APIs, and feeds?",
        weight: 0.2,
        checks: checks.integration,
        score: avgScore(checks.integration),
        icon: "\u{1F50C}"
      },
      {
        name: "UX",
        description: "Is your interface structured for agent consumption?",
        weight: 0.15,
        checks: checks.ux,
        score: avgScore(checks.ux),
        icon: "\u{1F3AF}"
      }
    ];
    const overallScore = Math.round(
      categories.reduce((sum, c) => sum + c.score * c.weight, 0)
    );
    const recommendations = categories.flatMap((c) => c.checks).filter((ch) => !ch.passed && ch.suggestion).map((ch) => ch.suggestion);
    const grade = getGrade(overallScore);
    const gradeDescriptions = {
      A: "Fully Agent-Ready. Agents can discover, authenticate, integrate, and complete tasks on this application.",
      B: "Mostly Agent-Ready. Core agent protocols are in place, with room for deeper integration.",
      C: "Partially Agent-Ready. Basic discoverability exists but agents struggle beyond surface-level interaction.",
      D: "Minimally Agent-Ready. Agents can barely interact with this application. Major gaps exist.",
      F: "Not Agent-Ready. This application is invisible or hostile to AI agents. Fundamental work needed."
    };
    return {
      url,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      overallScore,
      grade,
      categories,
      summary: gradeDescriptions[grade],
      recommendations: recommendations.slice(0, 8)
    };
  }
  async function auditDiscovery(baseUrl, html, robots) {
    const checks = [];
    const llmsUrl = `${baseUrl}/llms.txt`;
    const llms = await fetchWithStatus(llmsUrl);
    checks.push({
      id: "llms-txt",
      name: "llms.txt exists",
      passed: llms.ok && (llms.body?.length ?? 0) > 10,
      score: llms.ok ? (llms.body?.length ?? 0) > 100 ? 100 : 60 : 0,
      details: llms.ok ? `llms.txt found (${llms.body.length.toLocaleString()} bytes)` : `llms.txt not found (HTTP ${llms.status || "connection failed"})`,
      suggestion: llms.ok ? void 0 : "Create an llms.txt file at the root of your site. See https://llmstxt.org",
      verifiedUrl: llmsUrl,
      httpStatus: llms.status,
      displayValue: llms.ok ? `${(llms.body.length / 1024).toFixed(1)} KB` : "\u2014",
      docsUrl: "https://llmstxt.org"
    });
    const llmsFullUrl = `${baseUrl}/llms-full.txt`;
    const llmsFull = await fetchWithStatus(llmsFullUrl);
    checks.push({
      id: "llms-full-txt",
      name: "llms-full.txt (extended docs)",
      passed: llmsFull.ok && (llmsFull.body?.length ?? 0) > 100,
      score: llmsFull.ok ? (llmsFull.body?.length ?? 0) > 500 ? 100 : 50 : 0,
      details: llmsFull.ok ? `llms-full.txt found (${llmsFull.body.length.toLocaleString()} bytes)` : `llms-full.txt not found (HTTP ${llmsFull.status || "connection failed"})`,
      suggestion: llmsFull.ok ? void 0 : "Add llms-full.txt with comprehensive documentation for AI agents",
      verifiedUrl: llmsFullUrl,
      httpStatus: llmsFull.status,
      displayValue: llmsFull.ok ? `${(llmsFull.body.length / 1024).toFixed(1)} KB` : "\u2014",
      docsUrl: "https://llmstxt.org"
    });
    const aiAgents = ["GPTBot", "Claude", "anthropic", "CCBot", "Google-Extended"];
    const matchedAgents = aiAgents.filter(
      (a) => robots.body?.includes(a)
    );
    const hasAiRules = matchedAgents.length > 0;
    checks.push({
      id: "robots-ai-rules",
      name: "robots.txt has AI crawler rules",
      passed: hasAiRules,
      score: hasAiRules ? 100 : robots.ok ? 30 : 0,
      details: hasAiRules ? `AI crawler directives found: ${matchedAgents.join(", ")}` : robots.ok ? "No AI-specific crawler rules in robots.txt" : `robots.txt not accessible (HTTP ${robots.status || "connection failed"})`,
      suggestion: hasAiRules ? void 0 : "Add AI crawler directives (GPTBot, Claude, etc.) to robots.txt",
      verifiedUrl: `${baseUrl}/robots.txt`,
      httpStatus: robots.status,
      displayValue: hasAiRules ? `${matchedAgents.length} agents` : "0 agents",
      docsUrl: "https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers"
    });
    const sitemapInRobots = robots.body?.includes("Sitemap:");
    const sitemapInHtml = html.body?.includes("sitemap") || html.body?.includes("Sitemap");
    const hasSitemap = sitemapInRobots || sitemapInHtml;
    checks.push({
      id: "sitemap",
      name: "Sitemap discoverable",
      passed: !!hasSitemap,
      score: hasSitemap ? 100 : 0,
      details: hasSitemap ? sitemapInRobots ? "Sitemap referenced in robots.txt" : "Sitemap referenced in page HTML" : "No sitemap reference found",
      suggestion: hasSitemap ? void 0 : "Add a sitemap.xml and reference it in robots.txt",
      verifiedUrl: `${baseUrl}/sitemap.xml`,
      httpStatus: 0,
      displayValue: hasSitemap ? "Found" : "Missing",
      docsUrl: "https://www.sitemaps.org/protocol.html"
    });
    return checks;
  }
  async function auditIdentity(html) {
    const checks = [];
    const hasHtml = !!html.body;
    const htmlUrl = html.url;
    const hasOGTitle = hasHtml && /property="og:title"/i.test(html.body);
    const hasOGDesc = hasHtml && /property="og:description"/i.test(html.body);
    const hasOGImage = hasHtml && /property="og:image"/i.test(html.body);
    const ogPresent = [hasOGTitle, hasOGDesc, hasOGImage].filter(Boolean);
    const ogCount = ogPresent.length;
    const ogTitleMatch = hasHtml ? html.body.match(/property="og:title"\s+content="([^"]+)"/i) : null;
    const ogDescMatch = hasHtml ? html.body.match(/property="og:description"\s+content="([^"]+)"/i) : null;
    checks.push({
      id: "open-graph",
      name: "Open Graph tags",
      passed: ogCount >= 2,
      score: Math.round(ogCount / 3 * 100),
      details: `${ogCount}/3 OG tags present (${["title", "description", "image"].filter((_, i) => [hasOGTitle, hasOGDesc, hasOGImage][i]).join(", ")})`,
      suggestion: ogCount < 3 ? "Add missing Open Graph meta tags for better agent understanding" : void 0,
      verifiedUrl: htmlUrl,
      httpStatus: html.status,
      displayValue: `${ogCount}/3`,
      docsUrl: "https://ogp.me/"
    });
    const hasJsonLd = hasHtml && /application\/ld\+json/.test(html.body);
    const jsonLdCount = hasHtml ? (html.body.match(/application\/ld\+json/gi) || []).length : 0;
    checks.push({
      id: "structured-data",
      name: "Structured data (JSON-LD)",
      passed: !!hasJsonLd,
      score: hasJsonLd ? 100 : 0,
      details: hasJsonLd ? `${jsonLdCount} JSON-LD block(s) found` : "No JSON-LD structured data",
      suggestion: hasJsonLd ? void 0 : "Add JSON-LD structured data (Schema.org) to help agents understand your content",
      verifiedUrl: htmlUrl,
      httpStatus: html.status,
      displayValue: hasJsonLd ? `${jsonLdCount} blocks` : "0",
      docsUrl: "https://schema.org/"
    });
    const hasMetaDesc = hasHtml && /<meta[^>]*name="description"/i.test(html.body);
    const metaDescMatch = hasHtml ? html.body.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) : null;
    const descLength = metaDescMatch?.[1]?.length ?? 0;
    checks.push({
      id: "meta-description",
      name: "Meta description",
      passed: !!hasMetaDesc && descLength >= 50,
      score: hasMetaDesc ? descLength >= 120 ? 100 : 60 : 0,
      details: hasMetaDesc ? `Meta description found (${descLength} chars)` : "No meta description tag",
      suggestion: hasMetaDesc ? void 0 : "Add a descriptive meta description tag (50-160 chars)",
      verifiedUrl: htmlUrl,
      httpStatus: html.status,
      displayValue: descLength ? `${descLength} chars` : "\u2014",
      docsUrl: "https://developers.google.com/search/docs/appearance/snippet"
    });
    const hasTitle = hasHtml && /<title>/i.test(html.body);
    const titleMatch = hasHtml ? html.body.match(/<title>([^<]+)<\/title>/i) : null;
    const titleText = titleMatch?.[1]?.trim() ?? "";
    checks.push({
      id: "title-tag",
      name: "Page title",
      passed: !!hasTitle && titleText.length > 10,
      score: hasTitle ? titleText.length >= 30 ? 100 : 50 : 0,
      details: hasTitle ? `Title tag present: "${titleText}"` : "No title tag",
      suggestion: hasTitle ? void 0 : "Add a descriptive <title> tag",
      verifiedUrl: htmlUrl,
      httpStatus: html.status,
      displayValue: titleText ? titleText.length > 50 ? titleText.slice(0, 47) + "..." : titleText : "\u2014",
      docsUrl: "https://developers.google.com/search/docs/appearance/title-link"
    });
    return checks;
  }
  async function auditAuth(baseUrl) {
    const checks = [];
    const oauthUrl = `${baseUrl}/.well-known/oauth-authorization-server`;
    const oauth = await fetchWithStatus(oauthUrl);
    checks.push({
      id: "oauth-metadata",
      name: "OAuth 2.0 metadata endpoint",
      passed: oauth.ok,
      score: oauth.ok ? 100 : 0,
      details: oauth.ok ? "OAuth 2.0 metadata endpoint accessible" : `No OAuth metadata at ${oauthUrl} (HTTP ${oauth.status || "connection failed"})`,
      suggestion: oauth.ok ? void 0 : "Publish OAuth 2.0 metadata at /.well-known/oauth-authorization-server for standardized agent auth",
      verifiedUrl: oauthUrl,
      httpStatus: oauth.status,
      displayValue: oauth.ok ? "Available" : "\u2014",
      docsUrl: "https://datatracker.ietf.org/doc/html/rfc8414"
    });
    const oidcUrl = `${baseUrl}/.well-known/openid-configuration`;
    const oidc = await fetchWithStatus(oidcUrl);
    checks.push({
      id: "oidc",
      name: "OpenID Connect discovery",
      passed: oidc.ok,
      score: oidc.ok ? 100 : 0,
      details: oidc.ok ? "OpenID Connect discovery found" : `No OIDC config at ${oidcUrl} (HTTP ${oidc.status || "connection failed"})`,
      suggestion: oidc.ok ? void 0 : "Publish OpenID Connect configuration for standardized agent auth",
      verifiedUrl: oidcUrl,
      httpStatus: oidc.status,
      displayValue: oidc.ok ? "Available" : "\u2014",
      docsUrl: "https://openid.net/connect/"
    });
    const usesHttps = baseUrl.startsWith("https://");
    checks.push({
      id: "https",
      name: "HTTPS enforced",
      passed: usesHttps,
      score: usesHttps ? 100 : 0,
      details: usesHttps ? "Site uses HTTPS" : `Site uses HTTP \u2014 ${baseUrl} (agents require encrypted connections)`,
      suggestion: usesHttps ? void 0 : "Enforce HTTPS for all traffic \u2014 required for agent auth",
      verifiedUrl: baseUrl,
      httpStatus: 200,
      displayValue: usesHttps ? "\u{1F512} HTTPS" : "\u26A0\uFE0F HTTP",
      docsUrl: "https://https.cio.gov/everything/"
    });
    const apiDocUrl = `${baseUrl}/docs/api`;
    const apiDocs = await fetchWithStatus(apiDocUrl);
    checks.push({
      id: "api-key-docs",
      name: "API authentication documented",
      passed: apiDocs.ok,
      score: apiDocs.ok ? 80 : 0,
      details: apiDocs.ok ? "API documentation page found" : `No API docs at ${apiDocUrl} (HTTP ${apiDocs.status || "connection failed"})`,
      suggestion: apiDocs.ok ? void 0 : "Document API authentication methods publicly for agent consumption",
      verifiedUrl: apiDocUrl,
      httpStatus: apiDocs.status,
      displayValue: apiDocs.ok ? "Found" : "\u2014",
      docsUrl: "https://swagger.io/docs/specification/authentication/"
    });
    return checks;
  }
  async function auditIntegration(baseUrl, html) {
    const checks = [];
    const mcpUrl = `${baseUrl}/.well-known/mcp`;
    const mcp = await fetchWithStatus(mcpUrl);
    checks.push({
      id: "mcp-endpoint",
      name: "MCP endpoint",
      passed: mcp.ok,
      score: mcp.ok ? 100 : 0,
      details: mcp.ok ? "MCP endpoint accessible" : `No MCP endpoint at ${mcpUrl} (HTTP ${mcp.status || "connection failed"})`,
      suggestion: mcp.ok ? void 0 : "Implement an MCP (Model Context Protocol) endpoint for agent tool access",
      verifiedUrl: mcpUrl,
      httpStatus: mcp.status,
      displayValue: mcp.ok ? "Available" : "\u2014",
      docsUrl: "https://modelcontextprotocol.io/"
    });
    const webhooksUrl = `${baseUrl}/docs/webhooks`;
    const webhooks = await fetchWithStatus(webhooksUrl);
    checks.push({
      id: "webhooks",
      name: "Webhook support",
      passed: webhooks.ok,
      score: webhooks.ok ? 80 : 0,
      details: webhooks.ok ? "Webhook documentation found" : `No webhook docs at ${webhooksUrl} (HTTP ${webhooks.status || "connection failed"})`,
      suggestion: webhooks.ok ? void 0 : "Document webhook capabilities for agent-driven event handling",
      verifiedUrl: webhooksUrl,
      httpStatus: webhooks.status,
      displayValue: webhooks.ok ? "Documented" : "\u2014",
      docsUrl: "https://docs.github.com/en/webhooks"
    });
    const rssRegex = /type="application\/(rss|atom)\+xml"/i;
    const rssMatch = html.body?.match(rssRegex);
    const hasRSS = !!rssMatch;
    checks.push({
      id: "rss-feed",
      name: "RSS/Atom feed",
      passed: hasRSS,
      score: hasRSS ? 80 : 0,
      details: hasRSS ? "RSS/Atom feed link found in page source" : "No RSS/Atom feed in page source",
      suggestion: hasRSS ? void 0 : "Add an RSS/Atom feed for agent-friendly content consumption",
      verifiedUrl: html.url,
      httpStatus: html.status,
      displayValue: hasRSS ? "Found" : "Not found",
      docsUrl: "https://www.rssboard.org/rss-specification"
    });
    let corsValue = "";
    let corsStatus = 0;
    try {
      const corsRes = await fetch(baseUrl, { method: "OPTIONS" });
      corsStatus = corsRes.status;
      corsValue = corsRes.headers.get("access-control-allow-origin") || "";
    } catch {
    }
    checks.push({
      id: "cors",
      name: "CORS configured",
      passed: !!corsValue,
      score: corsValue === "*" ? 60 : corsValue ? 80 : 20,
      details: corsValue ? `CORS allows: ${corsValue}` : "No CORS headers on OPTIONS request",
      suggestion: corsValue ? void 0 : "Configure CORS headers for cross-origin agent access",
      verifiedUrl: baseUrl,
      httpStatus: corsStatus,
      displayValue: corsValue || "Not set",
      docsUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS"
    });
    return checks;
  }
  async function auditUX(html) {
    const checks = [];
    const body = html.body;
    const hasHtml = !!body;
    const htmlUrl = html.url;
    const semanticTags = ["nav", "main", "header", "footer"];
    const foundSemantic = semanticTags.filter(
      (tag) => hasHtml && new RegExp(`<${tag}\\b`, "i").test(body)
    );
    const semanticCount = foundSemantic.length;
    const missingSemantic = semanticTags.filter(
      (t) => !foundSemantic.includes(t)
    );
    checks.push({
      id: "semantic-html",
      name: "Semantic HTML structure",
      passed: semanticCount >= 3,
      score: Math.round(semanticCount / 4 * 100),
      details: semanticCount >= 3 ? `${semanticCount}/4 semantic elements present: ${foundSemantic.join(", ")}` : `${semanticCount}/4 semantic elements. Missing: ${missingSemantic.join(", ")}`,
      suggestion: semanticCount < 3 ? `Add missing semantic elements: ${missingSemantic.join(", ")}` : void 0,
      verifiedUrl: htmlUrl,
      httpStatus: html.status,
      displayValue: `${semanticCount}/4`,
      docsUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element"
    });
    const ariaMatch = hasHtml ? body.match(/aria-label="([^"]+)"/gi) : null;
    const ariaCount = ariaMatch?.length ?? 0;
    checks.push({
      id: "aria-labels",
      name: "ARIA labels present",
      passed: ariaCount > 0,
      score: ariaCount >= 5 ? 100 : ariaCount > 0 ? 50 : 0,
      details: ariaCount > 0 ? `${ariaCount} ARIA label(s) found` : "No ARIA labels \u2014 agents struggle to interpret interactive elements",
      suggestion: ariaCount < 5 ? "Add ARIA labels to interactive elements for agent accessibility" : void 0,
      verifiedUrl: htmlUrl,
      httpStatus: html.status,
      displayValue: `${ariaCount} labels`,
      docsUrl: "https://www.w3.org/WAI/standards-guidelines/aria/"
    });
    const linkMatches = hasHtml ? body.match(/<a[^>]*>/gi) || [] : [];
    const linkCount = linkMatches.length;
    const emptyLinks = hasHtml ? (body.match(/<a[^>]*>\s*<\/a>/gi) || []).length : 0;
    const linkScore = linkCount > 0 ? Math.round((linkCount - emptyLinks) / linkCount * 100) : 0;
    checks.push({
      id: "descriptive-links",
      name: "Descriptive link text",
      passed: emptyLinks === 0 && linkCount > 0,
      score: linkScore,
      details: linkCount > 0 ? `${emptyLinks}/${linkCount} links have no text (${linkScore}% descriptive)` : "No links found on page",
      suggestion: emptyLinks > 0 ? "Ensure all links have descriptive text \u2014 empty links confuse agents" : void 0,
      verifiedUrl: htmlUrl,
      httpStatus: html.status,
      displayValue: `${linkScore}%`,
      docsUrl: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html"
    });
    const hasViewport = hasHtml && /viewport.*width=device-width/i.test(body);
    checks.push({
      id: "viewport",
      name: "Responsive viewport",
      passed: !!hasViewport,
      score: hasViewport ? 100 : 0,
      details: hasViewport ? "Viewport meta tag present" : "No responsive viewport \u2014 mobile/agent rendering may break",
      suggestion: hasViewport ? void 0 : 'Add a responsive viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">',
      verifiedUrl: htmlUrl,
      httpStatus: html.status,
      displayValue: hasViewport ? "Present" : "Missing",
      docsUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag"
    });
    return checks;
  }
  function avgScore(checks) {
    if (checks.length === 0) return 0;
    return Math.round(
      checks.reduce((sum, c) => sum + c.score, 0) / checks.length
    );
  }
  return __toCommonJS(index_exports);
})();
