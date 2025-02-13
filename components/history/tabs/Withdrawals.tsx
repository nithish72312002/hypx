import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { useActiveAccount } from 'thirdweb/react';
import { format } from 'date-fns';

interface WithdrawDelta {
  type: string;
  usdc: string;
  nonce: number;
  fee: string;
}

interface LedgerUpdate {
  time: number;
  hash: string;
  delta: WithdrawDelta;
}

const WithdrawHistory = () => {
  const [withdrawals, setWithdrawals] = useState<LedgerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const { sdk } = useHyperliquid();
  const account = useActiveAccount();

  useEffect(() => {
    const fetchWithdrawHistory = async () => {
      if (!sdk || !account?.address) return;

      try {
        setLoading(true);
        const endTime = Date.now();
        const startTime = endTime - 7 * 24 * 60 * 60 * 1000; // Last 7 days
        const history = await sdk.info.perpetuals.getUserNonFundingLedgerUpdates(account.address, startTime, endTime);
        // Filter only withdraw transactions
        const withdrawHistory = history.filter(item => item.delta.type === 'withdraw')
          .sort((a, b) => b.time - a.time); // Sort by time descending
        setWithdrawals(withdrawHistory);
      } catch (error) {
        console.error('Error fetching withdraw history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWithdrawHistory();
  }, [sdk, account?.address]);

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM dd, HH:mm');
  };

  const formatUSDC = (usdc: string) => {
    return `$${parseFloat(usdc).toFixed(2)}`;
  };

  const renderWithdrawItem = ({ item }: { item: LedgerUpdate }) => (
    <View style={styles.withdrawItem}>
      <View style={styles.withdrawLeft}>
        <Text style={styles.withdrawType}>Withdraw</Text>
        <Text style={styles.timestamp}>{formatTime(item.time)}</Text>
      </View>
      <View style={styles.withdrawMiddle}>
        <Text style={styles.fee}>Fee: {formatUSDC(item.delta.fee)}</Text>
      </View>
      <View style={styles.withdrawRight}>
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
        data={withdrawals}
        renderItem={renderWithdrawItem}
        keyExtractor={(item) => `${item.hash}-${item.time}-${item.delta.nonce}-withdraw`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No withdrawals found</Text>
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
  withdrawItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  withdrawLeft: {
    flex: 1,
  },
  withdrawMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  withdrawRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  withdrawType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B3F',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#808A9D',
  },
  fee: {
    fontSize: 14,
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

export default WithdrawHistory;
