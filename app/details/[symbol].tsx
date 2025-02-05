import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import TradingViewChart from "@/components/TradingViewChart";
import OrderBookMarket from "@/components/orderbooks/OrderBookMarket";
import PerpAssetOverview from "@/components/PerpAssetOverview";
import SpotAssetOverview from "@/components/SpotAssetOverview";
import TradesList from "@/components/TradesList";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

const DetailsPage: React.FC = () => {
  const { symbol } = useLocalSearchParams();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: `${symbol?.toString().toUpperCase()}` });
  }, [symbol]);

  const isSpot = symbol?.includes("@") || symbol?.includes("/");

  // Setup for TabView
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "orderbook", title: "Order Book" },
    { key: "trades", title: "Trades" },
  ]);

  // Memoized components
  const OrderBookMemo = useCallback(
    () => <OrderBookMarket symbol={symbol?.toString() || ""} />,
    [symbol]
  );

  const TradesListMemo = useCallback(
    () => <TradesList symbol={symbol?.toString() || ""} />,
    [symbol]
  );

  // Custom scene renderer
  const renderScene = useCallback(({ route }: { route: any }) => {
    switch (route.key) {
      case "orderbook":
        return <OrderBookMemo />;
      case "trades":
        return <TradesListMemo />;
      default:
        return null;
    }
  }, []);

  

  return (
    <View style={styles.container}>
      {/* Overview Section */}
      <View style={styles.section}>
        {isSpot ? (
          <SpotAssetOverview symbol={symbol?.toString() || ""} />
        ) : (
          <PerpAssetOverview symbol={symbol?.toString() || ""} />
        )}
      </View>

      {/* Chart Section */}
      <View style={styles.chartSection}>
        <TradingViewChart symbol={symbol?.toString() || "BTC"} />
      </View>

      {/* Tabs Section with Fixed Height */}
      <View style={styles.tabSection}>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: Dimensions.get("window").width }}
          renderTabBar={(props) => (
            <TabBar
              {...props}
              indicatorStyle={{ backgroundColor: "white" }}
              style={{ backgroundColor: "black" }}
              labelStyle={{ color: "white" }}
            />
          )}
          removeClippedSubviews={false}
          lazy={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",

  },
  section: {
    padding: 1,
  },
  chartSection: {
    height: 380,
  },
  tabSection: {
    flex: 1,
    minHeight: 400,
  },
});

export default React.memo(DetailsPage);