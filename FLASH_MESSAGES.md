# Flash Message Pattern - Security Enhancement

## Overview

Replaced URL query parameters (`?error=...`) with session-based flash messages for error/success notifications. This improves security and user experience.

## Changes Made

### 1. Session Type Extended (`lib/session/index.ts`)
```typescript
export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  flash?: {
    error?: string;
    success?: string;
    info?: string;
  };
}
```

### 2. Flash Message API Added (`lib/session/index.ts`)
- `setFlashError(sessionId, message)` - Set error message
- `setFlashSuccess(sessionId, message)` - Set success message  
- `getFlash(sessionId)` - Get and clear flash messages
- `getSessionIdFromRequest(request)` - Extract session ID from cookie

### 3. Handlers Updated
- `lib/admin/handlers/authenticate.ts` - Uses flash for login errors
- `lib/admin/handlers/processRegistration.ts` - Uses flash for validation errors and success
- `lib/admin/handlers/login.tsx` - Reads flash messages
- `lib/admin/handlers/register.tsx` - Reads flash messages

### 4. Components Updated
- `lib/admin/ui/LoginForm.tsx` - Added `success` prop, removed `decodeURIComponent`
- `lib/admin/ui/RegistrationForm.tsx` - Removed `decodeURIComponent`

## Security Benefits

✅ **Prevents URL manipulation attacks** - No more crafted URLs with fake errors  
✅ **Clean URLs** - No query string pollution  
✅ **Auto-expiring messages** - Flash messages cleared after one read  
✅ **Temporary sessions** - Unauthenticated users get 5-min temp sessions for flashes  
✅ **No sensitive data in logs** - Error messages not in URLs/server logs

## Before/After

### Before (Insecure)
```typescript
return redirect('/admin/register?error=' + encodeURIComponent('Passwords do not match'));
```
URL: `/admin/register?error=Passwords%20do%20not%20match`

### After (Secure)
```typescript
const session = await setFlashError(sessionId, 'Passwords do not match');
const response = redirect('/admin/register');
response.headers.append('Set-Cookie', createSessionCookie(session));
return response;
```
URL: `/admin/register` (clean!)

## Testing

All 44 tests pass, including integration tests that verify:
- Error flash messages work for login failures
- Error flash messages work for registration validation
- Success flash messages work for successful registration
- Flash messages are cleared after being read

Run: `bun test`
