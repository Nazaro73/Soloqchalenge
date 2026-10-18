const TIER_LABELS = {
  IRON: 'Fer',
  BRONZE: 'Bronze',
  SILVER: 'Argent',
  GOLD: 'Or',
  PLATINUM: 'Platine',
  EMERALD: 'Émeraude',
  DIAMOND: 'Diamant',
  MASTER: 'Maître',
  GRANDMASTER: 'Grand Maître',
  CHALLENGER: 'Challenger',
};

const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

export function formatRank(tier, rank) {
  if (!tier) return 'Unranked';
  const label = TIER_LABELS[tier] ?? tier;
  return APEX.includes(tier) ? label : `${label} ${rank}`;
}

export function emblemUrl(tier) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier.toLowerCase()}.png`;
}

export function profileIconUrl(id) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${id ?? 29}.jpg`;
}

export function liveGamePath(gameName, tagLine) {
  return `/game/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
}

export function opggUrl(gameName, tagLine) {
  return `https://www.op.gg/summoners/euw/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
}
