import React, { createContext, useContext, useState, useEffect } from "react";
import { Hyperliquid } from "hyperliquid";
import { useActiveAccount } from "thirdweb/react";
import { getPrivateKey } from "@/utils/storage"; // Utility to fetch saved private key
import { useAgentWalletContext } from "@/context/AgentWalletContext";

const HyperliquidContext = createContext(null);

export const HyperliquidProvider = ({ children }) => {
  const [sdk, setSdk] = useState(null);
  const account = useActiveAccount();
  const { wallet, loading: walletLoading } = useAgentWalletContext();

  useEffect(() => {
    const initializeSdk = async () => {
      try {
        if (!account?.address || walletLoading || !wallet?.privateKey) {
          console.log("Waiting for account and wallet to be ready...");
          return;
        }

        console.log("Initializing Hyperliquid SDK...");

        const instance = new Hyperliquid({
          enableWs: false,
          
          privateKey: wallet.privateKey, // Agent wallet private key
          walletAddress: account.address, // External wallet address
          testnet: true,
          
          WebSocket: global.WebSocket// Set to false for production
        });

        await instance.connect(); // Explicitly initialize the SDK
        setSdk(instance);
        console.log("Hyperliquid SDK initialized successfully.");
      } catch (error) {
        console.error("Error initializing Hyperliquid SDK:", error);
      }
    };

    initializeSdk();
  }, [account?.address, wallet, walletLoading]);

  return (
    <HyperliquidContext.Provider value={{ sdk }}>
      {children}
    </HyperliquidContext.Provider>
  );
};

export const useHyperliquid = () => {
  return useContext(HyperliquidContext);
};
