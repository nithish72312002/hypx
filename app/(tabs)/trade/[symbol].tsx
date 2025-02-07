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
import axios from "axios";
import TradingInterface from "@/components/tradinginterface/tradinginterface";
import { useLocalSearchParams } from "expo-router";
import OrderBook from "@/components/orderbooks/OrderBook";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import WebSocketManager from "@/api/WebSocketManager";
import SpotTradingInterface from "@/components/tradinginterface/spottradinginterface";
import SpotOrderBook from "@/components/orderbooks/spotOrderBook";
import SpotTradeOpenOrdersHoldings from "@/components/openorders/OpenOrdersHoldingsTabs";

interface SpotTokenData {
  id: string;
  name: string;
  price: number;
  volume: number;
  change: number;
}

const SpotPage: React.FC = () => {
  const { symbol } = useLocalSearchParams();
  const { symbol: initialSymbol } = useLocalSearchParams();
  // Maintain two states: one for the symbol (id) and one for the token name.
  const [selectedSymbol, setSelectedSymbol] = useState(
    initialSymbol?.toString() || "PURR/USDC"
  );
  const [sdkSymbol, setSdkSymbol] = useState(
    initialSymbol?.toString() || "PURR"
  );
  // We'll use sdkSymbol for display (header) and pass selectedSymbol to SDK components.
  const [price, setPrice] = useState("3400");

  // States for spot tokens (for the bottom sheet)
  const [spotTokens, setSpotTokens] = useState<SpotTokenData[]>([]);
  const [tokenMapping, setTokenMapping] = useState<{ [key: string]: string }>({});
  const [spotLoading, setSpotLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch token mapping from API
  useEffect(() => {
    const fetchTokenMapping = async () => {
      try {
        const response = await axios.post("https://api.hyperliquid-testnet.xyz/info", {
          type: "spotMetaAndAssetCtxs",
        });
        const mapping: { [key: string]: string } = {};
        const tokensArray = response.data[0]?.tokens || [];
        const universeArray = response.data[0]?.universe || [];

        // Create a mapping from token index to token name
        const tokenNameByIndex: { [key: number]: string } = {};
        tokensArray.forEach((token: any) => {
          tokenNameByIndex[token.index] = token.name;
        });

        // Use the first index in "tokens" array of universe to resolve names
        universeArray.forEach((pair: any) => {
          const [firstTokenIndex] = pair.tokens;
          const resolvedName = tokenNameByIndex[firstTokenIndex] || "Unknown";
          mapping[pair.name] = resolvedName;
        });
        setTokenMapping(mapping);
      } catch (err) {
        console.error("Error fetching token mapping:", err);
      }
    };

    fetchTokenMapping();
  }, []);

  // Listen for spot tokens from websocket once the token mapping is available
  useEffect(() => {
    if (Object.keys(tokenMapping).length === 0) return;

    const wsManager = WebSocketManager.getInstance();
    const listener = (data: any) => {
      try {
        const { spotAssetCtxs } = data;

        if (!spotAssetCtxs || !Array.isArray(spotAssetCtxs)) {
          console.error("Invalid spotAssetCtxs format in WebSocket data.");
          return;
        }

        const formattedTokens: SpotTokenData[] = spotAssetCtxs
          .filter((ctx: any) => parseFloat(ctx.dayBaseVlm) > 0) // Only tokens with volume > 0
          .map((ctx: any) => {
            const { coin, markPx, dayBaseVlm, prevDayPx } = ctx;
            const id = coin;
            const name = tokenMapping[coin] || coin;
            const price = markPx !== undefined ? parseFloat(markPx) : 0;
            const volume = dayBaseVlm !== undefined ? parseFloat(dayBaseVlm) : 0;
            const prevPrice = prevDayPx !== undefined ? parseFloat(prevDayPx) : 0;
            const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
            return {
              id,
              name,
              price,
              volume,
              change,
            };
          });
        setSpotTokens(formattedTokens);
        setSpotLoading(false);
      } catch (err) {
        console.error("Error processing spot websocket data:", err);
      }
    };

    wsManager.addListener("webData2", listener);
    return () => {
      wsManager.removeListener("webData2", listener);
    };
  }, [tokenMapping]);

  const filteredSpotTokens = useMemo(
    () =>
      spotTokens.filter((token) =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [spotTokens, searchQuery]
  );

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["95%"], []);

  const handleSnapPress = () => sheetRef.current?.snapToIndex(0);
  const handleClosePress = () => sheetRef.current?.close();

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

  const renderToken = useCallback(
    ({ item }: { item: SpotTokenData }) => (
      <RenderToken item={item} onPress={handleTokenSelect} />
    ),
    [handleTokenSelect]
  );

  return (
    <View style={styles.container}>
      {/* Wrap all main content in a ScrollView */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header displays the sdkSymbol (token name) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSnapPress}>
            <Text style={styles.headerText}>{sdkSymbol}-SPOT</Text>
          </TouchableOpacity>
        </View>

        {/* Funding Row */}
    
        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.orderBook}>
            <SpotOrderBook
              // Pass the symbol (id) to SDK components
              symbol={selectedSymbol || "@1"} 
              onPriceSelect={(selectedPrice) => setPrice(selectedPrice.toString())}
            />
          </View>
          <View style={styles.tradingInterface}>
            <SpotTradingInterface sdksymbol={sdkSymbol}
              symbol={selectedSymbol || "@1"}
              price={price}
              setPrice={setPrice}
            />
          </View>
        </View>

        {/* Open Orders & Positions Tabs */}
        <View style={styles.tabsContainer}>
          <SpotTradeOpenOrdersHoldings symbol={selectedSymbol || "@1"} />
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
        </BottomSheet>
      </View>
    </View>
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
    color: "#FFFFFF",
    backgroundColor: "#34C759",
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
    color: "#FFFFFF",
    textAlign: "center",
  },
  tabsContainer: {
    minHeight: 500,
    backgroundColor: "#2E2E3A",
    borderRadius: 8,
    marginTop: 16,
  },
});

export default SpotPage;
