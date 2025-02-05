import { useEffect } from "react";
import { useAutoConnect, useConnect } from "thirdweb/react";
import { client, inApp } from "../constants/thirdweb";

export function useGuestConnect() {
  const connectMutation = useConnect();
  const autoConnecQuery = useAutoConnect({
    client,
    wallets: [inApp],
  });

  useEffect(() => {
    console.log("AutoConnect query data:", autoConnecQuery.data);
    console.log("AutoConnect query isLoading:", autoConnecQuery.isLoading);

    if (autoConnecQuery.data || autoConnecQuery.isLoading) {
      return;
    }

    console.log("Not auto-connected, logging in as guest...");

   
  }, [autoConnecQuery.data, autoConnecQuery.isLoading]);

  return {
    isConnecting: autoConnecQuery.isLoading || connectMutation.isConnecting,
  };
}