// Split into three stores but share WebSocket subscription
import { create } from "zustand";
import { useWebData2Store } from "./useWebData2Store";
import { debounce } from 'lodash';

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

// Cache for meta universe data
let metaUniverseCache: any[] | null = null;
let isFetchingMeta = false;

// Orders Store
export const usePerpOrdersStore = create<PerpOrdersState>((set) => {
  let previousOrders: Order[] = [];

  const processWebData2 = debounce((data: any) => {
    if (!data?.openOrders) return;
    
    try {
      // Only update if orders have changed
      const newOrders = data.openOrders;
      if (JSON.stringify(newOrders) !== JSON.stringify(previousOrders)) {
        previousOrders = newOrders;
        set({ openOrders: newOrders });
      }
    } catch (err) {
      console.error("[PerpOrders] Error processing orders:", err);
    }
  }, 100);

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
        processWebData2.cancel();
        unsubscribe();
        unsubscribeStore();
        previousOrders = [];
      };
    }
  };
});

// Positions Store
export const usePerpPositionsStore = create<PerpPositionsState>((set) => {
  let previousPositions: any = null;
  let pendingData: any = null;
  
  const processWebData2 = debounce((data: any) => {
    try {
      if (!data?.clearinghouseState) {
        if (!previousPositions) {
          set({ isLoading: false, error: "No clearinghouse state found" });
        }
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
          
          return {
            coin: position.coin,
            size: parseFloat(position.szi || "0"),
            entryPx: parseFloat(position.entryPx || "0"),
            unrealizedPnl: parseFloat(position.unrealizedPnl || "0"),
            liquidationPx: position.liquidationPx,
            marginUsed: parseFloat(position.marginUsed || "0"),
            returnOnEquity: parseFloat(position.returnOnEquity || "0") * 100,
            leverage: position.leverage || { type: "cross", value: 1 },
            markPx: parseFloat(ctx?.markPx || "0"),
            positionValue: parseFloat(position.positionValue || "0"),
            maxLeverage: position.maxLeverage,
            cumFunding: position.cumFunding
          };
        }) || [];

      const totalPnl = formattedPositions.reduce((acc: number, pos: PerpPosition) => acc + pos.unrealizedPnl, 0);

      const newState = {
        positions: formattedPositions,
        accountValue,
        totalPnl,
        assets: formattedAssets,
        isLoading: false,
        error: null
      };

      // Only update if state has changed
      if (JSON.stringify(newState) !== JSON.stringify(previousPositions)) {
        previousPositions = newState;
        set(newState);
      }
    } catch (err) {
      console.error("[PerpPositions] Error processing data:", err);
      set({ error: "Error processing positions data", isLoading: false });
    }
  }, 100);

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
        processWebData2.cancel();
        if (unsubscribe) {
          unsubscribe();
        }
        unsubscribeStore();
        previousPositions = null;
        pendingData = null;
      };
    }
  };
});

// Context Store
export const usePerpContextStore = create<PerpContextState>((set) => {
  let previousContext: any = null;

  const fetchMetaUniverse = async () => {
    if (isFetchingMeta || metaUniverseCache) {
      return metaUniverseCache;
    }

    try {
      isFetchingMeta = true;
      const response = await fetch("https://api.hyperliquid-testnet.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      });
      const data = await response.json();
      metaUniverseCache = data[0].universe;
      return metaUniverseCache;
    } catch (err) {
      console.error("[PerpContext] Error fetching meta universe:", err);
      return null;
    } finally {
      isFetchingMeta = false;
    }
  };

  const processWebData2 = debounce(async (data: any) => {
    try {
      if (!data?.meta?.universe) {
        const metaUniverse = await fetchMetaUniverse();
        if (!metaUniverse) return;
        
        const newState = {
          assetContexts: data?.assetCtxs || [],
          metaUniverse
        };

        if (JSON.stringify(newState) !== JSON.stringify(previousContext)) {
          previousContext = newState;
          set(newState);
        }
        return;
      }

      const newState = {
        assetContexts: data.assetCtxs || [],
        metaUniverse: data.meta.universe
      };

      if (JSON.stringify(newState) !== JSON.stringify(previousContext)) {
        previousContext = newState;
        set(newState);
      }
    } catch (err) {
      console.error("[PerpContext] Error processing context:", err);
    }
  }, 100);

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
        processWebData2.cancel();
        if (unsubscribe) {
          unsubscribe();
        }
        unsubscribeStore();
        previousContext = null;
      };
    }
  };
});
