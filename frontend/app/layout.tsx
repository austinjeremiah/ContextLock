import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sleep Well Creatives',
  description: 'Sleep Well Creatives',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="w-mod-js">
      <body className="body">
        {/* Same cascade order as the original: Webflow base, Lenis, then the
            custom Three.js app styles. Served verbatim from /public. */}
        <link rel="stylesheet" href="/styles/webflow.css" precedence="high" />
        <link rel="stylesheet" href="/styles/lenis.css" precedence="high" />
        <link rel="stylesheet" href="/styles/app.css" precedence="high" />
        <link rel="stylesheet" href="/styles/inline.css" precedence="high" />
        {children}
      </body>
    </html>
  );
}
