import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import History from '@/components/history/History';

export default function HistoryPage() {
  return (
    <View style={styles.container}>

      <Stack.Screen
        options={{
          title: 'History',
          headerStyle: {
            backgroundColor: '#1A1C24',
          },
          headerBackVisible: true,

          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 16,
          },
          headerShadowVisible: false,
        }}
      />
      <History />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
});