import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Router } from '../../router';
import { container } from '../../../src/container';
import { MemorySessionStore } from '../../session/stores/memory';
import { FileUserStore } from '../../users/stores/file';
import { EventStore } from '../../events/store';
import { FileEventWriter } from '../../events/writers/file';
import { UserListener } from '../../listeners/user';
import { adminRoutes } from '../routes';
import { rmSync } from 'fs';

describe('Admin authentication flow', () => {
  let router: Router;
  
  beforeEach(() => {
    container.clear();
    
    // Setup user store
    const userStore = new FileUserStore('data/test-users-auth');
    container.set('users', { store: userStore });

    // Setup event store
    const eventWriter = new FileEventWriter('data/test-events-auth');
    const eventStore = new EventStore(eventWriter);
    eventStore.subscribe(new UserListener());
    container.set('eventStore', eventStore);

    // Setup session store
    container.register('session', () => ({
      store: new MemorySessionStore(),
    }));
    
    router = new Router();
    router.group('/admin', adminRoutes);
  });
  
  afterEach(() => {
    rmSync('data/test-events-auth', { recursive: true, force: true });
    rmSync('data/test-users-auth', { recursive: true, force: true });
    container.clear();
  });
  
  it('GET /admin/login returns login form', async () => {
    const request = new Request('http://localhost:3000/admin/login');
    const response = await router.handle(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    
    const html = await response.text();
    expect(html).toContain('Admin Login');
    expect(html).toContain('action="/admin/login"');
    expect(html).toContain('method="POST"');
  });
  
  it('POST /admin/login with valid credentials creates session and redirects', async () => {
    // First register a user
    const registerData = new FormData();
    registerData.append('email', 'admin@example.com');
    registerData.append('password', 'admin123');
    registerData.append('passwordConfirm', 'admin123');

    await router.handle(new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: registerData,
    }));

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now login
    const formData = new FormData();
    formData.append('email', 'admin@example.com');
    formData.append('password', 'admin123');
    
    const request = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: formData,
    });
    
    const response = await router.handle(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/dashboard');
    expect(response.headers.get('set-cookie')).toContain('session=');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
  });
  
  it('POST /admin/login with invalid credentials redirects with error', async () => {
    const formData = new FormData();
    formData.append('email', 'nonexistent@example.com');
    formData.append('password', 'wrong');
    
    const request = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: formData,
    });
    
    const response = await router.handle(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/login');
    // Error is now stored in session flash, not in URL
  });
  
  it('GET /admin/dashboard without session redirects to login', async () => {
    const request = new Request('http://localhost:3000/admin/dashboard');
    const response = await router.handle(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('/admin/login');
    expect(response.headers.get('location')).toContain('return=');
  });
  
  it('GET /admin/dashboard with valid session shows dashboard', async () => {
    // First register
    const registerData = new FormData();
    registerData.append('email', 'admin@example.com');
    registerData.append('password', 'admin123');
    registerData.append('passwordConfirm', 'admin123');

    await router.handle(new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: registerData,
    }));

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Login
    const formData = new FormData();
    formData.append('email', 'admin@example.com');
    formData.append('password', 'admin123');
    
    const loginRequest = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: formData,
    });
    
    const loginResponse = await router.handle(loginRequest);
    const cookie = loginResponse.headers.get('set-cookie');
    
    // Then access dashboard
    const dashboardRequest = new Request('http://localhost:3000/admin/dashboard', {
      headers: { cookie: cookie! },
    });
    
    const dashboardResponse = await router.handle(dashboardRequest);
    
    expect(dashboardResponse.status).toBe(200);
    const html = await dashboardResponse.text();
    expect(html).toContain('Dashboard');
  });
  
  it('POST /admin/logout destroys session and redirects', async () => {
    // First register
    const registerData = new FormData();
    registerData.append('email', 'admin@example.com');
    registerData.append('password', 'admin123');
    registerData.append('passwordConfirm', 'admin123');

    await router.handle(new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: registerData,
    }));

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Login
    const formData = new FormData();
    formData.append('email', 'admin@example.com');
    formData.append('password', 'admin123');
    
    const loginRequest = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: formData,
    });
    
    const loginResponse = await router.handle(loginRequest);
    const cookie = loginResponse.headers.get('set-cookie');
    
    // Then logout
    const logoutRequest = new Request('http://localhost:3000/admin/logout', {
      method: 'POST',
      headers: { cookie: cookie! },
    });
    
    const logoutResponse = await router.handle(logoutRequest);
    
    expect(logoutResponse.status).toBe(302);
    expect(logoutResponse.headers.get('location')).toBe('/admin/login');
    expect(logoutResponse.headers.get('set-cookie')).toContain('Max-Age=0');
    
    // Verify session is destroyed - accessing dashboard should redirect
    const dashboardRequest = new Request('http://localhost:3000/admin/dashboard', {
      headers: { cookie: cookie! },
    });
    
    const dashboardResponse = await router.handle(dashboardRequest);
    expect(dashboardResponse.status).toBe(302);
    expect(dashboardResponse.headers.get('location')).toContain('/admin/login');
  });
  
  it('GET /admin/login when already authenticated redirects to dashboard', async () => {
    // First register
    const registerData = new FormData();
    registerData.append('email', 'admin@example.com');
    registerData.append('password', 'admin123');
    registerData.append('passwordConfirm', 'admin123');

    await router.handle(new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: registerData,
    }));

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Login
    const formData = new FormData();
    formData.append('email', 'admin@example.com');
    formData.append('password', 'admin123');
    
    const loginRequest = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: formData,
    });
    
    const loginResponse = await router.handle(loginRequest);
    const cookie = loginResponse.headers.get('set-cookie');
    
    // Try to access login page again
    const secondLoginRequest = new Request('http://localhost:3000/admin/login', {
      headers: { cookie: cookie! },
    });
    
    const secondLoginResponse = await router.handle(secondLoginRequest);
    
    expect(secondLoginResponse.status).toBe(302);
    expect(secondLoginResponse.headers.get('location')).toBe('/admin/dashboard');
  });
});

describe('User registration flow', () => {
  let router: Router;
  let eventStore: EventStore;

  beforeEach(() => {
    // Setup container
    container.clear();
    
    // Setup user store
    const userStore = new FileUserStore('data/test-users');
    container.set('users', { store: userStore });

    // Setup event store
    const eventWriter = new FileEventWriter('data/test-events');
    eventStore = new EventStore(eventWriter);
    eventStore.subscribe(new UserListener());
    container.set('eventStore', eventStore);

    // Setup session store
    container.set('session', { store: new MemorySessionStore() });

    // Setup router
    router = new Router();
    router.group('/admin', adminRoutes);
  });

  afterEach(() => {
    rmSync('data/test-events', { recursive: true, force: true });
    rmSync('data/test-users', { recursive: true, force: true });
    container.clear();
  });

  it('registers new user and emits event', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');
    formData.append('passwordConfirm', 'password123');

    const request = new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: formData,
    });

    const response = await router.handle(request);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('/admin/login');

    // Wait a bit for async event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify user was created
    const userConfig = container.get('users') as { store: any };
    const user = await userConfig.store.findByEmail('test@example.com');
    
    expect(user).not.toBeNull();
    expect(user!.email).toBe('test@example.com');
    expect(user!.passwordHash).toBeTruthy();
  });

  it('validates password confirmation', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');
    formData.append('passwordConfirm', 'different');

    const request = new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: formData,
    });

    const response = await router.handle(request);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/register');
    // Error is now stored in session flash, not in URL
  });

  it('prevents duplicate email registration', async () => {
    // First registration
    const formData1 = new FormData();
    formData1.append('email', 'test@example.com');
    formData1.append('password', 'password123');
    formData1.append('passwordConfirm', 'password123');

    await router.handle(new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: formData1,
    }));

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second registration with same email
    const formData2 = new FormData();
    formData2.append('email', 'test@example.com');
    formData2.append('password', 'different456');
    formData2.append('passwordConfirm', 'different456');

    const response = await router.handle(new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: formData2,
    }));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/register');
    // Error is now stored in session flash, not in URL
  });

  it('can login with registered user', async () => {
    // First register
    const registerData = new FormData();
    registerData.append('email', 'test@example.com');
    registerData.append('password', 'password123');
    registerData.append('passwordConfirm', 'password123');

    await router.handle(new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: registerData,
    }));

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Then login
    const loginData = new FormData();
    loginData.append('email', 'test@example.com');
    loginData.append('password', 'password123');

    const loginRequest = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: loginData,
    });

    const response = await router.handle(loginRequest);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/dashboard');
    expect(response.headers.get('set-cookie')).toContain('session=');
  });

  it('rejects login with wrong password', async () => {
    // First register
    const registerData = new FormData();
    registerData.append('email', 'test@example.com');
    registerData.append('password', 'password123');
    registerData.append('passwordConfirm', 'password123');

    await router.handle(new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: registerData,
    }));

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try login with wrong password
    const loginData = new FormData();
    loginData.append('email', 'test@example.com');
    loginData.append('password', 'wrongpassword');

    const loginRequest = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: loginData,
    });

    const response = await router.handle(loginRequest);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/login');
    // Error is now stored in session flash, not in URL
  });
});
