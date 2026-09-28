import "./styles.css";

function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">TRAVEL MATE</p>
        <h1>A Smart Traveller Matching Platform for Solo Travellers</h1>
        <p className="lead">
          A secure platform for discovering compatible travel partners through
          explainable matching.
        </p>
        <div className="architecture">
          <span>User / Presentation</span>
          <span>Application / Business Logic</span>
          <span>Data / Intelligence</span>
          <span>Storage / Infrastructure</span>
        </div>
      </section>
    </main>
  );
}

export default App;
