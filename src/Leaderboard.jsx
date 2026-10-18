import { SectionTitle } from './Ornament.jsx';
import PlayerRow from './PlayerRow.jsx';
import PodiumCard from './PodiumCard.jsx';
import { usePolling } from './usePolling.js';

const REFRESH_INTERVAL = 120_000;
// Ordre d'affichage du podium : 2e, 1er, 3e
const PODIUM_ORDER = [1, 0, 2];

export default function Leaderboard() {
  const { data, error, loading, reload } = usePolling('/api/leaderboard', REFRESH_INTERVAL);
  const players = data?.players ?? [];
  const rest = players.slice(3);

  return (
    <div className="page">
      <SectionTitle eyebrow="Classée Solo/Duo · EUW">Classement</SectionTitle>
      <p className="subtitle">Points = LP depuis Fer IV, ajustés par le handicap de chaque joueur</p>

      {error && <div className="alert">Impossible de charger le classement : {error}</div>}
      {!data && loading && <div className="loading">Invocation des joueurs…</div>}

      {data && (
        <>
          {players.some((p) => p.stale) && (
            <div className="notice">
              L’API Riot est saturée : certains joueurs affichent leurs dernières données connues. Mise à jour
              automatique dans quelques minutes.
            </div>
          )}
          <section className="podium">
            {PODIUM_ORDER.map((i) =>
              players[i] ? <PodiumCard key={players[i].riotId} player={players[i]} position={i + 1} /> : null
            )}
          </section>

          {rest.length > 0 && (
            <div className="board frame">
              <div className="board-head">
                <span>#</span>
                <span>Joueur</span>
                <span>Rang</span>
                <span className="hide-sm">KDA moyen</span>
                <span className="hide-sm">Winrate · Parties</span>
                <span className="right">Points</span>
              </div>
              {rest.map((p, i) => (
                <PlayerRow key={p.riotId} player={p} position={i + 4} />
              ))}
            </div>
          )}

          <footer className="footer">
            <span>Mis à jour à {new Date(data.updatedAt).toLocaleTimeString('fr-FR')}</span>
            <button className="btn-hex" onClick={reload} disabled={loading}>
              {loading ? 'Actualisation…' : 'Actualiser'}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
