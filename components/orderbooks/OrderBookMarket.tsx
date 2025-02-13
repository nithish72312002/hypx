import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, Text } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface OrderBookProps {
  symbol: string; // Symbol of the asset (e.g., "BTC/USDT")
}

interface OrderBookLevel {
  px: number; // Price
  sz: number; // Size
  barWidth: string; // Bar width as a percentage
  cumulative: number; // Cumulative size
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
      if (data.coin !== symbol) {
        return; // Ignore data for other symbols
      }

      if (data?.levels && Array.isArray(data.levels)) {
        const [bidsData, asksData] = data.levels;
        
        // Calculate cumulative amounts
        let cumulativeBidSize = 0;
        const processedBids = bidsData.slice(0, 25).map((level: any) => {
          cumulativeBidSize += parseFloat(level.sz);
          return {
            px: parseFloat(level.px),
            sz: parseFloat(level.sz),
            cumulative: cumulativeBidSize
          };
        });

        let cumulativeAskSize = 0;
        const processedAsks = asksData.slice(0, 25).map((level: any) => {
          cumulativeAskSize += parseFloat(level.sz);
          return {
            px: parseFloat(level.px),
            sz: parseFloat(level.sz),
            cumulative: cumulativeAskSize
          };
        });

        // Find max cumulative size for percentage calculation
        const maxCumulative = Math.max(cumulativeBidSize, cumulativeAskSize);

        setBids(
          processedBids.map((level: any) => ({
            px: level.px,
            sz: level.sz,
            barWidth: `${(level.cumulative / maxCumulative) * 100}%`,
            cumulative: level.cumulative
          }))
        );

        setAsks(
          processedAsks.map((level: any) => ({
            px: level.px,
            sz: level.sz,
            barWidth: `${(level.cumulative / maxCumulative) * 100}%`,
            cumulative: level.cumulative
          }))
        );
      }
    };

    const allMidsListener = (data: any) => {
      if (data?.mids && data.mids[symbol]) {
        setMidPrice(parseFloat(data.mids[symbol]));
      }
    };

    wsManager.subscribe("l2Book", { type: "l2Book", coin: symbol }, orderBookListener);
    wsManager.subscribe("allMids", { type: "allMids" }, allMidsListener);

    return () => {
      wsManager.unsubscribe("l2Book", { type: "l2Book", coin: symbol }, orderBookListener);
      wsManager.unsubscribe("allMids", { type: "allMids" }, allMidsListener);
    };
  }, [symbol]);

  const renderBidRow = useCallback(
    (item: OrderBookLevel, index: number) => {
      const priceDecimals = calculateDecimals(item.px);
      const sizeDecimals = calculateDecimals(item.sz);

      return (
        <View style={styles.row} key={`bid-${index}`}>
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

  const renderAskRow = useCallback(
    (item: OrderBookLevel, index: number) => {
      const priceDecimals = calculateDecimals(item.px);
      const sizeDecimals = calculateDecimals(item.sz);

      return (
        <View style={styles.row} key={`ask-${index}`}>
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
        <Text
          style={[styles.text, styles.midText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {midPrice !== null ? formatNumberDynamic(midPrice) : "--"}
        </Text>
        <Text style={[styles.text, styles.headerText]}>Asks</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.column}>
          {bids.map((bid, index) => renderBidRow(bid, index))}
        </View>

        <View style={styles.divider} />

        <View style={styles.column}>
          {asks.map((ask, index) => renderAskRow(ask, index))}
        </View>
      </View>
    </View>
  );
};

export default OrderBookMarket;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1C1C",
    opacity: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1C1C1C",
    opacity: 1,
  },
  body: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#1C1C1C",
    opacity: 1,
  },
  column: {
    flex: 1,
    backgroundColor: "#1C1C1C",
  },
  divider: {
    display: 'none',
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    height: 24,
    paddingHorizontal: 16,
    zIndex: 1,
    backgroundColor: "#1C1C1C",
  },
  bidBar: {
    position: "absolute",
    right: 0,
    height: "100%",
    backgroundColor: "rgba(22, 199, 132, 0.1)",
    zIndex: -1,
  },
  askBar: {
    position: "absolute",
    left: 0,
    height: "100%",
    backgroundColor: "rgba(234, 57, 67, 0.1)",
    zIndex: -1,
  },
  text: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  headerText: {
    color: "#808A9D",
    fontSize: 13,
    flex: 1,
    textAlign: "center",
  },
  bidText: {
    color: "#16C784",
    marginHorizontal: 6,
  },
  askText: {
    color: "#EA3943",
    marginHorizontal: 6,
  },
  midText: {
    flex: 2,
    color: "#808A9D",
    fontSize: 13,
    textAlign: "center",
  },
});
