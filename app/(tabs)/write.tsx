import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useActiveAccount } from "thirdweb/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import ApproveAgent from "@/components/approveagent";
import { useAgentWalletContext } from "@/context/AgentWalletContext";


const Wallet: React.FC = () => {
  const account = useActiveAccount();
  const router = useRouter();
  const { redirectTo } = useLocalSearchParams();
  const { wallet, loading, error } = useAgentWalletContext();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  useEffect(() => {
    if (!account) {
      // Redirect to login if no account is active
      router.push({
        pathname: "/loginpage",
        query: { redirectTo: redirectTo || "/wallet" }, // Redirect back to this page after login
      });
    }
  }, [account, router, redirectTo]);

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;
  if (!account) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading your wallet...</Text>
      </View>
    );
  }

  console.log("Wallet address: ", account.address);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Address</Text>
      {account.address ? (
        <Text style={styles.address}>{account.address}</Text>
      ) : (
        <Text style={styles.error}>No active wallet address found.</Text>
      )}
      
      <Text >Address: {wallet.address}</Text>
      <Text>Private Key: {wallet.privateKey}</Text>
	  <ApproveAgent/>
    </View>
  );
};

export default Wallet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  address: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
  error: {
    fontSize: 16,
    color: "red",
    marginBottom: 20,
  },
});
