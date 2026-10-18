import { SectionTitle } from './Ornament.jsx';
import { profileIconUrl } from './ranks.js';
import { formatDate, formatDecimal, formatInt, formatPercent, formatPlaytime, plural } from './format.js';
import { usePolling } from './usePolling.js';

const REFRESH_INTERVAL = 120_000;

const RANKINGS = [
  { key: 'kda', title: 'KDA', format: formatDecimal },
  { key: 'kills', title: 'Kills', format: formatInt },
  { key: 'deaths', title: 'Deaths', format: formatInt },
  { key: 'assists', title: 'Assists', format: formatInt },
  { key: 'csPerMin', title: 'CS/min', format: formatDecimal },
  { key: 'soloKills', title: 'Solo kills', format: formatInt },
  { key: 'winStreak', title: 'La plus longue winstreak', format: formatInt },
  { key: 'pings', title: 'Accro aux pings', format: formatInt },
  { key: 'flash', title: 'Flash', format: formatInt },
  { key: 'controlWards', title: 'Le plus de control wards placées', format: formatInt },
  { key: 'ffLosses', title: 'Le plus de games perdues par FF', format: formatInt },
  { key: 'timePlayed', title: 'Le plus de temps dans la faille', format: formatPlaytime },
];

const ROLES = {
  TOP: { label: 'top', icon: 'top' },
  JUNGLE: { label: 'jungle', icon: 'jungle' },
  MIDDLE: { label: 'mid', icon: 'middle' },
  BOTTOM: { label: 'adc', icon: 'bottom' },
  UTILITY: { label: 'support', icon: 'utility' },
};

const roleIcon = (icon) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-${icon}.png`;

// Avatar + position actuelle au classement, comme sur la page principale
function PlayerTag({ entry, board }) {
  const index = board.findIndex((p) => p.riotId === entry.riotId);
  const info = board[index];
  return (
    <span className="stat-player">
      <span className="avatar avatar-sm">
        <img src={profileIconUrl(info?.profileIconId)} alt="" />
        {index >= 0 && (
          <span className="board-pos" title={`${index + 1}e au classement`}>
            {index + 1}
          </span>
        )}
      </span>
      <span className="name">{entry.gameName}</span>
    </span>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`card frame ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="card-empty">Pas encore de données</p>;
}

function RankingCard({ title, entries, format, board }) {
  return (
    <Card title={title}>
      {entries.length === 0 ? (
        <Empty />
      ) : (
        <ol className="ranking">
          {entries.map((e, i) => (
            <li key={e.riotId} className={i === 0 ? 'first' : ''}>
              <PlayerTag entry={e} board={board} />
              <span className="ranking-value">
                <span className="value">{format(e.value)}</span>
                <span className="games">{plural(e.games, 'game')}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function ChampionChip({ champion, children }) {
  return (
    <span className="champ-chip">
      <img src={champion.icon} alt="" />
      <span>
        <span className="name">{champion.name}</span>
        {children && <span className="games">{children}</span>}
      </span>
    </span>
  );
}

export default function StatsPage() {
  const stats = usePolling('/api/stats', REFRESH_INTERVAL);
  const leaderboard = usePolling('/api/leaderboard', REFRESH_INTERVAL);
  const data = stats.data;
  const board = leaderboard.data?.players ?? [];

  return (
    <div className="page page-wide">
      <SectionTitle eyebrow="Le challenge en chiffres">Statistiques</SectionTitle>
      <p className="subtitle">
        Parties classées solo depuis le {data ? formatDate(data.challengeStart) : '…'}, remakes exclus
      </p>

      {stats.error && <div className="alert">Impossible de charger les statistiques : {stats.error}</div>}
      {!data && stats.loading && (
        <div className="loading">Analyse des parties… (la première synchro peut prendre un moment)</div>
      )}

      {data && (
        <>
          {data.pending > 0 && (
            <div className="notice">
              Synchronisation en cours : {plural(data.pending, 'partie')} encore à récupérer. Les stats se complètent
              automatiquement.
            </div>
          )}

          <div className="global-stats">
            <div className="frame">
              <span className="big">{formatInt(data.global.games)}</span>
              <span>games</span>
            </div>
            <div className="frame">
              <span className="big good">{formatInt(data.global.wins)}</span>
              <span>victoires</span>
            </div>
            <div className="frame">
              <span className="big bad">{formatInt(data.global.losses)}</span>
              <span>défaites</span>
            </div>
            <div className="frame">
              <span className="big">{formatPlaytime(data.global.timePlayed)}</span>
              <span>de jeu</span>
            </div>
          </div>

          <div className="cards">
            {RANKINGS.slice(0, 5).map((r) => (
              <RankingCard key={r.key} {...r} entries={data.rankings[r.key]} board={board} />
            ))}

            <Card title="Winrate par rôle">
              {data.roles.length === 0 ? (
                <Empty />
              ) : (
                <ul className="roles">
                  {data.roles.map((r) => (
                    <li key={r.role}>
                      <img src={roleIcon(ROLES[r.role].icon)} alt="" />
                      <span className="name">{ROLES[r.role].label}</span>
                      <span className="role-bar">
                        <span style={{ width: `${r.winrate * 100}%` }} />
                      </span>
                      <span className="ranking-value">
                        <span className={`value ${r.winrate >= 0.5 ? 'good' : 'bad'}`}>{formatPercent(r.winrate)}</span>
                        <span className="games">
                          {r.wins} - {r.losses}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Dernier pentakill">
              {data.lastPentakill ? (
                <div className="spotlight">
                  <PlayerTag entry={data.lastPentakill} board={board} />
                  <span className="games">le {formatDate(data.lastPentakill.date)}</span>
                  <ChampionChip champion={data.lastPentakill.champion}>avec</ChampionChip>
                </div>
              ) : (
                <p className="card-empty">Personne n’a encore fait de pentakill</p>
              )}
            </Card>

            <Card title="Le One Trick Pony">
              {data.oneTrick ? (
                <div className="spotlight">
                  <PlayerTag entry={data.oneTrick} board={board} />
                  <span className="games">a joué {plural(data.oneTrick.games, 'fois')}</span>
                  <ChampionChip champion={data.oneTrick.champion} />
                </div>
              ) : (
                <Empty />
              )}
            </Card>

            <Card title="La meta du challenge" className="card-wide">
              {data.meta.length === 0 ? (
                <Empty />
              ) : (
                <div className="meta">
                  {data.meta.map((m) => (
                    <ChampionChip key={m.champion.id} champion={m.champion}>
                      {plural(m.games, 'game')}
                    </ChampionChip>
                  ))}
                </div>
              )}
            </Card>

            {RANKINGS.slice(5).map((r) => (
              <RankingCard key={r.key} {...r} entries={data.rankings[r.key]} board={board} />
            ))}

            <Card title="La plus grande champion pool" className="card-wide">
              {data.championPool ? (
                <>
                  <div className="spotlight spotlight-row">
                    <PlayerTag entry={data.championPool} board={board} />
                    <span className="games">avec {plural(data.championPool.count, 'champion')} joués</span>
                  </div>
                  <div className="pool">
                    {data.championPool.champions.map((c) => (
                      <img key={c.id} src={c.icon} alt={c.name} title={c.name} />
                    ))}
                  </div>
                </>
              ) : (
                <Empty />
              )}
            </Card>

            <Card title="Adieu Jean-Michel">
              <div className="spotlight">
                <span className="big">{formatInt(data.global.scuttles)}</span>
                <span className="games">carapateurs ont été tués pendant ce challenge</span>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
