import { StyleSheet, View } from "react-native";
import TradingInterface from "@/components/tradinginterface";
import { useLocalSearchParams } from "expo-router";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/constants/thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import WebSocketManager from "@/api/WebSocketManager";
import { useEffect, useState } from "react";
import SymbolSelector from "@/components/bottomsheets/SymbolSelector";
import TestSheet from "@/components/bottomsheets/TestSheet";

const wallets = [
  inAppWallet({
    auth: {
      options: ["telegram", "email", "x", "passkey", "guest"],
    },
  }),
];

interface TokenData {
  name: string;
  // Add other necessary fields
}

const FuturesPage: React.FC = () => {
  const { symbol } = useLocalSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState(symbol?.toString() || "ETH");
  const [tokens, setTokens] = useState<string[]>([]);

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();
    
    const listener = (data: any) => {
      try {
        const { meta } = data;
        const validTokens = meta.universe
          .map((token: TokenData) => token.name)
          .filter((name: string) => name); // Filter out empty names if any
        
        setTokens(validTokens);
      } catch (err) {
        console.error("Error processing WebSocket data:", err);
      }
    };

    wsManager.addListener("webData2", listener);
    return () => wsManager.removeListener("webData2", listener);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ConnectButton client={client} wallets={wallets} />
      <TestSheet/>
      <View style={styles.selectorContainer}>
        <SymbolSelector 
          symbols={tokens}
          selectedSymbol={selectedSymbol}
          onSelect={setSelectedSymbol}
        />
      </View>

      <TradingInterface symbol={selectedSymbol} />
    </View>
  );
}

const styles = StyleSheet.create({
  selectorContainer: {
    padding: 16,
    zIndex: 1, // Ensure selector appears above other content
  },
});

export default FuturesPage;