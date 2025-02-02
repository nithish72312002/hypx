import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import TradingInterface from "@/components/tradinginterface";
import { useLocalSearchParams } from "expo-router";
import OrderBook from "@/components/OrderBook";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import WebSocketManager from "@/api/WebSocketManager";
import OpenOrdersPositionsTabs from "@/components/OpenOrdersPositionsTabs";

interface PerpTokenData {
  name: string;
  price: number;
  volume: number;
  change: number;
  leverage: number;
}

const FuturesPage: React.FC = () => {
  const { symbol } = useLocalSearchParams();
  const [tokens, setTokens] = useState<PerpTokenData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { symbol: initialSymbol } = useLocalSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState(
    initialSymbol?.toString() || "BTC"
  );
  const fullSymbol = `${selectedSymbol}-PERP`;
  const [price, setPrice] = useState("3400");

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

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();
    const listener = (data: any) => {
      try {
        const { meta, assetCtxs } = data;
        const formattedTokens = meta.universe
          .map((token: any, index: number) => {
            const ctx = assetCtxs[index] || {};
            const { markPx, dayBaseVlm, prevDayPx } = ctx;
            const price = markPx !== undefined ? parseFloat(markPx) : 0;
            const volume = dayBaseVlm !== undefined ? parseFloat(dayBaseVlm) : 0;
            const prevPrice = prevDayPx !== undefined ? parseFloat(prevDayPx) : 0;
            const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
            return {
              name: token.name || "Unknown",
              price,
              volume,
              change,
              leverage: token.maxLeverage || 0,
            };
          })
          .filter((token: PerpTokenData) => token.volume > 0);
        setTokens(formattedTokens);
        setIsLoading(false);
      } catch (err) {
        console.error("Error processing WebSocket data:", err);
      }
    };

    wsManager.addListener("webData2", listener);
    return () => {
      wsManager.removeListener("webData2", listener);
    };
  }, []);

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
    <SafeAreaView style={[styles.container, { marginTop: StatusBar.currentHeight }]}>
      {/* Wrap all main content in a ScrollView */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSnapPress}>
            <Text style={styles.headerText}>{fullSymbol}</Text>
          </TouchableOpacity>
        </View>

        {/* Funding Row */}
        <View style={styles.fundingRow}>
          <Text style={styles.fundingText}>Funding/Countdown</Text>
          
          <Text style={styles.fundingText}>0.0064% 05:58:51</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.orderBook}>
            <OrderBook
              symbol={selectedSymbol || "BTC"}
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
    backgroundColor: "#1E1E2F",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20, // extra bottom padding so content isn't cut off
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#1E1E2F",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  fundingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  fundingText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  mainContent: {
    flexDirection: "row",
    marginBottom: 16,
  },
  orderBook: {
    flex: 1,
    backgroundColor: "#1E1E2F",
    borderRadius: 8,
    marginRight: 8,
  },
  tradingInterface: {
    flex: 1,
    backgroundColor: "#2E2E3A",
    borderRadius: 8,
    marginLeft: 8,
  },
  searchInput: {
    backgroundColor: "#333333",
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
    borderBottomColor: "#333333",
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
    color: "#FFFFFF",
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
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  positiveChange: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
    backgroundColor: "#4CAF50",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    textAlign: "center",
  },
  negativeChange: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF6B6B",
    backgroundColor: "#FF6B6B",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
  },
  // Use minHeight here so if there’s little or no content it’s at least 300px tall;
  // if there are many orders/positions, the container will grow and the ScrollView will allow scrolling.
  tabsContainer: {
    minHeight: 500,
    backgroundColor: "#2E2E3A",
    borderRadius: 8,
    marginTop: 16,
  },
});

export default FuturesPage;
