// Données statiques (champions, sorts, runes) depuis CommunityDragon
const CDRAGON = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

const QUEUES = {
  0: 'Personnalisée',
  400: 'Normale Draft',
  420: 'Classée Solo/Duo',
  430: 'Normale Aveugle',
  440: 'Classée Flex',
  450: 'ARAM',
  490: 'Partie rapide',
  830: 'Coop vs IA',
  840: 'Coop vs IA',
  850: 'Coop vs IA',
  900: 'ARURF',
  1700: 'Arena',
  1900: 'URF',
};

export function queueName(queueId) {
  return QUEUES[queueId] ?? 'Partie';
}

function assetUrl(iconPath) {
  if (!iconPath) return null;
  return `${CDRAGON}/${iconPath.replace('/lol-game-data/assets/', '').toLowerCase()}`;
}

async function loadJson(file) {
  const res = await fetch(`${CDRAGON}/v1/${file}`);
  if (!res.ok) throw new Error(`CommunityDragon ${file}: ${res.status}`);
  return res.json();
}

function byId(list) {
  return new Map(list.map((x) => [x.id, x]));
}

let loading = null;

async function load() {
  const [champions, spells, perks, perkStyles] = await Promise.all([
    loadJson('champion-summary.json'),
    loadJson('summoner-spells.json'),
    loadJson('perks.json'),
    loadJson('perkstyles.json'),
  ]);
  return {
    champions: byId(champions),
    spells: byId(spells),
    perks: byId(perks),
    perkStyles: byId(perkStyles.styles),
  };
}

export async function getStaticData() {
  if (!loading) {
    loading = load().catch((err) => {
      console.error('Données statiques indisponibles :', err.message);
      loading = null;
      return { champions: new Map(), spells: new Map(), perks: new Map(), perkStyles: new Map() };
    });
  }
  const data = await loading;

  return {
    champion: (id) => ({
      id,
      name: data.champions.get(id)?.name ?? `Champion ${id}`,
      icon: `${CDRAGON}/v1/champion-icons/${id}.png`,
      splash: `https://cdn.communitydragon.org/latest/champion/${id}/splash-art/centered`,
    }),
    spell: (id) => {
      const s = data.spells.get(id);
      return s ? { id, name: s.name, icon: assetUrl(s.iconPath) } : null;
    },
    perk: (id) => {
      const p = data.perks.get(id);
      return p ? { id, name: p.name, icon: assetUrl(p.iconPath) } : null;
    },
    perkStyle: (id) => {
      const s = data.perkStyles.get(id);
      return s ? { id, name: s.name, icon: assetUrl(s.iconPath) } : null;
    },
  };
}
