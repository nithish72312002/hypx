import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from "expo-router";
import BottomSheet, { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from '@expo/vector-icons';
import { useSpotStore } from "@/store/useSpotStore";
import SpotTradingInterface from "@/components/tradinginterface/spottradinginterface";
import SpotOrderBook from "@/components/orderbooks/spotOrderBook";
import SpotTradeOpenOrdersHoldings from "@/components/openorders/OpenOrdersHoldingsTabs";
import { CustomSafeArea } from '@/components/SafeViewAndroid/SafeViewAndroid';

interface SpotTokenData {
  id: string;
  name: string;
  price: number;
  volume: number;
  change: number;
}

const SpotPage: React.FC = () => {
  const params = useLocalSearchParams();
  const { symbol, sdkSymbol: initialSdkSymbol } = params;
  const { tokens: spotTokens, isLoading: spotLoading, subscribeToWebSocket, fetchTokenMapping } = useSpotStore();
  
  const [selectedSymbol, setSelectedSymbol] = useState(
    symbol?.toString() || "PURR/USDC"
  );
  const [sdkSymbol, setSdkSymbol] = useState(
    initialSdkSymbol?.toString() || selectedSymbol.split('/')[0]
  );

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTokenMapping();
    const unsubscribe = subscribeToWebSocket();
    return () => {
      unsubscribe();
    };
  }, []);

  const filteredSpotTokens = useMemo(
    () =>
      spotTokens.filter((token) =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [spotTokens, searchQuery]
  );

  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["95%"], []);

  const handleSnapPress = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.present();
    }
  }, []);

  const handleClosePress = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.dismiss();
    }
  }, []);

  // When a token is selected, update both selectedSymbol (id) and sdkSymbol (name)
  const handleTokenSelect = useCallback((token: SpotTokenData) => {
    setSelectedSymbol(token.id);
    setSdkSymbol(token.name);
    handleClosePress();
  }, []);

  // Render a single spot token
  const RenderToken = React.memo(
    ({
      item,
      onPress,
    }: {
      item: SpotTokenData;
      onPress: (token: SpotTokenData) => void;
    }) => (
      <TouchableOpacity onPress={() => onPress(item)}>
        <View style={styles.tokenRow}>
          <View style={styles.tokenColumn}>
            <Text style={styles.tokenName}>{item.name}</Text>
            <Text style={styles.tokenVolume}>{item.volume.toFixed(2)} Vol</Text>
          </View>
          <View style={styles.priceColumn}>
            <Text style={styles.tokenPrice}>{item.price}</Text>
          </View>
          <View style={styles.changeColumn}>
            {item.change >= 0 ? (
              <Text style={styles.positiveChange}>{item.change.toFixed(2)}%</Text>
            ) : (
              <Text style={styles.negativeChange}>{item.change.toFixed(2)}%</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  );

  const renderToken = useCallback(
    ({ item }: { item: SpotTokenData }) => (
      <RenderToken item={item} onPress={handleTokenSelect} />
    ),
    [handleTokenSelect]
  );

  return (
    <CustomSafeArea style={styles.container} >
      {/* Wrap all main content in a ScrollView */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header displays the sdkSymbol (token name) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSnapPress} style={styles.headerButton}>
            <Text style={styles.headerText}>{sdkSymbol}</Text>
            <Ionicons name="chevron-down" size={20} color="#FFFFFF" style={styles.dropdownIcon} />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.orderBook}>
            <SpotOrderBook
              // Pass the symbol (id) to SDK components
              symbol={selectedSymbol || "@1"} 
            
            />
          </View>
          <View style={styles.tradingInterface}>
            <SpotTradingInterface
              sdksymbol={sdkSymbol}
              symbol={selectedSymbol || "@1"}
            
            />
          </View>
        </View>

        {/* Open Orders & Positions Tabs */}
        <View style={styles.tabsContainer}>
          <SpotTradeOpenOrdersHoldings symbol={selectedSymbol || "@1"} />
        </View>
      </ScrollView>

      {/* Bottom Sheet remains absolutely positioned */}
      <View >
        <BottomSheetModal
          ref={sheetRef}
          snapPoints={snapPoints}
          index={0}
          enablePanDownToClose
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: "#1E1E2F" }}
          handleIndicatorStyle={{ backgroundColor: "#BBBBBB" }}
        >
          <View style={{ flex: 1, paddingBottom: 20 }}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search tokens..."
              placeholderTextColor="#888888"
              onChangeText={setSearchQuery}
              value={searchQuery}
            />
            {spotLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading spot tokens...</Text>
              </View>
            ) : (
              <BottomSheetFlatList
                data={filteredSpotTokens}
                keyExtractor={(item) => item.id}
                renderItem={renderToken}
                initialNumToRender={10}
              />
            )}
          </View>
        </BottomSheetModal>
      </View>
    </CustomSafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#13141B",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#13141B",
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
  headerText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginRight: 4,
  },
  dropdownIcon: {
    marginTop: 2,
  },
  mainContent: {
    flexDirection: "row",
    marginBottom: 16,
  },
  orderBook: {
    flex: 1,
    backgroundColor: "#13141B",
    borderRadius: 8,
    marginRight: 8,
  },
  tradingInterface: {
    flex: 1,
    backgroundColor: "#13141B",
    borderRadius: 8,
    marginLeft: 8,
  },
  searchInput: {
    backgroundColor: "#1E1F26",
    color: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    margin: 12,
    fontSize: 16,
  },
  tokenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1F26",
  },
  tokenColumn: {
    flex: 2,
    alignItems: "flex-start",
  },
  tokenName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  tokenVolume: {
    fontSize: 12,
    color: "#8E8E93",
  },
  priceColumn: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  changeColumn: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  tokenPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  positiveChange: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "#00C087",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    textAlign: "center",
  },
  negativeChange: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "#FF3B30",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  tabsContainer: {
    minHeight: 500,
    backgroundColor: "#13141B",
    borderRadius: 8,
    marginTop: 16,
  },
});

export default SpotPage;