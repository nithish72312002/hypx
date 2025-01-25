import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import OrderBookMarket from "@/components/OrderBookMarket";

import SpotAssetOverview from "@/components/SpotAssetOverview";
import PerpAssetOverview from "@/components/PerpAssetOverview";

const DetailsPage: React.FC = () => {
  const { symbol } = useLocalSearchParams(); // Get the symbol parameter
  const navigation = useNavigation();

  useEffect(() => {
    if (symbol) {
      navigation.setOptions({
        title: `${symbol.toUpperCase()}`,
      });
    }
  }, [symbol, navigation]);

  const isSpot = symbol?.includes("@") || symbol?.includes("/"); // Check if symbol is a spot asset

  return (
    <View style={styles.container}>
      {/* Chart Container */}
      <View style={styles.chartContainer}>
        {isSpot ? (
          <SpotAssetOverview symbol={symbol || ""} />
        ) : (
          <PerpAssetOverview symbol={symbol || ""} />
        )}
      </View>

      {/* OrderBook */}
      <View style={styles.orderBookContainer}>
        <OrderBookMarket symbol={symbol || ""} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  chartContainer: {
    height: 400, // Adjust as needed
    marginBottom: 16,
  },
  orderBookContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
});

export default DetailsPage;
