// Agent Lighthouse — DevTools integration
chrome.devtools.panels.create(
  "Agent Lighthouse",
  "icons/icon16.png",
  "panel.html",
  (panel) => {
    console.log("Agent Lighthouse DevTools panel created")
  }
)
