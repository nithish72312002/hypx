import React from 'react';
import { WebView } from 'react-native-webview';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function FelixScreen() {
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Felix Dashboard',
          headerTintColor: '#007AFF',
        }} 
      />
      <SafeAreaView style={styles.container}>
        <WebView 
          source={{ uri: 'https://usefelix.xyz/dashboard/borrow' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
