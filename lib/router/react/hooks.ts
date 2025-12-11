/**
 * React hooks for accessing request context data
 * These hooks allow components to access flash messages, session, etc.
 * without prop drilling
 */

import { getRequestContext } from '../context';
import type { FlashMessages } from '../../session';

/**
 * Hook to access flash messages in React components
 * Flash messages are automatically loaded by flashMiddleware
 * 
 * @example
 * ```tsx
 * function LoginForm() {
 *   const flash = useFlash();
 *   
 *   return (
 *     <div>
 *       {flash?.error && <div>{flash.error}</div>}
 *       {flash?.success && <div>{flash.success}</div>}
 *       {flash?.errors?.email && <div>{flash.errors.email.join(', ')}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFlash(): FlashMessages | undefined {
  try {
    const ctx = getRequestContext();
    return ctx.flash;
  } catch {
    // Not in a request context (e.g., during client-side hydration)
    return undefined;
  }
}

/**
 * Hook to check if a specific field has validation errors
 * 
 * @example
 * ```tsx
 * function EmailInput() {
 *   const emailErrors = useFieldErrors('email');
 *   
 *   return (
 *     <div>
 *       <input type="email" name="email" />
 *       {emailErrors && emailErrors.map(err => <p key={err}>{err}</p>)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFieldErrors(fieldName: string): string[] | undefined {
  const flash = useFlash();
  return flash?.errors?.[fieldName];
}

/**
 * Hook to get the first error for a field (convenience)
 */
export function useFieldError(fieldName: string): string | undefined {
  const errors = useFieldErrors(fieldName);
  return errors?.[0];
}
