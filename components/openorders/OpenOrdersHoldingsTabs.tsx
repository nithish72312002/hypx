import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import axios from "axios";
import WebSocketManager from "@/api/WebSocketManager";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { useActiveAccount } from "thirdweb/react";
import { OrderRequest, placeOrderl1 } from "@/utils/Signing";
import { useAgentWallet } from "@/hooks/useAgentWallet";

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

interface Balance {
  coin: string;
  token: number;
  total: string;
  hold: string;
  entryNtl: string;
}

interface TradingInterfaceProps {
  symbol?: string; // Optional filter, if needed.
}

const SpotTradeOpenOrdersHoldings: React.FC<TradingInterfaceProps> = ({ symbol }) => {
  const [index, setIndex] = useState(0);
  const { sdk } = useHyperliquid();
  const [cancelStatus, setCancelStatus] = useState<string | null>(null);
  const [cancelAllStatus, setCancelAllStatus] = useState<string | null>(null);
  const [routes] = useState([
    { key: "orders", title: "Open Orders" },
    { key: "holdings", title: "Holdings" },
  ]);
  const [hideOtherSymbols, setHideOtherSymbols] = useState(false);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [spotBalances, setSpotBalances] = useState<Balance[]>([]);
  const [tokenMapping, setTokenMapping] = useState<{ [key: string]: string }>({});
  const account = useActiveAccount();

  // Fetch token mapping using spot meta
  useEffect(() => {
    const parseTokenMapping = (apiResponse: any) => {
      const mapping: { [key: string]: string } = {};
      const tokensArray = apiResponse[0]?.tokens || [];
      const universeArray = apiResponse[0]?.universe || [];

      // Create a mapping from token index to token name
      const tokenNameByIndex: { [key: number]: string } = {};
      tokensArray.forEach((token: any) => {
        tokenNameByIndex[token.index] = token.name;
      });

      // For each pair in universe, resolve the token name from the first token index
      universeArray.forEach((pair: any) => {
        const [firstTokenIndex] = pair.tokens;
        const resolvedName = tokenNameByIndex[firstTokenIndex] || "Unknown";
        mapping[pair.name] = resolvedName;
      });
      return mapping;
    };

    const fetchTokenMapping = async () => {
      try {
        const response = await axios.post("https://api.hyperliquid-testnet.xyz/info", {
          type: "spotMetaAndAssetCtxs",
        });
        const mapping = parseTokenMapping(response.data);
        setTokenMapping(mapping);
      } catch (err) {
        console.error("Error fetching token mapping:", err);
      }
    };

    fetchTokenMapping();
  }, []);

  // Listen to WebSocket for open orders and spot balances updates
  useEffect(() => {
    if (!account?.address) {
      setOpenOrders([]);
      setSpotBalances([]);
      return;
    }
    const wsManager = WebSocketManager.getInstance();
    const listener = (data: any) => {
      if (data.openOrders) {
        setOpenOrders(data.openOrders);
      }
      if (data.spotState && data.spotState.balances) {
        setSpotBalances(data.spotState.balances);
      }
    };
    wsManager.addListener("webData2", listener);
    return () => {
      wsManager.removeListener("webData2", listener);
    };
  }, [account?.address]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date
      .getHours()
      .toString()
      .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;
  };

  // Cancel individual order
  const cancelSpotOrder = async (oid: number, displayName: string) => {
    if (!sdk) {
      setCancelStatus("SDK not initialized yet.");
      return;
    }
      const fullname = `${displayName}-SPOT`;
    try {
      const result = await sdk.exchange.cancelOrder({
        coin: fullname,
        o: oid,
      });
      const error = result?.response?.data?.statuses?.[0]?.error;
      setCancelStatus(
        error ? `Failed to cancel order: ${error}` : "Order cancelled successfully!"
      );
      setOpenOrders((prevOrders) => prevOrders.filter((order) => order.oid !== oid));
    } catch (error: any) {
      setCancelStatus(`Failed to cancel order: ${error.message ?? "Unknown error"}`);
    }
  };

  // Cancel all orders
  const cancelAllOrders = async () => {
    if (!sdk) {
      setCancelAllStatus("SDK not initialized yet.");
      return;
    }
    try {
      const result = await sdk.custom.cancelAllOrders();
      const error = result?.response?.data?.statuses?.[0]?.error;
      setCancelAllStatus(
        error ? `Failed to cancel all orders: ${error}` : "All orders cancelled successfully!"
      );
    } catch (error: any) {
      setCancelAllStatus(`Failed to cancel all orders: ${error.message ?? "Unknown error"}`);
    }
  };

  

  // Render open orders using tokenMapping to resolve names
  const renderOrders = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setHideOtherSymbols(!hideOtherSymbols)}
          >
            {hideOtherSymbols && <View style={styles.checkboxInner} />}
          </TouchableOpacity>
          <Text style={styles.filterText}>Hide Other Symbols</Text>
        </View>
        <TouchableOpacity style={styles.cancelAllButton} onPress={cancelAllOrders}>
          <Text style={styles.cancelAllText}>Cancel All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView nestedScrollEnabled={true}>
        {openOrders
          .filter(
            (order) =>
              (order.coin.includes("/") || order.coin.includes("@")) &&
              (!hideOtherSymbols || (symbol ? order.coin.includes(symbol) : true))
          )
          .map((order) => {
            // Use the mapping to get a user-friendly name; fallback to order.coin if not found.
            const displayName = tokenMapping[order.coin] || order.coin;
            return (
              <View key={order.oid} style={styles.orderItem}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderCoin}>{displayName}</Text>
                  <Text style={styles.orderType}>
                    {order.orderType} / {order.side === "A" ? "Sell" : "Buy"}
                  </Text>
                  <Text style={styles.orderDate}>{formatDate(order.timestamp)}</Text>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => cancelSpotOrder(order.oid, displayName)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.progressBar}>
                  <View style={styles.progressFill} />
                </View>
                <View style={styles.orderDetails}>
                  <Text style={styles.filledText}>
                    Filled / Amount ({displayName}) 0.000 / {order.sz}
                  </Text>
                  <Text style={styles.priceText}>Price {order.limitPx}</Text>
                </View>
              </View>
            );
          })}
      </ScrollView>
      {cancelStatus && <Text style={styles.statusText}>{cancelStatus}</Text>}
      {cancelAllStatus && <Text style={styles.statusText}>{cancelAllStatus}</Text>}
    </View>
  );

  // Render holdings from spot balances
  const renderHoldings = () => (
    <View style={styles.container}>
      <ScrollView nestedScrollEnabled={true}>
        {spotBalances.map((balance, index) => {
          // Use token mapping to display a more user-friendly name if available.
          const displayName = tokenMapping[balance.coin] || balance.coin;
          const available = parseFloat(balance.total) - parseFloat(balance.hold);
          return (
            <View key={index} style={styles.holdingItem}>
              <View style={styles.holdingLeft}>
                <Text style={styles.holdingCoin}>{displayName}</Text>
              </View>
              <View style={styles.holdingRight}>
                <Text style={styles.holdingTotal}>{parseFloat(balance.total).toFixed(8)}</Text>
                <Text style={styles.holdingDetail}>Available: {available.toFixed(8)}</Text>
              </View>
            </View>
          );
        })}
        {spotBalances.length === 0 && (
          <Text style={styles.statusText}>No holdings found.</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderScene = SceneMap({
    orders: renderOrders,
    holdings: renderHoldings,
  });

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: Dimensions.get("window").width }}
      renderTabBar={(props) => (
        <TabBar
          {...props}
          indicatorStyle={styles.tabIndicator}
          style={styles.tabBar}
          labelStyle={styles.tabLabel}
        />
      )}
      style={styles.tabView}
    />
  );
};

const styles = StyleSheet.create({
  tabView: { flex: 1 },
  tabBar: { backgroundColor: "#13141B" },
  tabIndicator: { backgroundColor: "#F0B90B" },
  tabLabel: { color: "#FFFFFF", fontWeight: "bold" },
  container: { flex: 1, backgroundColor: "#13141B" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#13141B",
  },
  filterRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: "#8E8E93",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: "#F0B90B",
  },
  filterText: { color: "#8E8E93", marginLeft: 8 },
  cancelAllButton: { justifyContent: "center" },
  cancelAllText: { color: "#8E8E93", fontSize: 14 },
  orderItem: {
    backgroundColor: "#13141B",
    margin: 8,
    borderRadius: 4,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1F26",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderCoin: { color: "#FFFFFF", fontWeight: "bold" },
  orderType: { color: "#00C087", fontSize: 12 },
  orderDate: { color: "#8E8E93", fontSize: 12 },
  cancelButton: { backgroundColor: "#1E1F26", padding: 4, borderRadius: 3 },
  cancelButtonText: { color: "#8E8E93", fontSize: 12 },
  progressBar: {
    height: 3,
    backgroundColor: "#1E1F26",
    borderRadius: 2,
    marginVertical: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00C087",
    width: "0%",
    borderRadius: 2,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  filledText: { color: "#8E8E93", fontSize: 12 },
  priceText: { color: "#8E8E93", fontSize: 12 },
  statusText: { color: "#FFFFFF", textAlign: "center", margin: 8 },
  holdingItem: {
    backgroundColor: "#13141B",
    margin: 8,
    borderRadius: 4,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1F26",
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  holdingLeft: {
    flex: 1,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingCoin: { 
    color: "#FFFFFF", 
    fontWeight: "bold", 
    fontSize: 16 
  },
  holdingDetail: { 
    color: "#8E8E93", 
    fontSize: 14,
    marginTop: 4,
  },
  holdingTotal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
});

export default SpotTradeOpenOrdersHoldings;