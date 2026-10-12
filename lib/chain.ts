import { monadTestnet, monad } from "viem/chains";

// Active chain policy:
// - production build  => Monad MAINNET (chain 143)
// - dev (next dev)    => Monad TESTNET (chain 10143)
// - override anytime  => NEXT_PUBLIC_CHAIN=testnet|mainnet
const envChain = process.env.NEXT_PUBLIC_CHAIN as "testnet" | "mainnet" | undefined;
const isDev = process.env.NODE_ENV === "development";
const useTestnet = envChain ? envChain === "testnet" : isDev;

export const TESTNET_MODE = useTestnet;
export const ACTIVE_CHAIN = useTestnet ? monadTestnet : monad;
export const CHAIN_LABEL = useTestnet ? "Monad Testnet" : "Monad Mainnet";
export const CHAIN_RPC = useTestnet
  ? "https://rpc-testnet.monad.xyz"
  : "https://rpc.monad.xyz";
export function explorerTx(hash: string) {
  return useTestnet
    ? `https://testnet.monadexplorer.com/tx/${hash}`
    : `https://monadscan.com/tx/${hash}`;
}
export function explorerAddress(addr: string) {
  return useTestnet
    ? `https://testnet.monadexplorer.com/address/${addr}`
    : `https://monadscan.com/address/${addr}`;
}
