import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface PerpAssetData {
  coin: string;
  markPx: string; // Current market price
  prevDayPx: string; // Previous day's closing price
  dayNtlVlm: string; // 24h notional volume
  dayBaseVlm: string; // 24h base volume
  midPx: string; // Mid price
  funding: string; // Funding rate
  openInterest: string; // Open interest
  premium: string; // Premium
  oraclePx: string; // Oracle price
}

interface PerpAssetOverviewProps {
  symbol: string;
}

const PerpAssetOverview: React.FC<PerpAssetOverviewProps> = ({ symbol }) => {
  const [data, setData] = useState<PerpAssetData | null>(null);

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const perpAssetListener = (response: any) => {

      if (response?.coin === symbol) {
        const ctx = response.ctx;
        setData({
          coin: response.coin,
          markPx: ctx.markPx,
          prevDayPx: ctx.prevDayPx,
          dayNtlVlm: ctx.dayNtlVlm,
          dayBaseVlm: ctx.dayBaseVlm,
          midPx: ctx.midPx,
          funding: ctx.funding,
          openInterest: ctx.openInterest,
          premium: ctx.premium,
          oraclePx: ctx.oraclePx,
        });
      }
    };

    console.log(`Subscribing to activeAssetCtx for symbol: ${symbol}`);

    // Subscribe to activeAssetCtx
    wsManager.subscribe(
      "activeAssetCtx",
      { type: "activeAssetCtx", coin: symbol },
      perpAssetListener
    );

    return () => {
      console.log(`Unsubscribing from activeAssetCtx for symbol: ${symbol}`);
      wsManager.unsubscribe(
        "activeAssetCtx",
        { type: "activeAssetCtx", coin: symbol },
        perpAssetListener
      );
    };
  }, [symbol]);

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading perp asset data...</Text>
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
      <View style={styles.priceContainer}>
        <Text style={[styles.currentPrice, isPriceUp ? styles.greenText : styles.redText]}>
          {parseFloat(data.markPx)}
        </Text>
        <Text style={styles.smallText}>{`$${parseFloat(data.oraclePx)}`}</Text>
        <Text style={[styles.changeText, isPriceUp ? styles.greenText : styles.redText]}>
          {isPriceUp ? "+" : ""}
          {priceChange.toFixed(2)}%
        </Text>
      </View>
      <View style={styles.infoContainer}>
      
        <View>
          <Text style={styles.infoLabel}>Open Interest</Text>
          <Text style={styles.infoValue}>{parseFloat(data.openInterest).toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.infoLabel}>24h Volume</Text>
          <Text style={styles.infoValue}>{parseFloat(data.dayNtlVlm).toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.infoLabel}>Funding Rate</Text>
          <Text style={styles.infoValue}>{parseFloat(data.funding)}</Text>
        </View>   
      </View>
    </View>
  );
};

export default PerpAssetOverview;

const styles = StyleSheet.create({
  container: {
    padding: 10,
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
    marginBottom: 20,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: "bold",
  },
  smallText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  changeText: {
    fontSize: 16,
    fontWeight: "bold",
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
  infoLabel: {
    color: "#AAAAAA",
    fontSize: 12,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
});
