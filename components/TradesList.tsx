import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, Text } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface Trade {
  time: number;
  px: string; // Price as string (to handle any dynamic precision)
  sz: string; // Size as string
  side: string; // "B" for buy, "S" for sell
}

interface TradesListProps {
  symbol: string; // Coin symbol (e.g., "BTC")
}

const TradesList: React.FC<TradesListProps> = ({ symbol }) => {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const tradesListener = (data: any) => {
      if (Array.isArray(data)) {
        const parsedTrades = data.map((trade: any) => ({
          time: trade.time,
          px: trade.px, // Directly using price from the data
          sz: trade.sz, // Directly using size from the data
          side: trade.side, // "B" or "S"
        }));

        // Add new trades at the beginning and limit to the latest 50 trades
        setTrades((prevTrades) => [...parsedTrades, ...prevTrades].slice(0, 50));
      } else {
        console.warn("Invalid trades data format:", data);
      }
    };

    // Subscribe to trades for the given symbol
    wsManager.subscribe(
      "trades",
      { type: "trades", coin: symbol },
      tradesListener
    );

    return () => {
      // Unsubscribe from trades
      wsManager.unsubscribe(
        "trades",
        { type: "trades", coin: symbol },
        tradesListener
      );
    };
  }, [symbol]);

  const renderTrade = useCallback(
    (trade: Trade, index: number) => (
      <View style={styles.row} key={`trade-${index}`}>
        <Text style={[styles.cell, styles.text]}>
          {new Date(trade.time).toLocaleTimeString()}
        </Text>
        <Text
          style={[
            styles.cell,
            styles.text,
            trade.side === "B" ? styles.buyText : styles.sellText,
          ]}
        >
          {trade.px}
        </Text>
        <Text style={[styles.cell, styles.text]}>{trade.sz}</Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.cell, styles.headerText]}>Time</Text>
        <Text style={[styles.cell, styles.headerText]}>Price</Text>
        <Text style={[styles.cell, styles.headerText]}>Size</Text>
      </View>
      {/* Render trades without a scrollable container */}
      <View style={styles.listContainer}>
        {trades.map((trade, index) => renderTrade(trade, index))}
      </View>
    </View>
  );
};

export default TradesList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  listContainer: {
    paddingVertical: 10,
    // Remove any scrollable behavior by not using a ScrollView or FlatList.
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  cell: {
    flex: 1,
    textAlign: "center", // Center text in each column
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  buyText: {
    color: "#4CAF50", // Green for buy
  },
  sellText: {
    color: "#FF4D4D", // Red for sell
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#FFD700",
    textAlign: "center", // Center header text
  },
});
