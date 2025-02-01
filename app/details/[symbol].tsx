import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import TradingViewChart from "@/components/TradingViewChart";
import OrderBookMarket from "@/components/OrderBookMarket";
import PerpAssetOverview from "@/components/PerpAssetOverview";
import SpotAssetOverview from "@/components/SpotAssetOverview";

const DetailsPage: React.FC = () => {
  const { symbol } = useLocalSearchParams();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: `${symbol?.toString().toUpperCase()}` });
  }, [symbol]);

  const isSpot = symbol?.includes("@") || symbol?.includes("/");

  return (
    <View style={styles.container}>
      {/* Chart Overview */}
      <View style={styles.overviewContainer}>
        {isSpot ? (
          <SpotAssetOverview symbol={symbol?.toString() || ""} />
        ) : (
          <PerpAssetOverview symbol={symbol?.toString() || ""} />
        )}
      </View>

      {/* TradingView Chart */}
      <View style={styles.chartContainer}>
        <TradingViewChart symbol={symbol?.toString() || "BTC"} />
      </View>

      {/* Order Book */}
      <View style={styles.orderBookContainer}>
        <OrderBookMarket symbol={symbol?.toString() || ""} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overviewContainer: {
    padding: 12, // Add padding for spacing
  },
  chartContainer: {
    height: 380, // Fixed height for the chart
    marginBottom: 8,
  },
  orderBookContainer: {
    flex: 1, // Takes remaining space
  },
});

export default DetailsPage;