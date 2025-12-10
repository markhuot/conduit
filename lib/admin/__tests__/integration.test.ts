import { describe, it, expect, beforeEach } from 'bun:test';
import { Router } from '../../router';
import { container } from '../../../src/container';
import { MemorySessionStore } from '../../session/stores/memory';
import { adminRoutes } from '../routes';

describe('Admin authentication flow', () => {
  let router: Router;
  
  beforeEach(() => {
    container.clear();
    container.register('session', () => ({
      store: new MemorySessionStore(),
    }));
    
    router = new Router();
    router.group('/admin', adminRoutes);
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
    const formData = new FormData();
    formData.append('username', 'admin');
    formData.append('password', 'admin');
    
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
    formData.append('username', 'admin');
    formData.append('password', 'wrong');
    
    const request = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: formData,
    });
    
    const response = await router.handle(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('/admin/login');
    expect(response.headers.get('location')).toContain('error=');
  });
  
  it('GET /admin/dashboard without session redirects to login', async () => {
    const request = new Request('http://localhost:3000/admin/dashboard');
    const response = await router.handle(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('/admin/login');
    expect(response.headers.get('location')).toContain('return=');
  });
  
  it('GET /admin/dashboard with valid session shows dashboard', async () => {
    // First login
    const formData = new FormData();
    formData.append('username', 'admin');
    formData.append('password', 'admin');
    
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
    expect(html).toContain('admin'); // Session userId appears in the HTML
  });
  
  it('POST /admin/logout destroys session and redirects', async () => {
    // First login
    const formData = new FormData();
    formData.append('username', 'admin');
    formData.append('password', 'admin');
    
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
    // First login
    const formData = new FormData();
    formData.append('username', 'admin');
    formData.append('password', 'admin');
    
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
