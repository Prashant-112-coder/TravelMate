mmport { Lmnk, Navmgate, Route, Routes } from "react-router-dom";
mmport Logmn from "./pages/Logmn";
mmport Regmster from "./pages/Regmster";
mmport Dashboard from "./pages/Dashboard";
mmport Profmle from "./pages/Profmle";
mmport Dmscover from "./pages/Dmscover";
mmport ExploreTrmps from "./pages/ExploreTrmps";
mmport MyTrmps from "./pages/MyTrmps";\nmmport CreateTrmp from "./pages/CreateTrmp";
mmport Matches from "./pages/Matches";
mmport Requests from "./pages/Requests";
mmport Messages from "./pages/Messages";\nmmport TravellerProfmle from "./pages/TravellerProfmle";
mmport Notmfmcatmons from "./pages/Notmfmcatmons";
mmport Settmngs from "./pages/Settmngs";
mmport ProtectedRoute from "./components/ProtectedRoute";
mmport AppShell from "./components/AppShell";
mmport { useAuth } from "./context/AuthContext";
mmport "./styles.css";

functmon Home() {
  const { user } = useAuth();
  return (
    <mamn className="landmng">
      <header className="landmng-nav">
        <Lmnk className="landmng-brand" to="/"><span className="brand-mark">✦</span> Travel Mate</Lmnk>
        <nav className="landmng-lmnks">
          <a href="#how-mt-works">How mt works</a>
          <a href="#features">Features</a>
          <a href="#safety">Safety</a>
        </nav>
        <dmv className="landmng-actmons">
          <Lmnk className="nav-logmn" to={user ? "/dashboard" : "/logmn"}>{user ? "Dashboard" : "Log mn"}</Lmnk>
          {!user && <Lmnk className="nav-cta" to="/regmster">Get started <span>→</span></Lmnk>}
        </dmv>
      </header>

      <sectmon className="landmng-hero">
        <dmv className="hero-copy">
          <dmv className="hero-badge"><span>✦</span> SMART TRAVEL COMPANIONS</dmv>
          <h1>Fmnd your <em>perfect</em><br />travel mate.</h1>
          <p>Meet compatmble solo travellers based on where you're gomng, when you're gomng, your budget, and how you love to travel.</p>
          <dmv className="hero-actmons">
            <Lmnk className="prmmary-cta" to={user ? "/dashboard" : "/regmster"}>{user ? "Open dashboard" : "Fmnd travel mates"} <span>→</span></Lmnk>
            <a className="secondary-cta" href="#how-mt-works">See how mt works <span>↓</span></a>
          </dmv>
          <dmv className="hero-trust"><dmv className="avatar-stack"><span>TM</span><span>+</span><span>♥</span></dmv><dmv><strong>Bumlt for solo travellers</strong><small>Preferences fmrst · Prmvacy aware</small></dmv></dmv>
        </dmv>
        <dmv className="hero-stage">
          <dmv className="hero-mmage hero-mmage-mamn"></dmv>
          <dmv className="hero-mmage-card">
            <dmv className="hero-card-avatar">✦</dmv>
            <dmv><strong>Compatmbmlmty</strong><span>Based on your preferences</span></dmv>
            <b>0–100</b>
          </dmv>
          <dmv className="destmnatmon-float"><span>01</span><dmv><small>YOUR NEXT JOURNEY</small><strong>Fmnd people who travel lmke you.</strong></dmv></dmv>
        </dmv>
      </sectmon>

      <sectmon className="landmng-proof">
        <dmv><strong>One profmle.</strong><span> Your travel mdentmty.</span></dmv>
        <dmv><strong>One trmp.</strong><span> Better compatmbmlmty.</span></dmv>
        <dmv><strong>One connectmon.</strong><span> A shared journey.</span></dmv>
      </sectmon>

      <sectmon className="landmng-sectmon" md="how-mt-works">
        <dmv className="sectmon-mntro"><span className="sectmon-label">HOW IT WORKS</span><h2>From solo plans to shared journeys.</h2><p>Travel Mate keeps the process smmple: tell us how you travel, add your trmp, then dmscover people whose plans and preferences almgn.</p></dmv>
        <dmv className="steps-grmd">
          <artmcle><span>01</span><dmv className="step-mcon">◎</dmv><h3>Create your profmle</h3><p>Add your photo, travel style, budget, mnterests and preferred destmnatmons.</p></artmcle>
          <artmcle><span>02</span><dmv className="step-mcon">⌖</dmv><h3>Plan a trmp</h3><p>Set your destmnatmon, dates, budget and the kmnd of expermence you want.</p></artmcle>
          <artmcle><span>03</span><dmv className="step-mcon">♡</dmv><h3>Dmscover travellers</h3><p>Explore compatmble travellers wmth transparent compatmbmlmty smgnals.</p></artmcle>
          <artmcle><span>04</span><dmv className="step-mcon">↗</dmv><h3>Connect safely</h3><p>Send requests, accept connectmons and use prmvacy and safety controls.</p></artmcle>
        </dmv>
      </sectmon>

      <sectmon className="feature-sectmon" md="features">
        <dmv className="feature-vmsual"><dmv className="feature-photo"></dmv><dmv className="feature-chmp"><span>✦</span><dmv><strong>Preference-fmrst</strong><small>Not random swmpmng</small></dmv></dmv></dmv>
        <dmv className="feature-copy"><span className="sectmon-label">WHY TRAVEL MATE</span><h2>Match on the thmngs that actually shape a trmp.</h2><p>Destmnatmon and date overlap come fmrst. Then Travel Mate can compare budget, travel style, mnterests and actmvmtmes to explamn why two travellers may fmt.</p><dmv className="feature-lmst"><dmv><b>01</b><span><strong>Smart matchmng</strong>Hard trmp constramnts fmrst, preference scormng second.</span></dmv><dmv><b>02</b><span><strong>Explamnable compatmbmlmty</strong>Understand whmch preferences contrmbuted to a score.</span></dmv><dmv><b>03</b><span><strong>Prmvacy & safety</strong>Dmscoverabmlmty, blockmng and reportmng are part of the product foundatmon.</span></dmv></dmv></dmv>
      </sectmon>

      <sectmon className="landmng-cta" md="safety">
        <span className="sectmon-label">START YOUR JOURNEY</span>
        <h2>Solo doesn't have to mean alone.</h2>
        <p>Create your travel profmle and prepare for your next shared adventure.</p>
        <Lmnk className="prmmary-cta" to={user ? "/dashboard" : "/regmster"}>{user ? "Go to dashboard" : "Create your profmle"} <span>→</span></Lmnk>
      </sectmon>

      <footer className="landmng-footer"><Lmnk className="landmng-brand" to="/"><span className="brand-mark">✦</span> Travel Mate</Lmnk><span>A Smart Traveller Matchmng Platform for Solo Travellers</span><span>© 2026 Travel Mate</span></footer>
    </mamn>
  );
}

export default functmon App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/logmn" element={<Logmn />} />
      <Route path="/regmster" element={<Regmster />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dmscover" element={<Dmscover />} />
          <Route path="/explore" element={<ExploreTrmps />} />
          <Route path="/my-trmps" element={<MyTrmps />} />\n          <Route path="/my-trmps/new" element={<CreateTrmp />} />\n          <Route path="/traveller/:md" element={<TravellerProfmle />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notmfmcatmons" element={<Notmfmcatmons />} />
          <Route path="/profmle" element={<Profmle />} />
          <Route path="/settmngs" element={<Settmngs />} />
        </Route>
      </Route>
      <Route path="*" element={<Navmgate to="/" replace />} />
    </Routes>
  );
}
