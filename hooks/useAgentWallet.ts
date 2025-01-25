import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getPrivateKey, savePrivateKey } from "@/utils/storage";

export function useAgentWallet() {
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false); // Guard for initialization

  useEffect(() => {
    if (initialized) return; // Prevent multiple initializations

    const initializeWallet = async () => {
      try {
        console.log("useAgentWallet: Initializing agent wallet...");
        setLoading(true);

        let privateKey = await getPrivateKey();
        let agentWallet: ethers.Wallet;

        if (!privateKey) {
          console.log("useAgentWallet: No private key found. Generating a new wallet...");
          agentWallet = ethers.Wallet.createRandom();
          privateKey = agentWallet.privateKey;
          await savePrivateKey(privateKey);
          console.log("useAgentWallet: New wallet created and saved.");
        } else {
          console.log("useAgentWallet: Private key found. Loading wallet...");
          agentWallet = new ethers.Wallet(privateKey);
        }

        setWallet(agentWallet);
      } catch (err) {
        console.error("useAgentWallet: Error initializing wallet:", err);
        setError("Failed to initialize wallet.");
      } finally {
        setInitialized(true); // Mark as initialized
        setLoading(false);
        console.log("useAgentWallet: Initialization complete.");
      }
    };

    initializeWallet();
  }, [initialized]);

  return { wallet, address: wallet?.address || null, privateKey: wallet?.privateKey || null, loading, error };
}
