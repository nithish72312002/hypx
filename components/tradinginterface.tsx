import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { useActiveAccount } from 'thirdweb/react';
import WebSocketManager from '@/api/WebSocketManager';
import { useLocalSearchParams } from 'expo-router';
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

interface AssetData extends WsActiveAssetData {}

interface TradingInterfaceProps {
  symbol: string;
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({ symbol }) => {  
  const [marginType, setMarginType] = useState('Cross');
  const [orderType, setOrderType] = useState('Limit');
  const [isReduceOnly, setIsReduceOnly] = useState(false);
  const [activeAssetData, setActiveAssetData] = useState<WsActiveAssetData | null>(null);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [tradeType, setTradeType] = useState('buy');
  const { sdk } = useHyperliquid();
  const fullSymbol = `${symbol}-PERP`;
  const [size, setSize] = useState('0.01');
  const [price, setPrice] = useState('3400');
const [midPrices, setMidPrices] = useState<Record<string, number>>({});
const [slippage] = useState(0.5); // 0.5% slippage
  // References for price and amount inputs
  const [isBuy, setIsBuy] = useState(true);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);


  const wsManager = WebSocketManager.getInstance();
  const account = useActiveAccount();
  const userAddress = account?.address || '0x93c6d60b83c43C925538215Ee467De7ed5B4D4d9';

  // State to store order parameters
 

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();
  
    const activeAssetDataListener = (response: any) => {
      console.log("WebSocket Data Received:", response);

      if (response?.coin?.toUpperCase() === symbol.toUpperCase()) {
        console.log("Leverage Value:", response?.leverage?.value); 
        setActiveAssetData(response);
      }
    };
    
  
    console.log(`Subscribing to activeAssetData for symbol: ${symbol}`);
  
    wsManager.subscribe(
      "activeAssetData",
      { type: "activeAssetData", user: userAddress, coin: symbol },
      activeAssetDataListener
    );
  
    return () => {
      console.log(`Unsubscribing from activeAssetData for symbol: ${symbol}`);
      wsManager.unsubscribe(
        "activeAssetData",
        { type: "activeAssetData", user: userAddress, coin: symbol },
        activeAssetDataListener
      );
    };
  }, [userAddress, symbol]);

  useEffect(() => {
    if (activeAssetData?.leverage?.type) {
      setMarginType(activeAssetData.leverage.type === 'cross' ? 'Cross' : 'Isolated');
    }
  }, [activeAssetData]);

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();
    const handleAllMids = (data: any) => {
      if (data.channel === 'allMids' && data.data?.mids) {
        setMidPrices(data.data.mids);
      }
    };
  
    wsManager.addListener('allMids', handleAllMids);
    return () => wsManager.removeListener('allMids', handleAllMids);
  }, []);
  
  // Add price calculation function
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

    try {
      const result = await sdk.exchange.placeOrder({ 
        coin: fullSymbol,
        is_buy: isBuy,
        sz: sizeNum,
        limit_px: priceNum,
        order_type: { limit: { tif: "Gtc" } },
        reduce_only: false,
      });
      console.log("Order Placed:", result);

      const error = result?.response?.data?.statuses?.[0]?.error;
      if (error) {
        setTradeStatus(`Failed to place order: ${error}`);
      } else {
        setTradeStatus("Order placed successfully!");
      }
    } catch (error: any) {
      console.error("Error placing order:", error);
      setTradeStatus(
        `Failed to place order: ${error.message ?? "Unknown error"}`
      );
    }
  };

  const handleSizeChange = (value: string) => {
    setSize(value); // Directly store the string value
  };

  const handlePriceChange = (value: string) => {
    setPrice(value); // Directly store the string value
  };
  return (
    <View style={styles.container}>
      {/* Header with Dropdowns */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.dropdownButton}
        >
          <Text style={styles.headerText}>{activeAssetData?.leverage?.value}x</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => {
            setMarginType(marginType === 'Cross' ? 'Isolated' : 'Cross');
          }}
        >
          <Text style={styles.headerText}>{marginType}</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle Container */}
      <View style={styles.toggleContainer}>
  <TouchableOpacity
    style={[styles.toggleButton, isBuy && styles.activeBuy]}
    onPress={() => setIsBuy(true)}
  >
    <Text style={[styles.toggleText, isBuy && styles.activeText]}>
      Buy
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.toggleButton, !isBuy && styles.activeSell]}
    onPress={() => setIsBuy(false)}
  >
    <Text style={[styles.toggleText, !isBuy && styles.activeText]}>
      Sell
    </Text>
  </TouchableOpacity>
</View>

      {/* Balance Row */}
      <View style={styles.balanceRow}>
        <Text style={styles.label}>Avbl</Text>
        <Text style={styles.value}>
        {(isBuy ? activeAssetData?.availableToTrade?.[0] : activeAssetData?.availableToTrade?.[1]) || '0.000'} USDC
        </Text>
      </View>

      {/* Order Type Selector with Dropdown */}
      <View style={styles.orderTypeContainer}>
        <TouchableOpacity
          style={[styles.orderTypeButton, styles.activeOrderType]}
          onPress={() => setOrderType(orderType === 'Limit' ? 'Market' : 'Limit')}
        >
          <Text style={styles.orderTypeText}>{orderType}</Text>
        </TouchableOpacity>
      </View>

      {/* Price Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Price (USDC)</Text>
        <View style={styles.inputRow}>
        <TextInput
  style={[
    styles.input,
    orderType === 'Market' && { backgroundColor: '#444', color: '#888' },
  ]}
  keyboardType="numeric"
  value={price}
  onChangeText={handlePriceChange}
/>
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.inputContainer}>
        <View style={[styles.inputRow, { justifyContent: 'space-between' }]}>
          <Text style={styles.label}>Amount {symbol}</Text>
          <TouchableOpacity style={styles.maxButton} onPress={() => {
  const max = isBuy 
    ? activeAssetData?.maxTradeSzs?.[0] 
    : activeAssetData?.maxTradeSzs?.[1];
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
        onChangeText={handleSizeChange}      />
        </View>
      </View>

      {/* Options Row */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => setIsReduceOnly(!isReduceOnly)}
        >
          <View style={[
            styles.optionIndicator,
            isReduceOnly && styles.checkedIndicator
          ]}>
            {isReduceOnly && <Text style={styles.checkmark}></Text>}
          </View>
          <Text style={styles.optionText}>Reduce Only</Text>
        </TouchableOpacity>
      </View>

      {/* Max and Cost Rows */}
      <View style={styles.row}>
        <Text style={styles.orderButtonSubtext}>Max</Text>
        <Text style={styles.orderButtonValue}>
          {(isBuy ? activeAssetData?.maxTradeSzs?.[0] : activeAssetData?.maxTradeSzs?.[1]) || '0.000'} {symbol}
        </Text>
      </View>

      {/* Order Button */}
      <TouchableOpacity
  style={[
    styles.orderButton,
    isBuy ? styles.buyButton : styles.sellButton,
  ]}
  onPress={placeOrder} // Directly use the placeOrder function
>
  <Text style={styles.orderButtonText}>
    {isBuy ? 'Buy / Long' : 'Sell / Short'}
  </Text>
</TouchableOpacity>

      {/* Max and Cost Rows */}
     
{tradeStatus && (
        <Text
          style={[
            styles.tradeStatus,
            tradeStatus.includes("successfully")
              ? styles.successText
              : styles.errorText,
          ]}
        >
          {tradeStatus}
        </Text>
      )}
    </View>
  );
};




const styles = StyleSheet.create({
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  
      checkedIndicator: {
        backgroundColor: '#18a689',
        borderColor: '#18a689',
      },
      checkmark: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
      },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 1, // Optional for spacing between rows
      },
      orderButtonValue: {
        color: 'white', // Or any other color
        fontSize: 12,
        textAlign: 'right',
      },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
     
      modalContent: {
        backgroundColor: '#1E1E1E',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        alignItems: 'center',
      },
      modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
      },
      modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
      },
      closeButton: {
        backgroundColor: '#333',
        borderRadius: 20,
        padding: 10,
      },
      closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
      },
      slider: {
        width: '100%',
        marginTop: 20,
      },
      sliderValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
      },
      confirmButton: {
        marginTop: 20,
        backgroundColor: '#18a689',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
      },
      confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
      },
  container: {
    width: width * 0.5,
    flex: 1,
    backgroundColor: '#121212',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#888',
    fontSize: 14,
  },
  value: {
    color: 'white',
    fontSize: 14,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  activeOrderType: {
    backgroundColor: '#333',
  },
  orderTypeText: {
    color: 'white',
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
    backgroundColor: '#222',
    color: 'white',
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
  },
  maxButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  maxButtonText: {
    color: 'white',
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
    borderColor: '#666',
    marginRight: 6,
  },
  optionText: {
    color: '#888',
    fontSize: 12,
  },
  orderButton: {
    padding: 16,
    borderRadius: 4,
    marginVertical: 8,
  },
  buyButton: {
    backgroundColor: '#18a689',
  },
  sellButton: {
    backgroundColor: '#bf6262',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  orderButtonSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  dropdownButton: {
    padding: 8,
  },
  dropdown: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
 
  orderTypeButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#222',
    marginHorizontal: 4,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#222',
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
    backgroundColor: '#18a689', // Green for Buy
  },
  
  activeSell: {
    backgroundColor: '#bf6262', // Red for Sell
  },
  
  toggleText: {
    fontSize: 16,
    color: 'white',
  },
  
  activeText: {
    fontWeight: 'bold',
  },
});

export default TradingInterface;
