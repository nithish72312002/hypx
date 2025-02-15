import { create } from "zustand";
import { useWebData2Store } from "./useWebData2Store";

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

export const useSpotWallet = create<SpotState>((set, get) => {
  const processWebData2 = (data: any) => {
    if (!data) {
      console.log("[SpotWallet] No data received");
      return;
    }

    try {
      const spotState = data?.spotState;
      const spotAssetCtxs = data?.spotAssetCtxs || [];

      if (!spotState) {
        set({ balances: [], totalValue: 0, totalPnl: 0, isLoading: false });
        return;
      }

      // Get token metadata
      const { tokenMap } = get();
      if (!tokenMap || Object.keys(tokenMap).length === 0) {
        console.log("[SpotWallet] Fetching token metadata...");
        fetch("https://api.hyperliquid-testnet.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "spotMetaAndAssetCtxs" }),
        })
          .then((response) => response.json())
          .then((metaData) => {
            const newTokenMap: Record<number, string> = {};
            metaData[0].universe.forEach((market: any) => {
              const [baseToken] = market.tokens;
              newTokenMap[baseToken] = market.name;
            });
            set({ tokenMap: newTokenMap });
          })
          .catch((err) => {
            console.error("[SpotWallet] Failed to fetch token metadata:", err);
            set({ error: "Failed to load market data", isLoading: false });
          });
        return;
      }

      const formattedAssets = spotState.balances
        .filter((balance: any) => parseFloat(balance.total) > 0)
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

      const totalValue = formattedAssets.reduce((acc, asset) => acc + parseFloat(asset.value), 0);
      const totalPnl = formattedAssets.reduce((acc, asset) => acc + asset.pnlValue, 0);

      set({
        balances: formattedAssets,
        totalValue,
        totalPnl,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error("[SpotWallet] Error processing spot data:", err);
      set({ error: "Error processing spot balances", isLoading: false });
    }
  };

  return {
    balances: [],
    totalValue: 0,
    totalPnl: 0,
    isLoading: true,
    error: null,
    tokenMap: {},
    subscribeToWebSocket: () => {
      set({ isLoading: true, error: null });
      const webData2Store = useWebData2Store.getState();
      const unsubscribe = webData2Store.subscribeToWebSocket();

      const unsubscribeStore = useWebData2Store.subscribe((state) => {
        if (state.rawData) {
          processWebData2(state.rawData);
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
