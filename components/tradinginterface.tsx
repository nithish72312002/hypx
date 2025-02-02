import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import WebSocketManager from '@/api/WebSocketManager';
import { useHyperliquid } from '@/context/HyperliquidContext';

const { width } = Dimensions.get('window');

interface Leverage {
  type: string;
  value: number;
}

interface WsActiveAssetData {
  user: string;
  coin: string;
  leverage: Leverage;
  maxTradeSzs: [number, number];
  availableToTrade: [number, number];
}

interface TradingInterfaceProps {
  symbol: string;
  price: string;
  setPrice: (price: string) => void;
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({ symbol, price, setPrice }) => {  
  const [marginType, setMarginType] = useState('Cross');
  const [orderType, setOrderType] = useState('Limit');
  const [isReduceOnly, setIsReduceOnly] = useState(false);
  const [activeAssetData, setActiveAssetData] = useState<WsActiveAssetData | null>(null);
  const [size, setSize] = useState('0.01');
  const [isBuy, setIsBuy] = useState(true);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [midPrice, setMidPrice] = useState<number | null>(null);

  const wsManager = WebSocketManager.getInstance();
  const account = useActiveAccount();
  const userAddress = account?.address || '0x0000000000000000000000000000000000000000';
  const { sdk } = useHyperliquid();
  const fullSymbol = `${symbol}-PERP`;

  // Subscribe to active asset data and mid prices
  useEffect(() => {
    const activeAssetDataListener = (response: any) => {
      if (response?.coin?.toUpperCase() === symbol.toUpperCase()) {
        setActiveAssetData(response);
      }
    };

    const allMidsListener = (data: any) => {
      if (data?.mids && data.mids[symbol]) {
        setMidPrice(parseFloat(data.mids[symbol]));
      } else {
        setMidPrice(NaN);
      }
    };
    
    wsManager.subscribe(
      "activeAssetData",
      { type: "activeAssetData", user: userAddress, coin: symbol },
      activeAssetDataListener
    );
    wsManager.subscribe("allMids", { type: "allMids" }, allMidsListener);

    return () => {
      wsManager.unsubscribe(
        "activeAssetData",
        { type: "activeAssetData", user: userAddress, coin: symbol },
        activeAssetDataListener
      );
      wsManager.unsubscribe("allMids", { type: "allMids" }, allMidsListener);
    };
  }, [userAddress, symbol]);

  useEffect(() => {
    if (activeAssetData?.leverage?.type) {
      setMarginType(activeAssetData.leverage.type.toLowerCase() === 'cross' ? 'Cross' : 'Isolated');
    }
  }, [activeAssetData]);

  // This effect updates the price when switching to a market order.
  // When orderType is "Market" and midPrice is available, set the price to midPrice with 0.5% slippage.
  useEffect(() => {
    if (orderType === 'Market' && midPrice != null && !isNaN(midPrice)) {
      let px = midPrice;
      // For market orders:
      // - If buying, add 0.5% slippage (midPrice * 1.005)
      // - If selling, subtract 0.5% slippage (midPrice * 0.995)
      if (isBuy) {
        px = px * 1.005;
      } else {
        px = px * 0.995;
      }
      // Format to 5 significant figures (like Python's f"{px:.5g}")
      const pxFiveSig = parseFloat(px.toPrecision(5));
      // Round to 6 decimals (for perps)
      const finalPrice = parseFloat(pxFiveSig.toFixed(6));
      // Update price state (convert to string if needed)
      setPrice(finalPrice.toString());
      console.log("Adjusted price:", finalPrice);
    }
    console.log("midPrice:", midPrice);
  }, [orderType, midPrice, isBuy, setPrice]);

  // Additional listener for midPrice updates if needed
  useEffect(() => {
    const handleAllMids = (data: any) => {
      // Your logic for mid-prices, if needed.
    };
    wsManager.addListener('allMids', handleAllMids);
    return () => wsManager.removeListener('allMids', handleAllMids);
  }, []);

  const placeOrder = async () => {
    if (!sdk) {
      setTradeStatus("SDK not initialized yet.");
      return;
    }
    const sizeNum = parseFloat(size);
    const priceNum = parseFloat(price);

    if (isNaN(sizeNum) || sizeNum <= 0) {
      setTradeStatus("Please enter a valid size");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setTradeStatus("Please enter a valid price");
      return;
    }

    // Set order type conditionally:
    const orderTypeObject =
      orderType === 'Market'
        ? { limit: { tif: "FrontendMarket" } }
        : { limit: { tif: "Gtc" } };

    try {
      const result = await sdk.exchange.placeOrder({ 
        coin: fullSymbol,
        is_buy: isBuy,
        sz: sizeNum,
        limit_px: priceNum,
        order_type: orderTypeObject,
        reduce_only: false,
      });
      const error = result?.response?.data?.statuses?.[0]?.error;
      setTradeStatus(error ? `Failed to place order: ${error}` : "Order placed successfully!");
    } catch (error: any) {
      setTradeStatus(`Failed to place order: ${error.message ?? "Unknown error"}`);
    }
  };

  const handleSizeChange = (value: string) => {
    setSize(value);
  };

  // Allow onChangeText for price only when the order is Limit.
  const handlePriceChange = (value: string) => {
    setPrice(value);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.dropdownButton}>
          <Text style={styles.headerText}>{activeAssetData?.leverage?.value || "0"}x</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setMarginType(marginType === 'Cross' ? 'Isolated' : 'Cross')}
        >
          <Text style={styles.headerText}>{marginType}</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity style={[styles.toggleButton, isBuy && styles.activeBuy]} onPress={() => setIsBuy(true)}>
          <Text style={[styles.toggleText, isBuy && styles.activeText]}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, !isBuy && styles.activeSell]} onPress={() => setIsBuy(false)}>
          <Text style={[styles.toggleText, !isBuy && styles.activeText]}>Sell</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Row */}
      <View style={styles.balanceRow}>
        <Text style={styles.label}>Avbl</Text>
        <Text style={styles.value}>
          {(isBuy ? activeAssetData?.availableToTrade?.[0] : activeAssetData?.availableToTrade?.[1]) || '0.000'} USDC
        </Text>
      </View>

      {/* Order Type Selector */}
      <View style={styles.orderTypeContainer}>
        <TouchableOpacity
          style={[styles.orderTypeButton, styles.activeOrderType]}
          onPress={() => setOrderType(orderType === 'Limit' ? 'Market' : 'Limit')}
        >
          <Text style={styles.orderTypeText}>{orderType}</Text>
        </TouchableOpacity>
      </View>

      {/* Price Input */}
      {orderType === 'Limit' && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Price (USDC)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={price}
              onChangeText={handlePriceChange}
            />
          </View>
        </View>
      )}

      {/* Amount Input */}
      <View style={styles.inputContainer}>
        <View style={[styles.inputRow, { justifyContent: 'space-between' }]}>
          <Text style={styles.label}>Amount {symbol}</Text>
          <TouchableOpacity style={styles.maxButton} onPress={() => {
            const max = isBuy ? activeAssetData?.maxTradeSzs?.[0] : activeAssetData?.maxTradeSzs?.[1];
            setSize(max?.toString() || '0.00');
          }}>
            <Text style={styles.maxButtonText}>Max</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={size}
            onChangeText={handleSizeChange}
          />
        </View>
      </View>

      {/* Options Row */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.optionButton} onPress={() => setIsReduceOnly(!isReduceOnly)}>
          <View style={[styles.optionIndicator, isReduceOnly && styles.checkedIndicator]}>
            {isReduceOnly && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.optionText}>Reduce Only</Text>
        </TouchableOpacity>
      </View>

      {/* Max Row */}
      <View style={styles.row}>
        <Text style={styles.orderButtonSubtext}>Max</Text>
        <Text style={styles.orderButtonValue}>
          {(isBuy ? activeAssetData?.maxTradeSzs?.[0] : activeAssetData?.maxTradeSzs?.[1]) || '0.000'} {symbol}
        </Text>
      </View>

      {/* Order Button */}
      <TouchableOpacity style={[styles.orderButton, isBuy ? styles.buyButton : styles.sellButton]} onPress={placeOrder}>
        <Text style={styles.orderButtonText}>
          {isBuy ? 'Buy / Long' : 'Sell / Short'}
        </Text>
      </TouchableOpacity>

      {/* Trade Status */}
      {tradeStatus && (
        <Text style={[styles.tradeStatus, tradeStatus.includes("successfully") ? styles.successText : styles.errorText]}>
          {tradeStatus}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.48,
    flex: 1,
    backgroundColor: "#1E1E2F",
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  dropdownButton: {
    padding: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#2E2E3A',
    borderRadius: 8,
    marginVertical: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  activeBuy: {
    backgroundColor: '#4CAF50',
  },
  activeSell: {
    backgroundColor: '#FF6B6B',
  },
  toggleText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  activeText: {
    fontWeight: 'bold',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#BBBBBB',
    fontSize: 14,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  orderTypeButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#2E2E3A',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  activeOrderType: {
    backgroundColor: '#2E2E3A',
  },
  orderTypeText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2E2E3A',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: '#444444',
    color: '#888888',
  },
  maxButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  maxButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666666',
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedIndicator: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionText: {
    color: '#BBBBBB',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
  },
  orderButtonSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  orderButtonValue: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'right',
  },
  orderButton: {
    padding: 16,
    borderRadius: 4,
    marginVertical: 8,
  },
  buyButton: {
    backgroundColor: '#4CAF50',
  },
  sellButton: {
    backgroundColor: '#FF6B6B',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tradeStatus: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#FF6B6B',
  },
});

export default TradingInterface;
