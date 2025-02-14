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

// Cache for token mapping to avoid repeated API calls
let tokenMappingCache: { [key: string]: string } | null = null;
let isFetchingMapping = false;

export const useSpotStore = create<SpotStore>((set, get) => {
  const wsManager = WebSocketManager.getInstance();
  let wsUnsubscribe: (() => void) | null = null;

  const parseTokenMapping = (apiResponse: any) => {
    console.log("[SpotStore] Parsing token mapping from API response");
    const mapping: { [key: string]: string } = {};
    const tokensArray = apiResponse[0]?.tokens || [];
    const universeArray = apiResponse[0]?.universe || [];

    const tokenNameByIndex: { [key: number]: string } = {};
    tokensArray.forEach((token: any) => {
      tokenNameByIndex[token.index] = token.name;
    });

    universeArray.forEach((pair: any) => {
      const [firstTokenIndex] = pair.tokens;
      const resolvedName = tokenNameByIndex[firstTokenIndex] || "Unknown";
      mapping[pair.name] = resolvedName;
    });

    return mapping;
  };

  const listener = (data: any) => {
    try {
      const { spotAssetCtxs } = data;
      if (!spotAssetCtxs || !Array.isArray(spotAssetCtxs)) return;

      // Use cached token mapping
      const tokenMapping = get().tokenMapping;
      if (Object.keys(tokenMapping).length === 0) return;

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

      set({ tokens: formattedTokens, isLoading: false });
    } catch (err) {
      console.error("[SpotStore] Error processing WebSocket data:", err);
      set({ isLoading: false });
    }
  };

  const fetchTokenMapping = async () => {
    // Return if we already have the mapping or if a fetch is in progress
    if (tokenMappingCache || isFetchingMapping) {
      if (tokenMappingCache) {
        set({ tokenMapping: tokenMappingCache });
      }
      return;
    }

    isFetchingMapping = true;
    try {
      const response = await axios.post("https://api.hyperliquid-testnet.xyz/info", {
        type: "spotMetaAndAssetCtxs",
      });

      const mapping = parseTokenMapping(response.data);
      tokenMappingCache = mapping; // Cache the mapping
      set({ tokenMapping: mapping });

      // Connect to WebSocket after we have the mapping
      if (!wsUnsubscribe) {
        wsUnsubscribe = subscribeToWebSocket();
      }
    } catch (err) {
      console.error("[SpotStore] Error fetching token mapping:", err);
      set({ isLoading: false });
    } finally {
      isFetchingMapping = false;
    }
  };

  const subscribeToWebSocket = () => {
    wsManager.addListener("webData2", listener);
    return () => {
      wsManager.removeListener("webData2", listener);
      wsUnsubscribe = null;
    };
  };

  return {
    tokens: [],
    isLoading: true,
    tokenMapping: {},
    setTokens: (tokens) => set({ tokens }),
    fetchTokenMapping,
    subscribeToWebSocket: () => {
      // If we already have a subscription, return its cleanup function
      if (wsUnsubscribe) {
        return wsUnsubscribe;
      }
      
      // If we have cached token mapping, use it and subscribe
      if (tokenMappingCache) {
        set({ tokenMapping: tokenMappingCache });
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