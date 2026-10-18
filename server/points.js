const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];
const APEX_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

// Points = LP cumulés depuis Fer IV 0 LP (100 LP par division).
// Ex : Bronze III 0 LP = 500. Master+ démarre à 2800 + LP.
export function rankToPoints(tier, rank, lp) {
  if (!tier) return 0;
  if (APEX_TIERS.includes(tier)) return TIERS.length * 400 + lp;
  const tierIndex = TIERS.indexOf(tier);
  const divIndex = DIVISIONS.indexOf(rank);
  if (tierIndex === -1 || divIndex === -1) return 0;
  return tierIndex * 400 + divIndex * 100 + lp;
}
