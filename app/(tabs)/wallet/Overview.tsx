import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useActiveAccount } from "thirdweb/react";
import WebSocketManager from "@/api/WebSocketManager";
import WalletActionButtons from '@/components/buttons/WalletActionButtons';

const Overview = () => {
  const [totalValue, setTotalValue] = useState(0);
  const [todayPnl, setTodayPnl] = useState({ value: 0, percentage: 0 });
  const [balances, setBalances] = useState({
    spot: 0,
    funding: 0,
    futures: 0,
  });
  const account = useActiveAccount();

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();
    let isMounted = true;

    const listener = (data: any) => {
      if (!isMounted) return;
      try {
        // Process data to update balances
        const { meta, assetCtxs } = data;
        if (!meta || !assetCtxs) return;

        let spotTotal = 0;
        meta.universe.forEach((token: any, index: number) => {
          const ctx = assetCtxs[index] || {};
          const { markPx } = ctx;
          const price = parseFloat(markPx) || 0;
          spotTotal += price;
        });

        setBalances(prev => ({
          ...prev,
          spot: spotTotal
        }));
        
        // Calculate total value
        const total = spotTotal + balances.funding + balances.futures;
        setTotalValue(total);
      } catch (err) {
        console.error("Error processing data:", err);
      }
    };

    wsManager.addListener("webData2", listener);
    return () => {
      isMounted = false;
      wsManager.removeListener("webData2", listener);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header with Total Value */}
      <View style={styles.header}>
        <View style={styles.totalValueContainer}>
          <Text style={styles.label}>Est. Total Value</Text>
          <View style={styles.valueRow}>
            <Text style={styles.totalValue}>
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.currency}> USD</Text>
          </View>
          <Text style={[styles.pnl, todayPnl.value >= 0 ? styles.positive : styles.negative]}>
            {todayPnl.value >= 0 ? '+' : '-'}${Math.abs(todayPnl.value).toFixed(2)} ({Math.abs(todayPnl.percentage).toFixed(2)}%)
          </Text>
        </View>
        <WalletActionButtons />
      </View>

      {/* Account Section */}
      <View style={styles.accountSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Spot</Text>
          <Text style={styles.balanceValue}>${balances.spot.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Funding</Text>
          <Text style={styles.balanceValue}>${balances.funding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Futures</Text>
          <Text style={styles.balanceValue}>${balances.futures.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totalValueContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  currency: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  pnl: {
    fontSize: 14,
    marginTop: 4,
  },
  positive: {
    color: '#137333',
  },
  negative: {
    color: '#a50e0e',
  },
  accountSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#000',
  },
  balanceValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
});

export default Overview;
