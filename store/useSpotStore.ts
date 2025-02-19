import { create } from "zustand";
import axios from "axios";
import { useWebData2Store } from "./useWebData2Store";
import { debounce } from 'lodash';

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
let pendingData: any = null;

export const useSpotStore = create<SpotStore>((set, get) => {
  let previousTokens: SpotTokenData[] = [];

  const parseTokenMapping = (apiResponse: any) => {
    if (!apiResponse?.[0]) return {};

    const mapping: { [key: string]: string } = {};
    const tokensArray = apiResponse[0].tokens || [];
    const universeArray = apiResponse[0].universe || [];

    const tokenNameByIndex: { [key: number]: string } = {};
    tokensArray.forEach((token: any) => {
      if (token?.index && token?.name) {
        tokenNameByIndex[token.index] = token.name;
      }
    });

    universeArray.forEach((pair: any) => {
      if (pair?.tokens?.[0] && pair?.name) {
        const resolvedName = tokenNameByIndex[pair.tokens[0]] || "Unknown";
        mapping[pair.name] = resolvedName;
      }
    });

    return mapping;
  };

  const processWebData2 = debounce((data: any) => {
    try {
      const { spotAssetCtxs } = data;
      if (!spotAssetCtxs || !Array.isArray(spotAssetCtxs)) {
        return;
      }

      const tokenMapping = get().tokenMapping;
      if (Object.keys(tokenMapping).length === 0) {
        pendingData = data;
        return;
      }

      const formattedTokens = spotAssetCtxs
        .filter((ctx: any) => {
          const volume = ctx.dayBaseVlm !== undefined ? parseFloat(ctx.dayBaseVlm) : 0;
          return volume > 0;
        })
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
        .sort((a, b) => b.usdvolume - a.usdvolume);

      // Only update if tokens have changed
      if (JSON.stringify(formattedTokens) !== JSON.stringify(previousTokens)) {
        previousTokens = formattedTokens;
        set({ tokens: formattedTokens, isLoading: false });
      }
    } catch (err) {
      console.error("[SpotStore] Error processing data:", err);
      set({ isLoading: false });
    }
  }, 100);

  const fetchTokenMapping = async () => {
    if (isFetchingMapping || tokenMappingCache) {
      return;
    }

    try {
      isFetchingMapping = true;
      const response = await axios.post("https://api.hyperliquid-testnet.xyz/info", {
        type: "spotMetaAndAssetCtxs"
      });
      const mapping = parseTokenMapping(response.data);
      tokenMappingCache = mapping;
      set({ tokenMapping: mapping });

      if (pendingData) {
        processWebData2(pendingData);
        pendingData = null;
      }
    } catch (err) {
      console.error("[SpotStore] Error fetching token mapping:", err);
    } finally {
      isFetchingMapping = false;
    }
  };

  return {
    tokens: [],
    isLoading: true,
    tokenMapping: {},
    setTokens: (tokens: SpotTokenData[]) => {
      if (JSON.stringify(tokens) !== JSON.stringify(previousTokens)) {
        previousTokens = tokens;
        set({ tokens });
      }
    },
    fetchTokenMapping,
    subscribeToWebSocket: () => {
      const webData2Store = useWebData2Store.getState();
      const unsubscribe = webData2Store.subscribeToWebSocket();
      
      const unsubscribeStore = useWebData2Store.subscribe(
        (state) => {
          if (state.rawData) {
            processWebData2(state.rawData);
          }
        }
      );

      return () => {
        processWebData2.cancel();
        unsubscribe();
        unsubscribeStore();
        previousTokens = [];
      };
    },
  };
});