import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import Spot from './Spot';
import FuturesLayout from './Futures';
import Overview from './Overview';
import HyperEVM from './hyperevm';
import { useActiveAccount } from 'thirdweb/react';
import { useRouter } from 'expo-router';
import SafeViewAndroid from '@/components/SafeViewAndroid/SafeViewAndroid';

const renderScene = ({ route }: { route: { key: string } }) => {
  switch (route.key) {
    case 'Overview':
      return <Overview />;
    case 'Spot':
      return <Spot />;
    case 'Futures':
      return <FuturesLayout />;
    case 'HyperEVM':
      return <HyperEVM />;
    default:
      return null;
  }
};

const WalletScreen = () => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Spot' | 'Futures' | 'HyperEVM'>('Overview');
  const [index, setIndex] = useState(0);
  const account = useActiveAccount();
  const hyberevmdisabled = true;

  const routes = [
    { key: 'Overview', title: 'Overview' },
    { key: 'Spot', title: 'Spot' },
    { key: 'Futures', title: 'Futures' },
    ...(hyberevmdisabled ? [] : [{ key: 'HyperEVM', title: 'HyperEVM' }])
  ];

  const handleIndexChange = (newIndex: number) => {
    setIndex(newIndex);
    setActiveTab(routes[newIndex].key as 'Overview' | 'Spot' | 'Futures' | 'HyperEVM');
  };

  return (
    <SafeAreaView style={[SafeViewAndroid.AndroidSafeArea, styles.container]} >
      {/* Header Section */}
      <View style={styles.tabContainer}>
        {routes.map((route, i) => (
          <TouchableOpacity
            key={route.key}
            style={[styles.tabButton, activeTab === route.key && styles.activeTab]}
            onPress={() => {
              setIndex(i);
              setActiveTab(route.key as 'Overview' | 'Spot' | 'Futures' | 'HyperEVM');
            }}
          >
            <Text style={[styles.tabText, activeTab === route.key && styles.activeTabText]}>
              {route.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={handleIndexChange}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={() => null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1C24',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#F0B90B',
  },
  tabText: {
    fontSize: 14,
    color: '#808A9D',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default WalletScreen;