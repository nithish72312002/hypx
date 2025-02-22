import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSpotStore } from "@/store/useSpotStore";
import { useRouter } from "expo-router";
import { useSearchStore } from '@/store/useSearchStore';

interface SortConfig {
  key: 'name' | 'price' | 'volume' | 'change';
  direction: 'asc' | 'desc';
}

const SpotInfoPage: React.FC = () => {
  const { tokens, isLoading, tokenMapping } = useSpotStore();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const { searchText } = useSearchStore();
  const router = useRouter();

  const handleNavigateToDetails = (id: string) => {
    const symbol = id;
    router.push({
      pathname: "/details",
      params: { symbol }
    });
  };

  const sortData = (data: typeof tokens) => {
    return [...data].sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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

  const filteredAndSortedData = useMemo(() => {
    let filtered = tokens;
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = tokens.filter(token => 
        token.name.toLowerCase().includes(searchLower) ||
        token.symbol?.toLowerCase().includes(searchLower)
      );
    }
    return sortData(filtered);
  }, [tokens, sortConfig, searchText]);

  const RenderToken = React.memo(({ item }: { item: typeof tokens[0] }) => (
    <TouchableOpacity onPress={() => handleNavigateToDetails(item.id)}>
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
  ));

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
      {isLoading ? (
        <ActivityIndicator size="large" color="#F0B90B" />
      ) : (
        <View>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={[styles.headerCell, styles.nameColumn]}
              onPress={() => handleSort('name')}
            >
              <Text style={styles.headerText}>{`Name / Vol${getSortIcon('name')}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerCell, styles.priceColumn]}
              onPress={() => handleSort('price')}
            >
              <Text style={styles.headerText}>{`Last Price${getSortIcon('price')}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerCell, styles.changeColumn]}
              onPress={() => handleSort('change')}
            >
              <Text style={styles.headerText}>{`24h Chg%${getSortIcon('change')}`}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredAndSortedData}
            renderItem={({ item }) => <RenderToken item={item} />}
            keyExtractor={(item) => item.id}
            initialNumToRender={10}
            getItemLayout={(data, index) => ({
              length: 60,
              offset: 60 * index,
              index,
            })}
          />
        </View>
      )}
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
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2D3A",
  },
  headerCell: {
    flex: 1,
  },
  headerText: {
    fontSize: 14,
    color: '#808A9D',
    fontWeight: '500',
  },
  nameColumn: {
    flex: 2,
  },
  priceColumn: {
    flex: 1,
    alignItems: 'flex-end',
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
    paddingRight: 6,
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