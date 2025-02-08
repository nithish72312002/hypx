import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import WebSocketManager from '@/api/WebSocketManager';
import { useHyperliquid } from '@/context/HyperliquidContext';
import axios from 'axios';
import { useApproveAgent } from '@/hooks/useApproveAgent';
import { useAgentWalletContext } from '@/context/AgentWalletContext';
import { useAppInitializer } from '@/components/AppInitializer';
import { ethers } from 'ethers';
import { savePrivateKey } from '@/utils/storage';
import { router } from 'expo-router';

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
  const [szDecimals, setSzDecimals] = useState<number>(0);

  const wsManager = WebSocketManager.getInstance();
  const account = useActiveAccount();
  const userAddress = account?.address || '0x0000000000000000000000000000000000000000';
  const { sdk } = useHyperliquid();
  const fullSymbol = `${symbol}-PERP`;
  const { wallet, setWallet, loading: walletLoading, error: walletError } = useAgentWalletContext(); // Agent wallet from context
  const { approveAgent } = useApproveAgent(); // Hook to approve the agent wallet
  const { needsDeposit, checkDepositStatus } = useAppInitializer();

  const [approvalCompleted, setApprovalCompleted] = useState(false);
  const [isConnectionModalVisible, setIsConnectionModalVisible] = useState(false);

  const handleEstablishConnection = () => {
    setIsConnectionModalVisible(true);
  };

  const navigateToWallet = () => {
    setIsConnectionModalVisible(false);
    router.push('/wallet');
  };

  // Add useEffect to check user role when wallet or account changes
  useEffect(() => {
    if (walletLoading || !wallet || !account?.address) {
      console.log("Agent wallet is still loading or external wallet not connected.");
      return;
    }

    checkDepositStatus();
  }, [wallet, walletLoading, account?.address]);

  useEffect(() => {
    console.log("State updated - approvalCompleted:", approvalCompleted);
  }, [approvalCompleted]);

  const fetchTokenDecimals = async () => {
    if (!symbol) return;
    try {
      const response = await axios.post("https://api.hyperliquid-testnet.xyz/info", {
        type: "meta",
      });
      const meta = response.data;
      const token = meta.universe.find((t: any) => 
        t.name.toUpperCase() === symbol.toUpperCase()
      );
      if (token) {
        setSzDecimals(token.szDecimals);
        console.log(`Token ${symbol} szDecimals:`, token.szDecimals);
      } else {
        console.warn(`Token ${symbol} not found in spot metadata.`);
      }
    } catch (error) {
      console.error('Error fetching token decimals:', error);
    }
  };

  useEffect(() => {
    fetchTokenDecimals();
  }, [symbol]);

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
      const MAX_DECIMALS = 6;
      const allowedDecimalPlaces = MAX_DECIMALS - szDecimals;
  
      let finalPrice;
  
      // If the price is an integer, no need to enforce significant figure rules.
      if (Number.isInteger(px)) {
        finalPrice = px;
      } else {
        // First, round to 5 significant figures.
        const pxFiveSig = parseFloat(px.toPrecision(5));
        // Then, round (or pad) to the allowed number of decimal places.
        finalPrice = parseFloat(pxFiveSig.toFixed(allowedDecimalPlaces));
      }
      // Update price state (convert to string if needed)
      setPrice(finalPrice.toString());
    }
  }, [orderType, midPrice, isBuy, setPrice]);

  // Additional listener for midPrice updates if needed
 

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
        
        console.log("Placing order with details:", {
          coin: fullSymbol,
          is_buy: isBuy,
          sz: sizeNum,
          limit_px: priceNum,
          order_type: orderTypeObject,
          reduce_only: false,
        });
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
    const regex = new RegExp(`^\\d+(\\.\\d{0,${szDecimals}})?$`);
    if (regex.test(value)) {
      setSize(value);
    } else {
      console.log(`Invalid size entered for ${szDecimals} decimals:`, value);
    }
  };

  // Allow onChangeText for price only when the order is Limit.
  const handlePriceChange = (value: string) => {
    // Let the user type incomplete inputs without auto-correction.
    if (
      value === '' ||
      value === '.' ||
      value.startsWith('.') ||
      value.endsWith('.')
    ) {
      setPrice(value);
      return;
    }
  
    // Try to parse the input as a number.
    const priceNum = parseFloat(value);
    if (isNaN(priceNum)) {
      console.log("Invalid number");
      return;
    }
  
    // Base maximum allowed decimals from the asset:
    const baseMaxDecimals = 6 - szDecimals;
    let allowedDecimals;
  
    // Split the input into integer and fractional parts.
    const parts = value.split('.');
    let intPart = parts[0];
    // Remove any leading zeros (if any) from the integer part.
    intPart = intPart.replace(/^0+/, '') || '0';
  
    if (priceNum >= 1) {
      // For numbers ≥ 1, count the number of digits in the integer part.
      const intDigits = intPart.length;
      // Dynamic allowed decimals = 5 - intDigits (to have 5 total significant digits)
      const dynAllowed = 5 - intDigits;
      allowedDecimals = dynAllowed < 0 ? 0 : Math.min(baseMaxDecimals, dynAllowed);
    } else {
      // For numbers less than 1, we count significant digits in the fractional part.
      const fraction = parts[1] || "";
      const trimmedFraction = fraction.replace(/^0+/, '');
      const sigDigits = trimmedFraction.length; // number of significant digits entered so far
      
      if (sigDigits >= 5) {
        // Ensure we do not exceed `allowedDecimals` even when correcting with toPrecision(5)
        const corrected = Number(priceNum.toPrecision(Math.min(5, baseMaxDecimals))).toFixed(Math.min(5, baseMaxDecimals));
        setPrice(corrected);
        console.log(`Corrected price (for <1) to ${Math.min(5, baseMaxDecimals)} significant digits: ${corrected}`);
        return;
      } else {
        // Otherwise, allow up to baseMaxDecimals
        allowedDecimals = baseMaxDecimals;
      }
    }
  
    // Now, if a fractional part exists, check if its length exceeds the allowed decimals.
    if (parts.length === 2 && parts[1].length > allowedDecimals) {
      // Ensure rounding does not exceed allowed decimals
      const corrected = priceNum.toFixed(allowedDecimals);
      setPrice(corrected);
      console.log(`Corrected price: ${corrected} (allowed decimals: ${allowedDecimals})`);
      return;
    }
  
    // Otherwise, accept the entered value.
    setPrice(value);
    console.log(`Price accepted: ${value} (allowed decimals: ${allowedDecimals})`);
};

  const renderConnectionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isConnectionModalVisible}
      onRequestClose={() => setIsConnectionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsConnectionModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Deposit Required</Text>
          <Text style={styles.modalText}>
            You need to make a deposit to establish connection with Hyperliquid.
          </Text>

          <TouchableOpacity
            style={styles.depositButton}
            onPress={navigateToWallet}
          >
            <Text style={styles.depositButtonText}>Go to Wallet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderConnectionModal()}
      {/* Trading Interface */}
      <View style={styles.tradingInterface}>
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
                placeholder="Enter price"
                placeholderTextColor="#666"
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
              placeholder="Enter amount"
              placeholderTextColor="#666"
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
        {/* Order Button or Login Button */}
        {!account?.address ? (
          <TouchableOpacity 
            style={[styles.orderButton, styles.loginButton]} 
            onPress={() => router.push('/loginpage')}
          >
            <Text style={styles.orderButtonText}>Connect Wallet</Text>
          </TouchableOpacity>
        ) : needsDeposit ? (
          <TouchableOpacity 
            style={[styles.orderButton, styles.establishConnectionButton]} 
            onPress={handleEstablishConnection}
          >
            <Text style={styles.orderButtonText}>Establish Connection</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.orderButton, isBuy ? styles.buyButton : styles.sellButton]} 
            onPress={placeOrder}
          >
            <Text style={styles.orderButtonText}>
              {isBuy ? 'Buy / Long' : 'Sell / Short'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Trade Status */}
        {tradeStatus && (
          <Text style={[styles.tradeStatus, tradeStatus.includes("successfully") ? styles.successText : styles.errorText]}>
            {tradeStatus}
          </Text>
        )}
      </View>
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
  tradingInterface: {
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
  dropdownButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
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
  establishConnectionButton: {
    backgroundColor: '#2E2E3A',
  },
  loginButton: {
    backgroundColor: '#2E2E3A',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E2E3A',
    borderRadius: 16,
    zIndex: 2,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  depositButton: {
    backgroundColor: '#00C076',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  depositButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  establishConnectionButton: {
    backgroundColor: '#2E2E3A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  establishConnectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TradingInterface;
