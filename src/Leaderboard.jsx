import Nav from './Nav.jsx';
import PlayerRow from './PlayerRow.jsx';
import { usePolling } from './usePolling.js';

const REFRESH_INTERVAL = 60_000;

export default function Leaderboard() {
  const { data, error, loading, reload } = usePolling('/api/leaderboard', REFRESH_INTERVAL);

  return (
    <div className="page">
      <Nav />
      <header className="header">
        <h1>SoloQ Challenge</h1>
        <p className="subtitle">Points = LP depuis Fer IV, ajustés par le handicap de chaque joueur</p>
      </header>

      {error && <div className="error">Impossible de charger le classement : {error}</div>}

      {!data && loading && <div className="loading">Chargement…</div>}

      {data && (
        <>
          <div className="board">
            <div className="board-head">
              <span>#</span>
              <span>Joueur</span>
              <span>Rang</span>
              <span className="hide-sm">KDA moyen</span>
              <span className="hide-sm">Winrate · Parties</span>
              <span className="right">Points</span>
            </div>
            {data.players.map((p, i) => (
              <PlayerRow key={p.riotId} player={p} position={i + 1} />
            ))}
          </div>

          <footer className="footer">
            <span>Mis à jour à {new Date(data.updatedAt).toLocaleTimeString('fr-FR')}</span>
            <button onClick={reload} disabled={loading}>
              {loading ? 'Actualisation…' : 'Actualiser'}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
