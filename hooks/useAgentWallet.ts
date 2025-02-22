import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getPrivateKey, savePrivateKey } from "@/utils/storage";

export function useAgentWallet() {
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWallet = async () => {
    try {
      console.log("useAgentWallet: Creating new wallet...");
      setLoading(true);
      setError(null);

      // Generate a new random wallet with entropy
      const randomWallet = ethers.Wallet.createRandom();
      
      // Validate the generated wallet
      if (!randomWallet.address || !randomWallet.privateKey) {
        throw new Error("Failed to generate valid wallet");
      }

      // Convert to regular wallet and validate
      const agentWallet = new ethers.Wallet(randomWallet.privateKey);
      if (!ethers.isAddress(agentWallet.address)) {
        throw new Error("Invalid wallet address generated");
      }

      // Save private key securely
      await savePrivateKey(agentWallet.privateKey);
      setWallet(agentWallet);
      console.log("useAgentWallet: New wallet created and saved successfully");
      return agentWallet;
    } catch (err) {
      console.error("useAgentWallet: Error creating wallet:", err);
      setError(err instanceof Error ? err.message : "Failed to create wallet");
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
        setError(null);
        const privateKey = await getPrivateKey();
        
        if (privateKey) {
          // Validate private key format
          if (!privateKey.match(/^0x[0-9a-fA-F]{64}$/)) {
            throw new Error("Invalid private key format in storage");
          }

          const agentWallet = new ethers.Wallet(privateKey);
          
          // Validate wallet address
          if (!ethers.isAddress(agentWallet.address)) {
            throw new Error("Invalid wallet address");
          }

          setWallet(agentWallet);
          console.log("useAgentWallet: Wallet loaded successfully from storage");
        }
      } catch (err) {
        console.error("useAgentWallet: Error loading wallet:", err);
        setError(err instanceof Error ? err.message : "Failed to load wallet");
        setWallet(null);
      } finally {
        setLoading(false);
      }
    };

    initWallet();
  }, []);

  return { wallet, loading, error, createWallet };
}