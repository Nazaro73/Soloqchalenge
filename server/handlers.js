// Logique des routes API, partagée entre Express (local) et les fonctions Vercel
import { PLAYERS, CACHE_TTL, LIVE_RANK_TTL, CHALLENGE_START } from './config.js';
import { getPuuid, getSummoner, getLeagueEntries, getActiveGame } from './riot.js';
import { rankToPoints } from './points.js';
import { challengeGames, computeStats, kdaOf } from './stats.js';
import { syncMatches } from './sync.js';
import { getStaticData, queueName } from './staticData.js';

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
  return { status: 500, body: { error: 'RIOT_API_KEY non configurée sur le serveur' } };
}

async function fetchPlayer(player) {
  const riotId = `${player.gameName}#${player.tagLine}`;
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
    return {
      riotId,
      gameName: player.gameName,
      tagLine: player.tagLine,
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
  } catch (err) {
    console.error(`Erreur pour ${riotId}:`, err.message);
    return {
      riotId,
      gameName: player.gameName,
      tagLine: player.tagLine,
      error: errorLabel(err.status),
      basePoints: 0,
      adjustment: player.adjustment,
      totalPoints: player.adjustment,
    };
  }
}

let leaderboardCache = { data: null, fetchedAt: 0 };
let leaderboardInFlight = null;

function safeSync() {
  return syncMatches().catch((err) => {
    console.error('Synchro des parties :', err.message);
    return [];
  });
}

async function buildLeaderboard() {
  const now = Date.now();
  const [players, synced] = await Promise.all([Promise.all(PLAYERS.map(fetchPlayer)), safeSync()]);
  // KDA moyen sur toutes les parties du challenge
  for (const p of players) {
    const s = synced.find((x) => x.riotId === p.riotId);
    p.kda = s ? kdaOf(challengeGames(s.matches)) : null;
  }
  players.sort((a, b) => b.totalPoints - a.totalPoints);
  const data = { updatedAt: now, players };
  // On ne met en cache que les résultats complets, pour réessayer vite en cas d'erreur
  if (players.every((p) => !p.error)) leaderboardCache = { data, fetchedAt: now };
  return data;
}

// Renvoie { status, body, cacheable }
export async function leaderboardHandler() {
  if (!process.env.RIOT_API_KEY) return missingKey();

  if (leaderboardCache.data && Date.now() - leaderboardCache.fetchedAt < CACHE_TTL) {
    return { status: 200, body: leaderboardCache.data, cacheable: true };
  }
  // Plusieurs requêtes simultanées : une seule récupération à la fois
  leaderboardInFlight ??= buildLeaderboard().finally(() => (leaderboardInFlight = null));
  const data = await leaderboardInFlight;
  return { status: 200, body: data, cacheable: data.players.every((p) => !p.error) };
}

let statsCache = { data: null, fetchedAt: 0 };

export async function statsHandler() {
  if (!process.env.RIOT_API_KEY) return missingKey();

  if (statsCache.data && Date.now() - statsCache.fetchedAt < CACHE_TTL) {
    return { status: 200, body: statsCache.data, cacheable: true };
  }
  const [synced, sd] = await Promise.all([safeSync(), getStaticData()]);
  const complete = synced.length === PLAYERS.length && synced.every((s) => !s.error);
  const data = {
    updatedAt: Date.now(),
    challengeStart: CHALLENGE_START,
    pending: synced.reduce((n, s) => n + s.pending, 0),
    ...computeStats(synced, sd),
  };
  if (complete) statsCache = { data, fetchedAt: Date.now() };
  return { status: 200, body: data, cacheable: complete && data.pending === 0 };
}

export async function liveGameHandler(gameName, tagLine) {
  if (!process.env.RIOT_API_KEY) return missingKey();

  const player = findPlayer(gameName, tagLine);
  if (!player) return { status: 404, body: { error: 'Ce joueur ne fait pas partie du challenge' } };
  const riotId = `${player.gameName}#${player.tagLine}`;

  try {
    const puuid = await getPuuid(player.gameName, player.tagLine);
    const game = await getActiveGame(puuid);
    if (!game) return { status: 200, body: { inGame: false, riotId }, cacheable: true };

    const sd = await getStaticData();
    const participants = await Promise.all(
      game.participants.map(async (p) => {
        const entries = p.puuid ? await getLeagueEntries(p.puuid, LIVE_RANK_TTL).catch(() => null) : null;
        const solo = soloQueue(entries);
        return {
          riotId: p.riotId ?? 'Bot',
          teamId: p.teamId,
          isTracked: p.puuid === puuid,
          isChallenger: PLAYERS.some((cp) => `${cp.gameName}#${cp.tagLine}` === p.riotId),
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
      cacheable: true,
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
    return { status: 502, body: { error: errorLabel(err.status) } };
  }
}
