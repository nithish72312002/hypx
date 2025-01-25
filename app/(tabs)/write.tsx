import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { useActiveAccount } from "thirdweb/react";

const UserAssets = () => {
  const { sdk } = useHyperliquid();
  const account = useActiveAccount();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("Spot");

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        if (!sdk || !account?.address) {
          console.log("SDK or account address is not available.");
          return;
        }

        console.log("Fetching user assets for:", account.address);

        // Make the API call to get the user's spot balances
        const response = await sdk.info.spot.getSpotClearinghouseState(
          "0x93c6d60b83c43C925538215Ee467De7ed5B4D4d9"
        );

        if (response && response.balances) {
          // Transform the response to match the display format
          const formattedAssets = response.balances
            .filter((balance) => parseFloat(balance.total) > 0) // Filter only tokens with total > 0
            .map((balance) => {
              const total = parseFloat(balance.total);
              const entryNtl = parseFloat(balance.entryNtl || "1");
              const avgCost = entryNtl / total;

              return {
                coin: balance.coin,
                total: total.toFixed(6),
                value: `$${(total * 1).toFixed(2)}`, // Replace `1` with the dummy price or calculation
                pnl: "+$0.00 (0.00%)", // Placeholder for PNL if not available
                avgCost: `$${avgCost.toFixed(6)}`,
              };
            });
          setAssets(formattedAssets);
        } else {
          console.warn("Unexpected response format:", response);
          setAssets([]);
        }
      } catch (err) {
        console.error("Error fetching user assets:", err);
        setError("Failed to fetch user assets.");
        Alert.alert("Error", "Failed to fetch user assets.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [sdk, account?.address]);

  const renderAssetItem = ({ item }) => (
    <View style={styles.assetContainer}>
      <View style={styles.assetHeader}>
        <Text style={styles.assetName}>{item.coin}</Text>
        <Text style={styles.assetAmount}>{item.total}</Text>
      </View>

      <View style={styles.assetDetails}>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Value</Text>
          <Text style={styles.detailValue}>{item.value}</Text>
        </View>

        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Today's PNL</Text>
          <Text
            style={[
              styles.detailValue,
              item.pnl.includes("+") ? styles.positive : styles.negative,
            ]}
          >
            {item.pnl}
          </Text>
        </View>

        <View style={[styles.detailColumn, styles.alignAvgCost]}>
          <Text style={styles.detailLabel}>Avg. entry</Text>
          <Text style={styles.detailValue}>{item.avgCost}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading user assets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.tabs}>
          {["Spot", "Futures"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, selectedTab === tab && styles.activeTab]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.totalValue}>Est. Total Value</Text>
        <Text style={styles.totalAmount}>
          ${assets.reduce((acc, item) => acc + parseFloat(item.value.slice(1)), 0).toFixed(2)} USD
        </Text>
        <Text style={styles.pnl}>Today's PNL +$0.04 (-0.62%)</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {["Deposit", "Withdraw", "Transfer"].map((action) => (
          <TouchableOpacity key={action} style={styles.actionButton}>
            <Text style={styles.actionText}>{action}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Assets List */}
      <Text style={styles.sectionTitle}>Balances</Text>
      <FlatList
        data={assets}
        scrollEnabled={false}
        renderItem={renderAssetItem}
        keyExtractor={(item) => item.coin}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
    padding: 16,
  },
  header: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: "#0052FF",
  },
  tabText: {
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
  },
  totalValue: {
    color: "#666",
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  pnl: {
    color: "#00C076",
    fontSize: 14,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionText: {
    color: "#0052FF",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  assetContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  assetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  assetName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  assetDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  alignAvgCost: {
    alignItems: "flex-end",
  },
  detailColumn: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});

export default UserAssets;