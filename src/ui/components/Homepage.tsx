import { useState, useEffect } from 'react';

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
    <div>
      <div>
        <header>
          <h1>⚡ Project Conduit</h1>
          <p>Event-sourced CMS for LLM-native workflows</p>
        </header>

        <section>
          <h2>API Information</h2>
          
          {loading && (
            <div>
              <div></div>
              <p>Loading API information...</p>
            </div>
          )}

          {error && (
            <div>
              <p>❌ {error}</p>
              <button onClick={fetchApiInfo}>
                Retry
              </button>
            </div>
          )}

          {apiInfo && !loading && (
            <div>
              <div>
                <span>Name:</span>
                <span>{apiInfo.name}</span>
              </div>
              <div>
                <span>Version:</span>
                <span>{apiInfo.version}</span>
              </div>
              <div>
                <span>Description:</span>
                <span>{apiInfo.description}</span>
              </div>
              
              <div>
                <h3>Available Routes:</h3>
                <ul>
                  {Object.entries(apiInfo.routes).map(([name, path]) => (
                    <li key={name}>
                      <code>{path}</code>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2>Features</h2>
          <div>
            <div>
              <div>📝</div>
              <h3>Event Sourcing</h3>
              <p>Immutable event log as the source of truth</p>
            </div>
            <div>
              <div>🤖</div>
              <h3>LLM-First Design</h3>
              <p>Optimized for AI agent interactions</p>
            </div>
            <div>
              <div>🔌</div>
              <h3>Extensible Listeners</h3>
              <p>Subscribe to events and build custom workflows</p>
            </div>
            <div>
              <div>⚡</div>
              <h3>Fast & Modern</h3>
              <p>Built with Bun, TypeScript, and React</p>
            </div>
          </div>
        </section>

        <footer>
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
