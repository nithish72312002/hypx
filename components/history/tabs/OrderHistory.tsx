import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OrderHistory = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order History</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.headerText}>Date</Text>
        <Text style={styles.headerText}>Type</Text>
        <Text style={styles.headerText}>Price</Text>
        <Text style={styles.headerText}>Amount</Text>
        <Text style={styles.headerText}>Status</Text>
      </View>
      <Text style={styles.emptyText}>No order history available</Text>
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

export default OrderHistory;
