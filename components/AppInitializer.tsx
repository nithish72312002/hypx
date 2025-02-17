import React, { useEffect, useState, createContext, useContext } from "react";
import WebSocketManager from "@/api/WebSocketManager";
import { useActiveAccount } from "thirdweb/react";
import { useApprovalStore } from "@/store/useApprovalStore";
import { useAgentWallet } from "@/hooks/useAgentWallet";
import { useSpotStore } from "@/store/useSpotStore";
import { useWebData2Store } from "@/store/useWebData2Store";
import { usePerpStore } from "@/store/usePerpStore";
import { usePerpWallet } from "@/store/usePerpWallet";
import { useSpotWallet } from "@/store/useSpotWallet";

interface AppInitializerContextType {
  // Empty interface since we removed needsDeposit
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
  const { queryUserRole } = useApprovalStore();
  const { wallet } = useAgentWallet();
  const { subscribeToWebSocket: subscribeToSpotWebSocket, fetchTokenMapping } = useSpotStore();
  const { subscribeToWebSocket: subscribeToPerpWebSocket } = usePerpStore();
  const webData2Store = useWebData2Store();
  const perpWallet = usePerpWallet();
  const spotWallet = useSpotWallet();

  useEffect(() => {
    // Initialize WebSocket connection through WebData2Store
    const unsubscribeWebData2 = webData2Store.subscribeToWebSocket();

    // Initialize spot store
    fetchTokenMapping();
    const unsubscribeSpot = subscribeToSpotWebSocket();

    // Initialize perp store
    const unsubscribePerp = subscribeToPerpWebSocket();

    // Initialize wallet stores when account is available
    let unsubscribePerpWallet: (() => void) | undefined;
    let unsubscribeSpotWallet: (() => void) | undefined;

    if (account?.address) {
      WebSocketManager.getInstance().updateUserAddress(account.address);
      
      // Initialize wallet subscriptions
      unsubscribePerpWallet = perpWallet.subscribeToWebSocket();
      unsubscribeSpotWallet = spotWallet.subscribeToWebSocket();

      if (wallet) {  
        queryUserRole(wallet.address, account.address);
      }
    } else {
      WebSocketManager.getInstance().updateUserAddress("0x0000000000000000000000000000000000000000");
    }

    // Cleanup function
    return () => {
      unsubscribeWebData2();
      unsubscribeSpot();
      unsubscribePerp();
      if (unsubscribePerpWallet) unsubscribePerpWallet();
      if (unsubscribeSpotWallet) unsubscribeSpotWallet();
    };
  }, [account?.address, wallet]);

  const contextValue = {};

  return (
    <AppInitializerContext.Provider value={contextValue}>
      {children}
    </AppInitializerContext.Provider>
  );
}
