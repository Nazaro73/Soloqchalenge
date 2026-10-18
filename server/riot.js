import { REGIONAL_HOST, PLATFORM_HOST, RATE_LIMITS, SUMMONER_TTL } from './config.js';
import { store } from './store.js';

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

// --- Pause globale après un 429 : on n'insiste pas, on répond tout de suite avec le cache ---
let cooldownUntil = 0;

// Secondes restantes avant de pouvoir rappeler Riot (0 si pas de pause en cours)
export function cooldownRemaining() {
  return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
}

function rateLimitError() {
  const err = new Error('Riot API 429: limite atteinte');
  err.status = 429;
  return err;
}

async function riotFetch(url) {
  if (Date.now() < cooldownUntil) throw rateLimitError();
  await acquireSlot();
  if (Date.now() < cooldownUntil) throw rateLimitError();

  const res = await fetch(url, {
    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
  });
  if (res.status === 429) {
    // Limite de l'application : tous les appels sont bloqués. Limite d'une méthode : seul cet appel échoue.
    if (res.headers.get('X-Rate-Limit-Type') !== 'method') {
      const retryAfter = Number(res.headers.get('Retry-After') ?? 10);
      cooldownUntil = Math.max(cooldownUntil, Date.now() + retryAfter * 1000);
      console.warn(`Limite API Riot atteinte : pause de ${retryAfter}s`);
    }
    throw rateLimitError();
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
const summonerStore = new Map();

// Puuid d'un joueur du challenge : celui de la config s'il est renseigné (aucun appel)
export function playerPuuid(player) {
  return player.puuid ? Promise.resolve(player.puuid) : getPuuid(player.gameName, player.tagLine);
}

// Le puuid ne change jamais : gardé en mémoire et dans le stockage persistant
export function getPuuid(gameName, tagLine) {
  const key = `${gameName}#${tagLine}`.toLowerCase();
  return cached(puuidStore, key, Infinity, async () => {
    const saved = await store.getValue(`puuid:${key}`).catch(() => null);
    if (saved) return saved;
    const account = await riotFetch(
      `${REGIONAL_HOST}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    store.setValue(`puuid:${key}`, account.puuid).catch(() => {});
    return account.puuid;
  });
}

export function getSummoner(puuid) {
  return cached(summonerStore, puuid, SUMMONER_TTL, () =>
    riotFetch(`${PLATFORM_HOST}/lol/summoner/v4/summoners/by-puuid/${puuid}`)
  );
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

export function getMatchIds(puuid, params) {
  const query = new URLSearchParams(params).toString();
  return riotFetch(`${REGIONAL_HOST}/lol/match/v5/matches/by-puuid/${puuid}/ids?${query}`);
}

// Pas de cache ici : les parties sont résumées puis stockées (voir sync.js)
export function getMatch(matchId) {
  return riotFetch(`${REGIONAL_HOST}/lol/match/v5/matches/${matchId}`);
}
