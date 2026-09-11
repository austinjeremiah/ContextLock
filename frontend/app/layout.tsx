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
    /*
     * suppressHydrationWarning on <html> and <body> only.
     *
     * Wallet extensions (Leather, MetaMask, Phantom) inject provider scripts as
     * direct children of <body> before React hydrates, which React reports as a
     * hydration mismatch it cannot attribute to anything in this codebase. The
     * flag suppresses the warning one level deep — it does not extend into the
     * app tree, so genuine mismatches inside the workbench are still reported.
     */
    <html lang="en" className="w-mod-js" suppressHydrationWarning>
      <body className="body" suppressHydrationWarning>
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
