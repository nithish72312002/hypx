import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useWalletStore } from '@/store/useWalletStore';
import { useActiveAccount } from 'thirdweb/react';

interface ValidatorStats {
  uptimeFraction: string;
  predictedApr: string;
  nSamples: number;
}

interface Validator {
  validator: string;
  signer: string;
  name: string;
  description: string;
  nRecentBlocks: number;
  stake: number;
  isJailed: boolean;
  unjailableAfter: number | null;
  isActive: boolean;
  commission: string;
  stats: [string, ValidatorStats][];
}

interface Balance {
  coin: string;
  token: number;
  hold: string;
  total: string;
  entryNtl: string;
}

export default function StakingScreen() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<Balance | null>(null);
const account = useActiveAccount();
const address = account?.address;
  useEffect(() => {
    fetchValidators();
    if (address) {
      fetchBalance();
    }
  }, [address]);

  const fetchBalance = async () => {
    try {
      const response = await axios.post('https://api.hyperliquid-testnet.xyz/info', {
        type: 'spotClearinghouseState',
        user: address
      });
      
      const hypeBalance = response.data.balances.find((b: Balance) => b.coin === 'HYPE');
      if (hypeBalance) {
        setBalance(hypeBalance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchValidators = async () => {
    try {
      const response = await axios.post('https://api.hyperliquid-testnet.xyz/info', {
        type: 'validatorSummaries'
      });
      // Filter only active validators and sort by stake
      const activeValidators = response.data
        .filter((v: Validator) => v.isActive)
        .sort((a: Validator, b: Validator) => b.stake - a.stake);
      setValidators(activeValidators);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching validators:', error);
      setLoading(false);
    }
  };

  const formatStake = (stake: number | string) => {
    const value = typeof stake === 'string' ? parseFloat(stake) : stake;
    return (value / 1e8).toFixed(2) + ' HYPE';
  };

  const getAvailableBalance = () => {
    if (!balance) return '0.00';
    const total = parseFloat(balance.total);
    const hold = parseFloat(balance.hold);
    return (total - hold).toString();
  };

  const formatAPR = (apr: string) => {
    return (parseFloat(apr) * 100).toFixed(2) + '%';
  };

  const formatUptime = (uptime: string) => {
    return (parseFloat(uptime) * 100).toFixed(2) + '%';
  };

  const getTotalStaked = () => {
    return validators.reduce((sum, validator) => sum + validator.stake, 0) / 1e8;
  };

  const getTopAPY = () => {
    if (validators.length === 0) return '0%';
    const topApr = Math.max(...validators.map(v => parseFloat(v.stats[0][1].predictedApr)));
    return (topApr * 100).toFixed(2) + '%';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading validators...</Text>
      </View>
    );
  }

  if (validators.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.noValidatorsText}>No active validators found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Summary Section */}
      <View style={styles.summaryContainer}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatStake(getAvailableBalance())}</Text>
          <TouchableOpacity style={styles.stakeButton}>
            <Text style={styles.stakeButtonText}>Stake Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Stake HYPE to trusted validators and earn rewards for securing the network.
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Top APY</Text>
            <Text style={styles.statValue}>{getTopAPY()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Total Staked</Text>
            <Text style={styles.statValue}>{formatStake(getTotalStaked())}</Text>
          </View>
        </View>
      </View>

      {/* Validators List */}
      <View style={styles.validatorsSection}>
        <Text style={styles.title}>Active Validators</Text>
        <Text style={styles.subtitle}>{validators.length} validators</Text>
        {validators.map((validator) => (
          <TouchableOpacity 
            key={validator.validator}
            style={styles.validatorCard}
          >
            <View style={styles.headerRow}>
              <Text style={styles.validatorName}>{validator.name}</Text>
              <View style={styles.aprBadge}>
                <Text style={styles.aprText}>
                  APR: {formatAPR(validator.stats[0][1].predictedApr)}
                </Text>
              </View>
            </View>

            <Text style={styles.description} numberOfLines={2}>
              {validator.description}
            </Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Stake</Text>
                <Text style={styles.statValue}>{formatStake(validator.stake)}</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Commission</Text>
                <Text style={styles.percentValue}>
                  {(parseFloat(validator.commission) * 100).toFixed(0)}%
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Uptime (24h)</Text>
                <Text style={styles.percentValue}>
                  {formatUptime(validator.stats[0][1].uptimeFraction)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0D10',
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#0C0D10',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2128',
  },
  balanceCard: {
    backgroundColor: '#1F2128',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 14,
    color: '#808A9D',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  stakeButton: {
    backgroundColor: '#16C784',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  stakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F2128',
    borderRadius: 12,
    padding: 16,
  },
  statTitle: {
    fontSize: 14,
    color: '#808A9D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  percentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  validatorsSection: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0D10',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  noValidatorsText: {
    fontSize: 16,
    color: '#808A9D',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#808A9D',
    marginBottom: 16,
  },
  validatorCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    backgroundColor: '#1F2128',
    borderColor: '#2A2D3A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  validatorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  aprBadge: {
    backgroundColor: '#16C784',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aprText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#808A9D',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#808A9D',
    fontSize: 12,
    marginBottom: 4,
  },
});
