import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { useActiveAccount } from 'thirdweb/react';
import { format } from 'date-fns';

interface LedgerDelta {
  type: string;
  usdc: string;
}

interface LedgerUpdate {
  time: number;
  hash: string;
  delta: LedgerDelta;
}

const DepositHistory = () => {
  const [deposits, setDeposits] = useState<LedgerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const { sdk } = useHyperliquid();
  const account = useActiveAccount();

  useEffect(() => {
    const fetchDepositHistory = async () => {
      if (!sdk || !account?.address) return;

      try {
        setLoading(true);
        const endTime = Date.now();
        const startTime = endTime - 7 * 24 * 60 * 60 * 1000; // Last 7 days
        const history = await sdk.info.perpetuals.getUserNonFundingLedgerUpdates(account.address, startTime, endTime);
        // Filter only deposit transactions
        const depositHistory = history.filter(item => item.delta.type === 'deposit')
          .sort((a, b) => b.time - a.time); // Sort by time descending
        setDeposits(depositHistory);
      } catch (error) {
        console.error('Error fetching deposit history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepositHistory();
  }, [sdk, account?.address]);

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM dd, HH:mm');
  };

  const formatUSDC = (usdc: string) => {
    return `$${parseFloat(usdc).toFixed(2)}`;
  };

  const renderDepositItem = ({ item }: { item: LedgerUpdate }) => (
    <View style={styles.depositItem}>
      <View style={styles.depositLeft}>
        <Text style={styles.depositType}>Deposit</Text>
        <Text style={styles.timestamp}>{formatTime(item.time)}</Text>
      </View>
      <View style={styles.depositRight}>
        <Text style={styles.amount}>{formatUSDC(item.delta.usdc)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#808A9D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={deposits}
        renderItem={renderDepositItem}
        keyExtractor={(item) => `${item.hash}-${item.time}-deposit`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No deposits found</Text>
          </View>
        }
      />
    </View>
  );
};

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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  depositItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  depositLeft: {
    flex: 1,
  },
  depositRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  depositType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16C784',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#808A9D',
  },
  amount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#808A9D',
    fontSize: 14,
  },
});

export default DepositHistory;
