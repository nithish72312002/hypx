import React, { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { StyleSheet, View, Text, Button, ActivityIndicator,TouchableOpacity, FlatList, TextInput } from "react-native";
import BottomSheet, { BottomSheetFlatList, BottomSheetView } from "@gorhom/bottom-sheet";
import WebSocketManager from "@/api/WebSocketManager";
interface PerpTokenData {
    name: string;
    price: number;
    volume: number;
    change: number;
    leverage: number; // Add leverage property
  }


  interface TradingInterfaceProps {
    symbol: string;
  }

  const SymbolSelector: React.FC<TradingInterfaceProps> = ({ symbol }) => {  
  
  const [tokens, setTokens] = useState<PerpTokenData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
  // ... other existing state ...
  const fullSymbol = `${symbol}-PERP`;

  // Add filtered tokens calculation
  const filteredTokens = useMemo(() => 
    tokens.filter(token =>
      token.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [tokens, searchQuery]
  );
  const sheetRef = useRef<BottomSheet>(null);

  // variables
  const snapPoints = useMemo(() => ["90%"], []);

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
            {item.name}/USDC <Text style={styles.tokenLeverage}>x{item.leverage}</Text>
          </Text>            
            <Text style={styles.tokenVolume}>{item.volume.toFixed(2)} Vol</Text>
          </View>
          <View style={styles.priceColumn}>
            <Text style={styles.tokenPrice}>{item.price}</Text>
          </View>
          <View style={styles.changeColumn}>
            <Text
              style={[
                styles.tokenChange,
                item.change >= 0 ? styles.positiveChange : styles.negativeChange,
              ]}
            >
              {item.change.toFixed(2)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  );

  const renderToken = useCallback(
    ({ item }: { item: PerpTokenData }) => (
      <RenderToken item={item} onPress={(name) => console.log("Selected:", name)} />
    ),
    []
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading perpetual tokens...</Text>
      </View>
    );
  }
  // render
  return (
    <View style={styles.container}>
      <Button title={fullSymbol} onPress={handleSnapPress} />
     
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={-1}
        enableDynamicSizing={false}
        enablePanDownToClose
      >
        <View style={styles.contentContainer}>
          {/* Add Search Bar */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search tokens..."
            placeholderTextColor="#888"
            onChangeText={setSearchQuery}
            value={searchQuery}
          />
          
          {/* Update FlatList to use filteredTokens */}
          <BottomSheetFlatList
            data={filteredTokens}
            keyExtractor={(item) => item.name}
            renderItem={renderToken}
            initialNumToRender={10}
            getItemLayout={(data, index) => ({
              length: 60,
              offset: 60 * index,
              index,
            })}
          />
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
  });
  

export default SymbolSelector;