// Synchronisation incrémentale des parties classées solo du challenge
import { PLAYERS, CHALLENGE_START, RANKED_SOLO_QUEUE, MATCH_SYNC_BUDGET, CACHE_TTL as SYNC_TTL } from './config.js';
import { getPuuid, getMatchIds, getMatch } from './riot.js';
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

async function doSync() {
  let budget = MATCH_SYNC_BUDGET;
  const results = [];

  for (const player of PLAYERS) {
    const riotId = `${player.gameName}#${player.tagLine}`;
    try {
      const puuid = await getPuuid(player.gameName, player.tagLine);
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
      results.push({ player, riotId, matches: {}, pending: 0, error: true });
    }
  }
  return results;
}

let syncing = null;
let lastSync = { at: 0, results: null };

// Une seule synchro à la fois, partagée entre le classement et les stats,
// et réutilisée pendant SYNC_TTL s'il ne reste rien à récupérer
export function syncMatches() {
  const fresh = lastSync.results && Date.now() - lastSync.at < SYNC_TTL;
  if (fresh && lastSync.results.every((r) => r.pending === 0 && !r.error)) {
    return Promise.resolve(lastSync.results);
  }
  syncing ??= doSync()
    .then((results) => {
      lastSync = { at: Date.now(), results };
      return results;
    })
    .finally(() => (syncing = null));
  return syncing;
}
