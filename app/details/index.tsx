import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSpotName } from "@/hooks/useSpotName";
import TradingViewChart from "@/components/TradingViewChart";
import OrderBookMarket from "@/components/orderbooks/OrderBookMarket";
import PerpAssetOverview from "@/components/PerpAssetOverview";
import SpotAssetOverview from "@/components/SpotAssetOverview";
import TradesList from "@/components/TradesList";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

const DetailsPage: React.FC = () => {
  const { symbol } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const isSpot = symbol?.includes("@") || symbol?.includes("/");
  const { name, isLoading } = useSpotName(isSpot ? symbol?.toString() : undefined);
  const sdkSymbol = name?.toUpperCase();
  
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
  }, [OrderBookMemo, TradesListMemo]);

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
                  <TouchableOpacity 
                    style={styles.tabWrapper}
                    onPress={onPress}
                  >
                    <View style={[styles.tab, isActive && styles.activeTab]}>
                      <Text style={[styles.tabLabel, isActive ? styles.activeText : styles.inactiveText]}>
                        {route.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
          removeClippedSubviews={false}
          lazy={false}
        />
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
  tradeButtonContainer: {
    padding: 16,
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  tradeButton: {
    backgroundColor: "#00FF88",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  tradeButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default React.memo(DetailsPage);