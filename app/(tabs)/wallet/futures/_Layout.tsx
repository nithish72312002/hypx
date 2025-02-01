import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FuturesAssets from "./FuturesAssets";
import FuturesPositions from "./FuturesPositions";

interface LayoutProps {
  scrollEnabled?: boolean;
  onUpdate?: (total: number, pnl: string) => void;
}

const Layout = ({ scrollEnabled, onUpdate }: LayoutProps) => {
  const [activeInnerTab, setActiveInnerTab] = useState<"Assets" | "Positions">("Assets");

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

      {/* Render the appropriate component based on the selected tab */}
      {activeInnerTab === "Assets" ? (
        <FuturesAssets scrollEnabled={scrollEnabled} onUpdate={onUpdate} />
      ) : (
        <FuturesPositions scrollEnabled={scrollEnabled} />
      )}
    </View>
  );
};

export default Layout;

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
});
