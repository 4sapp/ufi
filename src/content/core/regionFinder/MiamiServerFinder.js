import { callRobloxApi } from '../api.js';
import { fetchServerRegion, isServerActive } from '../apis/serverApi.js';
import {
    getStateCodeFromRegion,
    loadDatacenterMap,
    datacenterList,
    serverIpMap,
} from '../regions.js';
import { launchGame } from '../utils/launcher.js';
import { getUserLocation } from '../utils/location.js';
import { getDistance } from './ClosestServer.js';

// Real Roblox datacenter IDs corresponding to Miami, FL (from ServerList.json location_id 17)
export const MIAMI_DC_IDS = new Set([332, 374, 432, 433, 434]);

// US East states and cities for truthful region classification
export const US_EAST_STATES = new Set([
    'FL',
    'GA',
    'VA',
    'NY',
    'NC',
    'SC',
    'PA',
    'NJ',
    'MD',
    'DC',
    'OH',
    'MA',
    'CT',
    'NH',
    'VT',
    'ME',
    'RI',
    'DE',
    'WV',
]);

export const US_EAST_CITIES = new Set([
    'Miami',
    'Atlanta',
    'Ashburn',
    'New York City',
    'Columbus',
    'New York',
    'Reston',
]);

export function logDebug(...args) {
    console.log('[MiamiFinder]', ...args);
}

/**
 * Truthfully classifies a server's geographic location without fabricating metadata.
 * Uses real datacenter IDs and verified location properties from RoValra / Roblox.
 */
export function classifyServerRegion({
    city = null,
    regionName = null,
    country = null,
    datacenterId = null,
} = {}) {
    // 1. Exact Miami Detection
    const dcNum = Number(datacenterId);
    const isMiamiDc = dcNum && MIAMI_DC_IDS.has(dcNum);
    const isMiamiCity =
        city && city.trim().toLowerCase() === 'miami' && (country === 'US' || !country);

    if (isMiamiDc || isMiamiCity) {
        return {
            level: 'miami',
            confidence: 'Verified Miami',
            label: 'Miami',
            subLabel: 'Verified Miami Datacenter',
            isExactMiami: true,
            isFlorida: true,
            isUsEast: true,
            regionScore: 50,
            city: 'Miami',
            regionName: 'Florida',
            country: 'US',
            datacenterId: dcNum || null,
        };
    }

    // 2. Florida Detection
    const isFloridaState =
        (regionName && regionName.trim().toLowerCase() === 'florida') ||
        (regionName && regionName.trim().toUpperCase() === 'FL');

    if (isFloridaState) {
        return {
            level: 'florida',
            confidence: 'Verified Florida',
            label: 'Florida',
            subLabel: city ? `${city}, Florida` : 'Florida, US',
            isExactMiami: false,
            isFlorida: true,
            isUsEast: true,
            regionScore: 40,
            city: city || 'Florida',
            regionName: 'Florida',
            country: country || 'US',
            datacenterId: dcNum || null,
        };
    }

    // 3. US East Detection
    const stateCode = getStateCodeFromRegion(regionName);
    const isUsEastState = stateCode && US_EAST_STATES.has(stateCode);
    const isUsEastCity = city && US_EAST_CITIES.has(city);
    const isUs = country === 'US' || country === 'USA' || (!country && (isUsEastState || isUsEastCity));

    if (isUs && (isUsEastState || isUsEastCity)) {
        const displayCity = city || stateCode || 'East';
        return {
            level: 'us_east',
            confidence: 'US East',
            label: 'US East',
            subLabel: city && regionName ? `${city}, ${regionName}` : `US East (${displayCity})`,
            isExactMiami: false,
            isFlorida: false,
            isUsEast: true,
            regionScore: 30,
            city: city || null,
            regionName: regionName || stateCode || null,
            country: 'US',
            datacenterId: dcNum || null,
        };
    }

    // 4. Other US Region (Central, West, etc.)
    if (isUs) {
        return {
            level: 'us_other',
            confidence: 'Other US Region',
            label: 'US (Other)',
            subLabel: city && regionName ? `${city}, ${regionName}` : 'United States',
            isExactMiami: false,
            isFlorida: false,
            isUsEast: false,
            regionScore: 15,
            city: city || null,
            regionName: regionName || stateCode || null,
            country: 'US',
            datacenterId: dcNum || null,
        };
    }

    // 5. International Region
    if (country && country !== 'Unknown') {
        return {
            level: 'international',
            confidence: 'International',
            label: country,
            subLabel: city ? `${city}, ${country}` : country,
            isExactMiami: false,
            isFlorida: false,
            isUsEast: false,
            regionScore: 10,
            city: city || null,
            regionName: regionName || null,
            country: country,
            datacenterId: dcNum || null,
        };
    }

    // 6. Unknown Region
    return {
        level: 'unknown',
        confidence: 'Unknown',
        label: 'Unknown',
        subLabel: 'Location unverified',
        isExactMiami: false,
        isFlorida: false,
        isUsEast: false,
        regionScore: 5,
        city: null,
        regionName: null,
        country: null,
        datacenterId: dcNum || null,
    };
}

/**
 * Calculates a server score (0-100) based on:
 * score = regionScore + connectionScore + availabilityScore - playerPenalty - failurePenalty
 */
export function calculateServerScore(server, regionClassification, options = {}) {
    const {
        mode = 'miami',
        latencyMs = null,
        distanceKm = null,
        failCount = 0,
        isBestLatencyCandidate = false,
    } = options;

    const playing = Number(server.playing || 0);
    const maxPlayers = Number(server.maxPlayers || server.max_players || 1);

    // Hard rejection for full or invalid servers
    if (playing >= maxPlayers || maxPlayers <= 0) return 0;
    if (!server.id) return 0;

    let score = 0;

    if (mode === 'miami') {
        // 1. Region Score (up to 50 pts)
        score += regionClassification.regionScore;

        // 2. Connection Score (up to 30 pts)
        let connectionScore = 18;
        if (latencyMs !== null) {
            if (latencyMs < 120) connectionScore = 30;
            else if (latencyMs < 200) connectionScore = 27;
            else if (latencyMs < 300) connectionScore = 24;
            else if (latencyMs < 450) connectionScore = 19;
            else connectionScore = 12;
        } else if (distanceKm !== null && distanceKm !== Infinity) {
            if (distanceKm < 200) connectionScore = 30;
            else if (distanceKm < 800) connectionScore = 26;
            else if (distanceKm < 1600) connectionScore = 22;
            else if (distanceKm < 3000) connectionScore = 16;
            else connectionScore = 10;
        } else if (isBestLatencyCandidate) {
            connectionScore = 26;
        }
        score += connectionScore;

        // 3. Availability Score (20 pts for confirmed slot availability & responsive server)
        score += 20;

        // 4. Player Penalty (0 to 12 pts - prefer lower player count when other factors are similar)
        const fullness = playing / maxPlayers;
        const playerPenalty = Math.round(fullness * 12);
        score -= playerPenalty;

        // 5. Failure Penalty
        if (failCount > 0) {
            score -= failCount * 25;
        }
    } else {
        // Best Connection Mode
        // 1. Connection / Latency Score (up to 50 pts)
        let connectionScore = 25;
        if (isBestLatencyCandidate) {
            connectionScore = 48;
        } else if (latencyMs !== null) {
            if (latencyMs < 80) connectionScore = 50;
            else if (latencyMs < 150) connectionScore = 44;
            else if (latencyMs < 250) connectionScore = 38;
            else if (latencyMs < 400) connectionScore = 28;
            else connectionScore = 18;
        } else if (distanceKm !== null && distanceKm !== Infinity) {
            if (distanceKm < 300) connectionScore = 48;
            else if (distanceKm < 800) connectionScore = 42;
            else if (distanceKm < 1500) connectionScore = 35;
            else if (distanceKm < 3000) connectionScore = 25;
            else connectionScore = 15;
        }
        score += connectionScore;

        // 2. Region Confidence Score (up to 20 pts)
        if (regionClassification.level !== 'unknown') {
            score += 20;
        } else {
            score += 5;
        }

        // 3. Availability Score (up to 20 pts)
        score += 20;

        // 4. Player Penalty (0 to 10 pts)
        const fullness = playing / maxPlayers;
        const playerPenalty = Math.round(fullness * 10);
        score -= playerPenalty;

        // 5. Failure Penalty
        if (failCount > 0) {
            score -= failCount * 30;
        }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Searches for and selects the best Roblox server matching Miami or Best Connection preference.
 */
export async function findMiamiOrBestServer({
    placeId,
    mode = 'miami',
    ignoredServerIds = new Set(),
    onProgress = null,
    maxPages = 3,
    stopCheck = null,
} = {}) {
    if (!placeId) {
        throw new Error('Invalid Place ID provided.');
    }

    logDebug(`Searching servers for placeId: ${placeId}, mode: ${mode}...`);
    if (onProgress) onProgress('Initializing server search...');

    await loadDatacenterMap();

    // Optionally retrieve user's location to assist proximity estimation if available
    let userCoords = null;
    try {
        const userLoc = await getUserLocation(placeId);
        if (userLoc?.userLat && userLoc?.userLon) {
            userCoords = { lat: userLoc.userLat, lon: userLoc.userLon };
        }
    } catch {
        // Non-blocking location lookup
    }

    const discoveredServers = [];
    const bestLatencyServerIds = new Set();

    // In Best Connection mode, query Roblox's native BestLatency endpoint first
    if (mode === 'best_connection') {
        try {
            if (onProgress) onProgress('Querying lowest-latency servers...');
            const latencyRes = await callRobloxApi({
                subdomain: 'games',
                endpoint: `/v2/games/${placeId}/servers/Public?cursor=&sortOrder=Desc&excludeFullGames=true&orderBy=BestLatency`,
            });
            if (latencyRes.ok) {
                const latencyData = await latencyRes.json();
                const latencyServers = latencyData.data || [];
                latencyServers.forEach((s) => {
                    const id = s.id || s.server_id;
                    if (id && !ignoredServerIds.has(id)) {
                        bestLatencyServerIds.add(id);
                        discoveredServers.push({
                            ...s,
                            id,
                            _isBestLatency: true,
                        });
                    }
                });
                logDebug(
                    `Discovered ${latencyServers.length} candidate(s) via Roblox BestLatency API`,
                );
            }
        } catch (e) {
            logDebug('Roblox BestLatency endpoint query failed, falling back to standard search:', e);
        }
    }

    // Retrieve public servers via standard pagination
    let cursor = null;
    let pagesScanned = 0;

    while (pagesScanned < maxPages) {
        if (stopCheck && stopCheck()) {
            logDebug('Server search stopped by user.');
            return null;
        }

        pagesScanned++;
        if (onProgress) {
            onProgress(
                `Retrieving server page ${pagesScanned} of ${maxPages}...`,
            );
        }

        try {
            const url = `/v1/games/${placeId}/servers/Public?excludeFullGames=true&limit=100${
                cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
            }`;
            const res = await callRobloxApi({
                subdomain: 'games',
                endpoint: url,
            });

            if (!res.ok) {
                logDebug(`Page request returned status ${res.status}`);
                if (res.status === 429) {
                    throw new Error('Roblox API rate limit reached. Please wait a moment before trying again.');
                }
                break;
            }

            const pageData = await res.json();
            const serversOnPage = pageData.data || [];

            for (const s of serversOnPage) {
                const id = s.id || s.server_id;
                if (!id) continue;
                if (ignoredServerIds.has(id)) continue;
                if (Number(s.playing) >= Number(s.maxPlayers)) continue;

                // Avoid duplicating candidates already added via BestLatency
                if (!discoveredServers.some((existing) => existing.id === id)) {
                    discoveredServers.push({
                        ...s,
                        id,
                        _isBestLatency: bestLatencyServerIds.has(id),
                    });
                }
            }

            logDebug(
                `Page ${pagesScanned}: ${serversOnPage.length} servers seen, total candidates: ${discoveredServers.length}`,
            );

            // In Miami mode, if we already have a healthy pool of candidates, don't spam pagination
            if (mode === 'miami' && discoveredServers.length >= 40) {
                break;
            }

            if (!pageData.nextPageCursor) break;
            cursor = pageData.nextPageCursor;
        } catch (err) {
            logDebug('Error fetching public server page:', err);
            if (err.message && err.message.includes('rate limit')) {
                throw err;
            }
            break;
        }
    }

    if (discoveredServers.length === 0) {
        logDebug('No candidate servers discovered.');
        return null;
    }

    logDebug(`${discoveredServers.length} candidates discovered`);
    if (onProgress) {
        onProgress(`Evaluating ${discoveredServers.length} candidate servers...`);
    }

    // Evaluate candidates
    // To respect rate limits and perform safely, evaluate up to the top 15 candidate servers
    const candidatesToEvaluate = discoveredServers.slice(0, 15);
    const evaluatedResults = [];

    for (let i = 0; i < candidatesToEvaluate.length; i++) {
        if (stopCheck && stopCheck()) return null;

        const server = candidatesToEvaluate[i];
        if (onProgress) {
            onProgress(
                `Inspecting server ${i + 1} of ${candidatesToEvaluate.length}...`,
            );
        }

        try {
            const startTime = performance.now();
            const regionInfo = await fetchServerRegion(placeId, server.id);
            const latencyMs = Math.round(performance.now() - startTime);

            // If joinScript is missing and status indicates failure, skip inactive server
            if (regionInfo && regionInfo.status !== undefined && regionInfo.status !== 2 && !regionInfo.joinScript) {
                logDebug(`Server ${server.id} returned status ${regionInfo.status} (inactive), skipping`);
                continue;
            }

            // Determine datacenter and location info
            let dcId = regionInfo?.datacenterId;
            let city = regionInfo?.city;
            let regionName = regionInfo?.regionName;
            let country = regionInfo?.country;

            // If datacenterId exists but location not resolved, check serverIpMap / datacenterList
            if (dcId && (!city || !country)) {
                const mappedLoc = serverIpMap[dcId];
                if (mappedLoc) {
                    city = city || mappedLoc.city;
                    regionName = regionName || mappedLoc.region;
                    country = country || mappedLoc.country;
                } else if (datacenterList) {
                    const matchDc = datacenterList.find(
                        (e) =>
                            (Array.isArray(e.dataCenterIds) && e.dataCenterIds.includes(dcId)) ||
                            e.dataCenterId === dcId,
                    );
                    if (matchDc) {
                        const loc = matchDc.location || matchDc;
                        city = city || loc.city;
                        regionName = regionName || loc.region;
                        country = country || loc.country;
                    }
                }
            }

            const classification = classifyServerRegion({
                city,
                regionName,
                country,
                datacenterId: dcId,
            });

            // Calculate proximity if coordinates are available
            let distanceKm = null;
            if (userCoords && dcId) {
                const mappedLoc = serverIpMap[dcId];
                if (mappedLoc && Array.isArray(mappedLoc.latLong) && mappedLoc.latLong.length === 2) {
                    distanceKm = getDistance(
                        userCoords.lat,
                        userCoords.lon,
                        parseFloat(mappedLoc.latLong[0]),
                        parseFloat(mappedLoc.latLong[1]),
                    );
                }
            }

            const score = calculateServerScore(server, classification, {
                mode,
                latencyMs,
                distanceKm,
                failCount: 0,
                isBestLatencyCandidate: server._isBestLatency === true,
            });

            logDebug(
                `Candidate ${server.id} -> region: ${classification.label} (${classification.confidence}), latency: ${latencyMs}ms, score: ${score}`,
            );

            const resultEntry = {
                server,
                classification,
                score,
                latencyMs,
                distanceKm,
                datacenterId: dcId || null,
            };

            evaluatedResults.push(resultEntry);

            // In Miami mode, if we discover an exact Verified Miami server with a strong score,
            // we can stop scanning further candidates to save time and API calls!
            if (mode === 'miami' && classification.isExactMiami && score >= 85) {
                logDebug(`Found high-scoring verified Miami server: ${server.id}`);
                break;
            }
        } catch (evalErr) {
            logDebug(`Error inspecting server ${server.id}:`, evalErr);
        }
    }

    if (evaluatedResults.length === 0) {
        logDebug('No candidates could be successfully evaluated.');
        return null;
    }

    // Sort evaluated results by score descending
    evaluatedResults.sort((a, b) => b.score - a.score);

    const best = evaluatedResults[0];
    logDebug(
        `Selected server: ${best.server.id} | Region: ${best.classification.label} (${best.classification.confidence}) | Score: ${best.score}/100`,
    );

    return best;
}

/**
 * Joins a specific candidate server via RoValra's launcher.
 */
export async function joinCandidateServer(placeId, serverId) {
    if (!placeId || !serverId) {
        throw new Error('Place ID and Server ID are required to join.');
    }

    logDebug(`Joining server ${serverId} for placeId: ${placeId}...`);

    // Verify activity before launch
    const active = await isServerActive(placeId, serverId);
    if (!active) {
        logDebug(`Server ${serverId} is no longer active.`);
        throw new Error('Selected server is no longer active or is full.');
    }

    launchGame(placeId, serverId);
    return true;
}
