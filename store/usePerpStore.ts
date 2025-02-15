import { create } from "zustand";
import WebSocketManager from "@/api/WebSocketManager";
import { useWebData2Store } from "./useWebData2Store";

interface PerpTokenData {
  name: string;
  price: number;
  volume: number;
  change: number;
  leverage: number;
  usdvolume: number;
}

interface PerpStore {
  tokens: PerpTokenData[];
  isLoading: boolean;
  setTokens: (tokens: PerpTokenData[]) => void;
  subscribeToWebSocket: () => () => void;
}

export const usePerpStore = create<PerpStore>((set) => {
  const processWebData2 = (data: any) => {
    try {
      const { meta, assetCtxs } = data;
      if (!meta?.universe || !assetCtxs) {
        return;
      }

      const formattedTokens = meta.universe
        .map((token: any, index: number) => {
          const ctx = assetCtxs[index] || {};
          const { markPx, dayBaseVlm, prevDayPx } = ctx;

          const price = markPx !== undefined ? parseFloat(markPx) : 0;
          const volume = dayBaseVlm !== undefined ? parseFloat(dayBaseVlm) : 0;
          const prevPrice = prevDayPx !== undefined ? parseFloat(prevDayPx) : 0;
          const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
          const usdvolume = volume * price;

          return {
            name: token.name || "Unknown",
            price,
            volume,
            change,
            leverage: token.maxLeverage || 0,
            usdvolume
          };
        })
        .filter((token: PerpTokenData) => token.volume > 0);

      set({ tokens: formattedTokens, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  };

  return {
    tokens: [],
    isLoading: true,
    setTokens: (tokens) => set({ tokens }),
    subscribeToWebSocket: () => {
      const webData2Store = useWebData2Store.getState();
      const unsubscribe = webData2Store.subscribeToWebSocket();
      
      const unsubscribeStore = useWebData2Store.subscribe((state) => {
        if (state.rawData) {
          processWebData2(state.rawData);
        }
      });

      return () => {
        unsubscribe();
        unsubscribeStore();
      };
    },
  };
});
