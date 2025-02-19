import { create } from "zustand";
import { useWebData2Store } from "./useWebData2Store";
import { debounce } from 'lodash';

interface SpotAsset {
  coin: string;
  token: number;
  total: string;
  value: string;
  avgCost: string;
  pnlValue: number;
  pnlPercentage: number;
}

interface SpotState {
  balances: SpotAsset[];
  totalValue: number;
  totalPnl: number;
  isLoading: boolean;
  error: string | null;
  tokenMap: Record<number, string>;
  subscribeToWebSocket: () => () => void;
}

// Cache for token mapping
let tokenMapCache: Record<number, string> | null = null;
let isFetchingTokenMap = false;

// Dummy data for development
const fallbackSpotAssets: SpotAsset[] = [
  {
    coin: "BTC",
    token: 1,
    total: "1.25",
    value: "50000.00",
    avgCost: "42000",
    pnlValue: 3750,
    pnlPercentage: 8.93,
  },
  {
    coin: "ETH",
    token: 2,
    total: "12.5",
    value: "30000.00",
    avgCost: "2200",
    pnlValue: 2500,
    pnlPercentage: 9.1,
  },
  {
    coin: "SOL",
    token: 3,
    total: "250.0",
    value: "25000.00",
    avgCost: "95",
    pnlValue: 1250,
    pnlPercentage: 5.26,
  },
  {
    coin: "USDC",
    token: 0,
    total: "15000.00",
    value: "15000.00",
    avgCost: "1",
    pnlValue: 0,
    pnlPercentage: 0,
  }
];

const calculateTotalValue = (assets: SpotAsset[]) => 
  assets.reduce((acc, asset) => acc + parseFloat(asset.value), 0);

const calculateTotalPnl = (assets: SpotAsset[]) => 
  assets.reduce((acc, asset) => acc + asset.pnlValue, 0);

export const useSpotWallet = create<SpotState>((set, get) => {
  let previousState: any = null;
  let previousSpotState: any = null;
  let usingFallbackData = false;

  const fetchTokenMap = async () => {
    if (isFetchingTokenMap || tokenMapCache) {
      if (tokenMapCache) {
        set({ tokenMap: tokenMapCache });
      }
      return;
    }

    try {
      isFetchingTokenMap = true;
      const response = await fetch("https://api.hyperliquid-testnet.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "spotMetaAndAssetCtxs" }),
      });
      const metaData = await response.json();
      const newTokenMap: Record<number, string> = {};
      metaData[0].universe.forEach((market: any) => {
        const [baseToken] = market.tokens;
        newTokenMap[baseToken] = market.name;
      });
      tokenMapCache = newTokenMap;
      set({ tokenMap: newTokenMap });
    } catch (err) {
      console.error("[SpotWallet] Failed to fetch token metadata:", err);
      set({ error: "Failed to load market data", isLoading: false });
    } finally {
      isFetchingTokenMap = false;
    }
  };

  const processWebData2 = debounce((data: any) => {
    const spotState = data?.spotState;

    // Only check if spotState has changed, not the entire data
    if (JSON.stringify(spotState) === JSON.stringify(previousSpotState)) {
      return; // Skip if spotState hasn't changed
    }
    previousSpotState = spotState;
    
    if (!data) {
      console.log("[SpotWallet] No data received");
      if (!usingFallbackData) {
        console.log("[SpotWallet] Setting fallback data (no data)");
        usingFallbackData = true;
        set({ 
          balances: fallbackSpotAssets,
          totalValue: calculateTotalValue(fallbackSpotAssets),
          totalPnl: calculateTotalPnl(fallbackSpotAssets),
          isLoading: false 
        });
      }
      return;
    }

    try {
      console.log("[SpotWallet] Full data structure:", {
        hasData: !!data,
        dataKeys: Object.keys(data || {}),
      });
      
      console.log("[SpotWallet] Received spot state:", {
        hasSpotState: !!spotState,
        hasBalances: !!spotState?.balances,
        balancesLength: spotState?.balances?.length,
        firstBalance: spotState?.balances?.[0],
        rawSpotState: spotState
      });
      
      // Set loading to false as soon as we receive any data
      set({ isLoading: false });
      
      const spotAssetCtxs = data?.spotAssetCtxs || [];  

      // Handle case where there's no spotState or empty balances
      if (!spotState?.balances) {
        if (!usingFallbackData) {
          console.log("[SpotWallet] No spot state balances found, using fallback data");
          usingFallbackData = true;
          set({ 
            balances: fallbackSpotAssets,
            totalValue: calculateTotalValue(fallbackSpotAssets),
            totalPnl: calculateTotalPnl(fallbackSpotAssets),
            error: null 
          });
        }
        return;
      }

      // Reset fallback flag if we have real data
      usingFallbackData = false;
      
      // Get token metadata
      const { tokenMap } = get();
      console.log("[SpotWallet] Token map status:", {
        hasTokenMap: !!tokenMap,
        tokenMapSize: Object.keys(tokenMap || {}).length
      });

      if (!tokenMap || Object.keys(tokenMap).length === 0) {
        console.log("[SpotWallet] Fetching token metadata...");
        fetchTokenMap().then(() => {
          console.log("[SpotWallet] Token map fetched, reprocessing data");
          processWebData2(data);
        });
        return;
      }

      const formattedAssets = spotState.balances
        .map((balance: any) => {
          const marketName = tokenMap[balance.token] || balance.coin;
          const ctx = spotAssetCtxs.find((c: any) => c.coin === marketName);

          const total = parseFloat(balance.total);
          const entryNtl = parseFloat(balance.entryNtl || "0");
          const markPx = balance.coin === "USDC" ? 1 : parseFloat(ctx?.markPx || "0");

          const value = total * markPx;
          const pnlValue = value - entryNtl;
          const pnlPercentage = entryNtl !== 0 ? (pnlValue / entryNtl) * 100 : 0;

          return {
            coin: balance.coin,
            token: balance.token,
            total: total.toString().replace(/(\.\d*?[1-9])0+$/, "$1"),
            value: value.toFixed(2),
            avgCost: entryNtl > 0
              ? (entryNtl / total).toFixed(6).replace(/(\.\d*?[1-9])0+$/, "$1")
              : "N/A",
            pnlValue,
            pnlPercentage,
          };
        });

      console.log("[SpotWallet] Processed assets:", {
        assetsCount: formattedAssets.length,
        totalValue: formattedAssets.reduce((acc, asset) => acc + parseFloat(asset.value), 0),
      });

      const totalValue = formattedAssets.reduce((acc, asset) => acc + parseFloat(asset.value), 0);
      const totalPnl = formattedAssets.reduce((acc, asset) => acc + asset.pnlValue, 0);

      const newState = {
        balances: formattedAssets,
        totalValue,
        totalPnl,
        error: null
      };

      // Only update if state has changed
      if (JSON.stringify(newState) !== JSON.stringify(previousState)) {
        console.log("[SpotWallet] Updating state with new values");
        previousState = newState;
        set(newState);
      } else {
        console.log("[SpotWallet] State unchanged, skipping update");
      }
    } catch (err) {
      console.error("[SpotWallet] Error processing spot data:", err);
      set({ error: "Error processing spot balances" });
    }
  }, 100);

  return {
    balances: [],
    totalValue: 0,
    totalPnl: 0,
    isLoading: true,
    error: null,
    tokenMap: {},
    subscribeToWebSocket: () => {
      console.log("[SpotWallet] Subscribing to WebSocket");
      set({ isLoading: true, error: null });
      const webData2Store = useWebData2Store.getState();
      console.log("[SpotWallet] WebData2Store state:", {
        isConnected: webData2Store.isConnected,
        hasRawData: !!webData2Store.rawData
      });
      
      const unsubscribe = webData2Store.subscribeToWebSocket();

      const unsubscribeStore = useWebData2Store.subscribe((state) => {
       
        
        if (!state.isConnected) {
          set({ isLoading: true, error: "Connecting to WebSocket..." });
          return;
        }
        
        if (state.rawData) {
          processWebData2(state.rawData);
        } else {
          // If we're connected but have no data, assume empty wallet
          set({ balances: [], totalValue: 0, totalPnl: 0, isLoading: false });
        }
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        unsubscribeStore();
      };
    }
  };
});
