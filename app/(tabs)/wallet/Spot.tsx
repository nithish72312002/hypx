import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import WebSocketManager from "@/api/WebSocketManager";
import { useActiveAccount } from "thirdweb/react";

interface SpotTabProps {
  scrollEnabled?: boolean;
  onUpdate?: (total: number, pnl: string) => void;
}

const SpotTab = ({ scrollEnabled, onUpdate }: SpotTabProps) => {
  const manager = WebSocketManager.getInstance();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [tokenMap, setTokenMap] = useState<Record<number, string>>({});
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnl, setTotalPnl] = useState(0);
  const account = useActiveAccount();

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const response = await fetch("https://api.hyperliquid-testnet.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "spotMetaAndAssetCtxs" }),
        });

        const data = await response.json();
        const newTokenMap: Record<number, string> = {};

        data[0].universe.forEach((market: any) => {
          const [baseToken] = market.tokens;
          newTokenMap[baseToken] = market.name;
        });

        setTokenMap(newTokenMap);
      } catch (err) {
        console.error("Failed to fetch token metadata:", err);
        setError("Failed to load market data");
      }
    };

    fetchTokenMetadata();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleWebData2 = (data: any) => {
      try {
        setLoading(false); // Always stop loading when data arrives
        clearTimeout(timeout);

        if (!tokenMap || Object.keys(tokenMap).length === 0) return;

        const spotState = data?.spotState;
        const spotAssetCtxs = data?.spotAssetCtxs || [];

        // Handle case with no spot balances
        if (!spotState) {
          setAssets([]);
          setTotalValue(0);
          setTotalPnl(0);
          return;
        }

        if (!account?.address) {
          // User is logged out, clear orders and positions.
          setAssets([]);
          setTotalValue(0);
          setTotalPnl(0);
          return;
        }

        const formattedAssets = spotState.balances
          .filter((balance: any) => parseFloat(balance.total) > 0)
          .map((balance: any) => {
            const marketName = tokenMap[balance.token] || balance.coin;
            const ctx = spotAssetCtxs.find((c: any) => c.coin === marketName);

            const total = parseFloat(balance.total);
            const entryNtl = parseFloat(balance.entryNtl || "0");
            const markPx = balance.coin === "USDC" ? 1 : parseFloat(ctx?.markPx || "0");

            const value = total * markPx;
            const pnlValue = value - entryNtl;
            const pnlPercentage = entryNtl !== 0 ? (pnlValue / entryNtl) * 100 : 0;

            return {
              coin: balance.coin,
              token: balance.token,
              total: total.toString().replace(/(\.\d*?[1-9])0+$/, "$1"),
              value: value.toFixed(2),
              avgCost: entryNtl > 0
                ? (entryNtl / total).toFixed(6).replace(/(\.\d*?[1-9])0+$/, "$1")
                : "N/A",
              pnlValue,
              pnlPercentage,
            };
          });

        setAssets(formattedAssets);

        // Calculate totals
        const totalValue = formattedAssets.reduce((acc, asset) => acc + parseFloat(asset.value), 0);
        const totalPnl = formattedAssets.reduce((acc, asset) => acc + asset.pnlValue, 0);
        setTotalValue(totalValue);
        setTotalPnl(totalPnl);

      } catch (err) {
        console.error("Error processing spot data:", err);
        setError("Error processing spot balances");
        setLoading(false);
      }
    };

    // Add connection timeout
    timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Connection timeout - showing demo data");
      }
    }, 5000);

    manager.addListener("webData2", handleWebData2);
    return () => {
      manager.removeListener("webData2", handleWebData2);
      clearTimeout(timeout);
    };
  }, [manager, tokenMap , account?.address ]);

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

  if (loading) {
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

  const displayAssets = assets.length > 0 ? assets : dummyAssets;

  return (
    <ScrollView style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.totalValue}>Est. Total Value</Text>
        <Text style={styles.totalAmount}>${totalValue.toFixed(2)} USD</Text>
        <Text style={styles.pnl}>
          {totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toFixed(2)} (
          {totalValue !== 0
            ? `${(totalPnl / totalValue) * 100 >= 0 ? "+" : "-"}${Math.abs((totalPnl / totalValue) * 100).toFixed(2)}`
            : "0.00"
          }%)
        </Text>
        <View style={styles.actionRow}>
          {["Deposit", "Withdraw", "Transfer"].map((action) => (
            <TouchableOpacity key={action} style={styles.actionButton}>
              <Text style={styles.actionText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>
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



// Keep the rest of your styles the same
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
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  pnl: {
    color: '#00C076',
    fontSize: 14,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#AB47BC',
  },
  actionText: {
    color: '#AB47BC',
    fontWeight: '500',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
});

export default SpotTab;