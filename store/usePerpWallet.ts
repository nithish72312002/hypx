// Split into three stores but share WebSocket subscription
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
  timestamp: number;
  isTrigger: boolean;
  oid: number;
  triggerPx: string;
  triggerCondition: string;
  children: [];
  isPositionTpsl: boolean;
  reduceOnly: boolean;
  orderType: string;
  origSz: string;
  tif: string | null;
  cloid: number | null;
}

interface PerpOrdersState {
  openOrders: Order[];
  subscribeToWebSocket: () => () => void;
}

interface PerpPositionsState {
  positions: PerpPosition[];
  accountValue: number;
  totalPnl: number;
  assets: PerpAsset[];
  isLoading: boolean;
  error: string | null;
  subscribeToWebSocket: () => () => void;
}

interface PerpContextState {
  assetContexts: any[];
  metaUniverse: any[];
  subscribeToWebSocket: () => () => void;
}

// Orders Store
export const usePerpOrdersStore = create<PerpOrdersState>((set) => {
  const processWebData2 = (data: any) => {
    if (!data?.openOrders) return;
    set({ openOrders: data.openOrders });
  };

  return {
    openOrders: [],
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
        unsubscribe();
        unsubscribeStore();
      };
    }
  };
});

// Positions Store
export const usePerpPositionsStore = create<PerpPositionsState>((set) => {
  const processWebData2 = (data: any) => {
    try {
      if (!data?.clearinghouseState) {
        set({ isLoading: false, error: "No clearinghouse state found" });
        return;
      }

      const clearinghouseState = data.clearinghouseState;
      const accountValue = parseFloat(clearinghouseState.marginSummary?.accountValue || "0");
      const totalMarginUsed = parseFloat(clearinghouseState.marginSummary?.totalMarginUsed || "0");
      const withdrawable = parseFloat(clearinghouseState.withdrawable || "0");

      const formattedAssets = [{
        coin: "USDC",
        walletBalance: accountValue.toFixed(6),
        totalmarginused: totalMarginUsed.toFixed(6),
        available: withdrawable.toFixed(6),
        unrealizedPnl: "0.00",
      }];

      const formattedPositions = clearinghouseState.assetPositions
        ?.filter((pos: any) => parseFloat(pos.position.szi || "0") !== 0)
        .map((pos: any) => {
          const position = pos.position;
          const universeIndex = data.meta?.universe?.findIndex((u: any) => u.name === position.coin) ?? -1;
          const ctx = universeIndex !== -1 ? data.assetCtxs?.[universeIndex] : null;
          
          const markPx = parseFloat(ctx?.markPx || "0");
          const size = parseFloat(position.szi || "0");
          const entryPx = parseFloat(position.entryPx || "0");
          const unrealizedPnl = parseFloat(position.unrealizedPnl || "0");
          const marginUsed = parseFloat(position.marginUsed || "0");
          const positionValue = parseFloat(position.positionValue || "0");
          const returnOnEquity = parseFloat(position.returnOnEquity || "0") * 100;

          return {
            coin: position.coin,
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

      const totalPnl = formattedPositions.reduce((acc: number, pos: PerpPosition) => acc + parseFloat(pos.unrealizedPnl), 0);

      set({
        positions: formattedPositions,
        accountValue,
        totalPnl,
        assets: formattedAssets,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error("[PerpPositions] Error processing data:", err);
      set({ error: "Error processing positions data", isLoading: false });
    }
  };

  return {
    positions: [],
    accountValue: 0,
    totalPnl: 0,
    assets: [],
    isLoading: true,
    error: null,
    subscribeToWebSocket: () => {
      set({ isLoading: true, error: null });
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
        unsubscribe();
        unsubscribeStore();
      };
    }
  };
});

// Context Store
export const usePerpContextStore = create<PerpContextState>((set) => {
  const processWebData2 = (data: any) => {
    const updates: Partial<PerpContextState> = {};
    let hasUpdates = false;

    if (data.assetCtxs) {
      updates.assetContexts = data.assetCtxs;
      hasUpdates = true;
    }

    if (data.meta?.universe) {
      updates.metaUniverse = data.meta.universe;
      hasUpdates = true;
    }

    if (hasUpdates) {
      set(updates);
    }
  };

  return {
    assetContexts: [],
    metaUniverse: [],
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
        unsubscribe();
        unsubscribeStore();
      };
    }
  };
});
