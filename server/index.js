// Serveur local (dev et `npm start`). Sur Vercel, ce sont les fonctions du dossier api/ qui répondent.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leaderboardHandler, liveGameHandler } from './handlers.js';

if (!process.env.RIOT_API_KEY) {
  console.error('RIOT_API_KEY manquante dans .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/leaderboard', async (req, res) => {
  const { status, body } = await leaderboardHandler();
  res.status(status).json(body);
});

app.get('/api/live/:gameName/:tagLine', async (req, res) => {
  const { status, body } = await liveGameHandler(req.params.gameName, req.params.tagLine);
  res.status(status).json(body);
});

// En production, on sert le build React
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.get('/{*splat}', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

app.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));
