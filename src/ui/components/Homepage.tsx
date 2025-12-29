import { Counter } from './Counter';

export function Homepage() {
  return (
    <div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Hello World</h1>
      <p style={{ fontSize: '1.125rem', color: '#666', marginBottom: '2rem' }}>
        Welcome to Project Conduit - an event-sourced CMS for LLM-native workflows.
      </p>
      <Counter />
    </div>
  );
}

// Default export for dynamic imports
export default Homepage;
