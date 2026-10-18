// Joueurs du challenge et leur ajustement de points (handicap / bonus)
export const PLAYERS = [
  { gameName: 'CatrauledMan', tagLine: '9161', adjustment: -600 },
  { gameName: 'CringsGorder', tagLine: '7967', adjustment: 300 },
  { gameName: 'Cerageirth', tagLine: 'EUW', adjustment: -200 },
  { gameName: 'Fouteur2Bordel', tagLine: 'DZ73', adjustment: -200 },
  { gameName: 'Rebzapdnyar', tagLine: 'EUW', adjustment: -200 },
  { gameName: 'Tokebscarrect', tagLine: '1478', adjustment: 300 },
  { gameName: 'Wellooz73', tagLine: 'EUW', adjustment: 600 },
  { gameName: 'neterent', tagLine: '7657', adjustment: 300 },
  { gameName: 'Giefilic', tagLine: '9625', adjustment: 0 },
];

// Routage Riot : compte et matchs (regional), LoL (plateforme)
export const REGIONAL_HOST = 'https://europe.api.riotgames.com';
export const PLATFORM_HOST = 'https://euw1.api.riotgames.com';

// Limites de la clé Riot (20/s et 100/2 min), avec une marge pour les autres instances
export const RATE_LIMITS = [
  { max: 18, window: 1_000 },
  { max: 90, window: 120_000 },
];

// Durée du cache du classement (ms). Si des joueurs n'ont pas pu être rafraîchis : PARTIAL_TTL
export const CACHE_TTL = 2 * 60_000;
export const PARTIAL_TTL = 30_000;

// Fréquence de synchronisation des historiques de parties (ms)
export const SYNC_TTL = 5 * 60_000;

// Icône et niveau de profil changent rarement (ms)
export const SUMMONER_TTL = 10 * 60_000;

// Durée du cache des rangs des joueurs adverses/alliés en partie (ms)
export const LIVE_RANK_TTL = 5 * 60_000;

export const RANKED_SOLO_QUEUE = 420;

// Début du challenge : seules les parties classées solo jouées après cette date comptent
export const CHALLENGE_START = process.env.CHALLENGE_START ?? '2026-10-18T00:00:00+02:00';

// Nombre max de nouvelles parties récupérées par synchronisation (respect des limites API)
export const MATCH_SYNC_BUDGET = 40;
