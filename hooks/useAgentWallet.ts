import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getPrivateKey, savePrivateKey } from "@/utils/storage";

export function useAgentWallet() {
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWallet = async () => {
    try {
      console.log("useAgentWallet: Creating new wallet...");
      setLoading(true);
      setError(null);

      const agentWallet = ethers.Wallet.createRandom();
      await savePrivateKey(agentWallet.privateKey);
      setWallet(agentWallet);
      console.log("useAgentWallet: New wallet created and saved.");
      return agentWallet;
    } catch (err) {
      console.error("useAgentWallet: Error creating wallet:", err);
      setError("Failed to create wallet.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Initialize wallet from storage on mount
  useEffect(() => {
    const initWallet = async () => {
      try {
        setLoading(true);
        const privateKey = await getPrivateKey();
        if (privateKey) {
          const agentWallet = new ethers.Wallet(privateKey);
          setWallet(agentWallet);
          console.log("useAgentWallet: Loaded wallet from storage");
        }
      } catch (err) {
        console.error("useAgentWallet: Error loading wallet:", err);
        setError("Failed to load wallet.");
      } finally {
        setLoading(false);
      }
    };

    initWallet();
  }, []);

  return { wallet, loading, error, createWallet };
}