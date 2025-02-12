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

interface SortConfig {
  key: 'name' | 'price' | 'volume' | 'change';
  direction: 'asc' | 'desc';
}

const SpotInfoPage: React.FC = () => {
  const [tokens, setTokens] = useState<SpotTokenData[]>([]);
  const [tokenMapping, setTokenMapping] = useState<{ [key: string]: string }>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
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

  const sortData = (data: SpotTokenData[], config: SortConfig) => {
    return [...data].sort((a, b) => {
      if (config.key === 'name') {
        return config.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      const aValue = a[config.key];
      const bValue = b[config.key];
      
      if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return ' ▲';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

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

        const sortedTokens = sortData(formattedTokens, sortConfig);
        setTokens(sortedTokens);
        setIsLoading(false);
      } catch (err) {
        console.error("Error processing WebSocket data:", err);
      }
    };

    wsManager.addListener("webData2", listener);

    return () => {
      wsManager.removeListener("webData2", listener);
    };
  }, [tokenMapping, sortConfig]);

  const RenderToken = React.memo(
    ({ item, onPress }: { item: SpotTokenData; onPress: (id: string) => void }) => (
      <TouchableOpacity onPress={() => onPress(item.id)}>
        <View style={styles.tokenRow}>
          <View style={styles.nameColumn}>
            <Text style={styles.tokenName}>{item.name}/USDC</Text>
            <Text style={styles.tokenVolume}>{item.volume.toFixed(2)} Vol</Text>
          </View>
          <View style={styles.priceColumn}>
            <Text style={styles.tokenPrice}>{item.price}</Text>
          </View>
          <View style={styles.changeColumn}>
            <View style={[styles.changeBox, item.change >= 0 ? styles.positiveChangeBox : styles.negativeChangeBox]}>
              <Text style={styles.changeText}>{item.change.toFixed(2)}%</Text>
            </View>
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
        <TouchableOpacity 
          style={[styles.nameColumn]} 
          onPress={() => handleSort('name')}
        >
          <Text style={styles.headerText}>{`Name / Vol${getSortIcon('name')}`}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.priceColumn]}
          onPress={() => handleSort('price')}
        >
          <Text style={styles.headerText}>{`Last Price${getSortIcon('price')}`}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.changeColumn]}
          onPress={() => handleSort('change')}
        >
          <Text style={styles.headerText}>{`24h Chg%${getSortIcon('change')}`}</Text>
        </TouchableOpacity>
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
    backgroundColor: "#1A1C24",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2D3A",
  },
  headerText: {
    fontSize: 13,
    color: "#808A9D",
    fontWeight: "500",
  },
  nameColumn: {
    flex: 2,
    alignItems: 'flex-start',
  },
  priceColumn: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 2,
  },
  changeColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tokenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2D3A",
  },
  tokenColumn: {
    flex: 2,
  },
  tokenName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  tokenVolume: {
    fontSize: 12,
    color: "#808A9D",
    marginTop: 2,
  },
  tokenPrice: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
    textAlign: "right",
  },
  changeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positiveChangeBox: {
    backgroundColor: "#16C784",
  },
  negativeChangeBox: {
    backgroundColor: "#EA3943",
  },
  changeText: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: "#808A9D",
    textAlign: "center",
    marginTop: 16,
  },
});

export default SpotInfoPage;
