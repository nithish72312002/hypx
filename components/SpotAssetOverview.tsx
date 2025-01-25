import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface SpotAssetData {
  coin: string;
  markPx: string;
  prevDayPx: string;
  dayNtlVlm: string;
  totalSupply: string;
}

interface SpotAssetOverviewProps {
  symbol: string;
}

const SpotAssetOverview: React.FC<SpotAssetOverviewProps> = ({ symbol }) => {
  const [data, setData] = useState<SpotAssetData | null>(null);

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const spotAssetListener = (response: any) => {
      if (response?.coin === symbol) {
        const ctx = response.ctx;
        setData({
          coin: response.coin,
          markPx: ctx.markPx,
          prevDayPx: ctx.prevDayPx,
          dayNtlVlm: ctx.dayNtlVlm,
          totalSupply: ctx.totalSupply,
        });
      }
    };

    console.log(`Subscribing to activeSpotAssetCtx for symbol: ${symbol}`);

    wsManager.subscribe(
      "activeSpotAssetCtx",
      { type: "activeAssetCtx", coin: symbol },
      spotAssetListener
    );

    return () => {
      console.log(`Unsubscribing from activeSpotAssetCtx for symbol: ${symbol}`);
      wsManager.unsubscribe(
        "activeSpotAssetCtx",
        { type: "activeAssetCtx", coin: symbol },
        spotAssetListener
      );
    };
  }, [symbol]);

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Calculate 24h change percentage
  const priceChange =
    ((parseFloat(data.markPx) - parseFloat(data.prevDayPx)) /
      parseFloat(data.prevDayPx)) *
    100;

  const isPriceUp = priceChange > 0;

  return (
    <View style={styles.container}>
      {/* Price and Percentage */}
      <View style={styles.priceContainer}>
        <Text style={[styles.currentPrice, isPriceUp ? styles.greenText : styles.redText]}>
          {data.markPx}
        </Text>
        <Text style={[styles.changeText, isPriceUp ? styles.greenText : styles.redText]}>
          {isPriceUp ? "+" : ""}
          {priceChange.toFixed(2)}%
        </Text>
      </View>

      {/* Additional Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>24h Vol</Text>
          <Text style={styles.infoValue}>{parseFloat(data.dayNtlVlm).toFixed(2)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Total Supply</Text>
          <Text style={styles.infoValue}>{parseFloat(data.totalSupply).toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

export default SpotAssetOverview;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#121212",
    borderRadius: 8,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
  },
  priceContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: "bold",
  },
  changeText: {
    fontSize: 18,
    fontWeight: "600",
  },
  greenText: {
    color: "#4CAF50",
  },
  redText: {
    color: "#FF4D4D",
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  infoItem: {
    alignItems: "center",
    flex: 1,
  },
  infoLabel: {
    color: "#AAAAAA",
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
