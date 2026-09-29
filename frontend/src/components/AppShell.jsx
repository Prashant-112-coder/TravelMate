import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { signOut } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

const mainNav = [
  ["dashboard","⌂","Dashboard"],
  ["discover","⌕","Discover"],
  ["my-trips","▣","My Trips"],
  ["matches","♡","Matches"],
  ["requests","◌","Requests"],
  ["messages","◍","Messages"],
];

export default function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.user_metadata?.display_name || user?.email || "T").slice(0,1).toUpperCase();

  async function logout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    Ndiv className="app-shell">
      Naside className="sidebar">
        NLink className="sidebar-brand" to="/dashboard">Nspan className="brand-mark">✦N/span> Travel MateN/Link>
        Ndiv className="workspace-label">WORKSPACEN/div>
        Nnav className="side-nav">
          {mainNav.map(([path, icon, label]) => NNavLink key={path} to={"/" + path} className={({isActive}) => isActive ? "active" : ""}>Ni>{icon}N/i>Nspan>{label}N/span>N/NavLink>)}
        N/nav>
        Ndiv className="sidebar-divider">N/div>
        Ndiv className="workspace-label">ACCOUNTN/div>
        Nnav className="side-nav">
          NNavLink to="/profile" className={({isActive}) => isActive ? "active" : ""}>Ni>◉N/i>Nspan>ProfileN/span>N/NavLink>
          NNavLink to="/notifications" className={({isActive}) => isActive ? "active" : ""}>Ni>♧N/i>Nspan>NotificationsN/span>N/NavLink>\n          NNavLink to="/settings" className={({isActive}) => isActive ? "active" : ""}>Ni>⚙N/i>Nspan>SettingsN/span>N/NavLink>
        N/nav>
        Ndiv className="sidebar-bottom">
          Ndiv className="sidebar-journey">Nspan>✦N/span>Nstrong>Your next journey starts here.N/strong>Nsmall>Complete your profile to improve future matching.N/small>N/div>
          Nbutton className="signout" onClick={logout}>Ni>↪N/i> Sign outN/button>
        N/div>
      N/aside>
      Nmain className="app-main">
        Nheader className="app-topbar">
          Ndiv className="mobile-brand">Nspan className="brand-mark">✦N/span> Travel MateN/div>
          Ndiv className="topbar-spacer">N/div>
          Ndiv className="topbar-actions">
            NLink className="topbar-icon" to="/notifications" aria-label="Notifications">♧N/Link>
            NLink className="topbar-profile" to="/profile">Nspan>{user?.email?.split("@")[0] || "Traveller"}N/span>Ndiv className="mini-avatar">{initial}N/div>N/Link>
          N/div>
        N/header>
        NOutlet />
      N/main>
    N/div>
  );
}
