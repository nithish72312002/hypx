import React, { useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSpotName } from "@/hooks/useSpotName";
import TradingViewChart from "@/components/TradingViewChart";
import PerpAssetOverview from "@/components/assetoverview/PerpAssetOverview";
import SpotAssetOverview from "@/components/assetoverview/SpotAssetOverview";
import OrderbookAndTrades from "@/components/OrderbookAndTrades";

const DetailsPage: React.FC = () => {
  const { symbol } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const isSpot = symbol?.includes("@") || symbol?.includes("/");
  const { name, isLoading } = useSpotName(isSpot ? symbol?.toString() : undefined);
  const sdkSymbol = name?.toUpperCase();

  useEffect(() => {
    // Set empty title initially while loading
    navigation.setOptions({ title: '' });
    
    if (!isLoading) {
      const displayName = isSpot && name ? name.toUpperCase() : symbol?.toString().toUpperCase();
      navigation.setOptions({ title: displayName });
    }
  }, [symbol, name, isSpot, navigation, isLoading]);

  const content = (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        {isSpot ? (
          <SpotAssetOverview symbol={symbol?.toString() || ""} />
        ) : (
          <PerpAssetOverview symbol={symbol?.toString() || ""} />
        )}

        <View style={styles.chartSection}>
          <TradingViewChart symbol={symbol?.toString() || "BTC"} />
        </View>

        <OrderbookAndTrades symbol={symbol?.toString() || ""} />
      </ScrollView>
      
      <View style={styles.tradeButtonContainer}>
        <TouchableOpacity 
          style={styles.tradeButton}
          activeOpacity={0.7}
          onPress={() => {
            if (isSpot) {
              router.push({
                pathname: "/(tabs)/trade",
                params: { 
                  symbol: symbol?.toString() || '',
                  sdkSymbol: sdkSymbol || ''
                }
              });
            } else {
              router.push({
                pathname: "/(tabs)/futures",
                params: { 
                  symbol: symbol?.toString() || ''
                }
              });
            }
          }}
        >
          <Text style={styles.tradeButtonText}>Trade {isSpot ? 'Spot' : 'Futures'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return isLoading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#00FF88" />
    </View>
  ) : content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    flex: 1,
  },
  chartSection: {
    height: 380,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  tradeButtonContainer: {
    padding: 16,
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  tradeButton: {
    backgroundColor: "#00FF88",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  tradeButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DetailsPage;