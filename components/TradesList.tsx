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
    backgroundColor: "#1A1C24",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContainer: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 16,
    height: 24,
  },
  cell: {
    flex: 1,
    textAlign: "left",
  },
  text: {
    color: "#808A9D",
    fontSize: 13,
    fontFamily: 'monospace',
  },
  buyText: {
    color: "#16C784",
  },
  sellText: {
    color: "#EA3943",
  },
  headerText: {
    color: "#808A9D",
    fontSize: 13,
  },
});
