import type { ReactNode } from 'react';

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/styles/studio.css" precedence="high" />
      {children}
    </>
  );
}
