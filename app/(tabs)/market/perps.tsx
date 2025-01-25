import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import WebSocketManager from "@/api/WebSocketManager";
import { useRouter } from "expo-router";

interface PerpTokenData {
  name: string;
  price: number;
  volume: number;
  change: number; // 24-hour change percentage
}

const PerpPage: React.FC = () => {
  const [tokens, setTokens] = useState<PerpTokenData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const handleNavigateToDetails = (symbol: string) => {
    const encodedSymbol = encodeURIComponent(symbol); // Encode the symbol for safe routing
    router.push(`/details/${encodedSymbol}`);
  };

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    const listener = (data: any) => {
      try {
        const { meta, assetCtxs } = data;

        // Process tokens and exclude those with volume = 0
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
            <Text style={styles.tokenName}>{item.name}</Text>
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

  const renderToken = ({ item }: { item: PerpTokenData }) => (
    <RenderToken item={item} onPress={handleNavigateToDetails} />
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, styles.nameColumn]}>Name / Vol</Text>
        <Text style={[styles.headerText, styles.priceColumn]}>Last Price</Text>
        <Text style={[styles.headerText, styles.changeColumn]}>24h Chg%</Text>
      </View>
      <FlatList
        data={tokens}
        keyExtractor={(item) => item.name}
        renderItem={renderToken}
        initialNumToRender={10} // Renders the first 10 items initially
        getItemLayout={(data, index) => ({
          length: 60, // Estimated row height
          offset: 60 * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: "#000",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    marginBottom: 5,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#aaa",
  },
  nameColumn: {
    flex: 2,
    textAlign: "left",
  },
  priceColumn: {
    flex: 1,
    textAlign: "center",
  },
  changeColumn: {
    flex: 1,
    textAlign: "right",
  },
  tokenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  tokenColumn: {
    flex: 2,
  },
  tokenName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  tokenVolume: {
    fontSize: 12,
    color: "#888",
  },
  tokenPrice: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
  },
  tokenChange: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  positiveChange: {
    color: "green",
  },
  negativeChange: {
    color: "red",
  },
  loadingText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
});

export default PerpPage;
