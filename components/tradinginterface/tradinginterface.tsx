import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import WebSocketManager from '@/api/WebSocketManager';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { useApproveAgent } from '@/hooks/useApproveAgent';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { useApprovalStore } from '@/store/useApprovalStore';
import axios from 'axios';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import { useTradingStore } from '@/store/useTradingStore';
const { width } = Dimensions.get('window');
import { usePerpPositionsStore } from "@/store/usePerpWallet";
import { router } from 'expo-router';
import { useapprovebuilderfee } from '@/hooks/usebuilderapproval';
import { BUILDER_ADDRESS } from '@/constants/env';

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

interface Universe {
  szDecimals: number;
  name: string;
  maxLeverage: number;
}

interface TradingInterfaceProps {
  symbol: string;
}

const SLIPPAGE_PERCENTAGE = 0.5; // 0.5%
const SLIPPAGE_MULTIPLIER_BUY = 1 + (SLIPPAGE_PERCENTAGE / 100);  // 1.005 for 0.5%
const SLIPPAGE_MULTIPLIER_SELL = 1 - (SLIPPAGE_PERCENTAGE / 100); // 0.995 for 0.5%

const TradingInterface: React.FC<TradingInterfaceProps> = ({ 
  symbol
}) => {  
  const [marginType, setMarginType] = useState('Cross');
  const [isReduceOnly, setIsReduceOnly] = useState(false);
  const [activeAssetData, setActiveAssetData] = useState<WsActiveAssetData | null>(null);
  const [size, setSize] = useState('');
  const [isBuy, setIsBuy] = useState(true);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [szDecimals, setSzDecimals] = useState<number>(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [maxTradeSize, setMaxTradeSize] = useState<number>(0);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const isSheetOpenRef = useRef(false);
  const [currentLeverage, setCurrentLeverage] = useState(20);
  const [maxLeverage, setMaxLeverage] = useState(25);
  const { orderType, setOrderType , price, setPrice } = useTradingStore()
  const wsManager = WebSocketManager.getInstance();
  const account = useActiveAccount();
  const userAddress = account?.address || '0x0000000000000000000000000000000000000000';
  const { sdk } = useHyperliquid();
  const fullSymbol = `${symbol}-PERP`;
  const { wallet, loading: walletLoading, error: walletError, createWallet } = useAgentWallet();
  const { approveAgent } = useApproveAgent();
  const { approvebuilderfee } = useapprovebuilderfee();
  const { approvalCompleted, setApprovalCompleted , isMatch } = useApprovalStore();
  const [isConnectionModalVisible, setIsConnectionModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const marginBottomSheetRef = useRef<BottomSheetModal>(null);
  const isMarginSheetOpenRef = useRef(false);
  const getLeverageSteps = (max: number) => {
    // For small max values (≤5), just return array from 1 to max
    if (max <= 5) {
      return Array.from({length: max}, (_, i) => i + 1);
    }
    // For larger values, use 6 steps
    return [1, Math.round(max/5), Math.round(max*2/5), Math.round(max*3/5), Math.round(max*4/5), max];
  };

  const handleIncrement = () => {
    const steps = getLeverageSteps(maxLeverage);
    const nextValue = steps.find(x => x > currentLeverage);
    if (nextValue) {
      setCurrentLeverage(nextValue);
    }
  };

  const handleDecrement = () => {
    const steps = getLeverageSteps(maxLeverage);
    const prevValue = [...steps].reverse().find(x => x < currentLeverage);
    if (prevValue) {
      setCurrentLeverage(prevValue);
    }
  };

  const handlePresentModalPress = useCallback(() => {
    fetchMaxLeverage();
    bottomSheetModalRef.current?.present();
  }, [symbol]);

  const handleSheetChanges = useCallback((index: number) => {
    isSheetOpenRef.current = index === 0;
    if (index === 0 && activeAssetData?.leverage?.value) {
      setCurrentLeverage(activeAssetData.leverage.value);
      setMarginType(activeAssetData.leverage.type);

    }
  }, [activeAssetData]);

  const handleMarginSheetChanges = useCallback((index: number) => {
    isMarginSheetOpenRef.current = index === 0;
    if (index === 0 && activeAssetData?.leverage?.type) {
      setCurrentLeverage(activeAssetData.leverage.value);

      setMarginType(activeAssetData.leverage.type);
    }
  }, [activeAssetData]);

  const handleMarginTypePress = useCallback(() => {
    marginBottomSheetRef.current?.present();
  }, []);

  const { 
    positions,
    subscribeToWebSocket
  } = usePerpPositionsStore();

  useEffect(() => {
    const unsubscribe = subscribeToWebSocket();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [subscribeToWebSocket]);

  const currentPosition = positions?.find(p => p.coin === symbol);

  useEffect(() => {

    // For reduce-only orders
    if (isReduceOnly) {
      // If no position exists, set max size to 0
      if (!currentPosition) {
        setMaxTradeSize(0);
        return;
      }

      const positionSize = Math.abs(parseFloat(currentPosition.size));
      if (isBuy) {
        // If position is short (negative), allow buying to close
        // If position is long (positive), don't allow buying more
        const maxSize = parseFloat(currentPosition.size) < 0 ? positionSize : 0;
        setMaxTradeSize(maxSize);
      } else {
        // If position is long (positive), allow selling to close
        // If position is short (negative), don't allow selling more
        const maxSize = parseFloat(currentPosition.size) > 0 ? positionSize : 0;
        setMaxTradeSize(maxSize);
      }
    } 
    // For normal orders, use maxTradeSzs
    else {
      const normalMaxSize = isBuy ? 
        (activeAssetData?.maxTradeSzs?.[0] || 0) : 
        (activeAssetData?.maxTradeSzs?.[1] || 0);
      setMaxTradeSize(normalMaxSize);
    }
  }, [isBuy, activeAssetData?.maxTradeSzs, isReduceOnly, currentPosition]);

  

  const handleEstablishConnection = async () => {
    if (walletLoading || isConnecting) {
      return;
    }

    setIsConnecting(true);
    try {
      // Create wallet if we don't have one
      if (!wallet?.address || !isMatch) {
        console.log("Wallet mismatch", { walletAddress: wallet?.address, isMatch });
        console.log("Creating wallet...");
        await createWallet();
      }

      // Only proceed with approval if we're not already connecting
      if (!isConnecting && wallet?.address) {
        try {
          console.log("Approving agent...");
          await approveAgent();
          await approvebuilderfee();
          setApprovalCompleted(true);
          setIsConnectionModalVisible(false);
        } catch (error: any) {
          if (error.message?.includes('Must deposit')) {
            setIsConnectionModalVisible(true);
          }
        }
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
      // Removed queryUserRole call
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

  const fetchMaxLeverage = async () => {
    try {
      const response = await axios.post('https://api.hyperliquid-testnet.xyz/info', {
        type: 'meta'
      });
      
      const universe: Universe[] = response.data.universe;
      const asset = universe.find(item => item.name === symbol);
      
      if (asset) {
        setMaxLeverage(asset.maxLeverage);
       
      }
    } catch (error) {
      console.error('Error fetching max leverage:', error);
    }
  };

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

 
  const SLIPPAGE_PERCENTAGE = 0.5; // 0.5%
  const SLIPPAGE_MULTIPLIER_BUY = 1 + (SLIPPAGE_PERCENTAGE / 100);  // 1.005 for 0.5%
  const SLIPPAGE_MULTIPLIER_SELL = 1 - (SLIPPAGE_PERCENTAGE / 100); // 0.995 for 0.5%
  // This effect updates the price when switching to a market order.
  // When orderType is "Market" and midPrice is available, set the price to midPrice with 0.5% slippage.
  useEffect(() => {
    if (orderType === 'Market' && midPrice != null && !isNaN(midPrice)) {
      let px = midPrice;
      // For market orders:
      // - If buying, add slippage (midPrice * SLIPPAGE_MULTIPLIER_BUY)
      // - If selling, subtract slippage (midPrice * SLIPPAGE_MULTIPLIER_SELL)
      if (isBuy) {
        px = px * SLIPPAGE_MULTIPLIER_BUY;
      } else {
        px = px * SLIPPAGE_MULTIPLIER_SELL;
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
        reduce_only: isReduceOnly,
      });
    try {
      const orderRequest = {
        orders: [{
          coin: fullSymbol,
          is_buy: isBuy,
          sz: sizeNum,
          limit_px: priceNum,
          order_type: orderTypeObject,
          reduce_only: isReduceOnly,
        }],
        grouping: 'na',
        builder: 
          {
            b: BUILDER_ADDRESS,
            f: 50,
          }
      };

      console.log('Attempting to place order with request:', JSON.stringify(orderRequest, null, 2));
      const result = await sdk.exchange.placeOrder(orderRequest);
      console.log('Order placement complete. Full result:', JSON.stringify(result, null, 2));
      
      const error = result?.response?.data?.statuses?.[0]?.error;
      setTradeStatus(error ? `Failed to place order: ${error}` : "Order placed successfully!");
    } catch (error: any) {
      console.error('Error details:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      if (error.response) {
        console.error('Error response:', JSON.stringify(error.response, null, 2));
      }
      if (error.request) {
        console.error('Error request:', JSON.stringify(error.request, null, 2));
      }
      setTradeStatus(`Failed to place order: ${error.message ?? "Unknown error"}`);
    }
  };

  const handleSizeChange = (value: string) => {
    console.log('handleSizeChange:', {
      value,
      maxTradeSize,
      isReduceOnly,
      currentPosition: currentPosition?.size
    });
    
    const regex = new RegExp(`^\\d+(\\.\\d{0,${szDecimals}})?$`);
    if (regex.test(value)) {
      const numValue = parseFloat(value);
      if (isReduceOnly && currentPosition && numValue > maxTradeSize) {
        setSize(maxTradeSize.toString());
        return;
      }
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

const updateLeverage = async () => {
  console.log('[Leverage] Attempting to update leverage...', {
    symbol: fullSymbol,
    marginType,
    currentLeverage,
    maxLeverage
  });

  if (!sdk) {
    const errorMsg = "SDK not initialized yet.";
    console.error('[Leverage] Error:', errorMsg);
    setTradeStatus(errorMsg);
    return;
  }

  try {
    const result = await sdk.exchange.updateLeverage(fullSymbol, marginType, currentLeverage);
    console.log('[Leverage] Update successful:', {
      response: result,
      finalLeverage: currentLeverage,
      mode: marginType
    });
  } catch (error) {
    console.error('[Leverage] Error updating leverage:', error);
    setTradeStatus('Failed to update leverage');
  }
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
          {isBuy ? 'Buy/Long' : 'Sell/Short'} {symbol}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

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
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsConnectionModalVisible(false)}
          >
            <AntDesign name="close" size={20} color="#FFFFFF" />
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
    <BottomSheetModal
            ref={bottomSheetModalRef}
            snapPoints={['48%']}
            onChange={handleSheetChanges}
            enablePanDownToClose={true}
            stackBehavior="replace"
            enableOverDrag={false}
            enableContentPanningGesture={false}
            index={0}
            backgroundStyle={{ backgroundColor: '#1E1E1E' }}
            backdropComponent={renderBackdrop}
        >
            <BottomSheetView style={styles.contentContainer}>
              <Text style={styles.title}>Adjust Leverage</Text>
              <View style={styles.leverageInputContainer}>
                <TouchableOpacity 
                  style={styles.adjustButton}
                  onPress={handleDecrement}
                >
                  <Text style={styles.adjustButtonText}>−</Text>
                </TouchableOpacity>
                <View style={styles.leverageValueContainer}>
                  <Text style={styles.leverageValue}>{currentLeverage}x</Text>
                </View>
                <TouchableOpacity 
                  style={styles.adjustButton}
                  onPress={handleIncrement}
                >
                  <Text style={styles.adjustButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={maxLeverage}
                  value={currentLeverage}
                  onValueChange={setCurrentLeverage}
                  minimumTrackTintColor="#F0B90B"
                  maximumTrackTintColor="#2A2D3A"
                  thumbTintColor="#F0B90B"
                  step={1}
                />
                <View style={styles.markersContainer}>
                  {getLeverageSteps(maxLeverage).map((leverage) => (
                    <View key={leverage} style={styles.marker}>
                      <View style={[
                        styles.markerDot,
                        currentLeverage >= leverage && styles.activeDot
                      ]} />
                      <Text style={styles.markerText}>{leverage}x</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.warningText}>Please note that leverage changing will also apply to open positions and open orders.</Text>
              <Text style={styles.riskText}>* Selecting higher leverage such as [10x] increases your liquidation risk. Always manage your risk levels.</Text>
              <TouchableOpacity style={styles.confirmButton} onPress={updateLeverage}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </BottomSheetView>
        </BottomSheetModal>
        <BottomSheetModal
            ref={marginBottomSheetRef}
            snapPoints={['45%']}
            onChange={handleMarginSheetChanges}
            enablePanDownToClose={true}
            stackBehavior="replace"
            enableOverDrag={false}
            enableContentPanningGesture={false}
            index={0}
            backgroundStyle={{ backgroundColor: '#1E1E1E' }}
            backdropComponent={renderBackdrop}
        >
            <BottomSheetView style={styles.contentContainer}>
                <View style={styles.marginHeader}>
                    <Text style={styles.marginTitle}>Margin mode</Text>
                </View>
                <View style={styles.marginOptionsContainer}>
                    <TouchableOpacity 
                        style={[
                            styles.marginOptionButton,
                            marginType === 'cross' && styles.selectedMarginOption
                        ]}
                        onPress={() => setMarginType('cross')}
                    >
                        <Text style={styles.marginOptionText}>Cross</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[
                            styles.marginOptionButton,
                            marginType === 'isolated' && styles.selectedMarginOption
                        ]}
                        onPress={() => setMarginType('isolated')}
                    >
                        <Text style={styles.marginOptionText}>Isolated</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.marginNote}>This margin mode adjustment will only affect the selected futures trading pair.</Text>
              
                <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={updateLeverage}
                >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
            </BottomSheetView>
        </BottomSheetModal>
      <View style={styles.tradingInterface}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.dropdownButton} onPress={handlePresentModalPress}>
            <Text style={styles.headerText}>{activeAssetData?.leverage?.value || "0"}x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={handleMarginTypePress}

          >
            <Text style={styles.headerText}>{activeAssetData?.leverage?.type}</Text>
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
              setSize(maxTradeSize?.toString() || '0.00');
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
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={() => {
              console.log('Toggling reduce-only from:', isReduceOnly);
              setIsReduceOnly(!isReduceOnly);
            }}
          >
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
            {maxTradeSize} {symbol}
          </Text>
        </View>
        {/* Order Button or Login Button */}
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
    marginVertical: 8,
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
    color: '#00C087',
  },
  errorText: {
    color: '#FF3B30',
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
  disabledButton: {
    backgroundColor: '#1E1F26',
    opacity: 0.7,
  },
  disabledButtonText: {
    color: '#8E8E93',
  },
  contentContainer: {
    padding: 16,
    backgroundColor: '#1A1C24',
  },
  title: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  leverageInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  adjustButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  leverageValueContainer: {
    backgroundColor: '#2A2D3A',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 4,
    marginHorizontal: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  leverageValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  sliderContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  markersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  marker: {
    alignItems: 'center',
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2D3A',
    marginBottom: 4,
  },
  activeDot: {
    backgroundColor: '#F0B90B',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2A2D3A',
  },
  markerText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  noteText: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 8,
  },
  warningText: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 12,
  },
  riskText: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 24,
    lineHeight: 18,
  },
  linkText: {
    color: '#F0B90B',
  },
  confirmButton: {
    backgroundColor: '#F0B90B',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  marginHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  marginTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  marginOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  marginOptionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2D3A',
    backgroundColor: '#1E1E1E',
  },
  selectedMarginOption: {
    borderColor: '#F0B90B',
    backgroundColor: 'rgba(240, 185, 11, 0.1)',
  },
  marginOptionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  marginNote: {
    fontSize: 14,
    color: '#808080',
    padding: 16,
    lineHeight: 20,
  },
  marginInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2A2D3A',
  },
  marginInfoText: {
    fontSize: 16,
    color: '#fff',
  },
});

export default TradingInterface;