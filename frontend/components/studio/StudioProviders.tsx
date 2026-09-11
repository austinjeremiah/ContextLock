'use client';

/**
 * Client providers for every Studio route.
 *
 *  - TanStack Query        server state (spec §38)
 *  - WorkbenchProvider     local UI state
 *  - ControlBridgeProvider carries "open this control" requests to the page
 *
 * The wallet is a workspace-level connection, so its session lives here and is
 * available on every route. The heavy runtime behind it (wagmi + RainbowKit +
 * viem + WalletConnect, roughly 7,000 modules) is NOT: <WalletProvider> keeps
 * it behind a dynamic import and mounts it only once a wallet is actually
 * connected, so a route that never touches one never downloads it.
 *
 * The landing page does not mount any of this.
 */
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkbenchProvider } from '@/lib/studio/workbench';
import { ControlBridgeProvider } from '@/lib/studio/control-bridge';
import { WalletSessionProvider } from '@/lib/studio/wallet-session';
import { WalletProvider } from './wallet/WalletProvider';

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
        <ControlBridgeProvider>
          <WalletSessionProvider>
            <WalletProvider>{children}</WalletProvider>
          </WalletSessionProvider>
        </ControlBridgeProvider>
      </WorkbenchProvider>
    </QueryClientProvider>
  );
}
