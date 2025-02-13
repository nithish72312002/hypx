import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import WalletActionButtons from '@/components/buttons/WalletActionButtons';
import { defineChain } from 'thirdweb';
import { client } from '@/constants/thirdweb';
import tokenList from '@/data/tokens.json';

export default function HyperEVMScreen() {
  const account = useActiveAccount();
  const address = account?.address;

  const hyperevm = defineChain({
    id: 998,
    rpc: "https://api.hyperliquid-testnet.xyz/evm",
    nativeCurrency: {
      name: "HYPE",
      symbol: "HYPE",
      decimals: 18,
    }
  });

  // Get native token balance
  const { data: nativeBalance, isLoading: nativeLoading } = useWalletBalance({
    chain: hyperevm,
    address: address,
    client,
  });

  // Get token balances for each token
  const tokenBalanceResults = tokenList.tokens.map(tokenAddress => 
    useWalletBalance({
      chain: hyperevm,
      address:address,
      client,
      tokenAddress,
    })
  );

  // Process token balances
  const tokenBalances = tokenBalanceResults.map((result, index) => ({
    address: tokenList.tokens[index],
    displayValue: result.data?.displayValue || '0',
    symbol: result.data?.symbol || '',
    isLoading: result.isLoading,
  }));

  const isLoading = nativeLoading || tokenBalances.some(token => token.isLoading);

  if (!account?.address) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Please connect your wallet</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16C784" />
        <Text style={styles.loadingText}>Loading balances...</Text>
      </View>
    );
  }

  const allBalances = [
    {
      address: 'native',
      displayValue: nativeBalance?.displayValue || '0',
      symbol: nativeBalance?.symbol || 'HYPE',
      isLoading: nativeLoading,
    },
    ...tokenBalances
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.balanceContainer}>
          <Text style={styles.totalValue}>Est. Total Value</Text>
          <Text style={styles.totalAmount}>$0.00 USD</Text>
        </View>
        <WalletActionButtons />
      </View>

      <View style={styles.tokensContainer}>
        {allBalances.map((token) => (
          <View key={token.address} style={styles.tokenItem}>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenSymbol}>{token.symbol}</Text>
            </View>
            <Text style={styles.tokenBalance}>
              {token.displayValue} {token.symbol}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1C24',
  },
  loadingText: {
    marginTop: 8,
    color: '#808A9D',
  },
  message: {
    textAlign: 'center',
    color: '#808A9D',
    marginTop: 20,
  },
  header: {
    backgroundColor: '#2A2D3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    margin: 10,
  },
  balanceContainer: {
    marginBottom: 24,
  },
  totalValue: {
    fontSize: 14,
    color: '#808A9D',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tokensContainer: {
    padding: 16,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tokenBalance: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});