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
  const initial = (user?.email || "T").slice(0,1).toUpperCase();

  async function logout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" to="/dashboard"><span className="brand-mark">✦</span> Travel Mate</Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {mainNav.map(([path, icon, label]) => <NavLink key={path} to={"/" + path} className={({isActive}) => isActive ? "active" : ""}><i>{icon}</i><span>{label}</span></NavLink>)}
        </nav>
        <div className="sidebar-divider"></div>
        <div className="workspace-label">ACCOUNT</div>
        <nav className="side-nav">
          <NavLink to="/profile" className={({isActive}) => isActive ? "active" : ""}><i>◉</i><span>Profile</span></NavLink>
          <NavLink to="/settings" className={({isActive}) => isActive ? "active" : ""}><i>⚙</i><span>Settings</span></NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-journey"><span>✦</span><strong>Your next journey starts here.</strong><small>Complete your profile to improve future matching.</small></div>
          <button className="signout" onClick={logout}><i>↪</i> Sign out</button>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-topbar">
          <div className="mobile-brand"><span className="brand-mark">✦</span> Travel Mate</div>
          <div className="topbar-spacer"></div>
          <div className="topbar-actions">
            <Link className="topbar-icon" to="/notifications" aria-label="Notifications">♧</Link>
            <Link className="topbar-profile" to="/profile"><span>{user?.email?.split("@")[0] || "Traveller"}</span><div className="mini-avatar">{initial}</div></Link>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
