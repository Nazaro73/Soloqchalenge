// Logique des routes API, partagée entre Express (local) et la fonction Vercel.
// Chaque handler renvoie { status, body, maxAge } — maxAge = durée du cache CDN en secondes (0 = pas de cache).
import { PLAYERS, CACHE_TTL, PARTIAL_TTL, LIVE_RANK_TTL, CHALLENGE_START } from './config.js';
import { getPuuid, getSummoner, getLeagueEntries, getActiveGame } from './riot.js';
import { rankToPoints } from './points.js';
import { challengeGames, computeStats, kdaOf } from './stats.js';
import { syncMatches } from './sync.js';
import { getStaticData, queueName } from './staticData.js';
import { store } from './store.js';

function errorLabel(status) {
  if (status === 404) return 'Compte introuvable';
  if (status === 401 || status === 403) return 'Clé API invalide ou expirée';
  if (status === 429) return 'Limite API atteinte';
  return 'Erreur API Riot';
}

function soloQueue(entries) {
  return entries?.find((e) => e.queueType === 'RANKED_SOLO_5x5') ?? null;
}

function findPlayer(gameName, tagLine) {
  return PLAYERS.find(
    (p) =>
      p.gameName.toLowerCase() === gameName.toLowerCase() && p.tagLine.toLowerCase() === tagLine.toLowerCase()
  );
}

function missingKey() {
  return { status: 500, body: { error: 'RIOT_API_KEY non configurée sur le serveur' }, maxAge: 0 };
}

const riotIdOf = (player) => `${player.gameName}#${player.tagLine}`;

// --- Dernières données valides de chaque joueur (mémoire + stockage persistant) ---
const lastGood = new Map();
let seeded = null;

function seedLastGood() {
  seeded ??= store
    .getValue('leaderboard')
    .then((snapshot) => {
      for (const p of snapshot?.players ?? []) if (!p.error && !lastGood.has(p.riotId)) lastGood.set(p.riotId, p);
    })
    .catch(() => {});
  return seeded;
}

async function fetchPlayer(player) {
  const riotId = riotIdOf(player);
  try {
    const puuid = await getPuuid(player.gameName, player.tagLine);

    const [summoner, entries, activeGame, staticData] = await Promise.all([
      getSummoner(puuid),
      getLeagueEntries(puuid),
      getActiveGame(puuid),
      getStaticData(),
    ]);
    const solo = soloQueue(entries);

    let inGame = null;
    if (activeGame) {
      const me = activeGame.participants.find((p) => p.puuid === puuid);
      inGame = {
        gameId: activeGame.gameId,
        queueName: queueName(activeGame.gameQueueConfigId),
        gameStartTime: activeGame.gameStartTime,
        champion: me ? staticData.champion(me.championId) : null,
      };
    }

    const basePoints = solo ? rankToPoints(solo.tier, solo.rank, solo.leaguePoints) : 0;
    const data = {
      riotId,
      gameName: player.gameName,
      tagLine: player.tagLine,
      realName: player.realName,
      profileIconId: summoner.profileIconId,
      summonerLevel: summoner.summonerLevel,
      tier: solo?.tier ?? null,
      rank: solo?.rank ?? null,
      leaguePoints: solo?.leaguePoints ?? 0,
      wins: solo?.wins ?? 0,
      losses: solo?.losses ?? 0,
      hotStreak: solo?.hotStreak ?? false,
      inGame,
      basePoints,
      adjustment: player.adjustment,
      totalPoints: basePoints + player.adjustment,
    };
    lastGood.set(riotId, data);
    return data;
  } catch (err) {
    console.error(`Erreur pour ${riotId}:`, err.message);
    const previous = lastGood.get(riotId);
    if (previous) {
      // Données précédentes plutôt qu'une erreur ; le handicap vient toujours de la config
      return {
        ...previous,
        realName: player.realName,
        inGame: null,
        stale: true,
        adjustment: player.adjustment,
        totalPoints: previous.basePoints + player.adjustment,
      };
    }
    return {
      riotId,
      gameName: player.gameName,
      tagLine: player.tagLine,
      realName: player.realName,
      error: errorLabel(err.status),
      basePoints: 0,
      adjustment: player.adjustment,
      totalPoints: player.adjustment,
    };
  }
}

function safeSync() {
  return syncMatches().catch((err) => {
    console.error('Synchro des parties :', err.message);
    return [];
  });
}

let leaderboardCache = { data: null, expiresAt: 0 };
let leaderboardInFlight = null;

async function buildLeaderboard() {
  await seedLastGood();
  const [players, synced] = await Promise.all([Promise.all(PLAYERS.map(fetchPlayer)), safeSync()]);
  // KDA moyen sur toutes les parties du challenge
  for (const p of players) {
    const s = synced.find((x) => x.riotId === p.riotId);
    p.kda = s ? kdaOf(challengeGames(s.matches)) : null;
  }
  players.sort((a, b) => b.totalPoints - a.totalPoints);

  const complete = players.every((p) => !p.error && !p.stale);
  const data = { updatedAt: Date.now(), complete, players };
  // Même partiel, le résultat est mis en cache (plus court) pour ne pas marteler l'API Riot
  leaderboardCache = { data, expiresAt: Date.now() + (complete ? CACHE_TTL : PARTIAL_TTL) };
  if (players.some((p) => !p.error && !p.stale)) store.setValue('leaderboard', data).catch(() => {});
  return data;
}

export async function leaderboardHandler() {
  if (!process.env.RIOT_API_KEY) return missingKey();

  if (!leaderboardCache.data || Date.now() >= leaderboardCache.expiresAt) {
    // Plusieurs requêtes simultanées : une seule récupération à la fois
    leaderboardInFlight ??= buildLeaderboard().finally(() => (leaderboardInFlight = null));
    await leaderboardInFlight;
  }
  const { data, expiresAt } = leaderboardCache;
  return { status: 200, body: data, maxAge: Math.max(1, Math.round((expiresAt - Date.now()) / 1000)) };
}

let statsCache = { data: null, expiresAt: 0 };

export async function statsHandler() {
  if (!process.env.RIOT_API_KEY) return missingKey();

  if (!statsCache.data || Date.now() >= statsCache.expiresAt) {
    const [synced, sd] = await Promise.all([safeSync(), getStaticData()]);
    const complete = synced.length === PLAYERS.length && synced.every((s) => !s.error);
    const data = {
      updatedAt: Date.now(),
      challengeStart: CHALLENGE_START,
      pending: synced.reduce((n, s) => n + s.pending, 0),
      ...computeStats(synced, sd),
    };
    const ttl = complete && data.pending === 0 ? CACHE_TTL : PARTIAL_TTL;
    statsCache = { data, expiresAt: Date.now() + ttl };
  }
  const { data, expiresAt } = statsCache;
  return { status: 200, body: data, maxAge: Math.max(1, Math.round((expiresAt - Date.now()) / 1000)) };
}

export async function liveGameHandler(gameName, tagLine) {
  if (!process.env.RIOT_API_KEY) return missingKey();

  const player = findPlayer(gameName, tagLine);
  if (!player) return { status: 404, body: { error: 'Ce joueur ne fait pas partie du challenge' }, maxAge: 300 };
  const riotId = riotIdOf(player);

  try {
    const puuid = await getPuuid(player.gameName, player.tagLine);
    const game = await getActiveGame(puuid);
    if (!game) return { status: 200, body: { inGame: false, riotId }, maxAge: 30 };

    const sd = await getStaticData();
    const participants = await Promise.all(
      game.participants.map(async (p) => {
        const entries = p.puuid ? await getLeagueEntries(p.puuid, LIVE_RANK_TTL).catch(() => null) : null;
        const solo = soloQueue(entries);
        const challenger = PLAYERS.find((cp) => riotIdOf(cp).toLowerCase() === p.riotId?.toLowerCase());
        return {
          riotId: p.riotId ?? 'Bot',
          teamId: p.teamId,
          isTracked: p.puuid === puuid,
          isChallenger: Boolean(challenger),
          realName: challenger?.realName ?? null,
          champion: sd.champion(p.championId),
          spells: [sd.spell(p.spell1Id), sd.spell(p.spell2Id)],
          keystone: sd.perk(p.perks?.perkIds?.[0]),
          subStyle: sd.perkStyle(p.perks?.perkSubStyle),
          rank: solo
            ? { tier: solo.tier, rank: solo.rank, leaguePoints: solo.leaguePoints, wins: solo.wins, losses: solo.losses }
            : null,
        };
      })
    );

    return {
      status: 200,
      maxAge: 30,
      body: {
        inGame: true,
        riotId,
        gameId: game.gameId,
        queueName: queueName(game.gameQueueConfigId),
        gameStartTime: game.gameStartTime,
        gameLength: game.gameLength,
        participants,
        bans: (game.bannedChampions ?? []).map((b) => ({
          teamId: b.teamId,
          champion: b.championId > 0 ? sd.champion(b.championId) : null,
        })),
      },
    };
  } catch (err) {
    console.error(`Live game ${riotId}:`, err.message);
    return { status: err.status === 429 ? 503 : 502, body: { error: errorLabel(err.status) }, maxAge: 10 };
  }
}
