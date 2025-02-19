import { create } from "zustand";
import WebSocketManager from "@/api/WebSocketManager";
import { useActiveAccount } from "thirdweb/react";
interface WebData2Store {
  rawData: any;
  isConnected: boolean;
  subscribeToWebSocket: () => () => void;
}

export const useWebData2Store = create<WebData2Store>((set, get) => {
  const wsManager = WebSocketManager.getInstance();
  let previousData: any = null;

  const listener = (data: any) => {
    if (JSON.stringify(data) !== JSON.stringify(previousData)) {
      previousData = data;
      set((state) => ({ 
        rawData: data,
        isConnected: true
      }));
    }
  };

  return {
    rawData: null,
    isConnected: false,
    subscribeToWebSocket: () => {
      wsManager.addListener("webData2", listener);
      set({ isConnected: true });
      return () => {
        wsManager.removeListener("webData2", listener);
        set({ isConnected: false, rawData: null });
        previousData = null;
      };
    },
  };
});
