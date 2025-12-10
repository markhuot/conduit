import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <Helmet>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main>
        {children}
      </main>
    </>
  );
}
