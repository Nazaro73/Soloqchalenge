import { getMatchIds, getMatch } from './riot.js';
import { KDA_GAMES, RANKED_SOLO_QUEUE } from './config.js';

// KDA moyen sur les dernières parties classées solo (remakes exclus)
export async function getRecentKda(puuid) {
  const ids = await getMatchIds(puuid, { queue: RANKED_SOLO_QUEUE, count: KDA_GAMES });
  const matches = await Promise.all(ids.map(getMatch));

  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let games = 0;
  for (const match of matches) {
    const p = match.info.participants.find((x) => x.puuid === puuid);
    if (!p || p.gameEndedInEarlySurrender) continue;
    kills += p.kills;
    deaths += p.deaths;
    assists += p.assists;
    games++;
  }

  if (games === 0) return null;
  return {
    games,
    kills: kills / games,
    deaths: deaths / games,
    assists: assists / games,
    ratio: (kills + assists) / Math.max(deaths, 1),
  };
}
