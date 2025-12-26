import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, arbitrum, sepolia } from "@reown/appkit/networks";
import { liskSepolia } from './liskSepolia';

// 1. Get projectId from https://dashboard.reown.com
const projectId = "19d42e4380db8c6b5f492fe52cd90802";

// 2. Create your application's metadata object
const metadata = {
  name: "AppKit",
  description: "AppKit Example",
  url: "http://localhost:5174/", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 3. Create a AppKit instance
export const modal = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [mainnet, arbitrum, sepolia, liskSepolia],
  metadata,
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});