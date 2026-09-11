'use client';

/**
 * Wallet stack, loaded on demand.
 *
 * wagmi + RainbowKit + viem + WalletConnect is roughly 7,000 modules. Mounting
 * it in the workbench layout meant every route compiled all of it. Only the
 * surfaces that actually sign — Deploy preflight and the Policy controls — wrap
 * themselves in this, and the chunk is fetched when one of them opens.
 *
 * Usage:
 *   <WalletProvider>
 *     <ConnectTestnetWallet />
 *   </WalletProvider>
 */
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const WalletRuntime = dynamic(() => import('./WalletRuntime').then((m) => m.WalletRuntime), {
  ssr: false,
  loading: () => (
    <span className="cl-meta" role="status">
      Loading wallet…
    </span>
  ),
});

export function WalletProvider({ children }: { children: ReactNode }) {
  return <WalletRuntime>{children}</WalletRuntime>;
}
