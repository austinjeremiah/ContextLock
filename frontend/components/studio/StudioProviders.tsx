'use client';

/**
 * Client providers for every Studio route.
 *
 *  - TanStack Query   server state (spec §38)
 *  - wagmi/RainbowKit testnet wallet connection for Deploy and Policy signing
 *  - WorkbenchProvider local UI state
 *  - ControlBridgeProvider carries "open this control" requests to the page
 *
 * The landing page does not mount any of this.
 */
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '@/lib/studio/wagmi';
import { WorkbenchProvider } from '@/lib/studio/workbench';
import { ControlBridgeProvider } from '@/lib/studio/control-bridge';

/** RainbowKit restyled onto the site palette so the modal matches the workbench. */
const walletTheme = lightTheme({
  accentColor: '#0042af',
  accentColorForeground: '#fef1d0',
  borderRadius: 'none',
  fontStack: 'system',
  overlayBlur: 'small',
});

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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={walletTheme} modalSize="compact" showRecentTransactions={false}>
          <WorkbenchProvider>
            <ControlBridgeProvider>{children}</ControlBridgeProvider>
          </WorkbenchProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
