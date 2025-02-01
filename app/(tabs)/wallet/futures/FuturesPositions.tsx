import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";

interface FuturesPositionsProps {
  scrollEnabled?: boolean;
}

const FuturesPositions = ({ scrollEnabled }: FuturesPositionsProps) => {
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    const manager = WebSocketManager.getInstance();

    const handleWebData = (data: any) => {
      const clearingState = data?.clearinghouseState;
      if (!clearingState) return;

      setPositions(
        clearingState.assetPositions?.map((p: any) => ({
          coin: p.position.coin,
          size: parseFloat(p.position.szi),
          entryPx: parseFloat(p.position.entryPx),
          unrealizedPnl: parseFloat(p.position.unrealizedPnl),
          marginUsed: parseFloat(p.position.marginUsed),
        })) || []
      );
    };

    manager.addListener("webData2", handleWebData);
    return () => manager.removeListener("webData2", handleWebData);
  }, []);

  const renderPositionItem = ({ item }: { item: any }) => (
    <View style={styles.positionContainer}>
      <Text>{item.coin}</Text>
      <Text>{item.size}</Text>
      <Text>{item.entryPx}</Text>
    </View>
  );

  return (
    <FlatList
      data={positions}
      keyExtractor={(item, idx) => `position-${idx}`}
      renderItem={renderPositionItem}
      scrollEnabled={scrollEnabled}
    />
  );
};

export default FuturesPositions;

const styles = StyleSheet.create({
  positionContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
    borderRadius: 8,
  },
});
