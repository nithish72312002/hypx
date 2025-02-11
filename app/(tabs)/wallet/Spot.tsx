import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useActiveAccount } from "thirdweb/react";
import { useSpotStore } from "@/store/useWalletStore";
import WalletActionButtons from '@/components/buttons/WalletActionButtons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

interface SpotTabProps {
  scrollEnabled?: boolean;
  onUpdate?: (total: number, pnl: string) => void;
}

const SpotTab = ({ scrollEnabled, onUpdate }: SpotTabProps) => {
  const account = useActiveAccount();
  const { balances, totalValue, totalPnl, isLoading, error, setAddress } = useSpotStore();

  useEffect(() => {
    setAddress(account?.address);
  }, [account?.address, setAddress]);

  useEffect(() => {
    if (onUpdate) {
      onUpdate(totalValue, totalPnl.toFixed(2));
    }
  }, [onUpdate, totalValue, totalPnl]);

  const renderAssetItem = ({ item }: { item: any }) => {
    const hasPNL = item.pnlValue !== 0;
    const isDummy = item.token < 0;
    const pnlSign = item.pnlValue >= 0 ? "+" : "-";

    return (
      <View style={[styles.assetContainer, isDummy && styles.dummyAsset]}>
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
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AB47BC" />
        <Text style={styles.loadingText}>Loading spot assets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const dummyAssets = [
    {
      coin: 'USDC',
      token: -1,
      total: '0',
      value: '0.00',
      avgCost: 'N/A',
      pnlValue: 0,
      pnlPercentage: 0,
    },
    {
      coin: 'HYPE',
      token: -2,
      total: '0',
      value: '0.00',
      avgCost: 'N/A',
      pnlValue: 0,
      pnlPercentage: 0,
    },
  ];

  const displayAssets = balances.length > 0 ? balances : dummyAssets;

  return (
    <ScrollView style={styles.wrapper}>
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
            onPress={() => router.push('/history')}
          >
            <Ionicons name="time-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <WalletActionButtons />
      </View>

      <Text style={styles.sectionTitle}>Balances</Text>
      {displayAssets.map((item) => (
        <View key={`${item.token}-${item.coin}`}>
          {renderAssetItem({ item })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dummyAsset: {
    opacity: 0.6,
  },
  wrapper: {
    flex: 1,
    padding: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginHorizontal: 10,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#666",
  },
  errorText: {
    color: "#FF6838",
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  assetContainer: {
    backgroundColor: "#fff",
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
    color: "#000",
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
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
    color: "#666",
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  positive: {
    color: "#00C076",
  },
  negative: {
    color: "#FF6838",
  },
  totalValue: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  pnl: {
    fontSize: 14,
    marginBottom: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
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