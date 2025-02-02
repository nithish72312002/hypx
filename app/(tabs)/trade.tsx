import {  StyleSheet, View } from "react-native";



import TradingInterface from "@/components/tradinginterface";
import { useLocalSearchParams } from "expo-router";
import TradingForm from "@/components/trade/TradingForm";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/constants/thirdweb";
import { inAppWallet } from "thirdweb/wallets";



const wallets = [
  inAppWallet({
    auth: {
      options: ["telegram", "email", "x", "passkey", "guest"],
    },
  }),
];

// fake login state, this should be returned from the backend

const futurespage: React.FC = () => {
  const { symbol } = useLocalSearchParams(); 
  return (
    
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <TradingForm symbol={symbol?.toString() || "ETH"} />
        <ConnectButton client={client} wallets={wallets} />
      </View>
      
  );
}






const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: "100%",
    width: "100%",
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  rowContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    justifyContent: "space-evenly",
  },
  tableContainer: {
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  leftColumn: {
    flex: 1,
    textAlign: "left",
  },
  rightColumn: {
    flex: 1,
    textAlign: "right",
  },
});

export default futurespage;