import React from "react";
import { WebView } from "react-native-webview";

export default function TradingViewChart({ 
  symbol, 
  onTouchStart, 
  onTouchEnd 
}: { 
  symbol: string; 
  onTouchStart?: () => void; 
  onTouchEnd?: () => void; 
}) {
  return (
    <WebView
      source={{ uri: `file:///android_asset/index.html?symbol=${symbol}` }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
      allowUniversalAccessFromFileURLs
      originWhitelist={["*"]}
      onTouchStart={onTouchStart} // Disable ScrollView scrolling
      onTouchEnd={onTouchEnd}    // Re-enable ScrollView scrolling
    />
  );
}