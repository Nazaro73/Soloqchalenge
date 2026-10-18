import { leaderboardHandler } from '../server/handlers.js';

export default async function handler(req, res) {
  const { status, body, cacheable } = await leaderboardHandler();
  // Cache CDN Vercel : limite les appels à l'API Riot quel que soit le nombre de visiteurs
  res.setHeader('Cache-Control', cacheable ? 'public, s-maxage=60, stale-while-revalidate=120' : 'no-store');
  res.status(status).json(body);
}
