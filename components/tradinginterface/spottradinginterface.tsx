import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import WebSocketManager from '@/api/WebSocketManager';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { router } from 'expo-router';
import { useApproveAgent } from '@/hooks/useApproveAgent';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { useApprovalStore } from '@/store/useApprovalStore';
import { Modal } from 'react-native';
import axios from 'axios';
import { AntDesign } from '@expo/vector-icons';
import { usespotTradingStore } from '@/store/useTradingStore';

const { width } = Dimensions.get('window');

interface SpotBalance {
  coin: string;
  token: number;
  total: string;
  hold: string;
  entryNtl: string;
}

interface SpotState {
  balances: SpotBalance[];
}

interface TradingInterfaceProps {
  symbol: string;
  sdksymbol: string;
}

const SpotTradingInterface: React.FC<TradingInterfaceProps> = ({ 
  symbol,
  sdksymbol
}) => {  
  
  const [spotState, setSpotState] = useState<SpotState>({ balances: [] });
  const [size, setSize] = useState('');
  const [isBuy, setIsBuy] = useState(true);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [szDecimals, setSzDecimals] = useState<number>(0);

  const wsManager = WebSocketManager.getInstance();
  const account = useActiveAccount();
  const userAddress = account?.address || '0x0000000000000000000000000000000000000000';
  const { sdk } = useHyperliquid();
  const fullSymbol = `${sdksymbol}-SPOT`;
  const { wallet, loading: walletLoading, error: walletError, createWallet } = useAgentWallet();
  const { approveAgent } = useApproveAgent();
  const { approvalCompleted, setApprovalCompleted } = useApprovalStore();  
  const [isConnectionModalVisible, setIsConnectionModalVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { orderType, setOrderType , price, setPrice } = usespotTradingStore();
  const handleEstablishConnection = async () => {
    if (walletLoading || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setApprovalCompleted(false); // Reset approval state at the start

    try {
      // Create wallet if we don't have one
      if (!wallet?.address) {
        console.log("Creating wallet...");
        await createWallet();
        
        // Verify wallet was created
        if (!wallet?.address) {
          throw new Error('Failed to create wallet');
        }
      }

      // Only proceed with approval if we have a wallet address
      if (wallet?.address) {
        try {
          console.log("Approving agent...");
          await approveAgent();
          
          // Only set approval if we get here (no errors thrown)
          setApprovalCompleted(true);
          setIsConnectionModalVisible(false);
        } catch (error: any) {
          console.error('Connection error:', error);
          // Explicitly set approval to false and handle modal
          setApprovalCompleted(false);
          if (error.message?.includes('Must deposit')) {
            setIsConnectionModalVisible(true);
          } else {
            setIsConnectionModalVisible(false);
            Alert.alert(
              'Connection Error',
              'Failed to establish connection. Please try again.'
            );
          }
          throw error; // Re-throw to ensure we don't proceed
        }
      }
    } catch (error: any) {
      console.error('Establish connection error:', error);
      setApprovalCompleted(false);
      // Don't hide modal if it's a deposit requirement
      if (!error.message?.includes('Must deposit')) {
        setIsConnectionModalVisible(false);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const navigateToWallet = () => {
    setIsConnectionModalVisible(false);
    router.push('/wallet');
  };

  useEffect(() => {
    if (wallet?.address && account?.address) {
      console.log("Wallet and account addresses available");
    }
  }, [wallet?.address, account?.address]);

  useEffect(() => {
    console.log("Modal visibility changed:", isConnectionModalVisible);
  }, [isConnectionModalVisible]);

  // Monitor wallet and account status
  useEffect(() => {
    if (walletLoading || !wallet || !account?.address) {
      console.log("Agent wallet is still loading or external wallet not connected.");
      return;
    }
  }, [wallet, walletLoading, account?.address]);

  useEffect(() => {
    console.log("State updated - approvalCompleted:", approvalCompleted);
  }, [approvalCompleted]);

  // Subscribe to active asset data and mid prices as before.
  useEffect(() => {
    const fetchTokenDecimals = async () => {
      if (!sdksymbol) return;
      try {
        const response = await axios.post("https://api.hyperliquid-testnet.xyz/info", {
          type: "spotMeta",
        });
        const spotMeta = response.data;
        const token = spotMeta.tokens.find((t: any) => 
          t.name.toUpperCase() === sdksymbol.toUpperCase()
        );
        if (token) {
          setSzDecimals(token.szDecimals);
          console.log(`Token ${sdksymbol} szDecimals:`, token.szDecimals);
        } else {
          console.warn(`Token ${sdksymbol} not found in spot metadata.`);
        }
      } catch (error) {
        console.error('Error fetching token decimals:', error);
      }
    };
    fetchTokenDecimals();
  }, [sdksymbol]);

  useEffect(() => {
    const allMidsListener = (data: any) => {
      if (data?.mids && data.mids[symbol]) {
        setMidPrice(parseFloat(data.mids[symbol]));
      } else {
        setMidPrice(NaN);
      }
    };
    
    wsManager.subscribe("allMids", { type: "allMids" }, allMidsListener);

    return () => {
      wsManager.unsubscribe("allMids", { type: "allMids" }, allMidsListener);
    };
  }, [symbol]);

  // Subscribe to webData2 for the spotState data.
  useEffect(() => {
    const webData2Listener = (data: any) => {
      // Expecting data in the format: { spotState: { balances: [ ... ] } }
      if (data?.spotState) {
        setSpotState(data.spotState);
      }
    };

    wsManager.subscribe("webData2", { type: "spotState" }, webData2Listener);
    return () => {
      wsManager.unsubscribe("webData2", { type: "spotState" }, webData2Listener);
    };
  }, [wsManager]);

  // Update price for Market orders based on midPrice.
  useEffect(() => {
    if (orderType === 'Market' && midPrice != null && !isNaN(midPrice)) {
      let px = midPrice; // For example, 3129.5
      
      // Adjust price based on order side, if applicable (this step is optional based on your business logic)
      if (isBuy) {
        px = px * 1.005;
      } else {
        px = px * 0.995;
      }
      
      // For perp coins, MAX_DECIMALS is 6.
      const MAX_DECIMALS = 6;
      const allowedDecimalPlaces = MAX_DECIMALS - szDecimals; // 6 - 4 = 2
  
      let finalPrice;
      
      // If the price is an integer, it's allowed as-is.
      if (Number.isInteger(px)) {
        finalPrice = px;
      } else {
        // Round to 5 significant figures.
        const pxFiveSig = parseFloat(px.toPrecision(5));
        // Then enforce allowed decimal places.
        finalPrice = parseFloat(pxFiveSig.toFixed(allowedDecimalPlaces));
      }
      
      setPrice(finalPrice.toString());
      console.log(`Calculated final price: ${finalPrice}`);
    }
  }, [orderType, midPrice, isBuy, setPrice, szDecimals]);
  
  

  // Determine the available balance and max trade size based on the order side.
  const availableBalance =
    isBuy
      ? spotState.balances.find((bal) => bal.coin.toUpperCase() === 'USDC')?.total || '0.000'
      : spotState.balances.find((bal) => bal.coin.toUpperCase() === sdksymbol.toUpperCase())?.total || '0.000';

      const HoldBalance =
      isBuy
        ? spotState.balances.find((bal) => bal.coin.toUpperCase() === 'USDC')?.hold || '0.000'
        : spotState.balances.find((bal) => bal.coin.toUpperCase() === sdksymbol.toUpperCase())?.hold || '0.000';

  // Calculate max trade size based on available balance and mid price
    const maxTradeSize = midPrice ? ((parseFloat(availableBalance) - parseFloat(HoldBalance)) / midPrice).toFixed(szDecimals) : '0';
  
  const maxTradeSizesell = (parseFloat(availableBalance) - parseFloat(HoldBalance)).toFixed(szDecimals);

  const placeOrder = async () => {
    if (!sdk) {
      setTradeStatus("SDK not initialized yet.");
      console.log("SDK not initialized yet.");
      return;
    }
    const sizeNum = parseFloat(size);
    const priceNum = parseFloat(price);
  
    if (isNaN(sizeNum) || sizeNum <= 0) {
      setTradeStatus("Please enter a valid size");
      console.log("Invalid size entered:", size);
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setTradeStatus("Please enter a valid price");
      console.log("Invalid price entered:", price);
      return;
    }
  
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
      console.log("Order result:", result);
    } catch (error: any) {
      setTradeStatus(`Failed to place order: ${error.message ?? "Unknown error"}`);
      console.error("Error placing order:", error);
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
    const baseMaxDecimals = 8 - szDecimals;
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

const renderOrderButton = () => {
  if (!account?.address) {
    return (
      <TouchableOpacity 
        style={[styles.orderButton, styles.loginButton]} 
        onPress={() => router.push('/loginpage')}
      >
        <Text style={styles.orderButtonText}>Connect Wallet</Text>
      </TouchableOpacity>
    );
  }

  if (!wallet?.address || !approvalCompleted) {
    const buttonStyles = [
      styles.orderButton, 
      styles.establishConnectionButton,
      (walletLoading || isConnecting) && styles.disabledButton
    ];
    const textStyles = [
      styles.orderButtonText,
      (walletLoading || isConnecting) && styles.disabledButtonText
    ];
    
    if (walletLoading || isConnecting) {
      return (
        <View style={buttonStyles}>
          <Text style={textStyles}>
            Connecting...
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={buttonStyles}
        onPress={handleEstablishConnection}
      >
        <Text style={textStyles}>
          Establish Connection
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.orderButton, isBuy ? styles.buyButton : styles.sellButton]} 
      onPress={placeOrder}
    >
      <Text style={styles.orderButtonText}>
        {isBuy ? 'Buy' : 'Sell'} {sdksymbol}
      </Text>
    </TouchableOpacity>
  );
};
  

  return (
    <View style={styles.container}>
    <Modal
      animationType="slide"
      transparent={true}
      visible={isConnectionModalVisible}
      onRequestClose={() => setIsConnectionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsConnectionModalVisible(false)}
              activeOpacity={0.7}
            >
              <AntDesign name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

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
    <View style={styles.tradingInterface}>
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
          {availableBalance} {isBuy ? 'USDC' : sdksymbol}
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
          <Text style={styles.label}>Amount {sdksymbol}</Text>
          <TouchableOpacity
            style={styles.maxButton}
            onPress={() => {
              // Use max trade size based on our computed available balance.
              setSize(isBuy ? maxTradeSize : maxTradeSizesell);
            }}
          >
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
      

      {/* Max Row */}
      <View style={styles.row}>
        <Text style={styles.orderButtonSubtext}>Max</Text>
        <Text style={styles.orderButtonValue}>
        {isBuy ? maxTradeSize : maxTradeSizesell}
        {sdksymbol}
        </Text>
      </View>

      {/* Order Button */}
      
      {renderOrderButton()}

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
    flex: 1,
    backgroundColor: "#13141B",
  },
  tradingInterface: {
    flex: 1,
    backgroundColor: "#13141B",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
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
  },modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#2C2D33',
  },
  closeButtonContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E2E3A',
    borderRadius: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  headerText: {
    color: '#8E8E93',
    fontSize: 18,
    fontWeight: '500',
  },
  dropdownButton: {
    padding: 8,
  },
  dropdownButtonText: {
    color: '#8E8E93',
    fontSize: 18,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1F26',
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
    backgroundColor: '#00C087',
  },
  activeSell: {
    backgroundColor: '#FF3B30',
  },
  toggleText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#8E8E93',
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
    backgroundColor: '#1E1F26',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  activeOrderType: {
    backgroundColor: '#2C2D33',
  },
  orderTypeText: {
    color: '#8E8E93',
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
    backgroundColor: '#1E1F26',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: '#2C2D33',
    color: '#8E8E93',
  },
  maxButton: {
    backgroundColor: '#1E1F26',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  maxButtonText: {
    color: '#8E8E93',
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
    borderColor: '#8E8E93',
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedIndicator: {
    backgroundColor: '#00C087',
    borderColor: '#00C087',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
  },
  orderButtonSubtext: {
    color: '#8E8E93',
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
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
  },
  buyButton: {
    backgroundColor: '#00C087',
  },
  sellButton: {
    backgroundColor: '#FF3B30',
  },
  loginButton: {
    backgroundColor: '#2C2D33',
  },
  establishConnectionButton: {
    backgroundColor: '#2E2E3A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
    height: 48,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  disabledButton: {
    backgroundColor: '#1E1F26',
    opacity: 0.7,
  },
  disabledButtonText: {
    color: '#8E8E93',
  },
  tradeStatus: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  successText: {
    color: '#00C087',
  },
  errorText: {
    color: '#FF3B30',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#13141B',
    padding: 20,
    borderRadius: 8,
    width: '80%',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#00C087',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SpotTradingInterface;