import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { formatDistanceToNow } from 'date-fns';

interface Trade {
  closedPnl: string;
  coin: string;
  crossed: boolean;
  dir: string;
  hash: string;
  oid: number;
  px: string;
  side: string;
  startPosition: string;
  sz: string;
  time: number;
  fee: string;
  feeToken: string;
  builderFee?: string;
  tid: number;
}

const TradeHistory = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const account = useActiveAccount();
  const { sdk } = useHyperliquid();

  useEffect(() => {
    const fetchTrades = async () => {
      if (!account?.address || !sdk) return;

      try {
        const userFills = await sdk.info.getUserFills(account.address);
        setTrades(userFills);
      } catch (error) {
        console.error('Error fetching trades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [account?.address, sdk]);

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const renderTrade = ({ item }: { item: Trade }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.assetName}>{item.coin}</Text>
        <Text style={styles.timestamp}>{formatTime(item.time)}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.amount, { color: item.dir.includes('Long') ? '#16C784' : '#FF3B3F' }]}>
          {item.sz} {item.coin} @ {item.px}
        </Text>
        <Text style={styles.fee}>Fee: {item.fee} {item.feeToken}</Text>
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
        data={trades}
        renderItem={renderTrade}
        keyExtractor={(item) => `${item.coin}-${item.tid}-${item.time}-${item.hash}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trades found</Text>
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
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#808A9D',
  },
  amount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fee: {
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

export default TradeHistory;
