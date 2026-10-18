import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Leaderboard from './Leaderboard.jsx';
import LiveGame from './LiveGame.jsx';
import StatsPage from './StatsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/game/:gameName/:tagLine" element={<LiveGame />} />
      </Routes>
    </BrowserRouter>
  );
}
