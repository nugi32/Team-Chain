import { defineChain } from '@reown/appkit/networks';

export const liskSepolia = defineChain({
  id: 4202,
  caipNetworkId: 'eip155:4202',
  name: 'Lisk Sepolia',
  nativeCurrency: {
    name: 'Lisk',
    symbol: 'LSK',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia-api.lisk.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Lisk Sepolia Explorer',
      url: 'https://sepolia-blockscout.lisk.com',
    },
  },
  testnet: true,
});
