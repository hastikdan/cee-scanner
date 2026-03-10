const API_BASE = 'https://swarmhawk-backend.onrender.com';

// Create context menu items on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'swarmhawk-scan-selection',
    title: '🦅 SwarmHawk: Scan "%s"',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'swarmhawk-scan-link',
    title: '🦅 SwarmHawk: Scan this link',
    contexts: ['link'],
  });
});

// Extract domain from various inputs
function extractDomain(input) {
  if (!input) return null;
  input = input.trim();
  // If it looks like a URL, parse it
  try {
    if (input.startsWith('http://') || input.startsWith('https://') || input.includes('://')) {
      return new URL(input).hostname.replace(/^www\./, '');
    }
    // Selected text: try to extract domain-like string
    const match = input.match(/([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/);
    if (match) return match[0].replace(/^www\./, '').toLowerCase();
  } catch (e) {
    // fall through
  }
  // Last resort: treat whole string as domain
  return input.replace(/^www\./, '').toLowerCase().split('/')[0];
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let rawDomain = null;

  if (info.menuItemId === 'swarmhawk-scan-selection') {
    rawDomain = info.selectionText;
  } else if (info.menuItemId === 'swarmhawk-scan-link') {
    rawDomain = info.linkUrl;
  }

  const domain = extractDomain(rawDomain);
  if (!domain || !domain.includes('.')) {
    // Show error in popup
    await chrome.storage.session.set({ scanResult: { error: 'Could not extract a valid domain from the selection.' } });
    chrome.action.openPopup();
    return;
  }

  // Store pending scan so popup can display it
  await chrome.storage.session.set({
    scanResult: { loading: true, domain },
    lastDomain: domain,
  });

  // Open popup immediately (shows loading state)
  chrome.action.openPopup();

  // Perform the scan
  try {
    const { apiKey } = await chrome.storage.sync.get('apiKey');

    let result;
    if (apiKey) {
      // Authenticated scan via Developer API
      const res = await fetch(`${API_BASE}/api/v1/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ domain }),
      });
      result = await res.json();
    } else {
      // Public scan (limited)
      const res = await fetch(`${API_BASE}/public-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      result = await res.json();
    }

    await chrome.storage.session.set({ scanResult: { ...result, domain, loading: false } });
  } catch (e) {
    await chrome.storage.session.set({
      scanResult: { error: 'Scan failed: ' + e.message, domain, loading: false },
    });
  }
});
