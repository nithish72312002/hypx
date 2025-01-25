import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { getPrivateKey, savePrivateKey } from "@/utils/storage";

const AgentWalletContext = createContext(null);

export const AgentWalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeWallet = async () => {
      try {
        setLoading(true);

        let privateKey = await getPrivateKey();
        let agentWallet;

        if (!privateKey) {
          console.log("No agent wallet found. Generating a new wallet...");
          agentWallet = ethers.Wallet.createRandom();
          privateKey = agentWallet.privateKey;
          await savePrivateKey(privateKey);
          console.log("New wallet created and saved.");
        } else {
          console.log("Existing agent wallet found. Loading...");
          agentWallet = new ethers.Wallet(privateKey);
        }

        setWallet(agentWallet);
      } catch (err) {
        console.error("Failed to initialize agent wallet:", err);
        setError("Failed to initialize wallet.");
      } finally {
        setLoading(false);
      }
    };

    initializeWallet();
  }, []);

  return (
    <AgentWalletContext.Provider value={{ wallet, setWallet, loading, error }}>
      {children}
    </AgentWalletContext.Provider>
  );
};

export const useAgentWalletContext = () => {
  return useContext(AgentWalletContext);
};
