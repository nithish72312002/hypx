import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface OrderBookProps {
  symbol: string; // Symbol of the asset (e.g., "BTC")
  containerWidth?: number; // Optional container width
  containerHeight?: number; // Optional container height
}

const OrderBook: React.FC<OrderBookProps> = ({
  symbol,
  containerWidth = 160, // Default width
  containerHeight = 300, // Default height
}) => {
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const styles = dynamicStyles(containerWidth, containerHeight);

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const orderBookListener = (data: any) => {
      if (data.levels && Array.isArray(data.levels)) {
        const [bidsData, asksData] = data.levels;

        setBids(
          bidsData.slice(0, 7).map((level: any) => ({
            px: parseFloat(level.px),
            sz: parseFloat(level.sz),
          }))
        );

        setAsks(
          asksData.slice(0, 7).map((level: any) => ({
            px: parseFloat(level.px),
            sz: parseFloat(level.sz),
          }))
        );
      }

      setIsLoading(false);
    };

    const allMidsListener = (data: any) => {
      if (data?.mids && data.mids[symbol]) {
        setMidPrice(parseFloat(data.mids[symbol]));
      } else {
        setMidPrice(NaN);
      }
    };

    wsManager.subscribe(
      "l2Book",
      { type: "l2Book", coin: symbol, nSigFigs: 5 },
      orderBookListener
    );

    wsManager.subscribe("allMids", { type: "allMids" }, allMidsListener);

    return () => {
      wsManager.unsubscribe(
        "l2Book",
        { type: "l2Book", coin: symbol, nSigFigs: 5 },
        orderBookListener
      );
      wsManager.unsubscribe("allMids", { type: "allMids" }, allMidsListener);
    };
  }, [symbol]);

  const renderOrder = (
    { item }: { item: any; index: number },
    isAsk: boolean
  ) => {
    if (!item || typeof item.px !== "number" || typeof item.sz !== "number") {
      return null; // Skip rendering invalid rows
    }

    const maxSize = isAsk
      ? Math.max(...asks.map((ask) => ask.sz)) || 1
      : Math.max(...bids.map((bid) => bid.sz)) || 1;

    const barWidth = `${Math.min(item.sz / maxSize, 1) * 100}%`;

    return (
      <View style={[styles.orderRow, { marginVertical: 2 }]}>
        <View
          style={[
            styles.bar,
            isAsk ? styles.askBar : styles.bidBar,
            { width: barWidth },
          ]}
        />
        <Text style={[styles.priceText, isAsk ? styles.askText : styles.bidText]}>
          {item.px.toFixed(2)}
        </Text>
        <Text style={styles.amountText}>{item.sz.toFixed(2)}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading order book...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!bids.length && !asks.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No data available for {symbol}.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.orderBookContainer}>
        <FlatList
          data={asks}
          keyExtractor={(_, index) => `ask-${index}`}
          renderItem={(item) => renderOrder(item, true)}
          scrollEnabled={false} // Disable scrolling
          inverted // Show highest asks at the top
        />
        <View style={styles.midPriceContainer}>
          <Text style={styles.midPriceText}>
            {midPrice !== null ? midPrice.toFixed(4) : "NaN"}
          </Text>
        </View>
        <FlatList
          data={bids}
          keyExtractor={(_, index) => `bid-${index}`}
          renderItem={(item) => renderOrder(item, false)}
          scrollEnabled={false} // Disable scrolling
        />
      </View>
    </View>
  );
};

const dynamicStyles = (containerWidth: number, containerHeight: number) =>
  StyleSheet.create({
    container: {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: "#1A1A1D",
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    orderBookContainer: {
      flex: 1,
      width: "90%",
    },
    midPriceContainer: {
      backgroundColor: "#333",
      borderRadius: 5,
      paddingVertical: 4,
      marginVertical: 8,
      alignItems: "center",
    },
    midPriceText: {
      fontSize: containerWidth * 0.07,
      fontWeight: "bold",
      color: "#FFD700", // Gold color for visibility
    },
    errorText: {
      color: "red",
      textAlign: "center",
    },
    orderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: containerHeight * 0.04,
      paddingHorizontal: 6,
      position: "relative",
    },
    bar: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      opacity: 0.3,
      borderRadius: 4,
    },
    askBar: {
      backgroundColor: "#FF4D4D",
    },
    bidBar: {
      backgroundColor: "#4CAF50",
    },
    priceText: {
      fontSize: containerWidth * 0.05,
      fontWeight: "bold",
    },
    amountText: {
      fontSize: containerWidth * 0.05,
      color: "#fff",
      textAlign: "right",
    },
    loadingText: {
      fontSize: containerWidth * 0.04,
      color: "#fff",
    },
  });

export default OrderBook;
