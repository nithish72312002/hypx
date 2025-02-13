import { create } from "zustand";
import WebSocketManager from "@/api/WebSocketManager";

interface WebSocketState {
  rawData: any;
  isConnected: boolean;
  error: string | null;
  setAddress: (address: string | undefined) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  rawData: null,
  isConnected: false,
  error: null,
  setAddress: (address) => {
    const manager = WebSocketManager.getInstance();
    
    if (!address) {
      set({ rawData: null, isConnected: false });
      return;
    }

    const handleWebData2 = (data: any) => {
      try {
        set({ 
          rawData: data,
          isConnected: true,
          error: null
        });
      } catch (err) {
        console.error("Error processing WebSocket data:", err);
        set({ error: "Error processing WebSocket data" });
      }
    };

    // Set timeout for initial connection
    const timeout = setTimeout(() => {
      const { isConnected } = get();
      if (!isConnected) {
        set({ error: "WebSocket connection timeout" });
      }
    }, 5000);

    manager.addListener("webData2", handleWebData2);

    return () => {
      manager.removeListener("webData2", handleWebData2);
      clearTimeout(timeout);
    };
  }
}));
