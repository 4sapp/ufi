// TODO Remove console logs

const STORAGE_KEY = 'rovalra_oauth_verification';
const OAUTH_PROGRESS_KEY = 'rovalra_oauth_progress';

import { callRobloxApi } from '../api.js';
import { getAuthenticatedUserId } from '../user.js';
import { shouldUseFallback, getValidFallbackToken } from './fallback.js';
import { getCurrentUserTierSync } from '../settings/handlesettings.js';

let activeOAuthPromise = null;

export async function init() {
    // Client-side ufi mode: no external backend session needed
}

function clearOAuthProgress() {
    return chrome.storage.local.remove(OAUTH_PROGRESS_KEY);
}

export async function getValidAccessToken() {
    return null;
}

async function startOAuthFlow(silent = false) {
    const userId = await getAuthenticatedUserId();
    if (!userId) return false;

    if (!silent) {
        console.warn(
            'ufi: Non-silent OAuth flow is not implemented as per the background-only request.',
        );
        return Promise.resolve(false);
    }

    if (activeOAuthPromise) return activeOAuthPromise;

    activeOAuthPromise = (async () => {
        try {
            const currentProgress = await getOAuthProgress();
            const now = Date.now();
            const elapsed = currentProgress
                ? now - (currentProgress.timestamp || 0)
                : Infinity;

            if (
                currentProgress &&
                currentProgress.step &&
                String(currentProgress.data?.userId) === String(userId)
            ) {
                if (elapsed < 60000) {
                    console.log('ufi: Resuming recent OAuth process...');
                    const success = await resumeOAuthFlow(
                        userId,
                        currentProgress,
                    );
                    if (success) return true;

                    console.log(
                        'ufi: Resumption attempt failed. Too recent to redo steps.',
                    );
                    return false;
                } else {
                    console.log(
                        'ufi: OAuth flow stale (> 1 min). Restarting.',
                    );
                    await clearOAuthProgress();
                }
            }

            console.log('ufi: Starting new OAuth flow...');

            console.log('ufi: Checking birthdate...');
            const birthResponse = await callRobloxApi({
                subdomain: 'users',
                endpoint: '/v1/birthdate',
                method: 'GET',
            });

            if (birthResponse.ok) {
                const data = await birthResponse.json();
                const { birthYear, birthMonth, birthDay } = data;

                const today = new Date();
                let age = today.getFullYear() - birthYear;
                const m = today.getMonth() + 1 - birthMonth;
                if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
                    age--;
                }

                if (age < 13) {
                    console.log(
                        'ufi: User is under 13. Will use fallback auth.',
                    );
                    await clearOAuthProgress();
                    return false;
                }
            }

            await saveOAuthProgress('birthdate_checked', { userId });

            await saveOAuthProgress('existence_verified', { userId });

            try {
                console.log(
                    'ufi: Attempting direct OAuth authorization POST request...',
                );

                const response = await callRobloxApi({
                    subdomain: 'apis',
                    endpoint: '/oauth/v1/authorizations',
                    method: 'POST',
                    body: {
                        clientId: '5835339573709822795',
                        responseTypes: ['Code'],
                        redirectUri:
                            'https://apis.rovalra.com/v1/auth/callback',
                        scopes: [
                            { scopeType: 'openid', operations: ['read'] },
                            { scopeType: 'profile', operations: ['read'] },
                        ],
                        resourceInfos: [
                            {
                                owner: { id: userId.toString(), type: 'User' },
                                resources: {},
                            },
                        ],
                    },
                });

                if (response.ok) {
                    const authResponse = await response.json();
                    const locationUrl = authResponse.location;
                    if (!locationUrl) return false;

                    await saveOAuthProgress('got_auth_code', {
                        userId,
                        locationUrl,
                    });
                    return await resumeOAuthFlow(userId, {
                        step: 'got_auth_code',
                        data: { userId, locationUrl },
                    });
                }
            } catch (error) {
                console.error('ufi: OAuth authorization error', error);
                return false;
            }
        } catch (error) {
            console.error('ufi: OAuth flow failure', error);
            return false;
        }
    })();

    try {
        return await activeOAuthPromise;
    } finally {
        activeOAuthPromise = null;
    }
}

async function resumeOAuthFlow(userId, progress) {
    const { step, data } = progress;

    if (data?.userId && String(data.userId) !== String(userId)) {
        await clearOAuthProgress();
        return false;
    }

    try {
        if (step === 'birthdate_checked') {
            await saveOAuthProgress('existence_verified', { userId });
            return await resumeOAuthFlow(userId, {
                step: 'existence_verified',
                data: { userId },
            });
        }

        if (step === 'got_auth_code') {
            const storage = await chrome.storage.local.get(STORAGE_KEY);
            if (storage[STORAGE_KEY]?.[userId]?.accessToken) {
                console.log(
                    'ufi: Token already present, clearing progress.',
                );
                await clearOAuthProgress();
                return true;
            }

            const { locationUrl } = data;

            console.log('ufi: Resuming token fetch from callback...');
            const tokenResponse = await callRobloxApi({
                fullUrl: locationUrl,
                method: 'GET',
                isRovalraApi: true,
                skipAutoAuth: true,
                noCache: true,
            });

            if (!tokenResponse.ok) return false;

            const tokenData = await tokenResponse.json();
            if (
                tokenData.status === 'success' &&
                tokenData.access_token &&
                tokenData.user_id &&
                tokenData.username
            ) {
                const storage = await chrome.storage.local.get(STORAGE_KEY);
                const allVerifications = storage[STORAGE_KEY] || {};
                allVerifications[userId] = {
                    verified: true,
                    robloxId: tokenData.user_id,
                    username: tokenData.username,
                    accessToken: tokenData.access_token,
                    timestamp: Date.now(),
                };
                await chrome.storage.local.set({
                    [STORAGE_KEY]: allVerifications,
                });
                await clearOAuthProgress();
                return true;
            }
            return false;
        }

        if (step === 'existence_verified') {
            const response = await callRobloxApi({
                subdomain: 'apis',
                endpoint: '/oauth/v1/authorizations',
                method: 'POST',
                body: {
                    clientId: '5835339573709822795',
                    responseTypes: ['Code'],
                    redirectUri: 'https://apis.rovalra.com/v1/auth/callback',
                    scopes: [
                        { scopeType: 'openid', operations: ['read'] },
                        { scopeType: 'profile', operations: ['read'] },
                    ],
                    resourceInfos: [
                        {
                            owner: { id: userId.toString(), type: 'User' },
                            resources: {},
                        },
                    ],
                },
            });

            if (response.ok) {
                const authResponse = await response.json();
                const locationUrl = authResponse.location;

                if (!locationUrl) {
                    console.error(
                        'ufi: OAuth authorization response did not contain a location URL.',
                    );
                    await clearOAuthProgress();
                    return false;
                }

                console.log(
                    'ufi: Got authorization code. Fetching token from callback URL...',
                );

                await saveOAuthProgress('got_auth_code', {
                    userId,
                    locationUrl,
                });

                return await resumeOAuthFlow(userId, {
                    step: 'got_auth_code',
                    data: { userId, locationUrl },
                });
            } else {
                console.error(
                    'ufi: OAuth authorization POST request failed with status ' +
                        response.status,
                );
                return false;
            }
        }

        console.warn('ufi: Unknown OAuth progress step:', step);
        return false;
    } catch (error) {
        console.error('ufi: Error resuming OAuth flow:', error);
        await clearOAuthProgress();
        return false;
    }
}
