import { NavLink } from 'react-router-dom';
import { HexLogo } from './Ornament.jsx';

export default function Nav() {
  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" className="brand">
          <HexLogo />
          <span>
            SoloQ <strong>Challenge</strong>
          </span>
        </NavLink>
        <div className="tabs">
          <NavLink to="/" end>
            Classement
          </NavLink>
          <NavLink to="/stats">Statistiques</NavLink>
        </div>
      </div>
    </nav>
  );
}
