import React, { useEffect, useState, createContext, useContext } from "react";
import axios from "axios";
import { ethers } from "ethers";
import WebSocketManager from "@/api/WebSocketManager";
import { useActiveAccount } from "thirdweb/react";
import { useAgentWalletContext } from "@/context/AgentWalletContext";
import { useApproveAgent } from "@/hooks/useApproveAgent";
import { savePrivateKey } from "@/utils/storage";

interface AppInitializerContextType {
  needsDeposit: boolean;
  checkDepositStatus: () => Promise<void>;
}

const AppInitializerContext = createContext<AppInitializerContextType | undefined>(undefined);

export function useAppInitializer() {
  const context = useContext(AppInitializerContext);
  if (context === undefined) {
    throw new Error('useAppInitializer must be used within AppInitializer');
  }
  return context;
}

export default function AppInitializer({ children }: { children?: React.ReactNode }) {
  const account = useActiveAccount();
  const wsManager = WebSocketManager.getInstance();
  const { wallet, setWallet, loading: walletLoading, error: walletError } = useAgentWalletContext();
  const { approveAgent } = useApproveAgent();

  const [approvalCompleted, setApprovalCompleted] = useState(false);
  const [needsDeposit, setNeedsDeposit] = useState(true);

  const checkDepositStatus = async () => {
    try {
      if (!account?.address || !wallet?.address) {
        console.log("Skipping deposit check: Missing account or wallet address");
        setNeedsDeposit(true);
        return;
      }

      const apiUrl = "https://api.hyperliquid-testnet.xyz/info";
      const headers = {
        "Content-Type": "application/json",
      };
      const body = {
        type: "userRole",
        user: wallet.address,
      };

      console.log("Checking deposit status for agent wallet:", wallet.address);
      const response = await axios.post(apiUrl, body, { headers });
      const { role, data } = response.data;

      if (role === "agent" && data.user.toLowerCase() === account.address.toLowerCase()) {
        console.log("Agent role and external wallet match. No deposit needed.");
        setNeedsDeposit(false);
        setApprovalCompleted(true);
      } else if (role === "agent") {
        console.log("Agent role exists but user mismatch. Creating new agent wallet...");
        await createAndApproveNewAgentWallet();
      } else if (role === "missing") {
        console.log("Role is missing. Approving agent wallet...");
        await approveAgent();
        setApprovalCompleted(true);
        // Recheck after approval
        await checkDepositStatus();
      } else {
        console.log("Deposit needed");
        setNeedsDeposit(true);
      }
    } catch (error) {
      console.error("Error checking deposit status:", error);
      setNeedsDeposit(true);
    }
  };

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
        user: wallet.address,
      };

      console.log("Querying user role for agent wallet:", wallet.address);
      const response = await axios.post(apiUrl, body, { headers });
      const { role, data } = response.data;

      console.log("API Response:", response.data);

      if (role === "agent") {
        if (data.user.toLowerCase() === account.address.toLowerCase()) {
          console.log("Agent role and external wallet match. No action required.");
          setApprovalCompleted(true);
          setNeedsDeposit(false);
        } else {
          console.log("Agent role exists but user mismatch. Creating new agent wallet...");
          await createAndApproveNewAgentWallet();
        }
      } else if (role === "missing") {
        console.log("Role is missing. Approving agent wallet...");
        await approveAgent();
        setApprovalCompleted(true);
        await checkDepositStatus(); // Check deposit status after approval
      }
    } catch (error) {
      console.error("Error querying user role:", error);
      setNeedsDeposit(true);
    }
  };

  const createAndApproveNewAgentWallet = async () => {
    try {
      const newWallet = ethers.Wallet.createRandom();
      const privateKey = newWallet.privateKey;
      await savePrivateKey(privateKey);
      setWallet(newWallet);
  
      console.log("New agent wallet created:", newWallet.address);
  
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (wallet?.address === newWallet.address) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
  
      console.log("Approving the new agent wallet...");
      await approveAgent();
      setApprovalCompleted(true);
      await checkDepositStatus(); // Check deposit status after creating new wallet
    } catch (error) {
      console.error("Failed to create and approve new agent wallet:", error);
      setNeedsDeposit(true);
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

  const contextValue = {
    needsDeposit,
    checkDepositStatus,
  };

  return (
    <AppInitializerContext.Provider value={contextValue}>
      {children}
    </AppInitializerContext.Provider>
  );
}
