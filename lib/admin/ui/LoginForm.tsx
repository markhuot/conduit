import { Helmet } from 'react-helmet-async';
import { useFlash } from '../../router/react/hooks';

interface LoginFormProps {
  returnTo?: string;
}

export function LoginForm({ returnTo }: LoginFormProps) {
  const flash = useFlash();
  
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
        
        {flash?.error && (
          <div role="alert">
            {flash.error}
          </div>
        )}
        
        {flash?.success && (
          <div role="status">
            {flash.success}
          </div>
        )}
        
        <form method="POST" action="/admin/login">
          <input type="hidden" name="return" value={returnTo || '/admin/dashboard'} />
          
          <div>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoFocus
              autoComplete="email"
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
          <p>Don't have an account? <a href="/admin/register">Register</a></p>
        </footer>
      </div>
    </>
  );
}
