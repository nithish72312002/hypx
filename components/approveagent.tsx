import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { ethers } from "ethers";
import { useActiveAccount } from "thirdweb/react";
import axios from "axios";
import { useAgentWallet } from "@/hooks/useAgentWallet";

const ApproveAgent: React.FC = () => {
  const { wallet, loading, error } = useAgentWallet(); // Agent wallet from context
  const [signStatus, setSignStatus] = useState("");
  const account = useActiveAccount();
  // Add 170 days in milliseconds

  const generateNonce = () => Date.now(); // Use the current time in milliseconds as nonce


  const onClickApproveAgent = async () => {
    try {
      if (loading || !wallet || !account) {
        Alert.alert("Error", "Wallet is still loading or not available.");
        return;
      }
      const currentTimestamp = generateNonce(); // Current timestamp for nonce
    const validUntilTimestamp = currentTimestamp + 170 * 24 * 60 * 60 * 1000; 
  
      const message = {
        hyperliquidChain: "Testnet",
        signatureChainId: "0x66eee", // Chain ID in hex for Sepolia Testnet
        agentAddress: wallet.address || "fallback-address", // Use address from the agent wallet hook
        agentName: `hypx valid_until ${validUntilTimestamp}`, // Example agent name
        nonce: currentTimestamp, // Must match nonce
        type: "approveAgent",
      };

      // EIP-712 domain definition
      const domain = {
        name: "HyperliquidSignTransaction",
        version: "1",
        chainId: 421614, // Chain ID for Sepolia Testnet
        verifyingContract: "0x0000000000000000000000000000000000000000", // Replace with your verifying contract address
      };

      // EIP-712 types
      const types = {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        "HyperliquidTransaction:ApproveAgent": [
          { name: "hyperliquidChain", type: "string" },
          { name: "agentAddress", type: "address" },
          { name: "agentName", type: "string" },
          { name: "nonce", type: "uint64" },
        ],
      };

      // Sign the EIP-712 data
      const signature = await account.signTypedData({
        domain,
        message,
        primaryType: "HyperliquidTransaction:ApproveAgent",
        types,
      });

      // Split the signature into r, s, v components
      const { v, r, s } = ethers.Signature.from(signature);

      console.log("EIP-712 Signature:", signature);
      console.log("Split Signature:", { v, r, s });

      // Construct the API payload
      const apiPayload = {
        action: message, // The signed message object
        nonce: currentTimestamp, // Must match the nonce inside message
        signature: { r, s, v }, // Signature components
      };

      // Send the payload to the API
      const apiUrl = " https://api.hyperliquid-testnet.xyz/exchange";
      const headers = {
        "Content-Type": "application/json",
      };

      const response = await axios.post(apiUrl, apiPayload, { headers });

      console.log("API Response:", response.data);
      Alert.alert("Success", "Agent Wallet Approved and Payload Sent Successfully!");
    } catch (error) {
      console.error("Error Approving Agent Wallet:", error);
      setSignStatus(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onClickApproveAgent} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Loading Wallet..." : "Approve Agent Wallet"}</Text>
      </TouchableOpacity>
      {signStatus ? <Text style={styles.status}>{signStatus}</Text> : null}
    </View>
  );
};

export default ApproveAgent;

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  status: {
    marginTop: 15,
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
});
