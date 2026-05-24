import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 504_2002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.testnet.arc-node.thecanteenapp.com/v1/swrm_bfc179c6535721b8d00f83ce99c3ed9a6401b038561071e72b21f1a86d276ce3",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
});
