// Stockage persistant : résumés de parties + quelques valeurs (puuid, dernier classement).
// Upstash Redis (Vercel Marketplace) si configuré, sinon un fichier JSON local.
import fs from 'node:fs/promises';
import path from 'node:path';

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const matchesKey = (puuid) => `soloq:matches:${puuid}`;
const valueKey = (key) => `soloq:kv:${key}`;

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
    const flat = (await redis(['HGETALL', matchesKey(puuid)])) ?? [];
    const out = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = JSON.parse(flat[i + 1]);
    return out;
  },
  async save(puuid, entries) {
    const args = Object.entries(entries).flatMap(([id, summary]) => [id, JSON.stringify(summary)]);
    if (args.length) await redis(['HSET', matchesKey(puuid), ...args]);
  },
  async getValue(key) {
    const raw = await redis(['GET', valueKey(key)]);
    return raw == null ? null : JSON.parse(raw);
  },
  async setValue(key, value) {
    await redis(['SET', valueKey(key), JSON.stringify(value)]);
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

// Écritures en série pour ne pas écraser les données d'un autre joueur
function update(mutate) {
  const write = fileLock.then(async () => {
    const all = await readAll();
    mutate(all);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(all));
  });
  fileLock = write.catch(() => {});
  return write;
}

const fileStore = {
  kind: 'file',
  async load(puuid) {
    return (await readAll())[puuid] ?? {};
  },
  save(puuid, entries) {
    if (Object.keys(entries).length === 0) return Promise.resolve();
    return update((all) => {
      all[puuid] = { ...all[puuid], ...entries };
    });
  },
  async getValue(key) {
    return (await readAll())._kv?.[key] ?? null;
  },
  setValue(key, value) {
    return update((all) => {
      all._kv = { ...all._kv, [key]: value };
    });
  },
};

export const store = REDIS_URL && REDIS_TOKEN ? redisStore : fileStore;
