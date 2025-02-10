import React, { createContext, useContext, useState, useEffect } from "react";
import { Hyperliquid } from "hyperliquid";
import { useActiveAccount } from "thirdweb/react";
import { useAgentWallet } from "@/hooks/useAgentWallet";

const HyperliquidContext = createContext(null);

export const HyperliquidProvider = ({ children }) => {
  const [sdk, setSdk] = useState(null);
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
          WebSocket: global.WebSocket
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
  return useContext(HyperliquidContext);
};
