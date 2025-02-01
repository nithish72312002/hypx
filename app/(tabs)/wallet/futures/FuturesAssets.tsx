import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface FuturesAssetsProps {
  scrollEnabled?: boolean;
  onUpdate?: (total: number, pnl: string) => void;
}

const FuturesAssets = ({ scrollEnabled, onUpdate }: FuturesAssetsProps) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [accountValue, setAccountValue] = useState(0);
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    const manager = WebSocketManager.getInstance();

    const handleWebData = (data: any) => {
      const clearingState = data?.clearinghouseState;
      if (!clearingState) return;

      const marginSummary = clearingState.marginSummary || {};
      const totalUnrealizedPnl =
        clearingState.assetPositions?.reduce((acc: number, p: any) => {
          return acc + parseFloat(p.position.unrealizedPnl || "0");
        }, 0) || 0;

      const newAccountValue = parseFloat(marginSummary.accountValue) || 0;
      setAccountValue(newAccountValue);

      setAssets([
        {
          coin: "USDC",
          walletBalance: newAccountValue.toFixed(2),
          totalMarginUsed: (
            parseFloat(marginSummary.totalMarginUsed) || 0
          ).toFixed(2),
          available: (parseFloat(clearingState.withdrawable) || 0).toFixed(2),
          unrealizedPnl: totalUnrealizedPnl.toFixed(2),
        },
      ]);
    };

    manager.addListener("webData2", handleWebData);
    return () => manager.removeListener("webData2", handleWebData);
  }, []);

  useEffect(() => {
    if (!onUpdate) return;
    const totalPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    const pnlPercentage = accountValue > 0 ? (totalPnl / accountValue) * 100 : 0;
    onUpdate(
      accountValue,
      `${totalPnl >= 0 ? "+" : "-"}$${Math.abs(totalPnl).toFixed(2)} (${pnlPercentage.toFixed(
        2
      )}%)`
    );
  }, [accountValue, positions, onUpdate]);

  const renderAssetsItem = ({ item }: { item: any }) => (
    <View style={styles.assetContainer}>
      <Text>{item.coin}</Text>
      <Text>${item.walletBalance}</Text>
    </View>
  );

  return (
    <FlatList
      data={assets}
      keyExtractor={(item) => item.coin}
      renderItem={renderAssetsItem}
      scrollEnabled={scrollEnabled}
    />
  );
};

export default FuturesAssets;

const styles = StyleSheet.create({
  assetContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
    borderRadius: 8,
  },
});
