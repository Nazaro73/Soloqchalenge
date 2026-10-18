import { liveGameHandler } from '../../../server/handlers.js';

export default async function handler(req, res) {
  const { gameName, tagLine } = req.query;
  const { status, body, cacheable } = await liveGameHandler(gameName, tagLine);
  res.setHeader('Cache-Control', cacheable ? 'public, s-maxage=20, stale-while-revalidate=40' : 'no-store');
  res.status(status).json(body);
}
