import { statsHandler } from '../server/handlers.js';

export default async function handler(req, res) {
  const { status, body, cacheable } = await statsHandler();
  // Tant que des parties restent à synchroniser, on ne cache pas pour avancer à chaque visite
  res.setHeader('Cache-Control', cacheable ? 'public, s-maxage=120, stale-while-revalidate=300' : 'no-store');
  res.status(status).json(body);
}
