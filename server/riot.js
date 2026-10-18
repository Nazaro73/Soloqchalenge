import { REGIONAL_HOST, PLATFORM_HOST, RATE_LIMITS } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Limiteur de débit : fenêtres glissantes partagées par tous les appels ---
const callTimes = [];
let queue = Promise.resolve();

function acquireSlot() {
  const slot = queue.then(async () => {
    for (;;) {
      const now = Date.now();
      const longest = Math.max(...RATE_LIMITS.map((l) => l.window));
      while (callTimes.length && now - callTimes[0] >= longest) callTimes.shift();

      let wait = 0;
      for (const { max, window } of RATE_LIMITS) {
        const recent = callTimes.filter((t) => now - t < window);
        if (recent.length >= max) wait = Math.max(wait, recent[recent.length - max] + window - now);
      }
      if (wait <= 0) {
        callTimes.push(now);
        return;
      }
      await sleep(wait);
    }
  });
  queue = slot.catch(() => {});
  return slot;
}

async function riotFetch(url, retries = 1) {
  await acquireSlot();
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
  });
  if (res.status === 429 && retries > 0) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? 1);
    await sleep(retryAfter * 1000);
    return riotFetch(url, retries - 1);
  }
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Riot API ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// --- Cache mémoire simple avec durée de vie ---
function cached(store, key, ttl, fn) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = fn();
  store.set(key, { at: Date.now(), value });
  // En cas d'échec, on ne garde pas la promesse rejetée en cache
  Promise.resolve(value).catch(() => store.delete(key));
  return value;
}

const puuidStore = new Map();
const leagueStore = new Map();
const matchStore = new Map();

export function getPuuid(gameName, tagLine) {
  return cached(puuidStore, `${gameName}#${tagLine}`.toLowerCase(), Infinity, async () => {
    const account = await riotFetch(
      `${REGIONAL_HOST}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    return account.puuid;
  });
}

export function getSummoner(puuid) {
  return riotFetch(`${PLATFORM_HOST}/lol/summoner/v4/summoners/by-puuid/${puuid}`);
}

export function getLeagueEntries(puuid, ttl = 0) {
  return cached(leagueStore, puuid, ttl, () =>
    riotFetch(`${PLATFORM_HOST}/lol/league/v4/entries/by-puuid/${puuid}`)
  );
}

// Renvoie null si le joueur n'est pas en partie
export async function getActiveGame(puuid) {
  try {
    return await riotFetch(`${PLATFORM_HOST}/lol/spectator/v5/active-games/by-summoner/${puuid}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export function getMatchIds(puuid, { queue, count }) {
  return riotFetch(
    `${REGIONAL_HOST}/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${queue}&count=${count}`
  );
}

// Une partie terminée ne change plus : cache permanent
export function getMatch(matchId) {
  return cached(matchStore, matchId, Infinity, () =>
    riotFetch(`${REGIONAL_HOST}/lol/match/v5/matches/${matchId}`)
  );
}
