import { useState } from 'react';

/**
 * Interactive counter component to test client-side hydration
 */
export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: '2rem', border: '2px solid #667eea', borderRadius: '8px', marginTop: '2rem' }}>
      <h2>Hydration Test: Interactive Counter</h2>
      <p style={{ fontSize: '2rem', margin: '1rem 0' }}>Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '0.5rem'
        }}
      >
        Increment
      </button>
      <button 
        onClick={() => setCount(count - 1)}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          background: '#764ba2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '0.5rem'
        }}
      >
        Decrement
      </button>
      <button 
        onClick={() => setCount(0)}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          background: '#999',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Reset
      </button>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        {count === 0 
          ? '✅ If these buttons work, hydration is successful!' 
          : '✅ Hydration working! Client-side state is active.'}
      </p>
    </div>
  );
}

export default Counter;
