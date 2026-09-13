'use client';

/**
 * The actual wagmi + RainbowKit mount. Imported only through <WalletProvider>,
 * so this module — and the ~7,000 modules behind it — stays out of every route
 * that never touches a wallet.
 */
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '@/lib/studio/wagmi';

/** RainbowKit restyled onto the site palette so the modal matches the workbench. */
const walletTheme = lightTheme({
  accentColor: '#0042af',
  accentColorForeground: '#fef1d0',
  borderRadius: 'none',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function WalletRuntime({ children }: { children: ReactNode }) {
  // wagmi requires its own QueryClient; the workbench's client lives higher up
  // and is not shared with chain queries.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={walletTheme} modalSize="compact" showRecentTransactions={false}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
