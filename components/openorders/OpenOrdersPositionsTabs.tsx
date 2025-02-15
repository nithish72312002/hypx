import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import WebSocketManager from "@/api/WebSocketManager";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { useActiveAccount } from "thirdweb/react";

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

interface Position {
  position: {
    coin: string;
    szi: string;
    leverage: {
      value: number;
      type: string;
    };
    entryPx: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    liquidationPx: string | null;
    marginUsed: string;
  };
}

interface TradingInterfaceProps {
  symbol: string;
}

const OpenOrdersPositionsTabs: React.FC<TradingInterfaceProps> = ({ symbol }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const { sdk } = useHyperliquid();
  const fullSymbol = `${symbol}-PERP`;
  const [cancelStatus, setcancelStatus] = useState<string | null>(null);
  const [routes] = useState([
    { key: "orders", title: "Open Orders" },
    { key: "positions", title: "Positions" },
  ]);
  const [hideOtherSymbols, setHideOtherSymbols] = useState(false);
  const [cancelallStatus, setcancelallStatus] = useState<string | null>(null);
  const [assetContexts, setAssetContexts] = useState<any[]>([]);
  const [metaUniverse, setMetaUniverse] = useState<any[]>([]);
  const [closeallStatus, setcloseallStatus] = useState<string | null>(null);
  const [closeStatus, setcloseStatus] = useState<string | null>(null);

  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const account = useActiveAccount();
  useEffect(() => {

    if (!account?.address) {
      // User is logged out, clear orders and positions.
      setOpenOrders([]);
      setPositions([]);
      return;
    }
    const wsManager = WebSocketManager.getInstance();
    const listener = (data: any) => {
      if (data.openOrders) setOpenOrders(data.openOrders);
      if (data.clearinghouseState?.assetPositions) {
        setPositions(data.clearinghouseState.assetPositions);
      }

      if (data.assetCtxs) {
        setAssetContexts(data.assetCtxs);
      }
      if (data.meta?.universe) {
        setMetaUniverse(data.meta.universe);
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

  // Updated cancel function that accepts an order id
  const cancelOrder = async (oid: number, coin: string) => {
    if (!sdk) {
      setcancelStatus("SDK not initialized yet.");
      return;
    }
        const cancelsymbol = `${coin}-PERP`;
    try {
      const result = await sdk.exchange.cancelOrder({
        coin: cancelsymbol,
        o: oid,
      });
      const error = result?.response?.data?.statuses?.[0]?.error;
      setcancelStatus(
        error ? `Failed to cancel order: ${error}` : "Order cancelled successfully!"
      );
      // Optionally remove the cancelled order from the list:
      setOpenOrders((prevOrders) => prevOrders.filter((order) => order.oid !== oid));
    } catch (error: any) {
      setcancelStatus(`Failed to cancel order: ${error.message ?? "Unknown error"}`);
    }
  };


  const cancelallOrder = async () => {
    if (!sdk) {
      console.log("Close all positions failed: SDK not initialized");
      setcancelallStatus("SDK not initialized yet.");
      return;
    }
        
    try {
      console.log("Attempting to close all positions...");
      // Using the closeAllPositions method with default slippage
      const result = await sdk.custom.cancelAllOrders();
      console.log("Close all positions response:", result);
      
      // Check if there's any error in the response
      if (result && Array.isArray(result)) {
        // If result is an array of OrderResponse, it was successful
        console.log("Successfully closed all positions");
        setcancelallStatus("All positions closed successfully!");
      } else {
        console.error("Unexpected response format:", result);
        setcancelallStatus("Failed to close positions: Unexpected response format");
      }
    } catch (error: any) {
      console.error("Error closing all positions:", error);
      setcancelallStatus(`Failed to close positions: ${error.message ?? "Unknown error"}`);
    }
  };

  const closeallOrder = async () => {
    if (!sdk) {
      console.log("Close all positions failed: SDK not initialized");
      setcloseallStatus("SDK not initialized yet.");
      return;
    }
        
    try {
      console.log("Attempting to close all positions...");
      // Using the closeAllPositions method with default slippage
      const result = await sdk.custom.closeAllPositions();
      console.log("Close all positions response:", result);
      
      // Check if there's any error in the response
      if (result && Array.isArray(result)) {
        // If result is an array of OrderResponse, it was successful
        console.log("Successfully closed all positions");
        setcloseallStatus("All positions closed successfully!");
      } else {
        console.error("Unexpected response format:", result);
        setcloseallStatus("Failed to close positions: Unexpected response format");
      }
    } catch (error: any) {
      console.error("Error closing all positions:", error);
      setcloseallStatus(`Failed to close positions: ${error.message ?? "Unknown error"}`);
    }
  };

  const closePosition = async (coin: string) => {
    if (!sdk) {
      console.log(`Close position failed for ${coin}: SDK not initialized`);
      setcloseStatus("SDK not initialized yet.");
      return;
    }
        
    try {
      const closesymbol = `${coin}-PERP`;
      console.log(`Attempting to close position for ${closesymbol}...`);
      // Using marketClose with the coin symbol - pass symbol directly, not as an object
      const result = await sdk.custom.marketClose(closesymbol);
      console.log(`Market close response for ${closesymbol}:`, result);

      // Handle the OrderResponse
      if (result?.response?.data?.statuses?.[0]?.error) {
        const error = result.response.data.statuses[0].error;
        console.error(`Failed to close position for ${closesymbol}:`, error);
        setcloseStatus(`Failed to close position: ${error}`);
      } else {
        console.log(`Successfully closed position for ${closesymbol}`);
        setcloseStatus("Position closed successfully!");
        // Optionally update the positions list if needed
      }
    } catch (error: any) {
      console.error(`Error closing position for ${coin}:`, error);
      setcloseStatus(`Failed to close position: ${error.message ?? "Unknown error"}`);
    }
  };

 

  const renderOrders = () => (
    <View style={styles.ordersContainer}>
      <View style={styles.ordersHeader}>
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={styles.checkbox}
          onPress={() => setHideOtherSymbols(!hideOtherSymbols)}
        >
          {hideOtherSymbols && <View style={styles.checkboxInner}/>}
        </TouchableOpacity>
        <Text style={styles.filterText}>Hide Other Symbols</Text>
      </View>
        <TouchableOpacity style={styles.cancelAllButton} onPress={cancelallOrder}>
          <Text style={styles.cancelAllText}>Cancel All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView nestedScrollEnabled={true}>
      {openOrders
  .filter((order) =>
    order.isTrigger === (subIndex === 1) &&
    (!hideOtherSymbols || order.coin === symbol) &&
    // Exclude spot orders that include "/" or "@" in the coin name.
    (!order.coin.includes("/") && !order.coin.includes("@"))
  )
  .map((order) => (
    <View key={order.oid} style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderCoin}>{order.coin}USDT</Text>
        <Text style={styles.orderType}>
          {order.orderType} / {order.side === "A" ? "Sell" : "Buy"}
        </Text>
        <Text style={styles.orderDate}>{formatDate(order.timestamp)}</Text>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => cancelOrder(order.oid, order.coin)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.filledText}>
          Filled / Amount (${symbol}) 0.000 / {order.sz}
        </Text>
        <Text style={styles.priceText}>Price {order.limitPx}</Text>
      </View>
    </View>
  ))}

      </ScrollView>
      {cancelStatus && <Text style={styles.statusText}>{cancelStatus}</Text>}
      {closeStatus && <Text style={styles.statusText}>{closeStatus}</Text>}
      {cancelallStatus && <Text style={styles.statusText}>{cancelallStatus}</Text>}
      {closeallStatus && <Text style={styles.statusText}>{closeallStatus}</Text>}

    </View>
  );

  const renderPositions = () => ( <View style={styles.positionsContainer}>
    {/* Header with checkbox and dummy "Close All" button */}
    <View style={styles.positionsHeader}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setHideOtherSymbols(!hideOtherSymbols)}
        >
          {hideOtherSymbols && <View style={styles.checkboxInner} />}
        </TouchableOpacity>
        <Text style={styles.filterText}>Hide Other Symbols</Text>
      </View>
      <TouchableOpacity
        style={styles.closeAllButton}
        onPress={closeallOrder}
      >
        <Text style={styles.closeAllText}>Close All</Text>
      </TouchableOpacity>
    </View>
    <ScrollView style={styles.positionsContainer} nestedScrollEnabled={true}>
      {positions
    .filter((pos) => !hideOtherSymbols || pos.position.coin === symbol)
      .map((pos, idx) => {
        const coin = pos.position.coin;
            const assetIndex = metaUniverse.findIndex((asset) => asset.name === coin);
            const markPx = assetIndex !== -1 && assetContexts[assetIndex] 
              ? parseFloat(assetContexts[assetIndex].markPx)
              : '-';
        const pnl = parseFloat(pos.position.unrealizedPnl);
        
        
        return (
          <View key={idx} style={styles.positionItem}>
            <View style={styles.positionHeader}>
              <Text style={styles.coinText}>{pos.position.coin}-PERP</Text>
              <Text style={styles.leverageText}>
                {pos.position.leverage.type} {pos.position.leverage.value}x
              </Text>
              <View style={styles.pnlContainer}>
                <Text
                  style={[
                    styles.pnlText,
                    pnl < 0 ? styles.negative : styles.positive,
                  ]}
                >
                  {pnl.toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.pnlPercent,
                    pnl < 0 ? styles.negative : styles.positive,
                  ]}
                >
                  {parseFloat(pos.position.returnOnEquity).toFixed(2)}%
                </Text>
              </View>
            </View>
            <View style={styles.detailsRow}>
              <View style={styles.detailsColumn}>
                <DetailRow label="Size (BTC)" value={pos.position.szi} />
                <DetailRow
                  label="Margin (USDT)"
                  value={pos.position.marginUsed}
                />
                <DetailRow
                  label="Margin Ratio"
                  value={`${(
                    (parseFloat(pos.position.marginUsed) /
                      (parseFloat(pos.position.szi) *
                        parseFloat(pos.position.entryPx))) *
                    100
                  ).toFixed(2)}%`}
                />
              </View>
              <View style={styles.detailsColumn}>
                <DetailRow label="Entry Price" value={pos.position.entryPx} />
                <DetailRow label="Mark Price" value={markPx} />
                <DetailRow
                  label="Liq. Price"
                  value={
                    pos.position.liquidationPx !== null 
                      ? parseFloat(pos.position.liquidationPx).toPrecision(5) 
                      : '-' 
                  } 
                />
              </View>
            </View>
            <View style={styles.actionRow}>
              <Text style={styles.leverageLabel}>
                Leverage {pos.position.leverage.value}x
              </Text>
              <TouchableOpacity style={styles.tpslButton}>
                <Text style={styles.tpslText}>TP/SL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => closePosition(pos.position.coin)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
    </View>

  );

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  const renderScene = SceneMap({
    orders: renderOrders,
    positions: renderPositions,
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
  tabIndicator: { backgroundColor: "#00C087" },
  tabLabel: { color: "#8E8E93", fontWeight: "500" },
  ordersContainer: { flex: 1, backgroundColor: "#13141B" },
  
  cancelAllButton: { justifyContent: "center" },
  cancelAllText: { color: "#8E8E93", fontSize: 14 },
  orderItem: {
    backgroundColor: "#13141B",
    margin: 8,
    borderRadius: 4,
    padding: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderCoin: { color: "#8E8E93", fontWeight: "500" },
  orderType: { color: "#8E8E93", fontSize: 12 },
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
  orderActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  chaseButton: {
    backgroundColor: "#1E1F26",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 3,
  },
  chaseButtonText: { color: "#8E8E93", fontSize: 12 },
  cancelButtonSmall: {
    backgroundColor: "#1E1F26",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 3,
  },
  positionsContainer: { flex: 1, backgroundColor: "#13141B" },
  positionItem: {
    backgroundColor: "#13141B",
    margin: 8,
    borderRadius: 4,
    padding: 12,
  },
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  coinText: { color: "#FFFFFF", fontWeight: "500" },
  leverageText: { color: "#8E8E93", fontSize: 12 },
  pnlContainer: { alignItems: "flex-end" },
  pnlText: { fontSize: 14, fontWeight: "500", color: "#FF3B30" },
  pnlPercent: { fontSize: 12, color: "#FF3B30" },
  negative: { color: "#FF3B30" },
  positive: { color: "#00C087" },
  detailsRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  detailsColumn: { flex: 1, gap: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { color: "#8E8E93", fontSize: 12 },
  detailValue: { color: "#FFFFFF", fontSize: 12 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  leverageLabel: { color: "#8E8E93", fontSize: 12 },
  tpslButton: { backgroundColor: "#1E1F26", padding: 6, borderRadius: 3 },
  tpslText: { color: "#8E8E93", fontSize: 12 },
  closeButton: { backgroundColor: "#1E1F26", padding: 6, borderRadius: 3 },
  closeButtonText: { color: "#8E8E93", fontSize: 12 },
  statusText: { color: "#8E8E93", textAlign: "center", margin: 8 },
  ordersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#13141B",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: "#1E1F26",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1F26",
  },
  filterText: {
    color: "#8E8E93",
    fontSize: 14,
  },
  positionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#13141B",
  },
  closeAllButton: { 
    justifyContent: "center",
    backgroundColor: "#1E1F26",
    padding: 6,
    borderRadius: 3,
  },
  closeAllText: { 
    color: "#8E8E93", 
    fontSize: 14 
  },
});

export default OpenOrdersPositionsTabs;
