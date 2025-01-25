import React, { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers"; // Import ethers here
import WebSocketManager from "@/api/WebSocketManager";
import { useActiveAccount } from "thirdweb/react";
import { useAgentWalletContext } from "@/context/AgentWalletContext";
import { useApproveAgent } from "@/hooks/useApproveAgent";
import { savePrivateKey } from "@/utils/storage";

export default function AppInitializer() {
  const account = useActiveAccount(); // External wallet
  const wsManager = WebSocketManager.getInstance(); // WebSocket Manager instance
  const { wallet, setWallet, loading: walletLoading, error: walletError } = useAgentWalletContext(); // Agent wallet from context
  const { approveAgent } = useApproveAgent(); // Hook to approve the agent wallet

  const [approvalCompleted, setApprovalCompleted] = useState(false); // Track if approval is completed

  const queryUserRole = async () => {
    try {
      if (!account?.address || !wallet?.address || approvalCompleted) {
        console.log("Skipping role query: Missing data or approval already completed.");
        return;
      }

      const apiUrl = "https://api.hyperliquid-testnet.xyz/info";
      const headers = {
        "Content-Type": "application/json",
      };
      const body = {
        type: "userRole",
        user: wallet.address, // Agent wallet address
      };

      console.log("Querying user role for agent wallet:", wallet.address);
      const response = await axios.post(apiUrl, body, { headers });
      const { role, data } = response.data;

      console.log("API Response:", response.data);

      if (role === "agent") {
        if (data.user.toLowerCase() === account.address.toLowerCase()) {
          console.log("Agent role and external wallet match. No action required.");
          setApprovalCompleted(true); // Mark approval as completed
        } else {
          console.log("Agent role exists but user mismatch. Creating new agent wallet...");
          await createAndApproveNewAgentWallet();
        }
      } else if (role === "missing") {
        console.log("Role is missing. Approving agent wallet...");
        await approveAgent();
        setApprovalCompleted(true); // Mark approval as completed
      }
    } catch (error) {
      console.error("Error querying user role:", error);
    }
  };

  const createAndApproveNewAgentWallet = async () => {
    try {
      const newWallet = ethers.Wallet.createRandom(); // Create a new wallet
      const privateKey = newWallet.privateKey;
      await savePrivateKey(privateKey); // Save the private key to storage
      setWallet(newWallet); // Update the context with the new wallet

      console.log("New agent wallet created:", newWallet.address);
      console.log("Approving the new agent wallet...");
      await approveAgent();
      setApprovalCompleted(true); // Mark approval as completed
    } catch (error) {
      console.error("Failed to create and approve new agent wallet:", error);
    }
  };

  useEffect(() => {
    if (account?.address) {
      wsManager.updateUserAddress(account.address);
    } else {
      wsManager.updateUserAddress("0x0000000000000000000000000000000000000000");
    }
  }, [account?.address]);

  useEffect(() => {
    if (walletLoading || !wallet || !account?.address) {
      console.log("Agent wallet is still loading or external wallet not connected.");
      return;
    }

    queryUserRole();
  }, [wallet, walletLoading, account?.address]);

  useEffect(() => {
    if (walletError) {
      console.error("Error initializing agent wallet:", walletError);
    }
  }, [walletError]);

  return null;
}
