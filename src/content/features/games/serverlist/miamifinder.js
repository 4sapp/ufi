import DOMPurify from 'dompurify';
import { observeElement } from '../../../core/observer.js';
import { getPlaceIdFromUrl } from '../../../core/idExtractor.js';
import {
    findMiamiOrBestServer,
    joinCandidateServer,
    logDebug,
} from '../../../core/regionFinder/MiamiServerFinder.js';

const STORAGE_KEY_MODE = 'miamiFinderMode';
const STORAGE_KEY_OPEN = 'miamiFinderCardOpen';

let finderState = {
    mode: 'miami', // 'miami' | 'best_connection'
    isOpen: true,
    isSearching: false,
    selectedCandidate: null,
    ignoredServerIds: new Set(),
    statusMessage: null,
    statusType: 'info', // 'info' | 'error' | 'success'
    cardElement: null,
    toggleButton: null,
};

function getPlaceId() {
    return getPlaceIdFromUrl(window.location.href);
}

function createPalmSvg() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h11Z"/>
        <path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-9"/>
        <path d="M5.89 12.72c2.08-.85 4.8-.46 6.61 1.28"/>
        <path d="M12 11c0 5 1.5 8 2 11"/>
    </svg>`;
}

function createCopySvg() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>`;
}

function renderCardContent(card) {
    if (!card) return;

    const { mode, isSearching, selectedCandidate, statusMessage, statusType } =
        finderState;

    const candidate = selectedCandidate;
    const classification = candidate?.classification;
    const server = candidate?.server;
    const score = candidate?.score ?? null;

    const preferredRegionDisplay =
        mode === 'miami' ? 'Miami' : 'Best Connection (Lowest Latency)';

    let detectedRegionHtml = '<span class="region-badge unknown">None</span>';
    let regionTruthNoteHtml = '';

    if (classification) {
        const badgeClass = classification.level || 'unknown';
        const badgeText = DOMPurify.sanitize(classification.label);
        detectedRegionHtml = `<span class="region-badge ${badgeClass}">${badgeText}</span>`;

        if (mode === 'miami') {
            if (classification.level === 'miami') {
                regionTruthNoteHtml = `<span class="region-truth-note">✓ Verified Miami Datacenter (${candidate.datacenterId ? `DC #${candidate.datacenterId}` : 'Direct match'})</span>`;
            } else if (classification.level === 'florida') {
                regionTruthNoteHtml = `<span class="region-truth-note">Exact Miami unavailable at city level. Using closest verified Florida server.</span>`;
            } else if (classification.level === 'us_east') {
                regionTruthNoteHtml = `<span class="region-truth-note">Miami preference unavailable at city level. Using closest available US East server (${classification.subLabel}).</span>`;
            } else {
                regionTruthNoteHtml = `<span class="region-truth-note">No US East or Florida servers found. Showing fallback candidate (${classification.label}).</span>`;
            }
        } else {
            if (candidate.latencyMs !== null) {
                regionTruthNoteHtml = `<span class="region-truth-note">Measured roundtrip latency: ~${candidate.latencyMs}ms (${classification.label})</span>`;
            } else {
                regionTruthNoteHtml = `<span class="region-truth-note">Region: ${classification.label} (${classification.confidence})</span>`;
            }
        }
    }

    const playersDisplay = server
        ? `${server.playing || 0} / ${server.maxPlayers || server.max_players || '?'}`
        : '-';

    const serverIdDisplay = server ? server.id : '-';

    const scoreDisplay = score !== null ? `${score} / 100` : '-';

    const mainSearchBtnLabel = isSearching
        ? 'Searching...'
        : mode === 'miami'
          ? 'Find Miami Server'
          : 'Find Best Connection';

    const cardInnerHtml = `
        <div class="miami-finder-header">
            <div class="header-title-group">
                <span class="header-icon">${createPalmSvg()}</span>
                <span class="header-title">Miami Server Finder</span>
                <span class="header-badge">${mode === 'miami' ? 'Miami Priority' : 'Best Ping'}</span>
            </div>
            <div class="header-modes">
                <button type="button" class="mode-pill ${mode === 'miami' ? 'active' : ''}" data-set-mode="miami">
                    Miami
                </button>
                <button type="button" class="mode-pill ${mode === 'best_connection' ? 'active' : ''}" data-set-mode="best_connection">
                    Best Connection
                </button>
            </div>
        </div>

        <div class="miami-finder-body">
            <div class="server-info-grid">
                <div class="info-field">
                    <span class="field-label">Preferred region</span>
                    <span class="field-value">${DOMPurify.sanitize(preferredRegionDisplay)}</span>
                </div>
                <div class="info-field">
                    <span class="field-label">Detected region</span>
                    <span class="field-value">${detectedRegionHtml}</span>
                </div>
                <div class="info-field">
                    <span class="field-label">Players</span>
                    <span class="field-value">${DOMPurify.sanitize(playersDisplay)}</span>
                </div>
                <div class="info-field">
                    <span class="field-label">Server ID</span>
                    <span class="field-value">
                        <span class="server-id-label" title="${DOMPurify.sanitize(serverIdDisplay)}">
                            ${server ? `${server.id.substring(0, 12)}...` : '-'}
                        </span>
                        ${
                            server
                                ? `<button type="button" class="copy-id-btn" data-copy-id="${server.id}" title="Copy Server JobId">${createCopySvg()}</button>`
                                : ''
                        }
                    </span>
                </div>
                <div class="info-field">
                    <span class="field-label">Connection score</span>
                    <span class="field-value score-value">${DOMPurify.sanitize(scoreDisplay)}</span>
                </div>
            </div>

            ${regionTruthNoteHtml}

            ${
                statusMessage
                    ? `<div class="finder-status-banner ${statusType}">
                        <span>${DOMPurify.sanitize(statusMessage)}</span>
                    </div>`
                    : ''
            }
        </div>

        <div class="miami-finder-actions">
            <button type="button" class="btn-finder-action primary" id="btn-find-miami" ${isSearching ? 'disabled' : ''}>
                ${DOMPurify.sanitize(mainSearchBtnLabel)}
            </button>
            <button type="button" class="btn-finder-action join" id="btn-join-server" ${!server || isSearching ? 'disabled' : ''}>
                Join Server
            </button>
            <button type="button" class="btn-finder-action secondary" id="btn-find-another" ${!server || isSearching ? 'disabled' : ''}>
                Find Another
            </button>
        </div>
    `;

    card.innerHTML = DOMPurify.sanitize(cardInnerHtml);
    attachCardEvents(card);
}

function attachCardEvents(card) {
    // Mode toggles
    card.querySelectorAll('[data-set-mode]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newMode = btn.dataset.setMode;
            if (newMode && newMode !== finderState.mode) {
                finderState.mode = newMode;
                chrome.storage.local.set({ [STORAGE_KEY_MODE]: newMode });
                finderState.statusMessage = null;
                renderCardContent(card);
            }
        });
    });

    // Copy JobId button
    const copyBtn = card.querySelector('[data-copy-id]');
    if (copyBtn) {
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const jobId = copyBtn.dataset.copyId;
            if (jobId) {
                try {
                    await navigator.clipboard.writeText(jobId);
                    copyBtn.title = 'Copied!';
                    copyBtn.style.color = '#00e588';
                    setTimeout(() => {
                        copyBtn.title = 'Copy Server JobId';
                        copyBtn.style.color = '';
                    }, 2000);
                } catch {
                    // Fallback
                }
            }
        });
    }

    // Find Server button
    const findBtn = card.querySelector('#btn-find-miami');
    if (findBtn) {
        findBtn.addEventListener('click', () => {
            performSearch();
        });
    }

    // Join Server button
    const joinBtn = card.querySelector('#btn-join-server');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            performJoin();
        });
    }

    // Find Another button
    const anotherBtn = card.querySelector('#btn-find-another');
    if (anotherBtn) {
        anotherBtn.addEventListener('click', () => {
            if (finderState.selectedCandidate?.server?.id) {
                finderState.ignoredServerIds.add(
                    finderState.selectedCandidate.server.id,
                );
            }
            performSearch();
        });
    }
}

async function performSearch() {
    const placeId = getPlaceId();
    if (!placeId) {
        finderState.statusMessage = 'Could not determine Roblox Place ID for this page.';
        finderState.statusType = 'error';
        renderCardContent(finderState.cardElement);
        return;
    }

    finderState.isSearching = true;
    finderState.statusMessage =
        finderState.mode === 'miami'
            ? 'Scanning for Miami and nearby East servers...'
            : 'Evaluating lowest latency candidate servers...';
    finderState.statusType = 'info';
    renderCardContent(finderState.cardElement);

    try {
        const candidate = await findMiamiOrBestServer({
            placeId,
            mode: finderState.mode,
            ignoredServerIds: finderState.ignoredServerIds,
            onProgress: (msg) => {
                finderState.statusMessage = msg;
                const statusEl = finderState.cardElement?.querySelector(
                    '.finder-status-banner span',
                );
                if (statusEl) {
                    statusEl.textContent = msg;
                }
            },
        });

        if (!candidate) {
            finderState.statusMessage =
                finderState.mode === 'miami'
                    ? 'No matching Miami or US East servers found at this time.'
                    : 'No available servers found with acceptable connection score.';
            finderState.statusType = 'error';
        } else {
            finderState.selectedCandidate = candidate;
            finderState.statusMessage = `Found candidate server (${candidate.classification.confidence}) with score ${candidate.score}/100.`;
            finderState.statusType = 'success';
        }
    } catch (err) {
        logDebug('Server search error:', err);
        finderState.statusMessage =
            err.message || 'Error occurred while searching for candidate servers.';
        finderState.statusType = 'error';
    } finally {
        finderState.isSearching = false;
        renderCardContent(finderState.cardElement);
    }
}

async function performJoin() {
    const candidate = finderState.selectedCandidate;
    const placeId = getPlaceId();

    if (!candidate?.server?.id || !placeId) {
        finderState.statusMessage = 'No server selected to join.';
        finderState.statusType = 'error';
        renderCardContent(finderState.cardElement);
        return;
    }

    finderState.statusMessage = `Joining server ${candidate.server.id.substring(0, 8)}...`;
    finderState.statusType = 'info';
    renderCardContent(finderState.cardElement);

    try {
        await joinCandidateServer(placeId, candidate.server.id);
        finderState.statusMessage = 'Launching Roblox client...';
        finderState.statusType = 'success';
        renderCardContent(finderState.cardElement);
    } catch (err) {
        logDebug('Join failed:', err);
        finderState.statusMessage = `Join failed: ${err.message || 'Server became unavailable'}. Try finding another.`;
        finderState.statusType = 'error';
        finderState.ignoredServerIds.add(candidate.server.id);
        renderCardContent(finderState.cardElement);
    }
}

function createOrGetFinderCard(parentContainer) {
    let card = document.getElementById('rovalra-miami-finder-card');
    if (!card) {
        card = document.createElement('div');
        card.id = 'rovalra-miami-finder-card';
        card.className = 'rovalra-miami-finder-card';
        card.style.display = finderState.isOpen ? 'flex' : 'none';

        // Insert at the top of the server list container
        parentContainer.prepend(card);
        finderState.cardElement = card;
        renderCardContent(card);
    }
    return card;
}

function createMainControlsButton(controlsContainer) {
    if (document.getElementById('rovalra-toggle-miami-finder')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'rovalra-toggle-miami-finder';
    btn.className = `btn-control-md filter-button-alignment ${finderState.isOpen ? 'active' : ''}`;
    btn.title = 'Toggle Miami Server Finder';
    btn.innerHTML = DOMPurify.sanitize(
        `${createPalmSvg()} <span>Miami Finder</span>`,
    );

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        finderState.isOpen = !finderState.isOpen;
        chrome.storage.local.set({ [STORAGE_KEY_OPEN]: finderState.isOpen });

        btn.classList.toggle('active', finderState.isOpen);
        if (finderState.cardElement) {
            finderState.cardElement.style.display = finderState.isOpen
                ? 'flex'
                : 'none';
        }
    });

    controlsContainer.appendChild(btn);
    finderState.toggleButton = btn;
}

export function initMiamiFinder() {
    // Only run on games pages
    if (!getPlaceId()) return;

    // Load saved settings
    chrome.storage.local.get(
        {
            [STORAGE_KEY_MODE]: 'miami',
            [STORAGE_KEY_OPEN]: true,
        },
        (res) => {
            if (res[STORAGE_KEY_MODE]) {
                finderState.mode = res[STORAGE_KEY_MODE];
            }
            if (res[STORAGE_KEY_OPEN] !== undefined) {
                finderState.isOpen = res[STORAGE_KEY_OPEN];
            }
        },
    );

    // Watch for server list container in DOM
    const serverListSelectors = [
        '#running-game-instances-container',
        '#rbx-running-games',
        '.rbx-game-server-item-container',
        '#roseal-running-game-instances-container',
    ];

    serverListSelectors.forEach((selector) => {
        observeElement(selector, (container) => {
            createOrGetFinderCard(container);
        });
    });

    // Watch for RoValra main controls bar to add the toggle button
    observeElement('#rovalra-main-controls', (controls) => {
        createMainControlsButton(controls);
    });
}
