const API_BASE = 'https://swarmhawk-backend.onrender.com';

const CHECK_LABELS = {
  ssl_expiry: 'SSL Expiry', ssl_cert: 'SSL Certificate', dnssec: 'DNSSEC',
  open_ports: 'Open Ports', spf: 'SPF Record', dmarc: 'DMARC', dkim: 'DKIM',
  cve: 'CVE / Software', headers: 'Security Headers', mx: 'Mail Records',
  blacklist: 'Blacklist Check', breach: 'Data Breach', whois: 'WHOIS / Domain Age',
  subdomain_takeover: 'Subdomain Takeover', ai_summary: 'AI Analysis',
};

let currentDomain = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Load API key into settings input
  const { apiKey } = await chrome.storage.sync.get('apiKey');
  if (apiKey) {
    document.getElementById('api-key-input').value = apiKey;
  }

  // Toggle settings
  document.getElementById('toggle-settings').addEventListener('click', () => {
    const main = document.getElementById('main-view');
    const settings = document.getElementById('settings-view');
    const isSettings = settings.style.display !== 'none';
    main.style.display = isSettings ? 'block' : 'none';
    settings.style.display = isSettings ? 'none' : 'block';
    document.getElementById('toggle-settings').textContent = isSettings ? '⚙' : '✕';
  });

  // Enter key on domain input
  document.getElementById('domain-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') manualScan();
  });

  // Check for pending scan result from background
  pollResult();
});

// Poll session storage for scan result from background.js
async function pollResult() {
  const { scanResult } = await chrome.storage.session.get('scanResult');
  if (!scanResult) return;

  if (scanResult.loading) {
    showLoading(scanResult.domain);
    // Poll again in 1 second
    setTimeout(pollResult, 1000);
    return;
  }

  if (scanResult.error) {
    showError(scanResult.error, scanResult.domain);
  } else {
    showResult(scanResult);
  }

  // Clear so it doesn't re-render on re-open
  await chrome.storage.session.remove('scanResult');
}

// ── Manual scan from input ────────────────────────────────────────────────────
function manualScan() {
  const input = document.getElementById('domain-input').value.trim()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

  if (!input || !input.includes('.')) {
    showError('Please enter a valid domain name.');
    return;
  }

  const url = `https://www.swarmhawk.com/?scan=${encodeURIComponent(input)}`;
  chrome.tabs.create({ url });
  window.close();
}

// ── Render states ─────────────────────────────────────────────────────────────
function showLoading(domain) {
  document.getElementById('result-area').innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-domain">Scanning ${domain || '…'}</div>
    </div>`;
  document.getElementById('scan-btn').disabled = true;
}

function showError(msg, domain) {
  document.getElementById('scan-btn').disabled = false;
  let html = '';
  if (domain) html += `<div class="result-domain">🌐 ${domain}</div>`;
  html += `<div class="error-state">⚠ ${msg}</div>`;
  document.getElementById('result-area').innerHTML = html;
}

function showResult(data) {
  document.getElementById('scan-btn').disabled = false;

  const domain    = data.domain || currentDomain || '?';
  const score     = data.risk_score || 0;
  const checks    = (data.checks || []).filter(c => c.check !== 'ai_summary');
  const critical  = checks.filter(c => c.status === 'critical').length;
  const warnings  = checks.filter(c => c.status === 'warning').length;
  const passed    = checks.filter(c => c.status === 'ok').length;

  const color = score >= 70 ? 'var(--red)' : score >= 30 ? 'var(--amber)' : 'var(--green)';
  const label = score >= 70 ? 'HIGH RISK' : score >= 30 ? 'MEDIUM RISK' : 'LOW RISK';

  const orderMap = { critical: 0, warning: 1, ok: 2, error: 3 };
  const sorted = [...checks].sort((a, b) => (orderMap[a.status] ?? 9) - (orderMap[b.status] ?? 9));

  const checkRows = sorted.slice(0, 10).map(c => {
    const dotClass = c.status === 'critical' ? 'dot-critical' : c.status === 'warning' ? 'dot-warning' : 'dot-ok';
    const statusClass = `status-${c.status}`;
    const label = CHECK_LABELS[c.check] || c.check.replace(/_/g, ' ');
    return `<div class="check-row">
      <div class="check-dot ${dotClass}"></div>
      <div class="check-name">${label}</div>
      <div class="check-status ${statusClass}">${c.status.toUpperCase()}</div>
    </div>`;
  }).join('');

  const swarmUrl = `https://www.swarmhawk.com/?scan=${encodeURIComponent(domain)}`;

  let html = `
    <div class="result-domain">🌐 ${domain}</div>
    <div class="score-block">
      <div class="score-circle" style="color:${color};border-color:${color}">
        <div class="score-num" style="color:${color}">${score}</div>
      </div>
      <div class="score-info">
        <div class="risk-label" style="color:${color}">${label}</div>
        <div class="risk-counts">
          <span style="color:var(--red)">● ${critical} critical</span>
          <span style="color:var(--amber)">● ${warnings} warnings</span>
          <span style="color:var(--green)">● ${passed} passed</span>
        </div>
      </div>
    </div>
    <div class="risk-bar"><div class="risk-bar-fill" style="width:${score}%;background:${color}"></div></div>
    <div class="checks-mini">${checkRows}</div>
    <div class="action-row">
      <a class="btn-full-report" href="${swarmUrl}" target="_blank">VIEW FULL REPORT →</a>
    </div>`;

  if (data.locked_count > 0) {
    html += `<div style="font-size:10px;color:var(--grey);margin-top:8px;text-align:center">
      ${data.locked_count} checks hidden · <a href="${swarmUrl}" target="_blank" style="color:var(--blue)">Unlock for $10</a>
    </div>`;
  }

  document.getElementById('result-area').innerHTML = html;
  document.getElementById('domain-input').value = domain;
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  await chrome.storage.sync.set({ apiKey: key || null });
  const status = document.getElementById('save-status');
  status.style.display = 'inline';
  setTimeout(() => { status.style.display = 'none'; }, 2000);
}
