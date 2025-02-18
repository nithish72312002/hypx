import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WalletActionButtons from '@/components/buttons/WalletActionButtons';
import { useSpotWallet } from '@/store/useSpotWallet';
import { usePerpPositionsStore } from '@/store/usePerpWallet';

const Overview = () => {
  const { totalValue: spotTotal } = useSpotWallet();
  const { accountValue: futuresTotal } = usePerpPositionsStore();
  
  const totalValue = spotTotal + futuresTotal;

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
        </View>
        <WalletActionButtons />
      </View>

      {/* Account Section */}
      <View style={styles.accountSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Spot</Text>
          <Text style={styles.balanceValue}>${spotTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Futures</Text>
          <Text style={styles.balanceValue}>${futuresTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
  header: {
    padding: 16,
    backgroundColor: '#2A2D3A',
    borderRadius: 12,
    margin: 10,
    marginBottom: 16,
  },
  totalValueContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#808A9D',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  currency: {
    fontSize: 14,
    color: '#808A9D',
    marginLeft: 4,
  },
  accountSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#808A9D',
  },
  balanceValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default Overview;
