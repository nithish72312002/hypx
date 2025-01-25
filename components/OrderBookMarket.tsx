import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ListRenderItem,
} from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface OrderBookProps {
  symbol: string; // Symbol of the asset (e.g., "BTC/USDT")
}

interface OrderBookLevel {
  px: number; // Price
  sz: number; // Size
  barWidth: string; // Bar width as a percentage
}

const OrderBookMarket: React.FC<OrderBookProps> = ({ symbol }) => {
  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);
  const [midPrice, setMidPrice] = useState<number | null>(null);

  const formatNumberDynamic = (num: number): string => {
    if (num === 0 || isNaN(num)) return "0";
    if (num >= 1000) {
      return num.toFixed(2); // For larger numbers, show 2 decimals
    }
    if (num >= 1) {
      return num.toFixed(4); // For numbers between 1 and 1000, show 4 decimals
    }
    return num.toFixed(6); // For smaller numbers, show 6 decimals
  };

  const calculateDecimals = (num: number): number => {
    if (!num || isNaN(num)) return 2;
    const strNum = num.toString();
    if (strNum.includes(".")) {
      return strNum.split(".")[1].length;
    }
    return 0;
  };

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const orderBookListener = (data: any) => {
      if (data?.levels && Array.isArray(data.levels)) {
        const [bidsData, asksData] = data.levels;
        const maxBidSize = Math.max(...bidsData.map((bid: any) => bid.sz), 1);
        const maxAskSize = Math.max(...asksData.map((ask: any) => ask.sz), 1);

        setBids(
          bidsData.slice(0, 15).map((level: any) => ({
            px: parseFloat(level.px),
            sz: parseFloat(level.sz),
            barWidth: `${Math.min((level.sz / maxBidSize) * 100, 100)}%`,
          }))
        );

        setAsks(
          asksData.slice(0, 15).map((level: any) => ({
            px: parseFloat(level.px),
            sz: parseFloat(level.sz),
            barWidth: `${Math.min((level.sz / maxAskSize) * 100, 100)}%`,
          }))
        );
      }
    };

    const allMidsListener = (data: any) => {
      if (data?.mids && data.mids[symbol]) {
        setMidPrice(parseFloat(data.mids[symbol]));
      }
    };

    wsManager.subscribe(
      "l2Book",
      { type: "l2Book", coin: symbol },
      orderBookListener
    );
    wsManager.subscribe("allMids", { type: "allMids" }, allMidsListener);

    return () => {
      wsManager.unsubscribe(
        "l2Book",
        { type: "l2Book", coin: symbol },
        orderBookListener
      );
      wsManager.unsubscribe("allMids", { type: "allMids" }, allMidsListener);
    };
  }, [symbol]);

  const renderBidRow: ListRenderItem<OrderBookLevel> = useCallback(
    ({ item }) => {
      const priceDecimals = calculateDecimals(item.px);
      const sizeDecimals = calculateDecimals(item.sz);

      return (
        <View style={styles.row}>
          <View style={[styles.bidBar, { width: item.barWidth }]} />
          <Text style={[styles.text, styles.bidText]}>
            {item.px.toFixed(priceDecimals)}
          </Text>
          <Text style={[styles.text, styles.bidText]}>
            {item.sz.toFixed(sizeDecimals)}
          </Text>
        </View>
      );
    },
    []
  );

  const renderAskRow: ListRenderItem<OrderBookLevel> = useCallback(
    ({ item }) => {
      const priceDecimals = calculateDecimals(item.px);
      const sizeDecimals = calculateDecimals(item.sz);

      return (
        <View style={styles.row}>
          <View style={[styles.askBar, { width: item.barWidth }]} />
          <Text style={[styles.text, styles.askText]}>
            {item.px.toFixed(priceDecimals)}
          </Text>
          <Text style={[styles.text, styles.askText]}>
            {item.sz.toFixed(sizeDecimals)}
          </Text>
        </View>
      );
    },
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.text, styles.headerText]}>Bids</Text>
        <Text style={[styles.text, styles.midText]} numberOfLines={1} ellipsizeMode="tail">
          {midPrice !== null ? formatNumberDynamic(midPrice) : "--"}
        </Text>
        <Text style={[styles.text, styles.headerText]}>Asks</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.column}>
          <FlatList
            data={bids}
            keyExtractor={(_, index) => `bid-${index}`}
            renderItem={renderBidRow}
            maxToRenderPerBatch={15}
            initialNumToRender={15}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.column}>
          <FlatList
            data={asks}
            keyExtractor={(_, index) => `ask-${index}`}
            renderItem={renderAskRow}
            maxToRenderPerBatch={15}
            initialNumToRender={15}
          />
        </View>
      </View>
    </View>
  );
};

export default OrderBookMarket;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 10,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  midText: {
    flex: 2,
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  body: {
    flexDirection: "row",
    width: "100%",
    marginTop: 10,
  },
  column: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: "#333",
    marginHorizontal: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    marginVertical: 2,
    height: 30,
  },
  bidBar: {
    position: "absolute",
    left: 0,
    height: "100%",
    backgroundColor: "green",
    opacity: 0.3,
  },
  askBar: {
    position: "absolute",
    left: 0,
    height: "100%",
    backgroundColor: "red",
    opacity: 0.3,
  },
  text: {
    fontSize: 14,
    fontWeight: "bold",
  },
  bidText: {
    color: "#4CAF50",
    marginHorizontal: 6,
  },
  askText: {
    color: "#FF4D4D",
    marginHorizontal: 6,
  },
});
