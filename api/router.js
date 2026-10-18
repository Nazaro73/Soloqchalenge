// Fonction Vercel unique pour toute l'API : les routes partagent le même cache mémoire
// et le même limiteur d'appels Riot (vercel.json redirige /api/* ici).
import { leaderboardHandler, liveGameHandler, statsHandler } from '../server/handlers.js';

function routeParts(req) {
  const raw = req.query.path ?? new URL(req.url, 'http://localhost').pathname.replace(/^\/api\/?/, '');
  return (Array.isArray(raw) ? raw.join('/') : String(raw))
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
}

export default async function handler(req, res) {
  const [route, ...params] = routeParts(req);

  let result;
  if (route === 'leaderboard') result = await leaderboardHandler();
  else if (route === 'stats') result = await statsHandler();
  else if (route === 'live' && params.length === 2) result = await liveGameHandler(params[0], params[1]);
  else result = { status: 404, body: { error: 'Route inconnue' }, maxAge: 0 };

  // Cache CDN : tous les visiteurs partagent la même réponse, l'API Riot n'est appelée qu'une fois par période
  res.setHeader(
    'Cache-Control',
    result.maxAge > 0 ? `public, s-maxage=${result.maxAge}, stale-while-revalidate=600` : 'no-store'
  );
  res.status(result.status).json(result.body);
}
