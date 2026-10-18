import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatRank } from './ranks.js';
import RankEmblem from './RankEmblem.jsx';
import { usePolling } from './usePolling.js';

const REFRESH_INTERVAL = 30_000;
const TEAMS = [
  { id: 100, name: 'Équipe bleue', className: 'team-blue' },
  { id: 200, name: 'Équipe rouge', className: 'team-red' },
];

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Participant({ p }) {
  const games = p.rank ? p.rank.wins + p.rank.losses : 0;
  const winrate = games > 0 ? Math.round((p.rank.wins / games) * 100) : null;

  return (
    <div className={`participant${p.isTracked ? ' tracked' : p.isChallenger ? ' challenger' : ''}`}>
      <img className="champ" src={p.champion.icon} alt={p.champion.name} title={p.champion.name} />
      <span className="loadout">
        {p.spells.map((s, i) =>
          s ? <img key={i} src={s.icon} alt={s.name} title={s.name} /> : <span key={i} className="empty" />
        )}
      </span>
      <span className="loadout">
        {p.keystone ? <img src={p.keystone.icon} alt={p.keystone.name} title={p.keystone.name} /> : <span className="empty" />}
        {p.subStyle ? (
          <img className="substyle" src={p.subStyle.icon} alt={p.subStyle.name} title={p.subStyle.name} />
        ) : (
          <span className="empty" />
        )}
      </span>
      <span className="participant-name">
        <span className="name">{p.riotId}</span>
        <span className="games">{p.champion.name}</span>
      </span>
      <span className="participant-rank">
        <RankEmblem className="emblem-sm" tier={p.rank?.tier} />
        <span>
          <span className="rank-name">{formatRank(p.rank?.tier, p.rank?.rank)}</span>
          {p.rank && <span className="lp">{p.rank.leaguePoints} LP</span>}
        </span>
      </span>
      <span className="participant-wr right">
        {winrate !== null ? (
          <>
            <span className={winrate >= 50 ? 'good' : 'bad'}>{winrate}%</span>
            <span className="games">{games} parties</span>
          </>
        ) : (
          <span className="games">—</span>
        )}
      </span>
    </div>
  );
}

export default function LiveGame() {
  const { gameName, tagLine } = useParams();
  const url = `/api/live/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const { data, error, loading } = usePolling(url, REFRESH_INTERVAL);
  const now = useNow();

  const elapsed = data?.inGame
    ? data.gameStartTime > 0
      ? (now - data.gameStartTime) / 1000
      : data.gameLength
    : 0;

  return (
    <div className="page page-wide">
      <Link className="back" to="/">
        ← Classement
      </Link>

      <header className="header">
        <h1>
          {gameName}
          <span className="tag">#{tagLine}</span>
        </h1>
        {data?.inGame && (
          <p className="subtitle">
            <span className="live-pill">● En direct</span> {data.queueName} ·{' '}
            {data.gameStartTime > 0 ? formatDuration(elapsed) : 'Écran de chargement'}
          </p>
        )}
      </header>

      {error && <div className="error">{error}</div>}
      {!data && loading && <div className="loading">Chargement…</div>}

      {data && !data.inGame && (
        <div className="empty-state">
          {gameName} n’est pas en partie pour le moment.
          <Link to="/">Retour au classement</Link>
        </div>
      )}

      {data?.inGame && (
        <>
          {TEAMS.map((team) => {
            const members = data.participants.filter((p) => p.teamId === team.id);
            const bans = data.bans.filter((b) => b.teamId === team.id);
            if (members.length === 0) return null;
            return (
              <section key={team.id} className={`team ${team.className}`}>
                <div className="team-head">
                  <span>{team.name}</span>
                  {bans.length > 0 && (
                    <span className="bans">
                      Bans
                      {bans.map((b, i) =>
                        b.champion ? (
                          <img key={i} src={b.champion.icon} alt={b.champion.name} title={b.champion.name} />
                        ) : (
                          <span key={i} className="empty" />
                        )
                      )}
                    </span>
                  )}
                </div>
                {members.map((p) => (
                  <Participant key={p.riotId + p.champion.id} p={p} />
                ))}
              </section>
            );
          })}
          <p className="note">
            L’API Riot ne donne pas le score (kills, CS, items) des parties en cours : seuls les champions, sorts,
            runes et rangs sont disponibles.
          </p>
        </>
      )}
    </div>
  );
}
