import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface FuturesTabProps {
  scrollEnabled?: boolean;
  onUpdate?: (total: number, pnl: string) => void;
}

const formatLiquidationPrice = (
  liquidationPx: string | number | null
): string => {
  if (!liquidationPx) return "N/A";
  const number =
    typeof liquidationPx === "string" ? parseFloat(liquidationPx) : liquidationPx;
  if (isNaN(number)) return "N/A";

  return number >= 1000
    ? Math.round(number).toString()
    : number.toFixed(5).replace(/\.?0+$/, "");
};

const FuturesTab = ({ scrollEnabled, onUpdate }: FuturesTabProps) => {
  const manager = WebSocketManager.getInstance();
  const [activeInnerTab, setActiveInnerTab] = useState<"Assets" | "Positions">("Assets");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountValue, setAccountValue] = useState(0);
  const [withdrawable, setWithdrawable] = useState(0);
  const [positions, setPositions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    const handleWebData2 = (data: any) => {
      try {
        const clearingState = data?.clearinghouseState;
        if (!clearingState) return;

        const marginSummary = clearingState.marginSummary || {};
        const totalUnrealizedPnl =
          clearingState.assetPositions?.reduce((acc: number, p: any) => {
            return acc + parseFloat(p.position.unrealizedPnl || "0");
          }, 0) || 0;

        const newAccountValue = parseFloat(marginSummary.accountValue) || 0;
        const newWithdrawable = parseFloat(clearingState.withdrawable) || 0;

        setAccountValue(newAccountValue);
        setWithdrawable(newWithdrawable);

        // Single “asset” object for the Futures account
        setAssets([
          {
            coin: "USDC",
            walletBalance: newAccountValue.toFixed(2),
            totalmarginused: (
              parseFloat(marginSummary.totalMarginUsed) || 0
            ).toFixed(2),
            available: newWithdrawable.toFixed(2),
            unrealizedPnl: totalUnrealizedPnl.toFixed(2),
          },
        ]);

        // Build positions array
        setPositions(
          clearingState.assetPositions?.map((p: any) => {
            const coin = p.position.coin;
            const universeIndex =
              data.meta?.universe?.findIndex((u: any) => u.name === coin) ?? -1;
            const markPx =
              universeIndex !== -1 && data.assetCtxs?.[universeIndex]?.markPx
                ? parseFloat(data.assetCtxs[universeIndex].markPx)
                : 0;

            return {
              coin,
              size: parseFloat(p.position.szi),
              entryPx: parseFloat(p.position.entryPx),
              unrealizedPnl: parseFloat(p.position.unrealizedPnl),
              liquidationPx: p.position.liquidationPx,
              marginUsed: parseFloat(p.position.marginUsed),
              returnOnEquity: parseFloat(p.position.returnOnEquity) * 100,
              leverage: p.position.leverage, // { type, value }
              markPx,
            };
          }) || []
        );

        setLoading(false);
      } catch (err) {
        console.error("Error processing webData2:", err);
        setError("Error processing futures data.");
      }
    };

    manager.addListener("webData2", handleWebData2);
    return () => manager.removeListener("webData2", handleWebData2);
  }, [manager]);

  // Calculate total PNL and update parent
  useEffect(() => {
    if (!onUpdate) return;

    const totalPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    const pnlPercentage = accountValue > 0 ? (totalPnl / accountValue) * 100 : 0;

    onUpdate(
      accountValue,
      `${totalPnl >= 0 ? "+" : "-"}$${Math.abs(totalPnl).toFixed(2)} (${pnlPercentage.toFixed(2)}%)`
    );
  }, [accountValue, positions, onUpdate]);

  // --- RENDERING FUNCTIONS ---

  /**
   * Assets rendering
   */
  const renderAssetsItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.assetContainer}>
        <View style={styles.assetHeader}>
          <Text style={styles.assetName}> {item.coin}</Text>
          <Text style={styles.assetAmount}>${item.walletBalance}</Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Wallet Balance</Text>
            <Text style={styles.detailValue}>${item.walletBalance}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Margin Used</Text>
            <Text style={styles.detailValue}>${item.totalmarginused}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Unrealized PNL</Text>
            <Text style={styles.detailValue}>${item.unrealizedPnl}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Available for Transfer</Text>
            <Text style={styles.detailValue}>${item.available}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAssets = () => {
    return (
      <FlatList
        data={assets}
        keyExtractor={(item) => item.coin}
        renderItem={renderAssetsItem}
        scrollEnabled={scrollEnabled}
      />
    );
  };

  /**
   * Positions rendering
   */
  const renderPositionItem = ({ item }: { item: any }) => {
    const marginRatio =
      (parseFloat(item.marginUsed) / parseFloat(accountValue.toString())) * 100 || 0;

    return (
      <View style={styles.assetContainer}>
        <View style={styles.positionHeader}>
          <Text style={styles.assetName}>{item.coin}/USDC</Text>
          <Text style={styles.leverageText}>
            {item.leverage.type === "cross" ? "Cross" : "Isolated"}{" "}
            {item.leverage.value}x
          </Text>
        </View>

        <View style={styles.pnlRow}>
          <Text style={styles.detailLabel}>Unrealized PNL (USDC)</Text>
          <Text
            style={[
              styles.detailValue,
              item.unrealizedPnl < 0 ? styles.negative : styles.positive,
            ]}
          >
            {item.unrealizedPnl}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Size ({item.coin})</Text>
            <Text style={styles.detailValue}>{Math.abs(item.size)}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Margin (USDC)</Text>
            <Text style={styles.detailValue}>{item.marginUsed}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Entry Price (USDC)</Text>
            <Text style={styles.detailValue}>{item.entryPx}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Mark Price (USDC)</Text>
            <Text style={styles.detailValue}>{item.markPx}</Text>
          </View>
        </View>

        <View style={styles.rotSection}>
          <View style={styles.rotColumn}>
            <Text
              style={[
                styles.detailValue,
                item.returnOnEquity < 0 ? styles.negative : styles.positive,
              ]}
            >
              {item.returnOnEquity.toFixed(2)}%
            </Text>
            <Text style={styles.detailLabel}>ROI</Text>
          </View>
          <View style={styles.rotColumn}>
            <Text style={styles.detailValue}>{marginRatio.toFixed(2)}%</Text>
            <Text style={styles.detailLabel}>Margin Ratio</Text>
          </View>
          <View style={styles.rotColumn}>
            <Text style={styles.detailValue}>
              {formatLiquidationPrice(item.liquidationPx)}
            </Text>
            <Text style={styles.detailLabel}>Liq. Price</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPositions = () => {
    return (
      <FlatList
        data={positions}
        keyExtractor={(_item, idx) => `position-${idx}`}
        renderItem={renderPositionItem}
        scrollEnabled={scrollEnabled}
      />
    );
  };

  // --- MAIN RETURN ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AB47BC" />
        <Text style={styles.loadingText}>Loading futures data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.innerTabs}>
        {["Assets", "Positions"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.innerTabButton,
              activeInnerTab === tab && styles.activeInnerTab,
            ]}
            onPress={() => setActiveInnerTab(tab as "Assets" | "Positions")}
          >
            <Text
              style={[
                styles.innerTabText,
                activeInnerTab === tab && styles.activeInnerTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Only render one list depending on the tab */}
      {activeInnerTab === "Assets" ? renderAssets() : renderPositions()}
    </View>
  );
};

export default FuturesTab;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  innerTabs: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
  },
  innerTabButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  activeInnerTab: {
    backgroundColor: "#AB47BC",
  },
  innerTabText: {
    color: "#666",
    fontWeight: "500",
  },
  activeInnerTabText: {
    color: "#fff",
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
    marginBottom: 12,
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
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  leverageText: {
    fontSize: 14,
    color: "#666",
  },
  pnlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  rotSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  rotColumn: {
    alignItems: "center",
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
  },
  loadingText: {
    marginTop: 8,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF6838",
  },
});
