"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { monadTestnet, monad } from "viem/chains";
import { injected } from "wagmi/connectors";

const wagmiConfig = createConfig({
  chains: [monadTestnet, monad],
  transports: {
    [monadTestnet.id]: http(),
    [monad.id]: http(),
  },
  connectors: [injected()],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "REPLACE_ME"}
        config={{
          appearance: {
            theme: "light",
            accentColor: "#7c3aed",
          },
          defaultChain: monadTestnet,
          supportedChains: [monadTestnet, monad],
        }}
      >
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
