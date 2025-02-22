import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PagerView from 'react-native-pager-view';
import { useRouter } from 'expo-router';
import { useActiveAccount } from "thirdweb/react";
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePerpStore } from '@/store/usePerpStore';
import { useSearchFocusStore } from '@/store/useSearchFocusStore';
import { CustomSafeArea } from '@/components/SafeViewAndroid/SafeViewAndroid';
import { showToast } from '@/utils/toast';

const { width } = Dimensions.get('window');

const CryptoItem = ({ symbol, price, change, prevPrice, usdvolume, onPress }) => {
  const isPositive = change > 0;
  return (
    <TouchableOpacity onPress={() => onPress(symbol)}>
      <View style={styles.cryptoItem}>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.prevPrice}>{parseFloat(usdvolume).toFixed(2)}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            ${price.toLocaleString('en-US', { maximumFractionDigits: 5 })}
          </Text>
          <Text style={styles.prevPrice}>
            ${prevPrice.toLocaleString('en-US', { maximumFractionDigits: 5 })}
          </Text>
        </View>
        <View style={[styles.changeContainer, { 
          backgroundColor: isPositive ? '#16C784' : '#FF3B3F' 
        }]}>
          <Text style={[styles.change, { 
            color: isPositive ? '#FFFFFF' : '#FFFFFF' 
          }]}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TabContent = ({ data, onNavigateToDetails, handleNavigatemarket }) => (
  <ScrollView style={styles.cryptoList}>
    {data.map((crypto, index) => (
      <CryptoItem key={index} {...crypto} onPress={onNavigateToDetails} />
    ))}
    <TouchableOpacity style={styles.viewMoreButton} onPress={() => handleNavigatemarket('/market?tab=perps')}>
      <Text style={styles.viewMoreText}>View More</Text>
    </TouchableOpacity>
  </ScrollView>
);

const HomeScreen = () => {
  const router = useRouter();
  const account = useActiveAccount();
  const address = account?.address;
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = React.useState(0);
  const pagerRef = React.useRef(null);
  const { tokens, isLoading } = usePerpStore();
  const { setShouldFocusSearch } = useSearchFocusStore();

  const handleNavigatemarket = (route) => {
    router.push(route);
  };

  const handleNavigateToDetails = (symbol: string) => {
    router.push({
      pathname: "/details",
      params: { symbol }
    });
  };

  const handleTestToast = () => {
    showToast.success('Success!', {
      description: 'This is a test toast message',
      position: { vertical: 'center', horizontal: 'left' }
    });
  };

  const tabs = ['Favorites', 'Hot', 'Gainers', 'Losers', '24h Vol'];

  const getTabData = (index) => {
    const tab = tabs[index];
    const sortedTokens = [...tokens].map(token => ({
      symbol: token.name?.split('/')[0] || 'Unknown',
      price: token.price,
      prevPrice: token.price / (1 + token.change / 100),
      change: token.change,
      usdvolume: token.usdvolume,
      volume: token.volume,
    }));

    switch (tab) {
      case 'Favorites':
        return sortedTokens.slice(0, 10);
      case 'Hot':
        return sortedTokens
          .sort((a, b) => b.usdvolume - a.usdvolume)
          .slice(0, 10);
      case 'Gainers':
        return sortedTokens
          .sort((a, b) => b.change - a.change)
          .slice(0, 10);
      case 'Losers':
        return sortedTokens
          .sort((a, b) => a.change - b.change)
          .slice(0, 10);
      case '24h Vol':
        return sortedTokens
          .sort((a, b) => b.usdvolume - a.usdvolume)
          .slice(0, 10);
      default:
        return sortedTokens.slice(0, 10);
    }
  };

  const handleTabPress = (index) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
  };

  const handlePageSelected = (e) => {
    setActiveTab(e.nativeEvent.position);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F0B90B" />
        <Text style={styles.loadingText}>Loading market data...</Text>
      </View>
    );
  }

  return (
    <CustomSafeArea style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => {
            if (!address) {
              router.push("../loginpage");
            } else {
              router.push("../profile");
            }
          }}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <TouchableOpacity 
            style={styles.searchInputWrapper}
            onPress={() => {
              setShouldFocusSearch(true);
              router.push('/(tabs)/market');
            }}
          >
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <Text style={styles.searchInput}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => router.push('/screen/staking')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="layers-outline" size={24} color="#666" />
          </View>
          <Text style={styles.actionText}>Staking</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => router.push('/')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={24} color="#666" />
          </View>
          <Text style={styles.actionText}>Vaults</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => router.push('/')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="cash-outline" size={24} color="#666" />
          </View>
          <Text style={styles.actionText}>Lending</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => router.push('/')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="apps-outline" size={24} color="#666" />
          </View>
          <Text style={styles.actionText}>DeFi</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.testButton}
        onPress={handleTestToast}
      >
        <Text style={styles.testButtonText}>Test Toast</Text>
      </TouchableOpacity>

      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              onPress={() => handleTabPress(index)}
              style={styles.tabButton}
            >
              <Text style={[
                styles.tab,
                activeTab === index && styles.activeTab
              ]}>
                {tab}
              </Text>
              {activeTab === index && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        {tabs.map((_, index) => (
          <View key={index} style={styles.pageContainer}>
            <TabContent data={getTabData(index)} onNavigateToDetails={handleNavigateToDetails} handleNavigatemarket={handleNavigatemarket} />
          </View>
        ))}
      </PagerView>
    </CustomSafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1C24',
  },
  loadingText: {
    marginTop: 10,
    color: '#808A9D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1A1C24',
  },
  searchContainer: {
    flex: 1,
    height: 56,
    backgroundColor: '#1A1C24',
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#666',
    fontSize: 14,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2A2D3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  felixButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  felixButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
    backgroundColor: '#1A1C24',
  },
  tabsScrollContent: {
    flexGrow: 0,
  },
  tabButton: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    color: '#808A9D',
    fontSize: 14,
  },
  activeTab: {
    color: '#F0B90B',
    fontWeight: 'bold',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#F0B90B',
    borderRadius: 2,
  },
  pagerView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  cryptoList: {
    flex: 1,
  },
  cryptoItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
    alignItems: 'center',
  },
  symbolContainer: {
    flex: 1,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceContainer: {
    flex: 2,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  price: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  prevPrice: {
    fontSize: 12,
    color: '#808A9D',
  },
  changeContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  change: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  viewMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  viewMoreText: {
    color: '#F0B90B',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#1A1C24',
    borderBottomColor: '#2A2D3A',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2D3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#808A9D',
    marginTop: 4,
  },
  testButton: {
    backgroundColor: '#F0B90B',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#1A1C24',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;