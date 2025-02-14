import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import TradingInterface from "@/components/tradinginterface/tradinginterface";
import { useLocalSearchParams } from "expo-router";
import OrderBook from "@/components/orderbooks/OrderBook";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import OpenOrdersPositionsTabs from "@/components/openorders/OpenOrdersPositionsTabs";
import { usePerpStore } from "@/store/usePerpStore";
import WebSocketManager from "@/api/WebSocketManager";
import { Ionicons } from '@expo/vector-icons';

interface PerpTokenData {
  name: string;
  price: number;
  volume: number;
  change: number;
  leverage: number;
  usdvolume: number;
}

const FuturesPage: React.FC = () => {
  const { symbol } = useLocalSearchParams();
  const { tokens, isLoading, subscribeToWebSocket } = usePerpStore();
  const [searchQuery, setSearchQuery] = useState("");
  const { symbol: initialSymbol } = useLocalSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState(
    initialSymbol?.toString() || "BTC"
  );
  const fullSymbol = `${selectedSymbol}-PERP`;
  const [price, setPrice] = useState("3400");
  const [orderType, setOrderType] = useState<'Limit' | 'Market'>('Limit');
  const [fundingRate, setFundingRate] = useState("0.0001");
  const [countdown, setCountdown] = useState("00:00:00");

  useEffect(() => {
    const unsubscribe = subscribeToWebSocket();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const perpAssetListener = (response: any) => {
      if (response?.coin === selectedSymbol) {
        const ctx = response.ctx;
        if (ctx?.funding) {
          // Convert funding rate to percentage
          const fundingValue = (ctx.funding) * 100;
          setFundingRate(fundingValue.toFixed(4));
        }
      }
    };

    console.log(`Subscribing to activeAssetCtx for symbol: ${selectedSymbol}`);

    wsManager.subscribe(
      "activeAssetCtx",
      { type: "activeAssetCtx", coin: selectedSymbol },
      perpAssetListener
    );

    return () => {
      console.log(`Unsubscribing from activeAssetCtx for symbol: ${selectedSymbol}`);
      wsManager.unsubscribe(
        "activeAssetCtx",
        { type: "activeAssetCtx", coin: selectedSymbol },
        perpAssetListener
      );
    };
  }, [selectedSymbol]);

  useEffect(() => {
    const calculateTimeUntilNextFunding = () => {
      const now = new Date();
      const nextFunding = new Date();
      
      // Set to next hour in UTC
      nextFunding.setUTCMinutes(0, 0, 0);
      nextFunding.setUTCHours(nextFunding.getUTCHours() + 1);

      const diff = nextFunding.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const timer = setInterval(() => {
      setCountdown(calculateTimeUntilNextFunding());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filteredTokens = useMemo(
    () =>
      tokens.filter((token) =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [tokens, searchQuery]
  );

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["95%"], []);

  const handleSnapPress = () => sheetRef.current?.snapToIndex(0);
  const handleClosePress = () => sheetRef.current?.close();

  const RenderToken = React.memo(
    ({
      item,
      onPress,
    }: {
      item: PerpTokenData;
      onPress: (name: string) => void;
    }) => (
      <TouchableOpacity onPress={() => onPress(item.name)}>
        <View style={styles.tokenRow}>
          <View style={styles.tokenColumn}>
            <Text style={styles.tokenName}>{item.name}/USDC</Text>
            <Text style={styles.tokenVolume}>{item.usdvolume.toFixed(2)} Vol</Text>
          </View>
          <View style={styles.priceColumn}>
            <Text style={styles.tokenPrice}>{item.price}</Text>
          </View>
          <View style={styles.changeColumn}>
            <View
              style={[
                styles.changeBox,
                item.change >= 0
                  ? styles.positiveChangeBox
                  : styles.negativeChangeBox,
              ]}
            >
              <Text style={styles.changeText}>
                {item.change >= 0 ? "+" : ""}
                {item.change.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  );

  const handleTokenSelect = useCallback((name: string) => {
    const baseSymbol = name.replace(/-PERP$/, "");
    setSelectedSymbol(baseSymbol);
    handleClosePress();
  }, []);

  const renderToken = useCallback(
    ({ item }: { item: PerpTokenData }) => (
      <RenderToken item={item} onPress={handleTokenSelect} />
    ),
    [handleTokenSelect]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading perpetual tokens...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSnapPress} style={styles.headerButton}>
            <Text style={styles.title}>{fullSymbol}</Text>
            <Ionicons name="chevron-down" size={20} color="#FFFFFF" style={styles.dropdownIcon} />
          </TouchableOpacity>
          <View style={styles.fundingContainer}>
            <View style={styles.fundingGroup}>
              <Text style={styles.fundingText}>Funding</Text>
              <Text style={styles.fundingValue}>{fundingRate}%</Text>
            </View>
            <View style={styles.fundingGroup}>
              <Text style={styles.fundingText}>Countdown</Text>
              <Text style={styles.fundingValue}>{countdown}</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.orderBook}>
            <OrderBook
              symbol={selectedSymbol || "BTC"}
              tradeType={orderType}
              onPriceSelect={(selectedPrice) =>
                setPrice(selectedPrice.toString())
              }
            />
          </View>
          <View style={styles.tradingInterface}>
            <TradingInterface
              symbol={selectedSymbol || "BTC"}
              price={price}
              setPrice={setPrice}
              orderType={orderType}
              onOrderTypeChange={setOrderType}
            />
          </View>
        </View>

        {/* Open Orders & Positions Tabs */}
        <View style={styles.tabsContainer}>
          <OpenOrdersPositionsTabs symbol={selectedSymbol || "BTC"}/>
        </View>
      </ScrollView>

      {/* Bottom Sheet remains absolutely positioned */}
      <View style={StyleSheet.absoluteFillObject}>
        <BottomSheet
          ref={sheetRef}
          snapPoints={snapPoints}
          index={-1}
          enablePanDownToClose
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: "#1A1C24" }}
          handleIndicatorStyle={{ backgroundColor: "#808A9D" }}
        >
          <View style={{ flex: 1, paddingBottom: 20 }}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search tokens..."
              placeholderTextColor="#808A9D"
              onChangeText={setSearchQuery}
              value={searchQuery}
            />
            <BottomSheetFlatList
              data={filteredTokens}
              keyExtractor={(item) => item.name}
              renderItem={renderToken}
              initialNumToRender={10}
            />
          </View>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13141B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#13141B',
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1F26',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 4,
  },
  dropdownIcon: {
    marginTop: 2,
  },
  fundingContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  fundingGroup: {
    alignItems: 'center',
  },
  fundingText: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 4,
  },
  fundingValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  mainContent: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  orderBook: {
    flex: 1,
    backgroundColor: '#13141B',
    borderRadius: 4,
    marginRight: 8,
  },
  tradingInterface: {
    flex: 1,
    backgroundColor: '#13141B',
    borderRadius: 4,
    marginLeft: 8,
  },
  searchInput: {
    backgroundColor: '#1E1F26',
    color: '#FFFFFF',
    borderRadius: 4,
    padding: 12,
    margin: 12,
    fontSize: 16,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1F26',
  },
  tokenColumn: {
    flex: 2,
    alignItems: 'flex-start',
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tokenVolume: {
    fontSize: 12,
    color: '#8E8E93',
  },
  priceColumn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  changeColumn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  tokenPrice: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  changeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  positiveChangeBox: {
    backgroundColor: '#00C087',
  },
  negativeChangeBox: {
    backgroundColor: '#FF3B30',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  tabsContainer: {
    minHeight: 500,
    backgroundColor: '#13141B',
    borderRadius: 4,
    marginTop: 16,
  },
});

export default FuturesPage;
