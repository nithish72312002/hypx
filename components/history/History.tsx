import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import PagerView from 'react-native-pager-view';
import TradeHistory from './tabs/TradeHistory';
import OrderHistory from './tabs/OrderHistory';
import FundingHistory from './tabs/FundingHistory';
import Deposits from './tabs/Deposits';
import Withdrawals from './tabs/Withdrawals';
import Transfers from './tabs/Transfers';
import Ionicons from '@expo/vector-icons/Ionicons';

const History = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [filterType, setFilterType] = useState('crypto');
  const pagerRef = useRef<PagerView>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const tabs = [
    { id: 'trades', label: 'Trade History' },
    { id: 'orders', label: 'Order History' },
    { id: 'funding', label: 'Funding History' },
    { id: 'deposits', label: 'Deposits' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'transfers', label: 'Transfers' },
  ];

  const handlePageSelected = (e: any) => {
    const newIndex = e.nativeEvent.position;
    setActiveTab(newIndex);
    scrollViewRef.current?.scrollTo({
      x: newIndex * 120,
      animated: true,
    });
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
  };

  const getTabColor = (index: number) => {
    const tab = tabs[index];
    if (activeTab !== index) return '#808A9D';
    
    switch (tab.id) {
      case 'orders':
      case 'trades':
        return '#FFFFFF';
      case 'funding':
        return '#F3BA2F';
      case 'deposits':
        return '#16C784';
      case 'withdrawals':
        return '#FF3B3F';
      case 'transfers':
        return '#F3BA2F';
      default:
        return '#FFFFFF';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === index && styles.activeTab]}
              onPress={() => handleTabPress(index)}
            >
              <Text style={[styles.tabText, { color: getTabColor(index) }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.contentContainer}>
        

        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={handlePageSelected}
        >
          <View key="trades">
            <TradeHistory />
          </View>
          <View key="orders">
            <OrderHistory />
          </View>
          <View key="funding">
            <FundingHistory />
          </View>
          <View key="deposits">
            <Deposits />
          </View>
          <View key="withdrawals">
            <Withdrawals />
          </View>
          <View key="transfers">
            <Transfers />
          </View>
        </PagerView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
  headerContainer: {
    backgroundColor: '#1A1C24',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#F3BA2F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  pagerView: {
    flex: 1,
  },
});

export default History;
