import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Example custom layout for demonstration purposes
 * 
 * This shows how users can create their own layouts
 * with different structure, styling, or features.
 * 
 * Page components use react-helmet-async's <Helmet> to manage head content.
 */

export interface CustomLayoutProps {
  children: ReactNode;
  theme?: 'light' | 'dark';
}

export function CustomLayout({
  children,
  theme = 'light',
}: CustomLayoutProps) {
  const themeClass = theme === 'dark' ? 'dark-theme' : 'light-theme';
  
  const themeStyles = `
    .dark-theme { background: #1a1a1a; color: #fff; min-height: 100vh; }
    .light-theme { background: #fff; color: #000; min-height: 100vh; }
    header { padding: 1rem; border-bottom: 1px solid currentColor; }
    main { padding: 2rem; }
    footer { padding: 1rem; border-top: 1px solid currentColor; margin-top: auto; }
  `;
  
  return (
    <>
      <Helmet>
        <html lang="en" className={themeClass} />
        <style>{themeStyles}</style>
        <title>Custom Layout - Project Conduit</title>
      </Helmet>
      <div className={themeClass}>
        <header>
          <nav>Custom Navigation</nav>
        </header>
        <main>{children}</main>
        <footer>
          <p>Custom Footer - {new Date().getFullYear()}</p>
        </footer>
      </div>
    </>
  );
}

// Default export for dynamic imports
export default CustomLayout;
