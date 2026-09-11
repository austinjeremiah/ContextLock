'use client';

/**
 * Client providers for every Studio route.
 *
 *  - TanStack Query        server state (spec §38)
 *  - WorkbenchProvider     local UI state
 *  - ControlBridgeProvider carries "open this control" requests to the page
 *
 * The wallet stack (wagmi + RainbowKit + viem + WalletConnect) is deliberately
 * NOT here. It is ~7,000 modules, and mounting it in the layout made every
 * route in the app compile all of it — dev builds were taking ~20s per page.
 * Only Deploy and Policies ever need a wallet, so it is loaded lazily by
 * <WalletProvider> on those routes instead.
 *
 * The landing page does not mount any of this.
 */
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkbenchProvider } from '@/lib/studio/workbench';
import { ControlBridgeProvider } from '@/lib/studio/control-bridge';

export function StudioProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Observed chain/runtime state must never be served indefinitely from
            // cache as if it were current; pages re-read and show freshness.
            staleTime: 5_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WorkbenchProvider>
        <ControlBridgeProvider>{children}</ControlBridgeProvider>
      </WorkbenchProvider>
    </QueryClientProvider>
  );
}
