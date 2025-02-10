import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

interface Transaction {
  asset: string;
  amount: string;
  status: string;
  timestamp: string;
  date: string;
}

const TradeHistory = () => {
  // Dummy data for demonstration
  const transactions: Transaction[] = [
    {
      asset: 'USDC',
      amount: '+100',
      status: 'Completed',
      timestamp: '18:02:16',
      date: '2025-02-03',
    },
    {
      asset: 'USDC',
      amount: '+110.009596',
      status: 'Completed',
      timestamp: '07:26:41',
      date: '2024-12-20',
    },
    {
      asset: 'XRP',
      amount: '+290',
      status: 'Completed',
      timestamp: '21:52:21',
      date: '2024-12-01',
    },
  ];

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.assetName}>{item.asset}</Text>
        <Text style={styles.timestamp}>{item.date} {item.timestamp}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.amount, { color: item.amount.startsWith('+') ? '#00C076' : '#FF6838' }]}>
          {item.amount}
        </Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => `${item.asset}-${item.timestamp}`}
      style={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  assetName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  amount: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    color: '#666',
  },
});

export default TradeHistory;
