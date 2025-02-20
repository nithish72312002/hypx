import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";
import { formatLargeNumber } from "@/utils/formatters";

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
      <View style={styles.mainContent}>
        <View style={styles.row}>
          {/* Left side - Price */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>{parseFloat(data.markPx)}</Text>
            <View style={styles.priceDetails}>
              <Text style={styles.priceUSD}>${parseFloat(data.oraclePx)}</Text>
              <Text style={[styles.changeText, isPriceUp ? styles.greenText : styles.redText]}>
                {isPriceUp ? "+" : ""}{priceChange.toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Right side - Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Funding</Text>
                <Text style={styles.statValue}>{parseFloat(data.funding).toFixed(4)}%</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>24h Vol({symbol})</Text>
                <Text style={styles.statValue}>{formatLargeNumber(parseFloat(data.dayBaseVlm))}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Open Interest</Text>
                <Text style={styles.statValue}>{formatLargeNumber(parseFloat(data.openInterest))}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>24h Vol(USD)</Text>
                <Text style={styles.statValue}>{formatLargeNumber(parseFloat(data.dayNtlVlm))}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default PerpAssetOverview;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1C',
    padding: 16,
  },
  mainContent: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceSection: {
    flex: 1,
    gap: 4,
    padding: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceUSD: {
    fontSize: 14,
    color: '#808A9D',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  greenText: {
    color: '#16C784',
  },
  redText: {
    color: '#EA3943',
  },
  statsSection: {
    flex: 1,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },
  statItem: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 12,
    color: '#808A9D',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingText: {
    color: '#808A9D',
    textAlign: 'center',
  },
});
