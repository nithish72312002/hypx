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
              <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.filterContainer}>
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filterType === 'crypto' && styles.activeFilterTab]}
              onPress={() => setFilterType('crypto')}
            >
              <Text style={[styles.filterText, filterType === 'crypto' && styles.activeFilterText]}>
                Crypto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterType === 'cash' && styles.activeFilterTab]}
              onPress={() => setFilterType('cash')}
            >
              <Text style={[styles.filterText, filterType === 'cash' && styles.activeFilterText]}>
                Cash
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpText}>Deposits not arrived? Check solutions here</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>

        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={handlePageSelected}
        >
          <View key="1">
            <TradeHistory />
          </View>
          <View key="2">
            <OrderHistory />
          </View>
          <View key="3">
            <FundingHistory />
          </View>
          <View key="4">
            <Deposits />
          </View>
          <View key="5">
            <Withdrawals />
          </View>
          <View key="6">
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
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    borderBottomColor: '#F0B90B',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
  },
  activeTabText: {
    color: '#F0B90B',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 2,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  activeFilterTab: {
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  activeFilterText: {
    color: '#000',
    fontWeight: '500',
  },
  filterButton: {
    padding: 8,
  },
  helpSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  helpText: {
    color: '#666',
    fontSize: 14,
  },
  pagerView: {
    flex: 1,
  },
});

export default History;
