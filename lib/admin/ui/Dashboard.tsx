import { Helmet } from 'react-helmet-async';
import type { Session } from '../../session';

interface DashboardProps {
  session: Session;
}

export function Dashboard({ session }: DashboardProps) {
  return (
    <>
      <Helmet>
        <title>Dashboard - Project Conduit Admin</title>
      </Helmet>
      
      <div>
        <header>
          <h1>Dashboard</h1>
          <div>
            <span>Welcome, {session.userId}</span>
            <form method="POST" action="/admin/logout" style={{ display: 'inline' }}>
              <button type="submit">Logout</button>
            </form>
          </div>
        </header>
        
        <main>
          <p>Welcome to the Project Conduit admin panel.</p>
          
          <nav>
            <ul>
              <li><a href="/admin/schemas">Schemas</a> - Manage content types</li>
              <li><a href="/admin/content">Content</a> - Create and edit content</li>
              <li><a href="/admin/events">Events</a> - View event log</li>
            </ul>
          </nav>
        </main>
      </div>
    </>
  );
}
