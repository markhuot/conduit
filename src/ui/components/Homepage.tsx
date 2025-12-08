import { useState, useEffect } from 'react';
import './Homepage.css';

interface ApiInfo {
  name: string;
  version: string;
  description: string;
  routes: Record<string, string>;
}

export function Homepage() {
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApiInfo();
  }, []);

  const fetchApiInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch API info from /api/info endpoint
      // In development: direct call to backend
      // In production: same origin
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/info'
        : '/api/info';
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as ApiInfo;
      setApiInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API info');
      console.error('Failed to fetch API info:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="homepage">
      <div className="container">
        <header className="header">
          <h1 className="title">⚡ Project Conduit</h1>
          <p className="subtitle">Event-sourced CMS for LLM-native workflows</p>
        </header>

        <section className="info-card">
          <h2 className="section-title">API Information</h2>
          
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading API information...</p>
            </div>
          )}

          {error && (
            <div className="error">
              <p>❌ {error}</p>
              <button onClick={fetchApiInfo} className="retry-button">
                Retry
              </button>
            </div>
          )}

          {apiInfo && !loading && (
            <div className="api-info">
              <div className="info-row">
                <span className="label">Name:</span>
                <span className="value">{apiInfo.name}</span>
              </div>
              <div className="info-row">
                <span className="label">Version:</span>
                <span className="value">{apiInfo.version}</span>
              </div>
              <div className="info-row">
                <span className="label">Description:</span>
                <span className="value">{apiInfo.description}</span>
              </div>
              
              <div className="routes-section">
                <h3 className="routes-title">Available Routes:</h3>
                <ul className="routes-list">
                  {Object.entries(apiInfo.routes).map(([name, path]) => (
                    <li key={name} className="route-item">
                      <code className="route-path">{path}</code>
                      <span className="route-name">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <section className="features">
          <h2 className="section-title">Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Event Sourcing</h3>
              <p>Immutable event log as the source of truth</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>LLM-First Design</h3>
              <p>Optimized for AI agent interactions</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔌</div>
              <h3>Extensible Listeners</h3>
              <p>Subscribe to events and build custom workflows</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Fast & Modern</h3>
              <p>Built with Bun, TypeScript, and React</p>
            </div>
          </div>
        </section>

        <footer className="footer">
          <p>
            Built with ❤️ using{' '}
            <a href="https://bun.sh" target="_blank" rel="noopener noreferrer">
              Bun
            </a>
            ,{' '}
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
              React
            </a>
            , and{' '}
            <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">
              Vite
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
