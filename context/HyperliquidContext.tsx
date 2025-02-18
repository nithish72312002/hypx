import React, { createContext, useContext, useState, useEffect } from "react";
import { Hyperliquid } from "hyperliquid";
import { useActiveAccount } from "thirdweb/react";
import { useAgentWallet } from "@/hooks/useAgentWallet";

interface HyperliquidContextType {
  sdk: Hyperliquid | null;
}

const HyperliquidContext = createContext<HyperliquidContextType>({ sdk: null });

export const HyperliquidProvider = ({ children }: { children: React.ReactNode }) => {
  const [sdk, setSdk] = useState<Hyperliquid | null>(null);
  const account = useActiveAccount();
  const { wallet, loading: walletLoading } = useAgentWallet();

  useEffect(() => {
    const initializeSdk = async () => {
      try {
        if (!account?.address || walletLoading) {
          console.log("Waiting for account to be ready...");
          return;
        }

        if (!wallet?.privateKey) {
          console.log("Waiting for wallet private key...");
          return;
        }

        console.log("Initializing Hyperliquid SDK with wallet...");
        const instance = new Hyperliquid({
          enableWs: false,
          privateKey: wallet.privateKey,
          walletAddress: account.address,
          testnet: true,
        });

        await instance.connect();
        setSdk(instance);
        console.log("Hyperliquid SDK initialized successfully with wallet.");
      } catch (error) {
        console.error("Error initializing Hyperliquid SDK:", error);
      }
    };

    initializeSdk();
  }, [account?.address, wallet?.privateKey, walletLoading]);

  return (
    <HyperliquidContext.Provider value={{ sdk }}>
      {children}
    </HyperliquidContext.Provider>
  );
};

export const useHyperliquid = () => {
  const context = useContext(HyperliquidContext);
  if (!context) {
    throw new Error("useHyperliquid must be used within a HyperliquidProvider");
  }
  return context;
};
