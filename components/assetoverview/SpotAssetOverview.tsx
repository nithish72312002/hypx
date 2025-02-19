import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface SpotAssetData {
  coin: string;
  markPx: string;
  prevDayPx: string;
  dayNtlVlm: string;
  totalSupply: string;
  high24h: string;
  low24h: string;
}

interface SpotAssetOverviewProps {
  symbol: string;
}

const SpotAssetOverview: React.FC<SpotAssetOverviewProps> = ({ symbol }) => {
  const [data, setData] = useState<SpotAssetData | null>(null);

  const fetch24HourData = async () => {
    try {
      const endTime = Date.now();
      const startTime = endTime - 24 * 60 * 60 * 1000;

      const response = await fetch("https://api.hyperliquid-testnet.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "candleSnapshot",
          req: {
            coin: symbol,
            interval: "1d",
            startTime,
            endTime
          }
        }),
      });

      const candleData = await response.json();
      
      if (candleData && candleData.length > 0) {
        const todayCandle = candleData[candleData.length - 1];
        
        setData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            high24h: todayCandle.h,
            low24h: todayCandle.l,
          };
        });
      }
    } catch (error) {
      console.error("Error fetching 24h data:", error);
    }
  };

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const spotAssetListener = (response: any) => {
      if (response?.coin === symbol) {
        const ctx = response.ctx;
        setData(prevData => ({
          ...prevData,
          coin: response.coin,
          markPx: ctx.markPx,
          prevDayPx: ctx.prevDayPx,
          dayNtlVlm: ctx.dayNtlVlm,
          totalSupply: ctx.totalSupply,
          high24h: prevData?.high24h || "0",
          low24h: prevData?.low24h || "0",
        }));
      }
    };

    console.log(`Subscribing to activeSpotAssetCtx for symbol: ${symbol}`);

    wsManager.subscribe(
      "activeSpotAssetCtx",
      { type: "activeAssetCtx", coin: symbol },
      spotAssetListener
    );

    fetch24HourData();
    const interval = setInterval(fetch24HourData, 60000);

    return () => {
      console.log(`Unsubscribing from activeSpotAssetCtx for symbol: ${symbol}`);
      wsManager.unsubscribe(
        "activeSpotAssetCtx",
        { type: "activeAssetCtx", coin: symbol },
        spotAssetListener
      );
      clearInterval(interval);
    };
  }, [symbol]);

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading spot asset data...</Text>
      </View>
    );
  }

  const formatPrice = (price: string) => price;
  const currentPrice = parseFloat(data.markPx);
  const prevPrice = parseFloat(data.prevDayPx);
  const change = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
  const formatChange = (change: string) => `${parseFloat(change) >= 0 ? '+' : ''}${change}%`;
  const isPriceUp = parseFloat(change) >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.row}>
          {/* Left side - Price */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>{formatPrice(data.markPx)}</Text>
            <View style={styles.priceDetails}>
              <Text style={[styles.changeText, isPriceUp ? styles.greenText : styles.redText]}>
                {formatChange(change)}
              </Text>
            </View>
          </View>

          {/* Right side - Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statsColumns}>
              <View style={styles.statsColumn}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>24h High</Text>
                  <Text style={styles.statValue}>${formatPrice(data.high24h)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>24h Low</Text>
                  <Text style={styles.statValue}>${formatPrice(data.low24h)}</Text>
                </View>
              </View>
              <View style={styles.statsColumn}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>24h Volume</Text>
                  <Text style={styles.statValue}>${parseFloat(data.dayNtlVlm).toFixed(2)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Supply</Text>
                  <Text style={styles.statValue}>{parseFloat(data.totalSupply).toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SpotAssetOverview;

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
    paddingTop: 12,
  },
  statsColumns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 32,
  },
  statsColumn: {
    gap: 12,
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
