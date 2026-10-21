// Synchronisation incrémentale des parties classées solo du challenge
import { PLAYERS, CHALLENGE_START, RANKED_SOLO_QUEUE, MATCH_SYNC_BUDGET, SYNC_TTL } from './config.js';
import { playerPuuid, getMatchIds, getMatch, remainingAppCalls } from './riot.js';
import { store } from './store.js';

const START_SECONDS = Math.floor(new Date(CHALLENGE_START).getTime() / 1000);
const PAGE_SIZE = 100;

async function challengeMatchIds(puuid) {
  const ids = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const page = await getMatchIds(puuid, {
      queue: RANKED_SOLO_QUEUE,
      startTime: START_SECONDS,
      start,
      count: PAGE_SIZE,
    });
    ids.push(...page);
    if (page.length < PAGE_SIZE) return ids;
  }
}

// On ne garde que ce dont les stats ont besoin (quelques centaines d'octets par partie)
function summarize(match, puuid) {
  const p = match.info.participants.find((x) => x.puuid === puuid);
  if (!p) return { skip: true };

  const flashSlot = p.summoner1Id === 4 ? 1 : p.summoner2Id === 4 ? 2 : 0;
  const pings = Object.entries(p)
    .filter(([key, value]) => key.endsWith('Pings') && typeof value === 'number')
    .reduce((sum, [, value]) => sum + value, 0);

  return {
    start: match.info.gameStartTimestamp,
    duration: match.info.gameDuration,
    remake: Boolean(p.gameEndedInEarlySurrender),
    win: p.win,
    ff: Boolean(p.gameEndedInSurrender) && !p.win,
    champ: p.championId,
    role: p.teamPosition || null,
    k: p.kills,
    d: p.deaths,
    a: p.assists,
    cs: p.totalMinionsKilled + p.neutralMinionsKilled,
    pings,
    flash: flashSlot ? p[`summoner${flashSlot}Casts`] ?? 0 : 0,
    solo: p.challenges?.soloKills ?? 0,
    cw: p.challenges?.controlWardsPlaced ?? p.visionWardsBoughtInGame ?? 0,
    penta: p.pentaKills ?? 0,
    scuttle: p.challenges?.scuttleCrabKills ?? 0,
  };
}

// Appels gardés de côté pour le classement et les parties en cours
const QUOTA_RESERVE = 30;

const previousResult = (riotId) => lastSync.results?.find((r) => r.riotId === riotId);

// Pas assez de quota : aucune requête Riot, on se contente de ce qui est déjà connu
function deferredSync() {
  return Promise.all(
    PLAYERS.map(async (player) => {
      const riotId = `${player.gameName}#${player.tagLine}`;
      const prev = previousResult(riotId);
      const stored = player.puuid ? await store.load(player.puuid).catch(() => ({})) : {};
      return { player, riotId, matches: { ...prev?.matches, ...stored }, pending: prev?.pending ?? null, deferred: true };
    })
  );
}

async function doSync() {
  const available = remainingAppCalls() - QUOTA_RESERVE;
  if (available < PLAYERS.length) return deferredSync();
  // Une liste d'ids par joueur, le reste du quota pour le détail des parties
  let budget = Math.min(MATCH_SYNC_BUDGET, available - PLAYERS.length);
  const results = [];

  for (const player of PLAYERS) {
    const riotId = `${player.gameName}#${player.tagLine}`;
    let puuid = null;
    try {
      puuid = await playerPuuid(player);
      const [ids, stored] = await Promise.all([challengeMatchIds(puuid), store.load(puuid)]);

      const missing = ids.filter((id) => !stored[id]);
      const toFetch = missing.slice(0, Math.max(budget, 0));
      budget -= toFetch.length;

      const fetched = {};
      await Promise.all(
        toFetch.map(async (id) => {
          try {
            fetched[id] = summarize(await getMatch(id), puuid);
          } catch (err) {
            if (err.status === 404) fetched[id] = { skip: true };
            else console.error(`Partie ${id} :`, err.message);
          }
        })
      );
      await store.save(puuid, fetched);

      results.push({
        player,
        riotId,
        matches: { ...stored, ...fetched },
        pending: missing.length - Object.keys(fetched).length,
      });
    } catch (err) {
      console.error(`Synchro ${riotId} :`, err.message);
      // Riot indisponible : on garde au moins les parties déjà connues
      const stored = puuid ? await store.load(puuid).catch(() => ({})) : {};
      const prev = previousResult(riotId);
      results.push({ player, riotId, matches: { ...prev?.matches, ...stored }, pending: prev?.pending ?? null, error: true });
    }
  }
  return results;
}

let syncing = null;
let lastSync = { at: 0, results: null };

// Nombre de parties restant à récupérer, ou null s'il est encore inconnu pour un joueur
export function pendingMatches(results) {
  if (results.length < PLAYERS.length || results.some((r) => r.pending == null)) return null;
  return results.reduce((n, r) => n + r.pending, 0);
}

// Synchro terminée : aucune erreur, rien de reporté, plus aucune partie à récupérer
export function syncComplete(results) {
  return results.length === PLAYERS.length && results.every((r) => !r.error && !r.deferred && r.pending === 0);
}

// Une seule synchro à la fois, partagée entre le classement et les stats.
// Résultat réutilisé pendant SYNC_TTL, ou 20 s si la synchro n'est pas finie
// (sans risque pour la limite : chaque passage ne consomme que le quota disponible).
export function syncMatches() {
  if (lastSync.results) {
    const ttl = syncComplete(lastSync.results) ? SYNC_TTL : 20_000;
    if (Date.now() - lastSync.at < ttl) return Promise.resolve(lastSync.results);
  }
  syncing ??= doSync()
    .then((results) => {
      lastSync = { at: Date.now(), results };
      return results;
    })
    .finally(() => (syncing = null));
  return syncing;
}
