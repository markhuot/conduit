import { Helmet } from 'react-helmet-async';

interface LoginFormProps {
  error?: string | null;
  returnTo?: string;
}

export function LoginForm({ error, returnTo }: LoginFormProps) {
  return (
    <>
      <Helmet>
        <title>Admin Login - Project Conduit</title>
      </Helmet>
      
      <div>
        <header>
          <h1>Project Conduit</h1>
          <p>Admin Login</p>
        </header>
        
        {error && (
          <div role="alert">
            {decodeURIComponent(error)}
          </div>
        )}
        
        <form method="POST" action="/admin/login">
          <input type="hidden" name="return" value={returnTo || '/admin/dashboard'} />
          
          <div>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              autoFocus
              autoComplete="username"
            />
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </div>
          
          <button type="submit">Log In</button>
        </form>
        
        <footer>
          <p>Default credentials: <code>admin</code> / <code>admin</code></p>
        </footer>
      </div>
    </>
  );
}
