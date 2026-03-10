// Content script: listens for messages from popup to highlight domains on page
// (future: auto-highlight suspicious domains in contracts/pages)

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_DOMAINS') {
    // Collect all unique hostnames from links on page
    const links = Array.from(document.querySelectorAll('a[href]'));
    const domains = new Set();
    links.forEach(a => {
      try {
        const host = new URL(a.href).hostname.replace(/^www\./, '');
        if (host && host.includes('.') && !host.includes('google') && !host.includes('facebook')) {
          domains.add(host);
        }
      } catch (_) {}
    });
    sendResponse({ domains: Array.from(domains).slice(0, 20) });
  }
});
