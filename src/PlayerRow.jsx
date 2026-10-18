import { Link } from 'react-router-dom';
import { formatRank, liveGamePath, opggUrl, profileIconUrl } from './ranks.js';
import RankEmblem from './RankEmblem.jsx';

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

export default function PlayerRow({ player, position }) {
  const games = (player.wins ?? 0) + (player.losses ?? 0);
  const winrate = games > 0 ? Math.round((player.wins / games) * 100) : null;
  const { kda, inGame } = player;

  return (
    <div className={`row pos-${position}`}>
      <span className="position">{position}</span>

      <span className="player">
        <span className="icon-wrap">
          <img className="icon" src={profileIconUrl(player.profileIconId)} alt="" />
          {inGame && <span className="live-dot" />}
        </span>
        <span className="player-info">
          <a className="name" href={opggUrl(player.gameName, player.tagLine)} target="_blank" rel="noreferrer">
            {player.gameName}
            <span className="tag">#{player.tagLine}</span>
          </a>
          {inGame && (
            <Link className="live-badge" to={liveGamePath(player.gameName, player.tagLine)}>
              {inGame.champion && <img src={inGame.champion.icon} alt="" />}
              En game{inGame.champion ? ` · ${inGame.champion.name}` : ''}
            </Link>
          )}
        </span>
      </span>

      <span className="rank">
        {player.error ? (
          <span className="row-error">{player.error}</span>
        ) : (
          <>
            <RankEmblem className="emblem" tier={player.tier} />
            <span>
              <span className="rank-name">{formatRank(player.tier, player.rank)}</span>
              {player.tier && <span className="lp">{player.leaguePoints} LP</span>}
            </span>
          </>
        )}
      </span>

      <span className="kda hide-sm">
        {kda ? (
          <>
            <span className="kda-line">
              {kda.kills.toFixed(1)} / <span className="bad">{kda.deaths.toFixed(1)}</span> / {kda.assists.toFixed(1)}
            </span>
            <span className="games">
              <span className={kdaClass(kda.ratio)}>{kda.ratio.toFixed(2)}</span> KDA · {kda.games} parties
            </span>
          </>
        ) : (
          <span className="games">—</span>
        )}
      </span>

      <span className="winrate hide-sm">
        {winrate !== null ? (
          <>
            <span>
              <span className={winrate >= 50 ? 'good' : 'bad'}>{winrate}%</span>
              <span className="games"> · {games} parties</span>
            </span>
            <span className="games">
              {player.wins}V {player.losses}D
            </span>
          </>
        ) : (
          <span className="games">{player.error ? '—' : '0 partie'}</span>
        )}
      </span>

      <span className="points right">
        <span className="total">{player.totalPoints}</span>
        <span className="breakdown">
          {player.basePoints}{' '}
          <span className={player.adjustment >= 0 ? 'good' : 'bad'}>{formatAdjustment(player.adjustment)}</span>
        </span>
      </span>
    </div>
  );
}
