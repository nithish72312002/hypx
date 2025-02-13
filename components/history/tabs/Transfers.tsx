import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { useActiveAccount } from 'thirdweb/react';
import { format } from 'date-fns';

interface SpotTransferDelta {
  type: 'spotTransfer';
  token: string;
  amount: string;
  usdcValue: string;
  user: string;
  destination: string;
  fee: string;
}

interface AccountClassTransferDelta {
  type: 'accountClassTransfer';
  usdc: string;
  toPerp: boolean;
}

interface InternalTransferDelta {
  type: 'internalTransfer';
  usdc: string;
  user: string;
  destination: string;
  fee: string;
}

type TransferDelta = SpotTransferDelta | AccountClassTransferDelta | InternalTransferDelta;

interface LedgerUpdate {
  time: number;
  hash: string;
  delta: TransferDelta;
}

const TransferHistory = () => {
  const [transfers, setTransfers] = useState<LedgerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const { sdk } = useHyperliquid();
  const account = useActiveAccount();

  useEffect(() => {
    const fetchTransferHistory = async () => {
      if (!sdk || !account?.address) return;

      try {
        setLoading(true);
        const endTime = Date.now();
        const startTime = endTime - 7 * 24 * 60 * 60 * 1000; // Last 7 days
        const history = await sdk.info.perpetuals.getUserNonFundingLedgerUpdates(account.address, startTime, endTime);
        // Filter transfer transactions
        const transferHistory = history.filter(item => 
          item.delta.type === 'spotTransfer' || 
          item.delta.type === 'accountClassTransfer' ||
          item.delta.type === 'internalTransfer'
        ).sort((a, b) => b.time - a.time); // Sort by time descending
        setTransfers(transferHistory);
      } catch (error) {
        console.error('Error fetching transfer history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransferHistory();
  }, [sdk, account?.address]);

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM dd, HH:mm');
  };

  const formatUSDC = (usdc: string) => {
    return `$${parseFloat(usdc).toFixed(2)}`;
  };

  const getTransferTypeLabel = (delta: TransferDelta) => {
    switch (delta.type) {
      case 'spotTransfer':
        return `Spot Transfer (${delta.token})`;
      case 'accountClassTransfer':
        return delta.toPerp ? 'Spot → Perp' : 'Perp → Spot';
      case 'internalTransfer':
        return 'Internal Transfer';
      default:
        return 'Transfer';
    }
  };

  const getTransferAmount = (delta: TransferDelta) => {
    switch (delta.type) {
      case 'spotTransfer':
        return formatUSDC(delta.usdcValue);
      case 'accountClassTransfer':
      case 'internalTransfer':
        return formatUSDC(delta.usdc);
      default:
        return '';
    }
  };

  const getFeeText = (delta: TransferDelta) => {
    if ('fee' in delta && delta.fee !== '0.0') {
      return `Fee: ${formatUSDC(delta.fee)}`;
    }
    return '';
  };

  const getAddressInfo = (delta: TransferDelta) => {
    switch (delta.type) {
      case 'spotTransfer':
        return `To: ${delta.destination.slice(0, 6)}...${delta.destination.slice(-4)}`;
      case 'internalTransfer':
        return `From: ${delta.user.slice(0, 6)}...${delta.user.slice(-4)}`;
      default:
        return '';
    }
  };

  const renderTransferItem = ({ item }: { item: LedgerUpdate }) => (
    <View style={styles.transferItem}>
      <View style={styles.transferLeft}>
        <Text style={styles.transferType}>
          {getTransferTypeLabel(item.delta)}
        </Text>
        <Text style={styles.timestamp}>{formatTime(item.time)}</Text>
        {getAddressInfo(item.delta) ? (
          <Text style={styles.address}>{getAddressInfo(item.delta)}</Text>
        ) : null}
      </View>
      <View style={styles.transferMiddle}>
        {getFeeText(item.delta) ? (
          <Text style={styles.fee}>{getFeeText(item.delta)}</Text>
        ) : null}
      </View>
      <View style={styles.transferRight}>
        <Text style={styles.amount}>{getTransferAmount(item.delta)}</Text>
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
        data={transfers}
        renderItem={renderTransferItem}
        keyExtractor={(item) => `${item.hash}-${item.time}-${item.delta.type}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transfers found</Text>
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
  transferItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  transferLeft: {
    flex: 1.5,
  },
  transferMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  transferRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  transferType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3BA2F',
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
  address: {
    fontSize: 12,
    color: '#808A9D',
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

export default TransferHistory;
