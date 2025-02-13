import { create } from "zustand";
import { useWebSocketStore } from "./useWebSocketStore";

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
  setAddress: (address: string | undefined) => void;
}

interface FuturesState {
  assets: any[];
  positions: any[];
  accountValue: number;
  totalPnl: number;
  isLoading: boolean;
  error: string | null;
  setAddress: (address: string | undefined) => void;
}

export const useSpotStore = create<SpotState>((set, get) => ({
  balances: [],
  totalValue: 0,
  totalPnl: 0,
  isLoading: true,
  error: null,
  tokenMap: {},
  setAddress: async (address) => {
    if (!address) {
      set({ balances: [], totalValue: 0, totalPnl: 0, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Fetch token metadata
      const response = await fetch("https://api.hyperliquid-testnet.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "spotMetaAndAssetCtxs" }),
      });

      const data = await response.json();
      const newTokenMap: Record<number, string> = {};

      data[0].universe.forEach((market: any) => {
        const [baseToken] = market.tokens;
        newTokenMap[baseToken] = market.name;
      });

      set({ tokenMap: newTokenMap });

      // Subscribe to WebSocket store
      const unsubscribe = useWebSocketStore.subscribe((state) => {
        if (!state.rawData) return;

        try {
          const { tokenMap } = get();
          if (!tokenMap || Object.keys(tokenMap).length === 0) return;

          const spotState = state.rawData?.spotState;
          const spotAssetCtxs = state.rawData?.spotAssetCtxs || [];

          if (!spotState || !address) {
            set({ balances: [], totalValue: 0, totalPnl: 0, isLoading: false });
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
          console.error("Error processing spot data:", err);
          set({ error: "Error processing spot balances", isLoading: false });
        }
      });

      // Initialize WebSocket connection
      useWebSocketStore.getState().setAddress(address);

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error("Failed to fetch token metadata:", err);
      set({ error: "Failed to load market data", isLoading: false });
    }
  },
}));

export const useFuturesStore = create<FuturesState>((set, get) => ({
  assets: [],
  positions: [],
  accountValue: 0,
  totalPnl: 0,
  isLoading: true,
  error: null,
  setAddress: async (address) => {
    if (!address) {
      set({ assets: [], positions: [], accountValue: 0, totalPnl: 0, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    // Subscribe to WebSocket store
    const unsubscribe = useWebSocketStore.subscribe((state) => {
      if (!state.rawData) return;

      try {
        const clearingState = state.rawData?.clearinghouseState;
        if (!clearingState || !address) {
          set({ assets: [], positions: [], accountValue: 0, totalPnl: 0, isLoading: false });
          return;
        }

        const marginSummary = clearingState.marginSummary || {};
        const totalUnrealizedPnl = clearingState.assetPositions?.reduce(
          (acc: number, p: any) => acc + parseFloat(p.position.unrealizedPnl || "0"),
          0
        ) || 0;

        const newAccountValue = parseFloat(marginSummary.accountValue) || 0;
        const newWithdrawable = parseFloat(clearingState.withdrawable) || 0;

        const newPositions = clearingState.assetPositions?.map((p: any) => {
          const coin = p.position.coin;
          const universeIndex = state.rawData.meta?.universe?.findIndex((u: any) => u.name === coin) ?? -1;
          const markPx = universeIndex !== -1 && state.rawData.assetCtxs?.[universeIndex]?.markPx
            ? parseFloat(state.rawData.assetCtxs[universeIndex].markPx)
            : 0;

          return {
            coin,
            size: parseFloat(p.position.szi),
            entryPx: parseFloat(p.position.entryPx),
            unrealizedPnl: parseFloat(p.position.unrealizedPnl),
            liquidationPx: p.position.liquidationPx,
            marginUsed: parseFloat(p.position.marginUsed),
            returnOnEquity: parseFloat(p.position.returnOnEquity) * 100,
            leverage: p.position.leverage,
            markPx,
          };
        }) || [];

        set({
          positions: newPositions,
          assets: [{
            coin: "USDC",
            walletBalance: newAccountValue.toFixed(2),
            totalmarginused: (parseFloat(marginSummary.totalMarginUsed) || 0).toFixed(2),
            available: newWithdrawable.toFixed(2),
            unrealizedPnl: totalUnrealizedPnl.toFixed(2),
          }],
          accountValue: newAccountValue,
          totalPnl: totalUnrealizedPnl,
          isLoading: false,
          error: null
        });
      } catch (err) {
        console.error("Error processing futures data:", err);
        set({ error: "Error processing futures data", isLoading: false });
      }
    });

    // Initialize WebSocket connection
    useWebSocketStore.getState().setAddress(address);

    return () => {
      unsubscribe();
    };
  }
}));