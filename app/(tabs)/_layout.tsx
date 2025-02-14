import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "expo-router";
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// Import your screens
import HomeScreen from '.';
import MarketScreen from './market/_layout';
import TradeScreen from './trade/[symbol]';
import FuturesScreen from './futures/[symbol]';
import WalletScreen from './wallet/_layout';

const ROUTES = [
  { key: 'home', title: 'Home', icon: 'home', component: HomeScreen },
  { key: 'market', title: 'Markets', icon: 'bar-chart', component: MarketScreen },
  { key: 'trade', title: 'Trade', icon: 'trending-up', component: TradeScreen },
  { key: 'futures', title: 'Futures', icon: 'time', component: FuturesScreen },
  { key: 'wallet', title: 'Assets', icon: 'wallet', component: WalletScreen },
];

export default function TabLayout() {
  const account = useActiveAccount();
  const address = account?.address;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');

  const handleTabPress = (tabKey: string) => {
    if (tabKey === 'wallet' && !address) {
      router.push("/loginpage");
      return;
    }
    setActiveTab(tabKey);
  };

  const ActiveComponent = ROUTES.find(route => route.key === activeTab)?.component || HomeScreen;

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
        <View style={styles.content}>
          <ActiveComponent />
        </View>
        <SafeAreaView edges={['bottom']}>
          <View style={styles.tabBar}>
            {ROUTES.map((route) => (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(route.key)}
              >
                <Ionicons 
                  name={route.icon as any} 
                  size={24} 
                  color={activeTab === route.key ? '#F0B90B' : '#808A9D'} 
                />
                <Text style={[
                  styles.tabLabel,
                  { color: activeTab === route.key ? '#F0B90B' : '#808A9D' }
                ]}>
                  {route.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1C24',
    borderTopColor: '#2A2D3A',
    borderTopWidth: 1,
    height: 60,
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});