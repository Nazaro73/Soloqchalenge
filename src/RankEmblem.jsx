import { emblemUrl } from './ranks.js';

// Emblème du rang, ou pastille grise si le joueur est unranked
export default function RankEmblem({ tier, className }) {
  if (!tier) return <span className={`${className} emblem-unranked`}>?</span>;
  return <img className={className} src={emblemUrl(tier)} alt="" />;
}
