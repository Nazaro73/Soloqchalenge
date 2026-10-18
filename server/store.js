// Stockage persistant des résumés de parties.
// Upstash Redis (Vercel Marketplace) si configuré, sinon un fichier JSON local.
import fs from 'node:fs/promises';
import path from 'node:path';

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redisKey = (puuid) => `soloq:matches:${puuid}`;

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: JSON.stringify(command),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`Redis : ${body.error ?? res.status}`);
  return body.result;
}

const redisStore = {
  kind: 'redis',
  async load(puuid) {
    const flat = (await redis(['HGETALL', redisKey(puuid)])) ?? [];
    const out = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = JSON.parse(flat[i + 1]);
    return out;
  },
  async save(puuid, entries) {
    const args = Object.entries(entries).flatMap(([id, summary]) => [id, JSON.stringify(summary)]);
    if (args.length) await redis(['HSET', redisKey(puuid), ...args]);
  },
};

// Sur Vercel sans Redis, seul /tmp est inscriptible (et il est éphémère)
const FILE = process.env.VERCEL ? '/tmp/soloq-matches.json' : path.join(process.cwd(), 'data', 'matches.json');
let fileLock = Promise.resolve();

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

const fileStore = {
  kind: 'file',
  async load(puuid) {
    return (await readAll())[puuid] ?? {};
  },
  save(puuid, entries) {
    if (Object.keys(entries).length === 0) return Promise.resolve();
    // Écritures en série pour éviter d'écraser les données d'un autre joueur
    const write = fileLock.then(async () => {
      const all = await readAll();
      all[puuid] = { ...all[puuid], ...entries };
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(all));
    });
    fileLock = write.catch(() => {});
    return write;
  },
};

export const store = REDIS_URL && REDIS_TOKEN ? redisStore : fileStore;
