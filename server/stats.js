// Calcul des statistiques du challenge à partir des résumés de parties
import { CHALLENGE_START } from './config.js';

const START_MS = new Date(CHALLENGE_START).getTime();
const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];

// Parties qui comptent, de la plus ancienne à la plus récente (remakes exclus)
export function challengeGames(matches) {
  return Object.values(matches)
    .filter((m) => !m.skip && !m.remake && m.start >= START_MS)
    .sort((a, b) => a.start - b.start);
}

export function kdaOf(games) {
  if (games.length === 0) return null;
  const sum = (key) => games.reduce((s, g) => s + g[key], 0);
  const [k, d, a] = [sum('k'), sum('d'), sum('a')];
  const n = games.length;
  return { games: n, kills: k / n, deaths: d / n, assists: a / n, ratio: (k + a) / Math.max(d, 1) };
}

function longestWinStreak(games) {
  let best = 0;
  let current = 0;
  for (const g of games) {
    current = g.win ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function aggregate({ player, riotId, matches }) {
  const games = challengeGames(matches);
  const sum = (key) => games.reduce((s, g) => s + g[key], 0);
  const seconds = sum('duration');

  const champions = new Map();
  for (const g of games) champions.set(g.champ, (champions.get(g.champ) ?? 0) + 1);

  return {
    riotId,
    gameName: player.gameName,
    tagLine: player.tagLine,
    list: games,
    games: games.length,
    wins: games.filter((g) => g.win).length,
    kda: kdaOf(games)?.ratio ?? 0,
    kills: sum('k'),
    deaths: sum('d'),
    assists: sum('a'),
    csPerMin: seconds > 0 ? sum('cs') / (seconds / 60) : 0,
    pings: sum('pings'),
    flash: sum('flash'),
    soloKills: sum('solo'),
    controlWards: sum('cw'),
    ffLosses: games.filter((g) => g.ff).length,
    winStreak: longestWinStreak(games),
    timePlayed: seconds,
    scuttles: sum('scuttle'),
    champions,
  };
}

const RANKINGS = [
  'kda',
  'kills',
  'deaths',
  'assists',
  'csPerMin',
  'pings',
  'flash',
  'soloKills',
  'timePlayed',
  'controlWards',
  'ffLosses',
  'winStreak',
];

const ref = (p) => ({ riotId: p.riotId, gameName: p.gameName, tagLine: p.tagLine, games: p.games });

export function computeStats(synced, sd) {
  const players = synced.map(aggregate);
  const active = players.filter((p) => p.games > 0);
  const allGames = active.flatMap((p) => p.list.map((g) => ({ ...g, player: p })));

  const rankings = Object.fromEntries(
    RANKINGS.map((key) => [
      key,
      active
        .filter((p) => p[key] > 0)
        .sort((a, b) => b[key] - a[key])
        .slice(0, 5)
        .map((p) => ({ ...ref(p), value: p[key] })),
    ])
  );

  const roles = ROLES.map((role) => {
    const games = allGames.filter((g) => g.role === role);
    const wins = games.filter((g) => g.win).length;
    return { role, wins, losses: games.length - wins, winrate: games.length ? wins / games.length : 0 };
  })
    .filter((r) => r.wins + r.losses > 0)
    .sort((a, b) => b.winrate - a.winrate);

  const pentas = allGames.filter((g) => g.penta > 0).sort((a, b) => b.start - a.start);
  const lastPentakill = pentas[0]
    ? { ...ref(pentas[0].player), date: pentas[0].start, champion: sd.champion(pentas[0].champ) }
    : null;

  const metaCounts = new Map();
  for (const g of allGames) metaCounts.set(g.champ, (metaCounts.get(g.champ) ?? 0) + 1);
  const meta = [...metaCounts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, games]) => ({ champion: sd.champion(id), games }));

  let oneTrick = null;
  for (const p of active) {
    for (const [id, games] of p.champions) {
      if (!oneTrick || games > oneTrick.games) oneTrick = { ...ref(p), champion: sd.champion(id), games };
    }
  }

  const poolOwner = [...active].sort((a, b) => b.champions.size - a.champions.size)[0];
  const championPool = poolOwner
    ? {
        ...ref(poolOwner),
        count: poolOwner.champions.size,
        champions: [...poolOwner.champions.keys()].map((id) => sd.champion(id)),
      }
    : null;

  const wins = allGames.filter((g) => g.win).length;
  return {
    rankings,
    roles,
    lastPentakill,
    meta,
    oneTrick,
    championPool,
    global: {
      games: allGames.length,
      wins,
      losses: allGames.length - wins,
      timePlayed: allGames.reduce((s, g) => s + g.duration, 0),
      scuttles: allGames.reduce((s, g) => s + g.scuttle, 0),
    },
  };
}
