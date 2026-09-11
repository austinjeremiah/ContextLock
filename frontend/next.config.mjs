/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  experimental: {
    // These are barrel files: a single `import { X } from 'lucide-react'` pulls
    // the whole index in dev unless Next rewrites it to a deep import. Matters a
    // lot for per-route dev compile time.
    optimizePackageImports: ['lucide-react', '@xyflow/react', '@tanstack/react-query'],

    turbo: {
      resolveAlias: {
        // Same shims as the webpack config below, in the form Turbopack expects
        // (a module path rather than `false`).
        '@react-native-async-storage/async-storage': './lib/studio/empty-module.ts',
        '@x402/evm': './lib/studio/empty-module.ts',
        '@x402/svm': './lib/studio/empty-module.ts',
        '@x402/core': './lib/studio/empty-module.ts',
        'pino-pretty': './lib/studio/empty-module.ts',
      },
    },
  },

  webpack: (config, { isServer, webpack }) => {
    // RainbowKit's index imports wagmi's full connector set, which pulls in
    // @coinbase/cdp-sdk and its optional @x402/* payment modules. ContextLock
    // uses the wallet only to connect and sign on a testnet — no payment path
    // is ever executed — so the whole namespace is ignored rather than adding
    // payment SDKs as dependencies.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@x402\//,
      }),
    );

    // @metamask/sdk ships one bundle for web and React Native and imports the
    // RN async-storage package unconditionally. In a browser build that code
    // path is never taken, so point it at false rather than installing a React
    // Native dependency into a Next.js app.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
