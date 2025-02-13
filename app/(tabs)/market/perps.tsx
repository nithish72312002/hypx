import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { usePerpStore } from "@/store/usePerpStore";
import { useRouter } from "expo-router";

interface PerpTokenData {
  name: string;
  price: number;
  volume: number;
  change: number;
  leverage: number;
  usdvolume: number;
}

interface SortConfig {
  key: 'name' | 'price' | 'volume' | 'change';
  direction: 'asc' | 'desc';
}

const PerpPage: React.FC = () => {
  const { tokens, isLoading, subscribeToWebSocket } = usePerpStore();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = subscribeToWebSocket();
    return () => {
      unsubscribe();
    };
  }, []);

  const handleNavigateToDetails = (symbol: string) => {
    const encodedSymbol = encodeURIComponent(symbol);
    router.push(`/details/${encodedSymbol}`);
  };

  const sortData = (data: PerpTokenData[], config: SortConfig) => {
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

  const sortedTokens = React.useMemo(() => {
    return sortData(tokens, sortConfig);
  }, [tokens, sortConfig]);

  const RenderToken = React.memo(
    ({ item, onPress }: { item: PerpTokenData; onPress: (name: string) => void }) => (
      <TouchableOpacity onPress={() => onPress(item.name)}>
        <View style={styles.tokenRow}>
          <View style={styles.tokenColumn}>
          <Text style={styles.tokenName}>
            {item.name}/USDC <Text style={styles.tokenLeverage}>x{item.leverage}</Text>
          </Text>            
            <Text style={styles.tokenVolume}>{item.usdvolume.toFixed(2)} Vol</Text>
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
        <TouchableOpacity 
          style={[styles.headerText, styles.nameColumn]} 
          onPress={() => handleSort('name')}
        >
          <Text style={[styles.headerText, {textAlign: 'left'}]}>Name / Vol{getSortIcon('name')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.headerText, styles.priceColumn]}
          onPress={() => handleSort('price')}
        >
          <Text style={[styles.headerText, {textAlign: 'right'}]}>Last Price{getSortIcon('price')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.headerText, styles.changeColumn]}
          onPress={() => handleSort('change')}
        >
          <Text style={[styles.headerText, {textAlign: 'right'}]}>24h Chg%{getSortIcon('change')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={sortedTokens}
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
  tokenLeverage: {
    fontSize: 12,
    color: "#808A9D",
    fontWeight: "400",
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

export default PerpPage;
