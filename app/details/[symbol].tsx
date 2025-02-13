import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Dimensions, Text, Pressable, ScrollView } from "react-native";
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
    <ScrollView style={styles.container}>
      {isSpot ? (
        <SpotAssetOverview symbol={symbol?.toString() || ""} />
      ) : (
        <PerpAssetOverview symbol={symbol?.toString() || ""} />
      )}

      <View style={styles.chartSection}>
        <TradingViewChart symbol={symbol?.toString() || "BTC"} />
      </View>

      <TabView
        style={styles.tabView}
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get("window").width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            style={styles.tabBar}
            indicatorStyle={styles.indicator}
            pressColor="transparent"
            renderTabBarItem={({ route, navigationState, onPress }) => {
              const isActive = navigationState.index === routes.indexOf(route);
              return (
                <Pressable 
                  style={styles.tabWrapper}
                  onPress={onPress}
                >
                  <View style={[styles.tab, isActive && styles.activeTab]}>
                    <Text style={[styles.tabLabel, isActive ? styles.activeText : styles.inactiveText]}>
                      {route.title}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
        removeClippedSubviews={false}
        lazy={false}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  chartSection: {
    height: 380,
  },
  tabView: {
    minHeight: 600,
  },
  tabBar: {
    backgroundColor: '#171B26',
    height: 36,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    paddingLeft: 16,
  },
  tabWrapper: {
    height: 36,
    justifyContent: 'center',
    marginRight: 8,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeTab: {
    backgroundColor: '#1F2937',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '400',
    textTransform: 'none',
  },
  activeText: {
    color: '#FFFFFF',
  },
  inactiveText: {
    color: '#808A9D',
  },
  indicator: {
    height: 0,
  },
});

export default React.memo(DetailsPage);