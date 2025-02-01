import { StatusBar, StyleSheet, View, Text, TextInput, TouchableOpacity } from "react-native";
import TradingInterface from "@/components/tradinginterface";
import { useLocalSearchParams } from "expo-router";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/constants/thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import SymbolSelector from "@/components/bottomsheets/SymbolSelector";
import { SafeAreaView } from "react-native";
import OrderBook from "@/components/OrderBook";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Button } from "react-native";
import { ActivityIndicator } from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WebSocketManager from "@/api/WebSocketManager";

const wallets = [
  inAppWallet({
    auth: {
      options: ["telegram", "email", "x", "passkey", "guest"],
    },
  }),
];
interface PerpTokenData {
  name: string;
  price: number;
  volume: number;
  change: number;
  leverage: number; // Add leverage property
}

const FuturesPage: React.FC = () => {
  const { symbol  } = useLocalSearchParams();
   
  const [tokens, setTokens] = useState<PerpTokenData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { symbol: initialSymbol } = useLocalSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol?.toString() || "BTC");
  const fullSymbol = `${selectedSymbol}-PERP`;
  // Add filtered tokens calculation
  const filteredTokens = useMemo(() => 
    tokens.filter(token =>
      token.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [tokens, searchQuery]
  );
  const sheetRef = useRef<BottomSheet>(null);

  // variables
  const snapPoints = useMemo(() => ["95%"], []);

  // callbacks
 
  const handleSnapPress = () => sheetRef.current?.snapToIndex(0);

  const handleClosePress = () => sheetRef.current?.close();

useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const listener = (data: any) => {
      try {
        const { meta, assetCtxs } = data;

        // Process tokens and exclude those with volume = 0
        const formattedTokens = meta.universe
          .map((token: any, index: number) => {
            const ctx = assetCtxs[index] || {};
            const { markPx, dayBaseVlm, prevDayPx,  } = ctx;

            const price = markPx !== undefined ? parseFloat(markPx) : 0;
            const volume = dayBaseVlm !== undefined ? parseFloat(dayBaseVlm) : 0;
            const prevPrice = prevDayPx !== undefined ? parseFloat(prevDayPx) : 0;
            const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;

            return {
              name: token.name || "Unknown",
              price,
              volume,
              change,
              leverage: token.maxLeverage || 0, // Include maxLeverage from meta.universe

            };
          })
          .filter((token: PerpTokenData) => token.volume > 0); // Exclude tokens with volume = 0

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
    ({ item, onPress }: { item: PerpTokenData; onPress: (name: string) => void }) => (
      <TouchableOpacity onPress={() => onPress(item.name)}>
        <View style={styles.tokenRow}>
          <View style={styles.tokenColumn}>
            <Text style={styles.tokenName}>
              {item.name}/USDC
            </Text>
            <Text style={styles.tokenVolume}>
              {item.volume.toFixed(2)} Vol
            </Text>
          </View>
          <View style={styles.priceColumn}>
            <Text style={styles.tokenPrice}>{item.price}</Text>
          </View>
          <View style={styles.changeColumn}>
            <Text style={styles.tokenChange}>
              {item.change >= 0 ? (
                <Text style={[styles.positiveChange]}>{item.change.toFixed(2)}%</Text>
              ) : (
                <Text style={[styles.negativeChange]}>{item.change.toFixed(2)}%</Text>
              )}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  );
  const handleTokenSelect = useCallback((name: string) => {
    const baseSymbol = name.replace(/-PERP$/, '');
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading perpetual tokens...</Text>
      </View>
    );
  }
  return (
    <SafeAreaView style={[styles.container, { marginTop: StatusBar.currentHeight }]}>
      {/* Top Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSnapPress} >
          <Text >{fullSymbol}</Text>
        </TouchableOpacity>
      </View>
  
      {/* Funding Row */}
      <View style={styles.fundingRow}>
        <Text style={styles.fundingText}>Funding/Countdown</Text>
        <Text style={styles.fundingText}>Cross</Text>
        <Text style={styles.fundingText}>20x</Text>
        <Text style={styles.fundingText}>0.0064%05:58:51</Text>
      </View>
  
      {/* Main Content: Order Book & Trading */}
      <View style={styles.mainContent}>
        <View style={styles.orderBook}>
          <OrderBook symbol={selectedSymbol?.toString() || "BTC"} />
        </View>
  
        <View style={styles.tradingInterface}>
          <TradingInterface symbol={selectedSymbol?.toString() || "BTC"} />
        </View>
      </View>
  
      {/* Buy & Sell Buttons */}
      
  
      {/* FULL-SCREEN BOTTOM SHEET */}
      <View style={StyleSheet.absoluteFillObject}>
        <BottomSheet
          ref={sheetRef}
          snapPoints={snapPoints}
          index={-1}
          enablePanDownToClose
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: "#222" }}
          handleIndicatorStyle={{ backgroundColor: "#888" }}
        >
          <View style={{ flex: 1, paddingBottom: 20 }}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search tokens..."
              placeholderTextColor="#888"
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
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fundingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  fundingText: {
    color: '#ffffff',
    fontSize: 12,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  orderBook: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  tradingInterface: {
    width: 200,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  bottomSection: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  tradeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sellButton: {
    backgroundColor: '#ef5350',
  },
  buyButton: {
    backgroundColor: '#26a69a',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#333',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    margin: 12,
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 20,
    backgroundColor: "#222",
  },
tokenRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#333",
},
tokenColumn: {
  flex: 2,
},
tokenName: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#fff",
},
tokenVolume: {
  fontSize: 12,
  color: "#fff",
},
tokenPrice: {
  fontSize: 14,
  paddingTop: 6,
  color: "#fff",
  fontWeight: "bold",
  textAlign: "right",
},
tokenChange: {
  fontSize: 14,
  fontWeight: "bold",
  textAlign: "right",
},
positiveChange: {
  color: "white",
  backgroundColor: "green",
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 4,
  textAlign: "center",
},
negativeChange: {
  color: "white",
  backgroundColor: "red",
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 4,
  textAlign: "center",
},
loadingText: {
  fontSize: 16,
  color: "#fff",
  textAlign: "center",
},
priceColumn: {
  paddingHorizontal: 15,
  flex: 1,
  textAlign: "right",
},

changeColumn: {
  flex: 1,
  textAlign: "right",
},

});


export default FuturesPage;