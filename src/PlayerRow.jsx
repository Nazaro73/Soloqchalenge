import { Link } from 'react-router-dom';
import { formatRank, liveGamePath, opggUrl, profileIconUrl, tierClass } from './ranks.js';
import RankEmblem from './RankEmblem.jsx';

const PLACEMENT_GAMES = 5;

function formatAdjustment(n) {
  if (n === 0) return '±0';
  return n > 0 ? `+${n}` : `${n}`;
}

function kdaClass(ratio) {
  if (ratio >= 4) return 'kda-great';
  if (ratio >= 3) return 'good';
  if (ratio < 2) return 'bad';
  return '';
}

export function Avatar({ player, size = '' }) {
  return (
    <span className={`avatar ${size}`}>
      <img src={profileIconUrl(player.profileIconId)} alt="" />
      {player.inGame && <span className="live-dot" title="En game" />}
    </span>
  );
}

export function PlayerName({ player }) {
  return (
    <span className="player-name">
      <a className="name" href={opggUrl(player.gameName, player.tagLine)} target="_blank" rel="noreferrer">
        {player.gameName}
        <span className="tag">#{player.tagLine}</span>
      </a>
      {player.realName && <span className="real-name">{player.realName}</span>}
    </span>
  );
}

export function LiveBadge({ player }) {
  const { inGame } = player;
  if (!inGame) return null;
  return (
    <Link className="live-badge" to={liveGamePath(player.gameName, player.tagLine)}>
      {inGame.champion && <img src={inGame.champion.icon} alt="" />}
      <span>En game{inGame.champion ? ` · ${inGame.champion.name}` : ''}</span>
    </Link>
  );
}

export function RankBlock({ player, emblemClass = 'emblem' }) {
  if (player.error) return <span className="row-error">{player.error}</span>;
  // Pas encore de rang mais des parties jouées : le joueur est en placements
  const placements = !player.tier && player.record ? Math.min(player.record.games, PLACEMENT_GAMES) : 0;
  return (
    <span className="rank">
      <RankEmblem className={emblemClass} tier={player.tier} />
      <span>
        <span className={`rank-name ${tierClass(player.tier)}`}>
          {placements > 0 ? 'Placements' : formatRank(player.tier, player.rank)}
        </span>
        {player.tier && <span className="lp">{player.leaguePoints} LP</span>}
        {placements > 0 && (
          <span className="lp">
            {placements}/{PLACEMENT_GAMES}
          </span>
        )}
      </span>
    </span>
  );
}

export function KdaBlock({ kda }) {
  if (!kda) return <span className="muted">—</span>;
  return (
    <span className="stack">
      <span className="kda-line">
        {kda.kills.toFixed(1)} / <span className="bad">{kda.deaths.toFixed(1)}</span> / {kda.assists.toFixed(1)}
      </span>
      <span className="muted small">
        <span className={kdaClass(kda.ratio)}>{kda.ratio.toFixed(2)}</span> KDA
      </span>
    </span>
  );
}

// Bilan sur les parties du challenge (placements compris), sinon celui de Riot pour la saison
export function WinrateBlock({ player }) {
  if (player.error) return <span className="muted">—</span>;
  const { games, wins, losses } = player.record ?? {
    games: (player.wins ?? 0) + (player.losses ?? 0),
    wins: player.wins ?? 0,
    losses: player.losses ?? 0,
  };
  if (games === 0) return <span className="muted">0 partie</span>;
  const winrate = Math.round((wins / games) * 100);
  return (
    <span className="stack">
      <span>
        <span className={winrate >= 50 ? 'good' : 'bad'}>{winrate}%</span>
        <span className="muted">
          {' '}
          · {games} partie{games > 1 ? 's' : ''}
        </span>
      </span>
      <span className="muted small">
        {wins}V {losses}D
      </span>
    </span>
  );
}

export function Points({ player }) {
  return (
    <span className="points">
      <span className="total">{player.totalPoints}</span>
      <span className="muted small">
        {player.basePoints}{' '}
        <span className={player.adjustment >= 0 ? 'good' : 'bad'}>{formatAdjustment(player.adjustment)}</span>
      </span>
    </span>
  );
}

export default function PlayerRow({ player, position }) {
  return (
    <div className="row">
      <span className="position">{position}</span>
      <span className="player">
        <Avatar player={player} />
        <span className="player-info">
          <PlayerName player={player} />
          <LiveBadge player={player} />
        </span>
      </span>
      <RankBlock player={player} />
      <span className="hide-sm">
        <KdaBlock kda={player.kda} />
      </span>
      <span className="hide-sm">
        <WinrateBlock player={player} />
      </span>
      <span className="right">
        <Points player={player} />
      </span>
    </div>
  );
}
