import React from "react";
import { WebView } from "react-native-webview";

export default function TradingViewChart() {
  return (
    <WebView
    source={{ uri: `file:///android_asset/index.html` }} // Cache-busting query param
    style={{ flex: 1 }}
    javaScriptEnabled
    domStorageEnabled
    allowUniversalAccessFromFileURLs={true}
    originWhitelist={["*"]}
    cacheEnabled={false} // Disable WebView caching
  />
  );
}
