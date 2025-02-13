import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { useActiveAccount } from 'thirdweb/react';
import { format } from 'date-fns';

interface FundingDelta {
  coin: string;
  fundingRate: string;
  szi: string;
  type: string;
  usdc: string;
}

interface FundingHistory {
  delta: FundingDelta;
  hash: string;
  time: number;
}

const FundingHistory = () => {
  const [fundingHistory, setFundingHistory] = useState<FundingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { sdk } = useHyperliquid();
  const account = useActiveAccount();

  useEffect(() => {
    const fetchFundingHistory = async () => {
      if (!sdk || !account?.address) return;

      try {
        setLoading(true);
        const endTime = Date.now();
        const startTime = endTime - 86400000; // Last 24 hours
        const history = await sdk.info.perpetuals.getUserFunding(account.address, startTime, endTime);
        setFundingHistory(history.sort((a, b) => b.time - a.time)); // Sort by time descending
      } catch (error) {
        console.error('Error fetching funding history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFundingHistory();
  }, [sdk, account?.address]);

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM dd, HH:mm');
  };

  const formatFundingRate = (rate: string) => {
    const percentage = (parseFloat(rate) * 100).toFixed(4);
    return `${percentage}%`;
  };

  const formatUSDC = (usdc: string) => {
    const value = parseFloat(usdc);
    const formatted = Math.abs(value).toFixed(6);
    return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
  };

  const formatSize = (szi: string) => {
    return parseFloat(szi).toFixed(4);
  };

  const renderFundingItem = ({ item }: { item: FundingHistory }) => (
    <View style={styles.fundingItem}>
      <View style={styles.fundingLeft}>
        <Text style={styles.assetName}>{item.delta.coin}</Text>
        <Text style={styles.timestamp}>{formatTime(item.time)}</Text>
      </View>
      <View style={styles.fundingMiddle}>
        <Text style={styles.size}>Size: {formatSize(item.delta.szi)}</Text>
        <Text style={styles.fundingRate}>Rate: {formatFundingRate(item.delta.fundingRate)}</Text>
      </View>
      <View style={styles.fundingRight}>
        <Text style={[
          styles.fundingAmount,
          { color: parseFloat(item.delta.usdc) >= 0 ? '#16C784' : '#FF3B3F' }
        ]}>
          {formatUSDC(item.delta.usdc)}
        </Text>
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
        data={fundingHistory}
        renderItem={renderFundingItem}
        keyExtractor={(item) => `${item.hash}-${item.time}-${item.delta.coin}-funding`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No funding history found</Text>
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
  fundingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  fundingLeft: {
    flex: 1,
  },
  fundingMiddle: {
    flex: 1.5,
    alignItems: 'center',
  },
  fundingRight: {
    flex: 1,
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
  size: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  fundingRate: {
    fontSize: 12,
    color: '#808A9D',
  },
  fundingAmount: {
    fontSize: 14,
    fontWeight: '500',
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

export default FundingHistory;
