import { Avatar, KdaBlock, LiveBadge, PlayerName, Points, RankBlock, WinrateBlock } from './PlayerRow.jsx';

const ROMAN = ['I', 'II', 'III'];

export default function PodiumCard({ player, position }) {
  return (
    <article className={`podium-card frame podium-${position}`}>
      <span className="podium-rank" aria-label={`Position ${position}`}>
        {ROMAN[position - 1]}
      </span>
      <Avatar player={player} size="avatar-lg" />
      <PlayerName player={player} />
      <LiveBadge player={player} />
      <RankBlock player={player} emblemClass="emblem-lg" />
      <Points player={player} />
      <div className="podium-stats">
        <div>
          <span className="label">KDA</span>
          <KdaBlock kda={player.kda} />
        </div>
        <div>
          <span className="label">Winrate</span>
          <WinrateBlock player={player} />
        </div>
      </div>
    </article>
  );
}
