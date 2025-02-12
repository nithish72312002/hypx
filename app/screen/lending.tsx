import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LendingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lending</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
