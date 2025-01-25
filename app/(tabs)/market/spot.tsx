import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import WebSocketManager from "@/api/WebSocketManager";
import { useRouter } from "expo-router";

interface SpotTokenData {
  id: string;
  name: string;
  price: number;
  volume: number;
  change: number;
}

const SpotInfoPage: React.FC = () => {
  const [tokens, setTokens] = useState<SpotTokenData[]>([]);
  const [tokenMapping, setTokenMapping] = useState<{ [key: string]: string }>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const handleNavigateToDetails = (id: string) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/details/${encodedId}`);
  };

  const parseTokenMapping = (apiResponse: any) => {
    const mapping: { [key: string]: string } = {};
    const tokensArray = apiResponse[0]?.tokens || [];
    const universeArray = apiResponse[0]?.universe || [];

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

    return mapping;
  };

  useEffect(() => {
    const fetchTokenMapping = async () => {
      try {
        const response = await axios.post("https://api.hyperliquid-testnet.xyz/info", {
          type: "spotMetaAndAssetCtxs",
        });

        const mapping = parseTokenMapping(response.data);
        setTokenMapping(mapping);
      } catch (err) {
        console.error("Error fetching token mapping:", err);
      }
    };

    fetchTokenMapping();
  }, []);

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

        const formattedTokens = spotAssetCtxs
          .filter((ctx: any) => ctx.dayBaseVlm > 0) // Exclude tokens with volume <= 0
          .map((ctx: any) => {
            const { coin, markPx, dayBaseVlm, prevDayPx } = ctx;

            const id = coin;
            const name = tokenMapping[coin] || coin;

            const price = markPx !== undefined ? parseFloat(markPx) : 0;
            const volume = dayBaseVlm !== undefined ? parseFloat(dayBaseVlm) : 0;
            const prevPrice =
              prevDayPx !== undefined ? parseFloat(prevDayPx) : 0;

            const change =
              prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;

            return {
              id,
              name,
              price,
              volume,
              change,
            };
          });

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
  }, [tokenMapping]);

  const RenderToken = React.memo(
    ({ item, onPress }: { item: SpotTokenData; onPress: (id: string) => void }) => (
      <TouchableOpacity onPress={() => onPress(item.id)}>
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

  const renderToken = ({ item }: { item: SpotTokenData }) => (
    <RenderToken item={item} onPress={handleNavigateToDetails} />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading spot tokens...</Text>
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
        keyExtractor={(item) => item.id}
        renderItem={renderToken}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: 60,
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

export default SpotInfoPage;
