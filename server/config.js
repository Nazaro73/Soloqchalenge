// Joueurs du challenge, leur prénom et leur ajustement de points (handicap / bonus).
// Le puuid (identifiant Riot permanent, propre à notre clé API) évite un appel par joueur
// et survit aux changements de pseudo. S'il est absent, il est retrouvé via le Riot ID.
export const PLAYERS = [
  {
    gameName: 'CatrauledMan',
    tagLine: '9161',
    realName: 'Isman',
    adjustment: -600,
    puuid: 'MDxdU_M-sRkE3CQX7BkUd6PqYzVgLYjZIJMEausmBVSkT3zsii01XnxctRmOL8l13oAjpJlw346Bqg',
  },
  {
    gameName: 'CringsGorder',
    tagLine: '7967',
    realName: 'Hatim',
    adjustment: 300,
    puuid: '3GJ1wa8aBwGoOMlGjeE4yTDUDDWVurtk2QvIYH49dHmPn3k2XiQnuTtpb0Y7RYFWK6IBT7qZeqN0kA',
  },
  {
    gameName: 'Cerageirth',
    tagLine: 'EUW',
    realName: 'Anass',
    adjustment: -200,
    puuid: 'hGHRglOEfuzoCL66BCX99khNPzaMAQ_4BXMb9orH7_L3e1AE5Sdf20P_E1ky5-0rcK9oP148g3inAQ',
  },
  {
    gameName: 'Fouteur2Bordel',
    tagLine: 'DZ73',
    realName: 'Abdel-Rahim',
    adjustment: -200,
    puuid: 'GNdxGsyeCMZaDA7bW_bOnHQblEE_lewFtN1gqDzGQTsXRHvGa8-Ow1D75ASn78JUkDDHKNvDLjRbQA',
  },
  {
    gameName: 'Rebzapdnyar',
    tagLine: 'EUW',
    realName: 'Chahine',
    adjustment: -200,
    puuid: 'cBxpfmw6NA7QUnOLABVv-J6IlpI6D5k5cqU5tL_8rb44uxgXtgkZVuITE7a_8bYGak6d0ckOw4hXdQ',
  },
  {
    gameName: 'Tokebscarrect',
    tagLine: '1478',
    realName: 'Ouneiss',
    adjustment: 300,
    puuid: 'fjTQ31qvPW8G0p4V05FmjjXLLNHqaFNJP_CmAL-W8OINCjepPkW7oqqvdA_eJxemsceNH2dJhTd_4w',
  },
  {
    gameName: 'Wellooz73',
    tagLine: 'EUW',
    realName: 'Abdel-Halim',
    adjustment: 600,
    puuid: 'iX0pvavUzaOjKDm3_p_xJ308NgQ4wRyuBWB8XS02cH5mDVmnO1Zm0rV6HhNIxWVJAP0s-3Q29DiXJA',
  },
  {
    gameName: 'neterent',
    tagLine: '7657',
    realName: 'Jule',
    adjustment: 300,
    puuid: 'RChSyN7KFgRwHpokC4KKPBESWY9m87Np19BWpAuZxXBUQnuoaqTKGnq9JC--MimG5G861X4ox51eMA',
  },
  {
    gameName: 'Giefilic',
    tagLine: '9625',
    realName: 'Thibault',
    adjustment: 0,
    puuid: 'sRVoAg8_RaU0u-OCTFr0DciXnREM2U2Z-IuMO1Bimh7uTMTKWr-tnkfgyZ9g8xGrOeSLOxlkTwz7og',
  },
  {
    gameName: 'Shacekko73',
    tagLine: 'EUW',
    realName: 'Antonio',
    adjustment: 0,
    puuid: 'dU3ieGlD33EoJ8YOqPQdCsURO1Kgu8rNGJRFmrbQt3Tn4tWHZtZ7jUiamjODeOmYA5EpiBad-hiS0w',
  },
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
export const PARTIAL_TTL = 90_000;

// Fréquence de synchronisation des historiques de parties (ms)
export const SYNC_TTL = 5 * 60_000;

// Icône et niveau de profil changent rarement (ms)
export const SUMMONER_TTL = 60 * 60_000;

// Durée du cache des rangs des joueurs adverses/alliés en partie (ms)
export const LIVE_RANK_TTL = 5 * 60_000;

export const RANKED_SOLO_QUEUE = 420;

// Début du challenge : seules les parties classées solo jouées après cette date comptent
export const CHALLENGE_START = process.env.CHALLENGE_START ?? '2026-10-18T00:00:00+02:00';

// Nombre max de nouvelles parties récupérées par synchronisation (respect des limites API)
export const MATCH_SYNC_BUDGET = 40;
