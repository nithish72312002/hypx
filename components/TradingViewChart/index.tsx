import React from "react";
import { WebView } from "react-native-webview";

export default function TradingViewChart({ symbol }: { symbol: string }) {
    return (
        <WebView
            source={{ uri: `file:///android_asset/index.html?symbol=${symbol}` }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            allowUniversalAccessFromFileURLs
            originWhitelist={["*"]}
        />
    );
}