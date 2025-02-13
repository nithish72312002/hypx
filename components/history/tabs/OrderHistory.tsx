import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { formatDistanceToNow } from 'date-fns';

interface Order {
  order: {
    coin: string;
    side: string;
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    triggerCondition: string;
    isTrigger: boolean;
    triggerPx: string;
    children: any[];
    isPositionTpsl: boolean;
    reduceOnly: boolean;
    orderType: string;
    origSz: string;
    tif: string;
    cloid: null | string;
  };
  status: 'filled' | 'open' | 'canceled' | 'triggered' | 'rejected' | 'marginCanceled';
  statusTimestamp: number;
}

const OrderHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const account = useActiveAccount();
  const { sdk } = useHyperliquid();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!account?.address || !sdk) return;

      try {
        const historicalOrders = await sdk.info.getHistoricalOrders(account.address);
        setOrders(historicalOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [account?.address, sdk]);

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'filled':
        return '#16C784';
      case 'open':
        return '#808A9D';
      case 'canceled':
      case 'marginCanceled':
        return '#FF3B3F';
      case 'triggered':
        return '#F3BA2F';
      case 'rejected':
        return '#FF3B3F';
      default:
        return '#808A9D';
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderLeft}>
        <Text style={styles.assetName}>{item.order.coin}</Text>
        <Text style={styles.timestamp}>{formatTime(item.statusTimestamp)}</Text>
      </View>
      <View style={styles.orderMiddle}>
        <Text style={[styles.orderType, { color: item.order.side === 'B' ? '#16C784' : '#FF3B3F' }]}>
          {item.order.side === 'B' ? 'Buy' : 'Sell'} {item.order.orderType}
        </Text>
        <Text style={styles.price}>{item.order.origSz} @ {item.order.limitPx}</Text>
      </View>
      <View style={styles.orderRight}>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => `${item.order.coin}-${item.order.oid}-${item.statusTimestamp}-${item.status}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders found</Text>
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
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  orderLeft: {
    flex: 1,
  },
  orderMiddle: {
    flex: 2,
    alignItems: 'flex-start',
  },
  orderRight: {
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
  orderType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  price: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  status: {
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

export default OrderHistory;
