import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import WebSocketManager from "@/api/WebSocketManager";
import { useRouter } from 'expo-router';
import { useActiveAccount } from "thirdweb/react";
import { useNavigation } from '@react-navigation/native';
import FelixWebView from '../screens/FelixWebView';

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
          backgroundColor: isPositive ? '#e6f4ea' : '#fce8e8' 
        }]}>
          <Text style={[styles.change, { 
            color: isPositive ? '#137333' : '#a50e0e' 
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
    <TouchableOpacity style={styles.viewMoreButton} onPress={() => handleNavigatemarket('market/perps')}>
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
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const handleNavigatemarket = (route) => {
    router.push(route);
  };
  const handleNavigateToDetails = (symbol: string) => {
    const encodedSymbol = encodeURIComponent(symbol); // Encode the symbol for safe routing
    router.push(`/details/${encodedSymbol}`);
  };

  const handleProfilePress = () => {
    if (!address) {
      router.push("/loginpage");
    } else {
      router.push("/profile");
    }
  };

  const tabs = ['Favorites', 'Hot', 'Gainers', 'Losers', '24h Vol']; // Updated tabs

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const listener = (data) => {
      try {
        const { meta, assetCtxs } = data;
        if (!meta || !assetCtxs) return;

        const formattedTokens = meta.universe.map((token, index) => {
          const ctx = assetCtxs[index] || {};
          const { markPx, prevDayPx, dayBaseVlm } = ctx; // Added volume

          const price = parseFloat(markPx) || 0;
          const prevPrice = parseFloat(prevDayPx) || 0;
          const change = prevPrice > 0 
            ? ((price - prevPrice) / prevPrice) * 100 
            : 0;
            const volume = dayBaseVlm !== undefined ? parseFloat(dayBaseVlm) : 0;
            const usdvolume = volume * price;
          return {
            symbol: token.name?.split('/')[0] || 'Unknown',
            price,
            prevPrice,
            change,
            usdvolume,
            volume, // Add volume to tokens
          };
        });

        setTokens(formattedTokens);
        setIsLoading(false);
      } catch (err) {
        console.error("Error processing data:", err);
        setIsLoading(false);
      }
    };

    wsManager.addListener("webData2", listener);
    return () => wsManager.removeListener("webData2", listener);
  }, []);

  const getTabData = (index) => {
    const tab = tabs[index];
    let processed = [...tokens];

    switch(tab) {
      case 'Favorites':
        processed = processed.slice(0, 5);
        break;
      case 'Hot':
        processed.sort((a, b) => b.price - a.price);
        processed = processed.slice(0, 5);
        break;
      case 'Gainers':
        processed.sort((a, b) => b.change - a.change);
        processed = processed.slice(0, 5);
        break;
      case 'Losers':
        processed.sort((a, b) => a.change - b.change);
        processed = processed.slice(0, 5);
        break;
      case '24h Vol':
        processed.sort((a, b) => b.usdvolume - a.usdvolume);
        processed = processed.slice(0, 5);
        break;
      default:
        processed = processed.slice(0, 5);
    }

    return processed;
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
    <SafeAreaView style={styles.container}>
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
          <View style={styles.searchInputWrapper}>
            <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.addFundsButton}>
          <Text style={styles.addFundsText}>Add Funds</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.felixButton}
        onPress={() => router.push("/felix")}
      >
        <Text style={styles.felixButtonText}>Open Felix</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    flex: 1,
    height: 40,
    borderColor: '#1E1E2F',
    borderWidth: 1,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#FFFFFF',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1E1E2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  addFundsButton: {
    height: 40,
    backgroundColor: '#F0B90B',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFundsText: {
    color: '#000',
    fontWeight: 'bold',
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
    borderBottomColor: '#f0f0f0',
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
    color: '#666',
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
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  symbolContainer: {
    flex: 1,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  priceContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  prevPrice: {
    fontSize: 12,
    color: '#666',
  },
  changeContainer: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 12,
  },
  change: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  viewMoreText: {
    color: '#F0B90B',
    fontWeight: '500',
  },
});

export default HomeScreen;