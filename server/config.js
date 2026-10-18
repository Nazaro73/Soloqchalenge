// Joueurs du challenge et leur ajustement de points (handicap / bonus)
export const PLAYERS = [
  { gameName: 'CatrauledMan', tagLine: '9161', adjustment: -600 },
  { gameName: 'CringsGorder', tagLine: '7967', adjustment: 400 },
  { gameName: 'Cerageirth', tagLine: 'EUW', adjustment: -200 },
  { gameName: 'Fouteur2Bordel', tagLine: 'DZ73', adjustment: -200 },
  { gameName: 'Rebzapdnyar', tagLine: 'EUW', adjustment: -200 },
];

// Routage Riot : compte et matchs (regional), LoL (plateforme)
export const REGIONAL_HOST = 'https://europe.api.riotgames.com';
export const PLATFORM_HOST = 'https://euw1.api.riotgames.com';

// Limites d'une clé de développement Riot (à augmenter avec une clé de production)
export const RATE_LIMITS = [
  { max: 20, window: 1_000 },
  { max: 100, window: 120_000 },
];

// Durée du cache du classement (ms)
export const CACHE_TTL = 60_000;

// Durée du cache des rangs des joueurs adverses/alliés en partie (ms)
export const LIVE_RANK_TTL = 5 * 60_000;

// Nombre de parties classées solo utilisées pour le KDA moyen
export const KDA_GAMES = 10;
export const RANKED_SOLO_QUEUE = 420;
