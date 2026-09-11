import type { ReactNode } from 'react';
import { WalletProvider } from '@/components/studio/wallet/WalletProvider';

/**
 * Deploy is one of only two surfaces that needs a wallet, so the wallet stack
 * is mounted by a layout scoped to this route rather than the workbench layout.
 *
 * Providers do belong in a layout — just not the root one: a layout's module
 * graph compiles for every route beneath it, and wagmi + RainbowKit + viem +
 * WalletConnect is roughly 7,000 modules. Here only /deploy pays for it, while
 * React context still works normally for everything below.
 */
export default function DeployLayout({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
