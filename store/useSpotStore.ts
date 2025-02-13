import { create } from "zustand";
import WebSocketManager from "@/api/WebSocketManager";
import axios from "axios";

interface SpotTokenData {
  id: string;
  name: string;
  price: number;
  volume: number;
  change: number;
  usdvolume: number;
  circulatingSupply: number;
  totalSupply: number;
}

interface SpotStore {
  tokens: SpotTokenData[];
  isLoading: boolean;
  tokenMapping: { [key: string]: string };
  setTokens: (tokens: SpotTokenData[]) => void;
  subscribeToWebSocket: () => () => void;
  fetchTokenMapping: () => Promise<void>;
}

export const useSpotStore = create<SpotStore>((set, get) => {
  const wsManager = WebSocketManager.getInstance();
  let wsUnsubscribe: (() => void) | null = null;

  const parseTokenMapping = (apiResponse: any) => {
    console.log("[SpotStore] Parsing token mapping from API response");
    const mapping: { [key: string]: string } = {};
    const tokensArray = apiResponse[0]?.tokens || [];
    const universeArray = apiResponse[0]?.universe || [];

    console.log("[SpotStore] Token array length:", tokensArray.length);
    console.log("[SpotStore] Universe array length:", universeArray.length);

    const tokenNameByIndex: { [key: number]: string } = {};
    tokensArray.forEach((token: any) => {
      tokenNameByIndex[token.index] = token.name;
    });

    universeArray.forEach((pair: any) => {
      const [firstTokenIndex] = pair.tokens;
      const resolvedName = tokenNameByIndex[firstTokenIndex] || "Unknown";
      mapping[pair.name] = resolvedName;
    });

    console.log("[SpotStore] Generated mapping entries:", Object.keys(mapping).length);
    return mapping;
  };

  const listener = (data: any) => {
    try {
      console.log("[SpotStore] WebSocket data received");
      const { spotAssetCtxs } = data;
      if (!spotAssetCtxs || !Array.isArray(spotAssetCtxs)) {
        console.log("[SpotStore] Invalid or empty spotAssetCtxs data");
        return;
      }

      console.log("[SpotStore] Processing", spotAssetCtxs.length, "spot assets");
      const tokenMapping = get().tokenMapping;
      console.log("[SpotStore] Current token mapping entries:", Object.keys(tokenMapping).length);

      const formattedTokens = spotAssetCtxs
        .map((ctx: any) => {
          const {
            coin,
            markPx,
            dayBaseVlm,
            prevDayPx,
            circulatingSupply,
            totalSupply
          } = ctx;

          const price = markPx !== undefined ? parseFloat(markPx) : 0;
          const volume = dayBaseVlm !== undefined ? parseFloat(dayBaseVlm) : 0;
          const prevPrice = prevDayPx !== undefined ? parseFloat(prevDayPx) : 0;
          const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
          const usdvolume = volume * price;

          return {
            id: coin,
            name: tokenMapping[coin] || coin,
            price,
            volume,
            change,
            usdvolume,
            circulatingSupply: parseFloat(circulatingSupply || '0'),
            totalSupply: parseFloat(totalSupply || '0')
          };
        })
        .filter((token: SpotTokenData) => token.volume > 0)
        .sort((a, b) => b.usdvolume - a.usdvolume);

      console.log("[SpotStore] Formatted tokens:", formattedTokens.length);
      console.log("[SpotStore] First token sample:", formattedTokens[0]);
      set({ tokens: formattedTokens, isLoading: false });
      console.log("[SpotStore] Store updated with new tokens");
    } catch (err) {
      console.error("[SpotStore] Error processing WebSocket data:", err);
      set({ isLoading: false });
    }
  };

  const fetchTokenMapping = async () => {
    console.log("[SpotStore] Fetching token mapping...");
    try {
      const response = await axios.post("https://api.hyperliquid-testnet.xyz/info", {
        type: "spotMetaAndAssetCtxs",
      });

      console.log("[SpotStore] Token mapping API response received");
      const mapping = parseTokenMapping(response.data);
      set({ tokenMapping: mapping });
      console.log("[SpotStore] Token mapping updated in store");

      // Connect to WebSocket after we have the mapping
      if (!wsUnsubscribe) {
        console.log("[SpotStore] Connecting to WebSocket after mapping...");
        wsUnsubscribe = subscribeToWebSocket();
      }
    } catch (err) {
      console.error("[SpotStore] Error fetching token mapping:", err);
      set({ isLoading: false });
    }
  };

  const subscribeToWebSocket = () => {
    console.log("[SpotStore] Subscribing to WebSocket");
    wsManager.addListener("webData2", listener);
    return () => {
      console.log("[SpotStore] Unsubscribing from WebSocket");
      wsManager.removeListener("webData2", listener);
      wsUnsubscribe = null;
    };
  };

  console.log("[SpotStore] Initializing store");
  return {
    tokens: [],
    isLoading: true,
    tokenMapping: {},
    setTokens: (tokens) => {
      console.log("[SpotStore] Manually setting tokens:", tokens.length);
      set({ tokens });
    },
    fetchTokenMapping,
    subscribeToWebSocket: () => {
      // If we already have a subscription, return its cleanup function
      if (wsUnsubscribe) {
        return wsUnsubscribe;
      }
      
      // If we have token mapping, subscribe immediately
      if (Object.keys(get().tokenMapping).length > 0) {
        wsUnsubscribe = subscribeToWebSocket();
        return wsUnsubscribe;
      }
      
      // Otherwise, fetch token mapping which will handle the subscription
      fetchTokenMapping();
      return () => {
        if (wsUnsubscribe) {
          wsUnsubscribe();
        }
      };
    },
  };
});