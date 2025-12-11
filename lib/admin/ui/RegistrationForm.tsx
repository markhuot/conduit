import { Helmet } from 'react-helmet-async';
import { useFlash, useFieldErrors } from '../../router/react/hooks';

export function RegistrationForm() {
  const flash = useFlash();
  const emailErrors = useFieldErrors('email');
  const passwordErrors = useFieldErrors('password');
  
  return (
    <>
      <Helmet>
        <title>Register - Project Conduit</title>
      </Helmet>
      
      <div>
        <header>
          <h1>Create Admin Account</h1>
          <p>Register a new administrator</p>
        </header>
        
        {flash?.error && (
          <div role="alert">
            {flash.error}
          </div>
        )}
        
        <form method="POST" action="/admin/register">
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
            {emailErrors && emailErrors.map((err, i) => (
              <small key={i} role="alert">{err}</small>
            ))}
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <small>Minimum 8 characters</small>
            {passwordErrors && passwordErrors.map((err, i) => (
              <small key={i} role="alert">{err}</small>
            ))}
          </div>
          
          <div>
            <label htmlFor="passwordConfirm">Confirm Password</label>
            <input
              type="password"
              id="passwordConfirm"
              name="passwordConfirm"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          
          <button type="submit">Create Account</button>
        </form>
        
        <footer>
          <p>Already have an account? <a href="/admin/login">Log in</a></p>
        </footer>
      </div>
    </>
  );
}
