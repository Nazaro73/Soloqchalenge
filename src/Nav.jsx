import { NavLink } from 'react-router-dom';

export default function Nav() {
  return (
    <nav className="nav">
      <NavLink to="/" end>
        Classement
      </NavLink>
      <NavLink to="/stats">Statistiques</NavLink>
    </nav>
  );
}
