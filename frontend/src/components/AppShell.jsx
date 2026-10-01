import { NavLink, Link, useNavigate } from "react-router-dom";
import { signOut } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

const mainNav=[
  ["dashboard","⌂","Dashboard"],
  ["explore","⌖","Explore Trips"],
  ["discover","⌕","Find Travel Mates"],
  ["my-trips","▣","My Trips"],
  ["matches","♡","Matches"],
  ["requests","◌","Requests"],
  ["messages","◍","Messages"]
];

export default function AppShell({ children }){
 const {user}=useAuth(); const navigate=useNavigate();
 const initial=(user?.user_metadata?.display_name||user?.email||"T").slice(0,1).toUpperCase();
 async function logout(){await signOut();navigate("/login",{replace:true});}
 return <div className="app-shell">
  <aside className="sidebar">
   <Link className="sidebar-brand" to="/dashboard">
  <span className="travel-mate-logo dashboard-travel-logo" aria-hidden="true">
    <svg viewBox="0 0 64 64">
      <path d="M32 4C18.7 4 8 14.7 8 28c0 17.1 24 32 24 32s24-14.9 24-32C56 14.7 45.3 4 32 4Z" fill="url(#tmDashboardLogoGradient)"/>
      <path d="M18 37 27 27l7 7 6-8 9 11H18Z" fill="#fff" opacity=".96"/>
      <path d="M39 18c6 1 9 4 11 9-5-2-9-2-13 0 1-3 1-6 2-9Z" fill="#fff"/>
      <circle cx="31" cy="28" r="2.8" fill="#fff"/>
      <defs>
        <linearGradient id="tmDashboardLogoGradient" x1="10" y1="8" x2="54" y2="55" gradientUnits="userSpaceOnUse">
          <stop stop-color="#1677d2"/>
          <stop offset=".55" stop-color="#13a78b"/>
          <stop offset="1" stop-color="#f2a623"/>
        </linearGradient>
      </defs>
    </svg>
  </span>
  <span className="travel-brand-copy"><strong>Travel Mate</strong><small>Find People. Explore Together.</small></span>
</Link>
   <div className="workspace-label">WORKSPACE</div>
   <nav className="side-nav">{mainNav.map(([path,icon,label])=><NavLink key={path} to={"/"+path} className={({isActive})=>isActive?"active":""}><i>{icon}</i><span>{label}</span></NavLink>)}</nav>
   <div className="sidebar-divider"/>
   <div className="workspace-label">ACCOUNT</div>
   <nav className="side-nav">
    <NavLink to="/profile" className={({isActive})=>isActive?"active":""}><i>◉</i><span>Profile</span></NavLink>
    <NavLink to="/notifications" className={({isActive})=>isActive?"active":""}><i>♧</i><span>Notifications</span></NavLink>
    <NavLink to="/settings" className={({isActive})=>isActive?"active":""}><i>⚙</i><span>Settings</span></NavLink>
   </nav>
   <div className="sidebar-bottom">
  <div className="sidebar-journey">
    <span>➤</span>
    <strong>Your next journey starts here.</strong>
    <small>Complete your profile to unlock better matches.</small>
    <Link to="/profile">Complete Profile →</Link>
  </div>
  <button className="signout" onClick={logout}>↪ Sign out</button>
</div>
  </aside>
  <main className="app-main">
   <header className="app-topbar"><div className="mobile-brand"><span className="brand-mark">✦</span> Travel Mate</div><div className="topbar-spacer"/><div className="topbar-actions"><Link className="topbar-icon" to="/notifications">♧</Link><Link className="topbar-profile" to="/profile"><span>{user?.user_metadata?.display_name||user?.email?.split("@")[0]||"Traveller"}</span><div className="mini-avatar">{initial}</div></Link></div></header>
   {children}
  </main>
 </div>;
}
