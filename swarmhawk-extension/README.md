# SwarmHawk — Scan Before You Sign

Chrome Extension (Manifest V3) that lets you instantly check the security risk of any domain directly from any webpage, contract PDF, or email.

## Features

- **Right-click to scan**: Select any domain name or right-click any link → SwarmHawk: Scan
- **Instant risk score**: 0–100 risk score with critical/warning/passed breakdown
- **Full check results**: SSL, DNSSEC, open ports, CVEs, blacklists, breaches, headers, SPF/DMARC
- **API key support**: Add your SwarmHawk API key for unlimited scans and full results
- **Free mode**: 3 public scans/day without an account
- **Attack Map link**: Quick access to the live global threat map

## Install (Developer Mode)

1. Clone or download this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select this folder

## Usage

### Right-click scan
1. Select a domain name on any page (e.g. `vendor.com`)
2. Right-click → **SwarmHawk: Scan "vendor.com"**
3. The popup opens with live scan results

### Manual scan
1. Click the SwarmHawk icon in the toolbar
2. Type a domain name in the input field
3. Press SCAN or hit Enter

### API Key Setup
1. Go to [swarmhawk.com](https://swarmhawk.com) → Account → API Keys
2. Generate a new key
3. Click ⚙ in the extension popup → paste your key → Save

## Files

```
manifest.json    — Extension config (MV3)
background.js    — Service worker: context menu, API calls
popup.html       — Popup UI
popup.js         — Popup logic and rendering
content.js       — Content script (page domain discovery)
icons/           — Extension icons (16, 48, 128px)
```

## API Endpoints Used

- `POST /api/v1/scan` — Authenticated scan (requires API key)
- `POST /public-scan` — Anonymous public scan (limited)

## Publishing to Chrome Web Store

1. Update `manifest.json` version
2. Zip all files (except `icons/create_icons.py` and `README.md`)
3. Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
