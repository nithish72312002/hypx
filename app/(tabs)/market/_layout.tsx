import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Spot from "./spot";
import Perps from "./perps";

const MarketLayout: React.FC = () => {
  const params = useLocalSearchParams();
  const [index, setIndex] = useState(params.tab === 'perps' ? 1 : 0);
  const [routes] = useState([
    { key: "spot", title: "Spot" },
    { key: "perps", title: "Perps" },
  ]);

  useEffect(() => {
    if (params.tab === 'perps') {
      setIndex(1);
    }
  }, [params.tab]);

  const renderScene = SceneMap({
    spot: Spot,
    perps: Perps,
  });

  const renderTabBar = (props: any) => (
    <View style={styles.tabBar}>
      {props.navigationState.routes.map((route, i) => {
        const isFocused = props.navigationState.index === i;
        return (
          <View
            key={route.key}
            style={[styles.tabItem, isFocused && styles.activeTab]}
          >
            <Text
              style={[styles.tabText, isFocused && styles.activeTabText]}
            >
              {route.title}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        initialLayout={{ width: 360 }}
        style={styles.scene}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1C24",
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1C24',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
    height: 40,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    maxWidth: 100,
  },
  tabText: {
    color: '#808A9D',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#F7B84B',
  },
  scene: {
    flex: 1,
  },
});

export default MarketLayout;
