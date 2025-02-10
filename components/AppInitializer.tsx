import React, { useEffect, useState, createContext, useContext } from "react";
import WebSocketManager from "@/api/WebSocketManager";
import { useActiveAccount } from "thirdweb/react";

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
  const  account  = useActiveAccount();

  useEffect(() => {
    if (account?.address) {
      WebSocketManager.getInstance().updateUserAddress(account.address);
    } else {
      WebSocketManager.getInstance().updateUserAddress("0x0000000000000000000000000000000000000000");
    }
  }, [account?.address]);

  const contextValue = {};

  return (
    <AppInitializerContext.Provider value={contextValue}>
      {children}
    </AppInitializerContext.Provider>
  );
}
