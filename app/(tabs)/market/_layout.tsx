import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import Spot from "./spot";
import Perps from "./perps";

const MarketLayout: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "spot", title: "Spot" },
    { key: "perps", title: "Perps" },
  ]);

  const renderScene = SceneMap({
    spot: Spot,
    perps: Perps,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      style={styles.tabBar}
      indicatorStyle={styles.indicator}
      labelStyle={styles.tabLabel}
      activeColor="#fff"
      inactiveColor="#888"
    />
  );

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        initialLayout={{ width: 360 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  tabBar: {
    backgroundColor: "#222",
  },
  indicator: {
    backgroundColor: "#fff",
    height: 3,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default MarketLayout;
