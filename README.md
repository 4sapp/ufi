# ufi

A lightweight, local browser extension for Roblox server discovery, regional ranking, and targeted server instance selection.

Based on the [RoValra](https://github.com/NotValra/RoValra) architecture, **ufi** is a personal fork specialized in identifying authentic regional game instances—primarily focused on Miami and US East infrastructure—alongside a low-latency connection finder.

---

## Overview

Finding specific regional instances on Roblox is traditionally opaque. The public server directory lists player counts and server version numbers, but omits datacenter identities and exact physical locations. 

`ufi` resolves this limitation directly inside the browser. It queries available public instances, evaluates their underlying infrastructure through legitimate join handshake telemetry, computes a multi-factor connection score, and launches the desktop client into the selected server instance.

The extension operates **strictly on client-side browser APIs**. It requires no cloud backends, databases, external proxies, or tracking services.

---

## Key Features

### Miami Server Finder

Targeted discovery for Roblox instances hosted in Miami, Florida datacenters.

- **Verified Datacenter Matching**: Matches instance telemetry against known physical Roblox datacenters in Miami (`Location #17`, DataCenter IDs: `332`, `374`, `432`, `433`, `434`).
- **Truthful Region Attribution**: Zero simulated or fabricated locations. If Miami capacity is inactive for a specific game, the extension explicitly communicates the nearest verified fallback (e.g., Florida statewide or US East hubs such as Atlanta or Ashburn).
- **Hierarchical Resolution**:
  1. Verified Miami datacenter
  2. Verified Florida statewide infrastructure
  3. US East regional datacenters (Georgia, Virginia, New York, Ohio)
  4. Compatible nearby North American regions
  5. Unverified / Unknown instances

### Best Connection Mode

An alternative discovery engine prioritizing overall connection stability and network roundtrip time rather than a fixed geographic market.

- Utilizes Roblox latency-sorted discovery endpoints alongside measured handshake roundtrip durations.
- Ranks candidate instances according to responsive latency and server capacity.

### Server Scoring Engine

Candidates are scored on an objective 0–100 scale using a transparent heuristic:

$$\text{Score} = \text{RegionScore} + \text{ConnectionScore} + \text{AvailabilityScore} - \text{PlayerPenalty} - \text{FailurePenalty}$$

- **Region Score** (up to 50 pts): Awarded based on verified proximity to the target region.
- **Connection Score** (up to 30 pts): Derived from live roundtrip network latency or geographic distance.
- **Availability Score** (20 pts): Confirms the instance is responsive, active, and contains open player slots.
- **Player Penalty** (0–12 pts): Dampens crowded servers, favoring instances with room for friends when connection quality is equal.
- **Hard Rejections**: Servers at maximum capacity (`playing >= maxPlayers`) or inactive instances receive a score of 0 and are excluded immediately.
- **Find Another**: Allows instant rejection of the current candidate to evaluate the next highest-scoring server.

---

## Technical Architecture

### How Region Detection Works

1. **Place Resolution**: Extracts the active `PlaceId` from the navigation context.
2. **Cataloging Instances**: Iterates through paginated public servers via `games.roblox.com/v1/games/{placeId}/servers/Public`.
3. **Infrastructure Resolution**: Evaluates candidate JobIds through the `gamejoin.roblox.com` endpoint. The resulting response yields the physical `DataCenterId` and machine network routing without needing to fully initialize a gameplay session.
4. **Local Datacenter Mapping**: The retrieved `DataCenterId` is referenced against `ServerList.json`, which contains verified geographic coordinates and municipal classifications.
5. **Execution**: Once approved, `launchGame()` triggers `Roblox.GameLauncher.joinGameInstance()` via secure main-world injection to prompt the local Roblox client.

---

## Building & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- `npm` (bundled with Node.js)

### 1. Build the Extension

```bash
# Clone the repository
git clone https://github.com/4sapp/ufi.git
cd ufi

# Install dependencies
npm install

# Build distribution bundle
npm run build
```

The compiled extension files, content scripts, background workers, and SCSS stylesheets are output directly to the `dist/` directory.

### 2. Load into Chromium Browsers (Chrome, Edge, Brave, Opera)

1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/`).
2. Toggle **Developer mode** in the top-right corner of the page.
3. Click **Load unpacked** in the upper toolbar.
4. Select the `dist/` directory located inside your cloned `ufi` folder.
5. Navigate to any Roblox experience page and open the **Servers** tab. The **Miami Server Finder** panel will be mounted directly above the active instance list.

---

## Project Integrity & Network Rules

- **No Credential Access**: The extension does not read, store, or transmit security tokens, cookies, or account credentials.
- **No Client Tampering**: Does not inject DLLs, manipulate game memory, or modify the Roblox desktop client.
- **Rate-Limit Conscious**: Candidate evaluation is strictly throttled with micro-delays to comply with Roblox endpoint rate limits and avoid server flooding.

---

## Upstream & Acknowledgements

This software is a specialized fork of [RoValra](https://github.com/NotValra/RoValra), developed by Valra and open-source contributors.

- **Upstream Repository**: [NotValra/RoValra](https://github.com/NotValra/RoValra)
- **Datacenter Identification Research**: Julia ([RoSeal Datacenter IP Research](https://github.com/RoSeal-Extension/Top-Secret-Thing))
- **Original Region Search Logic**: l5se

---

## License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**, maintaining full compliance with the upstream codebase license.
