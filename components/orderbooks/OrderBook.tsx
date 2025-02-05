import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Dimensions, TouchableOpacity } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface OrderBookProps {
  symbol: string;
  onPriceSelect?: (price: number) => void;

}
const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');


const OrderBook: React.FC<OrderBookProps> = ({
  symbol,
  onPriceSelect, // Destructure the new prop

}) => {
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

 

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const orderBookListener = (data: any) => {


      if (data.coin !== symbol) {
        return; // Ignore data for other symbols
      }


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
      { type: "l2Book", coin: symbol, nSigFigs: null },
      orderBookListener
    );
    wsManager.subscribe("allMids", { type: "allMids" }, allMidsListener);

    return () => {
      wsManager.unsubscribe(
        "l2Book",
        { type: "l2Book", coin: symbol, nSigFigs: null },
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
      return null;
    }
    const maxSize =
      isAsk ? Math.max(...asks.map((ask) => ask.sz)) || 1 : Math.max(...bids.map((bid) => bid.sz)) || 1;
    const barWidth = `${Math.min(item.sz / maxSize, 1) * 100}%`;

    return (
      <TouchableOpacity
        onPress={() => {
          // When the row is tapped, call the callback with the price.
          if (onPriceSelect) {
            onPriceSelect(item.px);
          }
        }}
      >

      <View style={[styles.orderRow, { marginVertical: 2 }]}>
        <View
          style={[
            styles.bar,
            isAsk ? styles.askBar : styles.bidBar,
            { width: barWidth },
          ]}
        />
        <Text style={[styles.priceText, isAsk ? styles.askText : styles.bidText]}>
          {item.px}
        </Text>
        <Text style={styles.amountText}>{item.sz}</Text>
      </View></TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
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
          scrollEnabled={false}
          inverted
        />
        <View style={styles.midPriceContainer}>
          <Text style={styles.midPriceText}>
            {midPrice !== null ? midPrice : "NaN"}
          </Text>
        </View>
        <FlatList
          data={bids}
          keyExtractor={(_, index) => `bid-${index}`}
          renderItem={(item) => renderOrder(item, false)}
          scrollEnabled={false}
        />
      </View>
    </View>
  );
};

const styles =  StyleSheet.create({
    container: {
      width: width * 0.45,
      height: height * 0.5,
      backgroundColor: "#1E1E2F",
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    orderBookContainer: {
      flex: 1,
      width: "100%",
    },
    midPriceContainer: {
      backgroundColor: "#2E2E3A",
      borderRadius: 5,
      paddingVertical: 4,
      marginVertical: 8,
      alignItems: "center",
    },
    midPriceText: {
      fontSize: width * height * 0.000024,
      fontWeight: "bold",
      color: "#FFD700",
    },
    errorText: {
      color: "#FF6B6B",
      textAlign: "center",
    },
    orderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: height * 0.025,
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
      backgroundColor: "#FF6B6B",
    },
    bidBar: {
      backgroundColor: "#4CAF50",
    },
    priceText: {
      fontSize: width * height * 0.00003,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    amountText: {
      fontSize: width * height * 0.00003,
      color: "#FFFFFF",
      textAlign: "right",
    },
    loadingText: {
      fontSize: width * height * 0.00003,
      color: "#FFFFFF",
      marginTop: 8,
    },
    askText: {
      color: "#FF6B6B",
    },
    bidText: {
      color: "#4CAF50",
    },
  });

export default OrderBook;
