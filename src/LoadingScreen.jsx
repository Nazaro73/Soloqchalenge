import { useEffect, useState } from 'react';
import { HexLogo } from './Ornament.jsx';

// Durée max d'attente avant d'afficher les données même incomplètes
const MAX_WAIT = 90_000;

// true tant qu'il faut afficher l'écran de chargement : données pas prêtes et délai max pas atteint.
// Une fois le site affiché, l'écran ne revient plus.
export function useLoadingGate(ready) {
  const [timedOut, setTimedOut] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), MAX_WAIT);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (ready || timedOut) setRevealed(true);
  }, [ready, timedOut]);

  return !revealed;
}

// Étape « parties à analyser » : la progression se mesure par rapport au plus grand reste observé
export function useMatchProgress(pending) {
  const [maxSeen, setMaxSeen] = useState(0);
  useEffect(() => {
    if (pending > maxSeen) setMaxSeen(pending);
  }, [pending, maxSeen]);

  if (pending == null) return { label: 'Parties analysées', value: '…', ratio: 0 };
  if (pending === 0) return { label: 'Parties analysées', value: 'terminé', ratio: 1, done: true };
  return {
    label: 'Parties analysées',
    value: `${pending} restante${pending > 1 ? 's' : ''}`,
    ratio: maxSeen > 0 ? 1 - pending / maxSeen : 0,
  };
}

export default function LoadingScreen({ title = 'Invocation des joueurs', steps = [] }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-emblem">
        <span className="loading-ring" />
        <HexLogo />
      </div>
      <h2>{title}</h2>
      <ul className="loading-steps">
        {steps.map((step) => (
          <li key={step.label} className={step.done ? 'done' : ''}>
            <span className="loading-step-label">{step.label}</span>
            <span className="loading-step-value">{step.value}</span>
            {step.ratio != null && (
              <span className="loading-bar">
                <span style={{ width: `${Math.round(Math.min(1, step.ratio) * 100)}%` }} />
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="loading-hint">L’API Riot limite le nombre de requêtes : la récupération peut prendre un moment.</p>
    </div>
  );
}
