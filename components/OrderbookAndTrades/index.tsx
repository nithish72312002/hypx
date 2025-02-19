import React, { useState, useCallback } from "react";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from "react-native";
import { TabView, TabBar } from "react-native-tab-view";
import OrderBookMarket from "@/components/orderbooks/OrderBookMarket";
import TradesList from "@/components/TradesList";

interface OrderbookAndTradesProps {
  symbol: string;
}

const OrderbookAndTrades: React.FC<OrderbookAndTradesProps> = ({ symbol }) => {
  // Setup for TabView
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "orderbook", title: "Order Book" },
    { key: "trades", title: "Trades" },
  ]);

  // Memoized components
  const OrderBookMemo = useCallback(
    () => <OrderBookMarket symbol={symbol || ""} />,
    [symbol]
  );

  const TradesListMemo = useCallback(
    () => <TradesList symbol={symbol || ""} />,
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

  return (
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
  );
};

const styles = StyleSheet.create({
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

export default OrderbookAndTrades;
