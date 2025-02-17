import { create } from "zustand";
import { useWebData2Store } from "./useWebData2Store";

interface PerpAsset {
  coin: string;
  walletBalance: string;
  totalmarginused: string;
  available: string;
  unrealizedPnl: string;
}

interface Leverage {
  type: "cross" | "isolated";
  value: number;
}

interface PerpPosition {
  coin: string;
  size: string;
  entryPx: string;
  unrealizedPnl: string;
  liquidationPx: string;
  marginUsed: string;
  returnOnEquity: string;
  leverage: Leverage;
  markPx: string;
  positionValue: string;
  maxLeverage: number;
  cumFunding: any;
}

interface Order {
  coin: string;
  side: string;
  limitPx: string;
  sz: string;
  orderType: string;
  timestamp: number;
  isTrigger: boolean;
  oid: number;
}

interface PerpState {
  assets: PerpAsset[];
  positions: PerpPosition[];
  openOrders: Order[];
  assetContexts: any[];
  metaUniverse: any[];
  accountValue: number;
  totalPnl: number;
  isLoading: boolean;
  error: string | null;
  subscribeToWebSocket: () => () => void;
}

export const usePerpWallet = create<PerpState>((set, get) => {
  const processWebData2 = (data: any) => {
    if (!data) {
      console.log("[PerpWallet] No data received");
      return;
    }
    if (data.openOrders) {
      set(state => ({
        ...state,
        openOrders: data.openOrders
      }));
    }

    if (data.assetCtxs) {
      set(state => ({
        ...state,
        assetContexts: data.assetCtxs
      }));
    }

    if (data.meta?.universe) {
      set(state => ({
        ...state,
        metaUniverse: data.meta.universe
      }));
    }

    try {
      const clearinghouseState = data?.clearinghouseState;

      if (!clearinghouseState) {
        console.log("[PerpWallet] No clearinghouseState found in data");
        set({ assets: [], positions: [], accountValue: 0, totalPnl: 0, isLoading: false });
        return;
      }

      const accountValue = parseFloat(clearinghouseState.marginSummary?.accountValue || "0");
      const totalMarginUsed = parseFloat(clearinghouseState.marginSummary?.totalMarginUsed || "0");
      const withdrawable = parseFloat(clearinghouseState.withdrawable || "0");

      // Create USDC asset
      const formattedAssets = [{
        coin: "USDC",
        walletBalance: accountValue.toFixed(6),
        totalmarginused: totalMarginUsed.toFixed(6),
        available: withdrawable.toFixed(6),
        unrealizedPnl: "0.00",
      }];


      // Process positions
      const formattedPositions = clearinghouseState.assetPositions
        ?.filter((pos: any) => parseFloat(pos.position.szi || "0") !== 0)
        .map((pos: any) => {
          const position = pos.position;
          const coin = position.coin;
          const universeIndex = data.meta?.universe?.findIndex((u: any) => u.name === coin) ?? -1;
          const ctx = universeIndex !== -1 ? data.assetCtxs?.[universeIndex] : null;
          

          const markPx = parseFloat(ctx?.markPx || "0");
          const size = parseFloat(position.szi || "0");
          const entryPx = parseFloat(position.entryPx || "0");
          const unrealizedPnl = parseFloat(position.unrealizedPnl || "0");
          const marginUsed = parseFloat(position.marginUsed || "0");
          const positionValue = parseFloat(position.positionValue || "0");
          const returnOnEquity = parseFloat(position.returnOnEquity || "0") * 100;

          return {
            coin,
            size,
            entryPx,
            unrealizedPnl,
            liquidationPx: position.liquidationPx,
            marginUsed,
            returnOnEquity,
            leverage: position.leverage || { type: "cross", value: 1 },
            markPx,
            positionValue,
            maxLeverage: position.maxLeverage,
            cumFunding: position.cumFunding
          };
        }) || [];


      // Total PNL is already calculated in unrealizedPnl for each position
      const totalPnl = formattedPositions.reduce((acc, pos) => acc + pos.unrealizedPnl, 0);

   

      set({
        assets: formattedAssets,
        positions: formattedPositions,
        accountValue,
        totalPnl,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error("[PerpWallet] Error processing perp data:", err);
      set({ error: "Error processing perpetual balances", isLoading: false });
    }
  };

  return {
    assets: [],
    positions: [],
    openorders: [],
    assetContexts: [],
    metaUniverse: [],
    accountValue: 0,
    totalPnl: 0,
    isLoading: true,
    error: null,
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
