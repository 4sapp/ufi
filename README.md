# ufi — Miami Server Finder & Roblox Region Selector

<p align="center">
  <strong>ufi</strong> is a personal fork of <a href="https://github.com/NotValra/RoValra">RoValra</a> enhanced with specialized tools for Roblox server discovery, truthful region verification, and preferred-region joining.
</p>

<p align="center">
  <a href="https://github.com/4sapp/ufi">GitHub Repository</a> •
  <a href="https://github.com/NotValra/RoValra">Upstream Project (RoValra)</a>
</p>

---

## Key Features

### 🌴 Miami Server Finder
- **True Miami Detection**: Accurately detects verified Roblox datacenters located in Miami, Florida (`Location #17`, DataCenter IDs: `332`, `374`, `432`, `433`, `434`).
- **Zero Fabrication**: Never fakes geographic location. If an exact Miami datacenter is not currently active for an experience, it transparently indicates the closest available Florida or US East server.
- **Hierarchical Priority**:
  1. Verified Miami
  2. Verified Florida
  3. US East (Atlanta, Ashburn, New York City, Columbus, etc.)
  4. Other US / Nearby Regions
  5. Unknown fallback

### ⚡ Best Connection Mode
- An alternative search mode that prioritizes the best possible connection and lowest network roundtrip latency rather than a fixed geographic preference.
- Evaluates candidate servers via Roblox's native latency endpoints, measures live request roundtrips, and ranks candidates using a comprehensive connection score (0–100).

### 🎯 Smart Server Scoring & Filtering
- **Formula**: `score = regionScore + connectionScore + availabilityScore - playerPenalty - failurePenalty`
- Automatically excludes full servers (`playing >= maxPlayers`) and inactive instances.
- Prefers servers with modest player counts when region and connection scores are comparable.
- **Find Another**: Allows quickly cycling to the next best candidate server if you want a different instance.

---

## Installation & Setup

This extension runs completely locally in your browser without requiring external backend servers or third-party databases.

### 1. Build from Source

Requirements: [Node.js](https://nodejs.org/) (v18 or higher) and `npm`.

```bash
# Clone the repository
git clone https://github.com/4sapp/ufi.git
cd ufi

# Install dependencies
npm install

# Build the extension
npm run build
```

The compiled extension output will be generated in the `dist/` directory.

### 2. Load into Your Browser (Chrome, Edge, Brave, Opera)

1. Open your browser and navigate to:
   - Chrome / Brave: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (or **Cargar descomprimida**).
4. Select the `dist/` folder inside the `ufi` project directory.
5. Visit any Roblox game page, open the **Servers** tab, and use the **Miami Server Finder** panel!

---

## Upstream & Acknowledgements

This project is a fork of and builds upon the open-source work in [RoValra](https://github.com/NotValra/RoValra) by Valra and its contributors.

- **Upstream Repository:** [https://github.com/NotValra/RoValra](https://github.com/NotValra/RoValra)
- **Roblox Datacenter IP Research:** Julia ([Datacenter IP Research](https://github.com/RoSeal-Extension/Top-Secret-Thing))
- **Original Region Searcher Logic:** l5se

---

## License

This project is open-source under the **GNU General Public License v3.0 (GPL-3.0)**, preserving the license of the upstream RoValra codebase.
