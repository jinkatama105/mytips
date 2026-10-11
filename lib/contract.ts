// testnet (Monad Testnet, chain 10143)
export const TIPJAR_ADDRESS = "0xf98a5e2832b52dba20ff92d1119be44201192f27" as const;
export const CHAIN_ID = 10143;
// mainnet (Monad, chain 143) — set NEXT_PUBLIC_TIPJAR_MAINNET after deploying
export const MAINNET_CHAIN_ID = 143;
export const TIPJAR_ADDRESS_MAINNET = (process.env.NEXT_PUBLIC_TIPJAR_MAINNET || "") as string;

export const tipJarAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "handle", type: "string" },
      { name: "displayName", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "tip",
    stateMutability: "payable",
    inputs: [
      { name: "handle", type: "string" },
      { name: "message", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getStreamerByHandle",
    stateMutability: "view",
    inputs: [{ name: "handle", type: "string" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "wallet", type: "address" },
      { name: "displayName", type: "string" },
      { name: "active", type: "bool" },
      { name: "balance", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Tipped",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "message", type: "string", indexed: false },
    ],
  },
] as const;
