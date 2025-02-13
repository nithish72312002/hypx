import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useActiveAccount } from "thirdweb/react";
import WalletActionButtons from '@/components/buttons/WalletActionButtons';
import { useFuturesStore } from "@/store/useWalletStore";

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
  const [activeInnerTab, setActiveInnerTab] = useState<"Assets" | "Positions">("Assets");
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'assets', title: 'Assets' },
    { key: 'positions', title: 'Positions' },
  ]);

  const account = useActiveAccount();
  const { 
    accountValue,
    positions,
    assets,
    totalPnl,
    isLoading,
    error,
    setAddress
  } = useFuturesStore();

  useEffect(() => {
    setAddress(account?.address);
  }, [account?.address, setAddress]);

  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (onUpdateRef.current) {
      const pnlPercentage = accountValue > 0 ? (totalPnl / accountValue) * 100 : 0;
      onUpdateRef.current(
        accountValue,
        `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`
      );
    }
  }, [accountValue, totalPnl]);

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

  const renderPositionItem = ({ item }: { item: any }) => {
    const marginRatio = (parseFloat(item.marginUsed) / accountValue) * 100 || 0;

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

  const renderAssetsScene = () => (
    <View style={{ flex: 1 }}>
      {renderAssets()}
    </View>
  );

  const renderPositionsScene = () => (
    <View style={{ flex: 1 }}>
      {renderPositions()}
    </View>
  );

  const renderScene = SceneMap({
    assets: renderAssetsScene,
    positions: renderPositionsScene,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16C784" />
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.totalValue}>Est. Total Value</Text>
        <Text style={styles.totalAmount}>${accountValue.toFixed(2)} USD</Text>
        <Text style={styles.pnl}>
          {totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toFixed(2)} (
          {accountValue !== 0
            ? `${(totalPnl / accountValue) * 100 >= 0 ? "+" : "-"}${Math.abs((totalPnl / accountValue) * 100).toFixed(2)}`
            : "0.00"
          }%)
        </Text>
        <View style={styles.actionContainer}>
          <WalletActionButtons />
        </View>
      </View>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={(newIndex) => {
          setIndex(newIndex);
          setActiveInnerTab(newIndex === 0 ? "Assets" : "Positions");
        }}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            style={styles.tabBar}
            indicatorStyle={styles.tabIndicator}
            labelStyle={styles.tabLabel}
            activeColor="#16C784"
            inactiveColor="#808A9D"
          />
        )}
      />
    </View>
  );
};

export default FuturesTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1C24",
  },
  header: {
    backgroundColor: '#2A2D3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    margin: 10,
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
    marginBottom: 4,
  },
  pnl: {
    fontSize: 16,
    color: "#16C784",
    marginBottom: 16,
  },
  actionContainer: {
    marginTop: -8,  // Adjust the top margin to compensate for the button container's margin
  },
  tabBar: {
    backgroundColor: '#2A2D3A',
    elevation: 0,
    shadowOpacity: 0,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  tabIndicator: {
    backgroundColor: '#16C784',
    height: 3,
    borderRadius: 3,
  },
  tabLabel: {
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  assetContainer: {
    backgroundColor: "#2A2D3A",
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
    marginBottom: 12,
  },
  detailColumn: {
    flex: 1,
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
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  leverageText: {
    fontSize: 14,
    color: "#808A9D",
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
    color: "#16C784",
  },
  negative: {
    color: "#EA3943",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#808A9D",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#EA3943",
  },
});