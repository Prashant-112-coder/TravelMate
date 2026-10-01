import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import ExploreTrips from "./pages/ExploreTrips";
import MyTrips from "./pages/MyTrips";
import CreateTrip from "./pages/CreateTrip";
import Matches from "./pages/Matches";
import Requests from "./pages/Requests";
import Messages from "./pages/Messages";
import TravellerProfile from "./pages/TravellerProfile";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import { useAuth } from "./context/AuthContext";
import "./styles.css";

function Home() {
  const { user } = useAuth();
  return <div className="landing">
    <header className="landing-nav">
      <Link className="landing-brand" to="/"><span className="brand-mark">✦</span> Travel Mate</Link>
      <nav><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#safety">Safety</a></nav>
      <div className="landing-actions"><Link className="nav-login" to={user ? "/dashboard" : "/login"}>{user ? "Dashboard" : "Login"}</Link>{!user&&<Link className="nav-cta" to="/register">Get started →</Link>}</div>
    </header>
    <section className="landing-hero"><div className="hero-copy"><div className="hero-badge">✦ SMART TRAVEL COMPANIONS</div><h1>Find your <em>perfect</em><br/>travel mate.</h1><p>Meet compatible solo travellers based on destination, dates, budget and travel style.</p><div className="hero-actions"><Link className="primary-cta" to={user?"/dashboard":"/register"}>{user?"Open dashboard":"Find travel mates"} →</Link><a className="secondary-cta" href="#how-it-works">See how it works ↓</a></div></div><div className="hero-stage"><div className="hero-image"></div><div className="hero-card"><strong>Compatibility</strong><span>Based on your preferences</span><b>0–100</b></div></div></section>
    <section id="how-it-works" className="landing-section"><span className="section-label">HOW IT WORKS</span><h2>From solo plans to shared journeys.</h2><div className="steps-grid">{["Create your profile","Plan a trip","Discover travellers","Connect safely"].map((x,i)=><article key={x}><span>0{i+1}</span><h3>{x}</h3><p>Build your travel identity and connect with compatible travellers.</p></article>)}</div></section>
    <section id="features" className="landing-section"><span className="section-label">WHY TRAVEL MATE</span><h2>Travel around people who travel like you.</h2><p>Trip planning, discovery, requests, matches and messaging in one place.</p></section>
    <section id="safety" className="landing-cta"><span className="section-label">START YOUR JOURNEY</span><h2>Solo doesn't have to mean alone.</h2><Link className="primary-cta" to={user?"/dashboard":"/register"}>{user?"Go to dashboard":"Create your profile"} →</Link></section>
  </div>;
}

function ShellPage({ children }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/dashboard" element={<ShellPage><Dashboard/></ShellPage>}/>
    <Route path="/explore" element={<ShellPage><ExploreTrips/></ShellPage>}/>
    <Route path="/discover" element={<ShellPage><Discover/></ShellPage>}/>
    <Route path="/my-trips" element={<ShellPage><MyTrips/></ShellPage>}/>
    <Route path="/my-trips/new" element={<ShellPage><CreateTrip/></ShellPage>}/>
    <Route path="/my-trips/edit/:id" element={<ShellPage><CreateTrip/></ShellPage>}/>
    <Route path="/matches" element={<ShellPage><Matches/></ShellPage>}/>
    <Route path="/requests" element={<ShellPage><Requests/></ShellPage>}/>
    <Route path="/messages" element={<ShellPage><Messages/></ShellPage>}/>
    <Route path="/notifications" element={<ShellPage><Notifications/></ShellPage>}/>
    <Route path="/traveller/:id" element={<ShellPage><TravellerProfile/></ShellPage>}/>
    <Route path="/profile" element={<ShellPage><Profile/></ShellPage>}/>
    <Route path="/settings" element={<ShellPage><Settings/></ShellPage>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}
