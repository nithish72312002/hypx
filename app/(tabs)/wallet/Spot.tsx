import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useActiveAccount } from "thirdweb/react";
import { useSpotWallet } from "@/store/useSpotWallet";
import WalletActionButtons from '@/components/buttons/WalletActionButtons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

interface SpotTabProps {
  scrollEnabled?: boolean;
  onUpdate?: (total: number, pnl: string) => void;
}

interface AssetItemProps {
  item: {
    coin: string;
    total: string;
    value: string;
    pnlValue: number;
    pnlPercentage: number;
    avgCost: string;
  };
}

const AssetItem = memo(({ item }: AssetItemProps) => {
  const hasPNL = item.pnlValue !== 0;
  const pnlSign = item.pnlValue >= 0 ? "+" : "-";

  return (
    <View style={styles.assetContainer}>
      <View style={styles.assetHeader}>
        <Text style={styles.assetName}>{item.coin}</Text>
        <Text style={styles.assetAmount}>{item.total}</Text>
      </View>
      <View style={styles.detailRow}>
        <View style={styles.avgCostColumn}>
          <Text style={styles.detailLabel}>Avg. entry</Text>
          <Text style={styles.detailValue}>{item.avgCost}</Text>
        </View>
        <View style={styles.valueColumn}>
          <Text style={styles.detailLabel}>Value</Text>
          <Text style={styles.detailValue}>${item.value}</Text>
        </View>
      </View>
      {hasPNL && (
        <View style={styles.pnlRow}>
          <Text style={styles.detailLabel}>Today's PNL</Text>
          <Text
            style={[
              styles.detailValue,
              item.pnlValue >= 0 ? styles.positive : styles.negative,
            ]}
          >
            {`${pnlSign}$${Math.abs(item.pnlValue).toFixed(2)} (${pnlSign}${Math.abs(
              item.pnlPercentage
            ).toFixed(2)}%)`}
          </Text>
        </View>
      )}
    </View>
  );
});

export const SpotTab = ({ scrollEnabled, onUpdate }: SpotTabProps) => {
  const account = useActiveAccount();
  const { balances, totalValue, totalPnl, isLoading, subscribeToWebSocket } = useSpotWallet();
  const [scrollEnabledState, setScrollEnabledState] = useState(scrollEnabled);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    console.log("[SpotTab] Component mounted, subscribing to WebSocket");
    const unsubscribe = subscribeToWebSocket();

    return () => {
      console.log("[SpotTab] Component unmounting, unsubscribing from WebSocket");
      unsubscribe();
    };
  }, [subscribeToWebSocket]);

  useEffect(() => {
    if (onUpdateRef.current) {
      onUpdateRef.current(totalValue, totalPnl.toFixed(2));
    }
  }, [balances, totalValue, totalPnl, isLoading]);

  useEffect(() => {
    if (balances) {
      console.log("[SpotTab] Balances updated:", balances.length, "assets");
    }
  }, [balances]);

  const renderAssetItem = useMemo(() => ({ item }: { item: AssetItemProps["item"] }) => {
    return <AssetItem item={item} />;
  }, []);

  if (isLoading) {
    console.log("[SpotTab] Rendering loading state");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16C784" />
        <Text style={styles.loadingText}>Loading spot assets...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrapper} scrollEnabled={scrollEnabledState}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.totalValue}>Est. Total Value</Text>
            <Text style={styles.totalAmount}>${totalValue.toFixed(2)} USD</Text>
            <Text style={[styles.pnl, totalPnl >= 0 ? styles.positive : styles.negative]}>
              {totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toFixed(2)} (
              {totalValue !== 0
                ? `${(totalPnl / totalValue) * 100 >= 0 ? "+" : "-"}${Math.abs((totalPnl / totalValue) * 100).toFixed(2)}`
                : "0.00"}%)
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() =>router.push({
              pathname: '/history',
              params: { initialTab: 'deposits' }
            })
            }
          >
            <Ionicons name="time-outline" size={24} color="#808A9D" />
          </TouchableOpacity>
        </View>
        <WalletActionButtons />
      </View>

      <Text style={styles.sectionTitle}>Balances</Text>
      {balances.map((item) => (
        <View key={`${item.token}-${item.coin}`}>
          {renderAssetItem({ item })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginHorizontal: 10,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#1A1C24',
  },
  loadingText: {
    marginTop: 8,
    color: "#808A9D",
  },
  errorText: {
    color: "#EA3943",
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  assetContainer: {
    backgroundColor: "#2A2D3A",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 12,
  },
  assetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  assetName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  valueColumn: {
    alignItems: "flex-end",
  },
  avgCostColumn: {
    flex: 1,
  },
  pnlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailLabel: {
    color: "#808A9D",
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  positive: {
    color: "#16C784",
  },
  negative: {
    color: "#EA3943",
  },
  totalValue: {
    fontSize: 14,
    color: "#808A9D",
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  pnl: {
    fontSize: 14,
    marginBottom: 16,
  },
  header: {
    backgroundColor: '#2A2D3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    margin: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  historyButton: {
    padding: 8,
  },
  actionContainer: {
    marginTop: -8,  // Adjust the top margin to compensate for the button container's margin
  },
});

export default SpotTab;