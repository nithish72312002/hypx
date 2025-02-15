import { create } from "zustand";
import WebSocketManager from "@/api/WebSocketManager";

interface WebData2Store {
  rawData: any;
  isConnected: boolean;
  subscribeToWebSocket: () => () => void;
}

export const useWebData2Store = create<WebData2Store>((set, get) => {
  const wsManager = WebSocketManager.getInstance();

  const listener = (data: any) => {
    set((state) => ({ rawData: data }));
  };

  return {
    rawData: null,
    isConnected: false,
    subscribeToWebSocket: () => {
      set({ isConnected: true });
      wsManager.addListener("webData2", listener);
      
      return () => {
        wsManager.removeListener("webData2", listener);
        set({ isConnected: false, rawData: null });
      };
    },
  };
});
