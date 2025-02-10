import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FundingHistory = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Funding History</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.headerText}>Time</Text>
        <Text style={styles.headerText}>Symbol</Text>
        <Text style={styles.headerText}>Funding Rate</Text>
        <Text style={styles.headerText}>Position Size</Text>
        <Text style={styles.headerText}>Payment</Text>
      </View>
      <Text style={styles.emptyText}>No funding history available</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: {
    color: '#888',
    fontSize: 14,
    flex: 1,
    textAlign: 'left',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
});

export default FundingHistory;
