import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { useActiveAccount } from "thirdweb/react";
import { OrderRequest, placeOrderl1 } from "@/utils/Signing";
import { useAgentWallet } from "@/hooks/useAgentWallet";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { usePerpOrdersStore, usePerpPositionsStore, usePerpContextStore } from "@/store/usePerpWallet";
import { BUILDER_ADDRESS } from "@/constants/env";

interface TradingInterfaceProps {
  symbol: string;
}

interface Leverage {
  type: "cross" | "isolated";
  value: number;
}

interface ModalData {
  coin: string;
  size: string;
  entryPx: string;
  markPx: string;
  leverage: Leverage;
}

const OpenOrdersPositionsTabs: React.FC<TradingInterfaceProps> = ({ symbol }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const { sdk } = useHyperliquid();
  const fullSymbol = `${symbol}-PERP`;
  const [cancelStatus, setcancelStatus] = useState<string | null>(null);
  const [routes] = useState([
    { key: "orders", title: "Open Orders" },
    { key: "positions", title: "Positions" },
  ]);
  const [hideOtherSymbols, setHideOtherSymbols] = useState(false);
  const [cancelallStatus, setcancelallStatus] = useState<string | null>(null);
  const [closeallStatus, setcloseallStatus] = useState<string | null>(null);
  const [closeStatus, setcloseStatus] = useState<string | null>(null);
  const {wallet }= useAgentWallet()
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%','85%'], []);
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState('Market');
  const [isBuy, setIsBuy] = useState(true);
  const [modalData, setModalData] = useState<ModalData>({
    coin: '',
    size: '',
    entryPx: '',
    markPx: '',
    leverage: {
      type: 'cross',
      value: 0
    }
  });
  const [tpTriggerPrice, setTpTriggerPrice] = useState('');
  const [tpPnL, setTpPnL] = useState('');
  const [slTriggerPrice, setSlTriggerPrice] = useState('');
  const [slPnL, setSlPnL] = useState('');
  const [existingTpOrder, setExistingTpOrder] = useState<any>(null);
  const [existingSlOrder, setExistingSlOrder] = useState<any>(null);

  const calculatePnLFromPrice = (triggerPrice: string) => {
    if (!triggerPrice || !modalData.entryPx || !modalData.size) return '';
    
    const entry = Number(modalData.entryPx);
    const trigger = Number(triggerPrice);
    const size = Number(modalData.size);
    
    // PnL = (Exit Price - Entry Price) * Size for longs
    // PnL = (Entry Price - Exit Price) * Size for shorts
    const pnl = size > 0 
      ? (trigger - entry) * Math.abs(size)
      : (entry - trigger) * Math.abs(size);
    
    return pnl.toFixed(2);
  };

  const calculatePriceFromPnL = (pnl: string) => {
    if (!pnl || !modalData.entryPx || !modalData.size) return '';
    
    const entry = Number(modalData.entryPx);
    const targetPnL = Number(pnl);
    const size = Number(modalData.size);
    
    // For longs: Exit Price = (PnL / Size) + Entry Price
    // For shorts: Exit Price = Entry Price - (PnL / Size)
    const triggerPrice = size > 0
      ? (targetPnL / Math.abs(size)) + entry
      : entry - (targetPnL / Math.abs(size));
    
    return triggerPrice.toFixed(2);
  };

  const handleTpTriggerPriceChange = (value: string) => {
    setTpTriggerPrice(value);
    const calculatedPnL = calculatePnLFromPrice(value);
    setTpPnL(calculatedPnL);
  };

  const handleTpPnLChange = (value: string) => {
    setTpPnL(value);
    const calculatedPrice = calculatePriceFromPnL(value);
    setTpTriggerPrice(calculatedPrice);
  };

  const handleSlTriggerPriceChange = (value: string) => {
    setSlTriggerPrice(value);
    const calculatedPnL = calculatePnLFromPrice(value);
    // Make PnL negative for stop loss
    setSlPnL(calculatedPnL ? (-Math.abs(Number(calculatedPnL))).toFixed(2) : '');
  };

  const handleSlPnLChange = (value: string) => {
    // Remove any negative signs from input and make it negative
    const positiveValue = value.replace('-', '');
    setSlPnL('-' + positiveValue);
    const calculatedPrice = calculatePriceFromPnL('-' + positiveValue);
    setSlTriggerPrice(calculatedPrice);
  };
  const { 
    openOrders = []
  } = usePerpOrdersStore();

  const handlePresentModal = useCallback((coin: string, size: string, entryPx: string, markPx: string, leverage: Leverage) => {
    setModalData({ coin, size, entryPx, markPx, leverage });
    
    // Find existing TP/SL orders for this position
    const positionTpSlOrders = openOrders.filter(order => 
      order.coin === coin && 
      order.isTrigger && 
      order.isPositionTpsl &&
      order.sz === "0.0"  // This is specific to TP/SL orders
    );

    console.log('Found TP/SL orders:', positionTpSlOrders);

    // Set existing TP and SL orders
    const tp = positionTpSlOrders.find(order => order.orderType === "Take Profit Market");
    const sl = positionTpSlOrders.find(order => order.orderType === "Stop Market");
    
    console.log('Found TP order:', tp);
    console.log('Found SL order:', sl);
    
    setExistingTpOrder(tp || null);
    setExistingSlOrder(sl || null);
    
    // Clear input fields if there are existing orders
    setTpTriggerPrice('');
    setSlTriggerPrice('');
    setTpPnL('');
    setSlPnL('');
    
    bottomSheetModalRef.current?.present();
  }, [openOrders]);

  const handleDismissModal = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  

  const { 
    positions = []
  } = usePerpPositionsStore();

  const {
    assetContexts = [],
    metaUniverse = []
  } = usePerpContextStore();

  const subscribeToWebSocket = usePerpOrdersStore(state => state.subscribeToWebSocket);
  const subscribeToPositionsWebSocket = usePerpPositionsStore(state => state.subscribeToWebSocket);
  const subscribeToContextWebSocket = usePerpContextStore(state => state.subscribeToWebSocket);

  useEffect(() => {
    const unsubscribeOrders = subscribeToWebSocket();
    const unsubscribePositions = subscribeToPositionsWebSocket();
    const unsubscribeContext = subscribeToContextWebSocket();

    return () => {
      unsubscribeOrders();
      unsubscribePositions();
      unsubscribeContext();
    };
  }, [subscribeToWebSocket, subscribeToPositionsWebSocket, subscribeToContextWebSocket]);

  const account = useActiveAccount();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date
      .getHours()
      .toString()
      .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;
  };

  const cancelOrder = async (oid: number, coin: string) => {
    if (!sdk) {
      console.log("Cancel order failed: SDK not initialized");
      setcancelStatus("SDK not initialized yet.");
      return;
    }
    const cancelsymbol = `${coin}-PERP`;
    try {
      console.log("Attempting to cancel order:", oid);
      const result = await sdk.exchange.cancelOrder({
        coin: cancelsymbol,
        o: oid,
      });
      console.log("Cancel order response:", result);
      const error = result?.response?.data?.statuses?.[0]?.error;
      
      // If order cancellation was successful, update the TP/SL states
      if (!error) {
        // Check if the cancelled order was a TP or SL order
        if (existingTpOrder && existingTpOrder.oid === oid) {
          setExistingTpOrder(null);
          setTpTriggerPrice('');
          setTpPnL('');
        }
        if (existingSlOrder && existingSlOrder.oid === oid) {
          setExistingSlOrder(null);
          setSlTriggerPrice('');
          setSlPnL('');
        }
      }
      
      setcancelStatus(
        error ? `Failed to cancel order: ${error}` : "Order cancelled successfully!"
      );
    } catch (error: any) {
      setcancelStatus(`Failed to cancel order: ${error.message ?? "Unknown error"}`);
    }
  };

  const cancelallOrder = async () => {
    if (!sdk) {
      console.log("Close all positions failed: SDK not initialized");
      setcancelallStatus("SDK not initialized yet.");
      return;
    }
    try {
      console.log("Attempting to cancell all positions...");
      const result = await sdk.custom.cancelAllOrders();
      console.log("Close all positions response:", result);
      if (result && Array.isArray(result)) {
        console.log("Successfully closed all positions");
        setcancelallStatus("All positions closed successfully!");
      } else {
        console.error("Unexpected response format:", result);
        setcancelallStatus("Failed to close positions: Unexpected response format");
      }
    } catch (error: any) {
      console.error("Error closing all positions:", error);
      setcancelallStatus(`Failed to close positions: ${error.message ?? "Unknown error"}`);
    }
  };

  const closeallOrder = async () => {
    if (!sdk) {
      console.log('Close all positions failed: SDK not initialized');
      return;
    }

    try {
      const allPositions = positions;
      console.log('Attempting to close all positions:', allPositions);

      // Create orders for all positions
      const orders = allPositions.map(position => {
        const isLongPosition = Number(position.size) > 0;
        const rawPrice = parseFloat(position.markPx);
        const priceWithSlippage = rawPrice * (isLongPosition ? SLIPPAGE_MULTIPLIER_SELL : SLIPPAGE_MULTIPLIER_BUY);
        const priceNum = Number(priceWithSlippage.toPrecision(5));

        return {
          coin: `${position.coin}-PERP`,
          is_buy: isLongPosition ? false : true, // opposite of position direction
          sz: Math.abs(Number(position.size)),
          limit_px: priceNum,
          order_type: { limit: { tif: "FrontendMarket" } },
          reduce_only: true
        };
      });

      if (orders.length === 0) {
        console.log('No positions to close');
        return;
      }

      const orderRequest = {
        orders,
        grouping: 'na',
        builder: {
          b: BUILDER_ADDRESS,
          f: 50
        }
      };

      console.log('Placing close all orders with request:', JSON.stringify(orderRequest, null, 2));
      const result = await sdk.exchange.placeOrder(orderRequest);
      console.log('Close all orders response:', result);

      if (result?.response?.data?.statuses?.[0]?.error) {
        const error = result.response.data.statuses[0].error;
        console.error('Error closing all positions:', error);
        setcloseStatus(`Failed to close all positions: ${error}`);
      } else {
        setcloseStatus("All positions closed successfully!");
      }
    } catch (error) {
      console.error('Error in closeallOrder:', error);
      setcloseStatus("Failed to close all positions. Please try again.");
    }
  };

  const closePosition = async (coin: string , size: string , markPx: string) => {
    console.log('Close position called with params:', { coin, size, markPx });
    
    if (!sdk) {
      console.log(`Close position failed for ${coin}: SDK not initialized`);
      setcloseStatus("SDK not initialized yet.");
      return;
    }

    const sizeNum = parseFloat(size);
    const isLongPosition = Number(size) > 0;
    const rawPrice = parseFloat(markPx);
    // When closing long (selling), use SELL multiplier to lower price
    // When closing short (buying), use BUY multiplier to increase price
    const priceWithSlippage = rawPrice * (isLongPosition ? SLIPPAGE_MULTIPLIER_SELL : SLIPPAGE_MULTIPLIER_BUY);
    const priceNum = Number(priceWithSlippage.toPrecision(5));
    console.log('Parsed values:', { sizeNum, priceNum, rawPrice, priceWithSlippage, isLongPosition });

    if (isNaN(sizeNum) || sizeNum <= 0) {
      console.log('Invalid size:', { sizeNum });
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      console.log('Invalid price:', { priceNum });
      return;
    }

    // Set order type conditionally:
    const orderTypeObject =
      orderType === 'Market'
        ? { limit: { tif: "FrontendMarket" } }
        : { limit: { tif: "Gtc" } };
    console.log('Order type:', orderTypeObject);

    try {
      const closesymbol = `${coin}-PERP`;
      const isLongPosition = Number(size) > 0;
      console.log('Position details:', { 
        closesymbol, 
        isLongPosition, 
        closeSize: Math.abs(sizeNum),
        closePrice: priceNum
      });

      const orderRequest = {
        orders: [{
          coin: closesymbol,
          is_buy: isLongPosition ? false : true,
          sz: Math.abs(sizeNum),
          limit_px: priceNum,
          order_type: orderTypeObject,
          reduce_only: true,
        }],
        grouping: 'na',
        builder: {
          b: BUILDER_ADDRESS,
          f: 50
        }
      };
      console.log('Placing close order with request:', JSON.stringify(orderRequest, null, 2));

      const result = await sdk.exchange.placeOrder(orderRequest);
      console.log(`Market close response for ${closesymbol}:`, result);
      if (result?.response?.data?.statuses?.[0]?.error) {
        const error = result.response.data.statuses[0].error;
        console.error(`Failed to close position for ${closesymbol}:`, error);
        setcloseStatus(`Failed to close position: ${error}`);
      } else {
        console.log(`Successfully closed position for ${closesymbol}`);
        setcloseStatus("Position closed successfully!");
      }
    } catch (error: any) {
      console.error(`Error closing position for ${coin}:`, error);
      setcloseStatus(`Failed to close position: ${error.message ?? "Unknown error"}`);
    }
  };

  const handlecloseallOrder = async () => {
    if (!wallet) {
      console.error("Wallet is not initialized");
      return;
    }
    const orderRequest: OrderRequest = {
      asset: 0, 
      is_buy: false,
      sz: 0.51,
      limit_px: 200,
      reduce_only: false,
      order_type: {
        limit: { tif: "FrontendMarket" },
      },
    };
    try {
      const nonce = Date.now();
      const response = await placeOrderl1(orderRequest, wallet, nonce);
      console.log("Order result:", response);
    } catch (error: any) {
      console.error("Error placing order:", error.message);
      if (error.response?.data) {
        console.error("API Error Details:", error.response.data);
      }
    }
  };

  const SLIPPAGE_PERCENTAGE = 2; // 0.5%
  const SLIPPAGE_MULTIPLIER_BUY = 1 + (SLIPPAGE_PERCENTAGE / 100);  // 1.005 for 0.5%
  const SLIPPAGE_MULTIPLIER_SELL = 1 - (SLIPPAGE_PERCENTAGE / 100); // 0.995 for 0.5%   

  const handletpsl = async (coin: string, size: string, entryPx: string, markPx: string) => {
    console.log('Starting handletpsl with params:', { coin, size, entryPx, markPx });
    
    if (!sdk) {
      console.error('SDK not initialized');
      return;
    }

    const sizeNum = parseFloat(size);
    const tpprice = tpTriggerPrice ? parseFloat(tpTriggerPrice) : 0;
    const slprice = slTriggerPrice ? parseFloat(slTriggerPrice) : 0;
    console.log('Parsed values:', {
      sizeNum,
      tpprice,
      slprice,
      tpTriggerPrice,
      slTriggerPrice
    });

    if (isNaN(sizeNum) || sizeNum <= 0) {
      console.error('Invalid size:', { sizeNum });
      return;
    }

    // Validate prices only if they are set
    if (tpTriggerPrice && (isNaN(tpprice) || tpprice <= 0)) {
      console.error('Invalid TP price:', { tpprice });
      return;
    }
    if (slTriggerPrice && (isNaN(slprice) || slprice <= 0)) {
      console.error('Invalid SL price:', { slprice });
      return;
    }

    // If neither TP nor SL is set, return
    if (!tpTriggerPrice && !slTriggerPrice) {
      console.error('Neither TP nor SL price is set');
      return;
    }

    const fullSymbol = `${coin}-PERP`;
    console.log('Placing order for symbol:', fullSymbol);

    try {
      // Determine if this is a long position by checking if size is positive
      const isLongPosition = Number(size) > 0;
      
      console.log('Order request params:', {
        orders: [
          ...(tpTriggerPrice ? [{
            coin: fullSymbol,
            is_buy: isLongPosition ? false : true,  // For long: sell at TP, For short: buy at TP
            sz: Math.abs(sizeNum),
            limit_px: tpprice * (isLongPosition ? SLIPPAGE_MULTIPLIER_SELL : SLIPPAGE_MULTIPLIER_BUY),
            order_type: { trigger: { triggerPx: tpprice, isMarket: true, tpsl: "tp" } },
            reduce_only: true
          }] : []),
          ...(slTriggerPrice ? [{
            coin: fullSymbol,
            is_buy: isLongPosition ? false : true,  // For long: sell at SL, For short: buy at SL
            sz: Math.abs(sizeNum),
            limit_px: slprice * (isLongPosition ? SLIPPAGE_MULTIPLIER_SELL : SLIPPAGE_MULTIPLIER_BUY),
            order_type: { trigger: { triggerPx: slprice, isMarket: true, tpsl: "sl" } },
            reduce_only: true
          }] : [])
        ],
        grouping: "positionTpsl",
        builder: {
          b: BUILDER_ADDRESS,
          f: 50,
        }
      });

      const result = await sdk.exchange.placeOrder({
        orders: [
          ...(tpTriggerPrice ? [{
            coin: fullSymbol,
            is_buy: isLongPosition ? false : true,  // For long: sell at TP, For short: buy at TP
            sz: 0,
            limit_px: tpprice * (isLongPosition ? SLIPPAGE_MULTIPLIER_SELL : SLIPPAGE_MULTIPLIER_BUY),
            order_type: { trigger: { triggerPx: tpprice, isMarket: true, tpsl: "tp" } },
            reduce_only: true
          }] : []),
          ...(slTriggerPrice ? [{
            coin: fullSymbol,
            is_buy: isLongPosition ? false : true,  // For long: sell at SL, For short: buy at SL
            sz: 0,
            limit_px: slprice * (isLongPosition ? SLIPPAGE_MULTIPLIER_SELL : SLIPPAGE_MULTIPLIER_BUY),
            order_type: { trigger: { triggerPx: slprice, isMarket: true, tpsl: "sl" } },
            reduce_only: true
          }] : [])
        ],
        grouping: "positionTpsl",
        builder: {
          b: BUILDER_ADDRESS,
          f: 50
        }
      });
      console.log('Order placement complete. Full result:', JSON.stringify(result, null, 2));
      
      const error = result?.response?.data?.statuses?.[0]?.error;
      if (error) {
        console.error('Order placement error:', error);
      } else {
        console.log('Order placed successfully');
        bottomSheetModalRef.current?.dismiss();
      }
    } catch (err) {
      console.error('Exception in handletpsl:', err);
    }
  };

  const renderOrders = useCallback(() => (
    <View style={styles.ordersContainer}>
      <View style={styles.ordersHeader}>
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={styles.checkbox}
            onPress={() => setHideOtherSymbols(!hideOtherSymbols)}
          >
            {hideOtherSymbols && <View style={styles.checkboxInner}/>}
          </TouchableOpacity>
          <Text style={styles.filterText}>Hide Other Symbols</Text>
        </View>
        <TouchableOpacity style={styles.cancelAllButton} onPress={cancelallOrder}>
          <Text style={styles.cancelAllText}>Cancel All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView nestedScrollEnabled={true}>
        {(openOrders || []).filter((order) =>
          (!hideOtherSymbols || order.coin === symbol) &&
          (!order.coin.includes("/") && !order.coin.includes("@"))
        )
        .map((order) => (
          <View key={order.oid} style={styles.orderItem}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderCoin}>{order.coin}USDC</Text>
              <Text style={styles.orderType}>
                {order.orderType} / {order.side === "A" ? "Sell" : "Buy"}
              </Text>
              <Text style={styles.orderDate}>{formatDate(order.timestamp)}</Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => cancelOrder(order.oid, order.coin)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
            <View style={styles.orderDetails}>
              <Text style={styles.filledText}>
                Filled / Amount (${symbol}) 0.000 / {order.sz}
              </Text>
              <Text style={styles.priceText}>Price {order.limitPx}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      {cancelStatus && <Text style={styles.statusText}>{cancelStatus}</Text>}
      {closeStatus && <Text style={styles.statusText}>{closeStatus}</Text>}
      {cancelallStatus && <Text style={styles.statusText}>{cancelallStatus}</Text>}
      {closeallStatus && <Text style={styles.statusText}>{closeallStatus}</Text>}
    </View>
  ), [openOrders, subIndex, hideOtherSymbols, symbol, cancelallOrder, cancelOrder]);

  const renderPositions = useCallback(() => (
    <View style={styles.positionsContainer}>
      <View style={styles.positionsHeader}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setHideOtherSymbols(!hideOtherSymbols)}
          >
            {hideOtherSymbols && <View style={styles.checkboxInner} />}
          </TouchableOpacity>
          <Text style={styles.filterText}>Hide Other Symbols</Text>
        </View>
        <TouchableOpacity
          style={styles.closeAllButton}
          onPress={closeallOrder}
        >
          <Text style={styles.closeAllText}>Close All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.positionsContainer} nestedScrollEnabled={true}>
        {positions
        .filter((pos) => !hideOtherSymbols || pos.coin === symbol)
          .map((pos, idx) => {
            const coin = pos.coin;
            const assetIndex = metaUniverse.findIndex((asset) => asset.name === coin);
            const markPx = assetIndex !== -1 && assetContexts[assetIndex] 
              ? parseFloat(assetContexts[assetIndex].markPx)
              : '-';
            const pnl = parseFloat(pos.unrealizedPnl);
            return (
              <View key={idx} style={styles.positionItem}>
                <View style={styles.positionHeader}>
                  <Text style={styles.coinText}>{pos.coin}-PERP</Text>
                  <Text style={styles.leverageText}>
                    {pos.leverage.type} {pos.leverage.value}x
                  </Text>
                  <View style={styles.pnlContainer}>
                    <Text
                      style={[
                        styles.pnlText,
                        pnl < 0 ? styles.negative : styles.positive,
                      ]}
                    >
                      {pnl.toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.pnlPercent,
                        pnl < 0 ? styles.negative : styles.positive,
                      ]}
                    >
                      {parseFloat(pos.returnOnEquity).toFixed(2)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.detailsRow}>
                  <View style={styles.detailsColumn}>
                    <DetailRow label="Size (BTC)" value={pos.size} />
                    <DetailRow
                      label="Margin (USDC)"
                      value={pos.marginUsed}
                    />
                    <DetailRow
                      label="Margin Ratio"
                      value={`${(
                        (parseFloat(pos.marginUsed) /
                          (parseFloat(pos.size) *
                            parseFloat(pos.entryPx))) *
                        100
                      ).toFixed(2)}%`}
                    />
                  </View>
                  <View style={styles.detailsColumn}>
                    <DetailRow label="Entry Price" value={pos.entryPx} />
                    <DetailRow label="Mark Price" value={markPx} />
                    <DetailRow
                      label="Liq. Price"
                      value={
                        pos.liquidationPx !== null 
                          ? parseFloat(pos.liquidationPx).toPrecision(5) 
                          : '-' 
                      } 
                    />
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <Text style={styles.leverageLabel}>
                    Leverage {pos.leverage.value}x
                  </Text>
                  <TouchableOpacity style={styles.tpslButton} onPress={() => handlePresentModal(pos.coin, pos.size, pos.entryPx, pos.markPx, pos.leverage)}>
                    <Text style={styles.tpslText}>TP/SL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeButton} onPress={() => closePosition(pos.coin, pos.size ,pos.markPx)}>
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
      </ScrollView>
    </View>
  ), [positions, hideOtherSymbols, symbol, closeallOrder]);

  const DetailRow = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  const renderScene = SceneMap({
    orders: renderOrders,
    positions: renderPositions,
  });

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get("window").width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={styles.tabIndicator}
            style={styles.tabBar}
            labelStyle={styles.tabLabel}
          />
        )}
        style={styles.tabView}
      />
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
         
            <View style={styles.modalHeader}>
              <Text style={styles.bottomSheetTitle}>Set TP/SL</Text>
             
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.symbolContainer}>
                <Text style={styles.labelText}>Symbol</Text>
                <View style={styles.symbolValueContainer}>
                  <Text style={styles.valueText}>{modalData.coin}</Text>
                  <Text style={styles.perpText}>Perp</Text>
                  <Text style={[styles.leverageText, { color: Number(modalData.size) > 0 ? '#00C087' : '#FF3B30' }]}>
                    {Number(modalData.size) > 0 ? 'Long' : 'Short'} {modalData.leverage.value}x
                  </Text>
                </View>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.labelText}>Entry Price (USDC)</Text>
                <Text style={styles.valueText}>{modalData.entryPx}</Text>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.labelText}>Mark Price (USDC)</Text>
                <Text style={styles.valueText}>{modalData.markPx}</Text>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Take Profit</Text>
              </View>
              
              {existingTpOrder ? (
                <View style={styles.existingOrderContainer}>
                  <View style={styles.existingOrderRow}>
                    <Text style={styles.existingOrderValue}>{existingTpOrder.triggerCondition}</Text>
                    <TouchableOpacity 
                      style={styles.cancelOrderButton}
                      onPress={() => cancelOrder(existingTpOrder.oid, existingTpOrder.coin)}
                    >
                      <Text style={styles.cancelOrderText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.expectedProfitRow}>
                    <Text style={styles.expectedProfitText}>
                    Expected profit:{Number(calculatePnLFromPrice(existingTpOrder.triggerPx)).toFixed(2)} USDC ({((Number(existingTpOrder.triggerPx) - Number(modalData.entryPx)) / Number(modalData.entryPx) * 100).toFixed(2)}%)
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <View style={styles.inputRow}>
                    <View style={styles.triggerInput}>
                      <TextInput 
                        style={styles.input}
                        placeholder="Trigger Price"
                        placeholderTextColor="#8F98A3"
                        keyboardType="numeric"
                        value={tpTriggerPrice}
                        onChangeText={handleTpTriggerPriceChange}
                      />
                    </View>
                    <View style={styles.pnlInputContainer}>
                      <View style={styles.pnlInput}>
                        <TextInput 
                          style={styles.input}
                          placeholder="PnL"
                          placeholderTextColor="#8F98A3"
                          keyboardType="numeric"
                          value={tpPnL}
                          onChangeText={handleTpPnLChange}
                        />
                      </View>
                      <TouchableOpacity style={styles.USDCSelector}>
                        <Text style={styles.USDCText}>USDC</Text>
                        <Text style={styles.dropdownIcon}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Stop Loss</Text>
              </View>
              
              {existingSlOrder ? (
                <View style={styles.existingOrderContainer}>
                  <View style={styles.existingOrderRow}>
                    <Text style={styles.existingOrderValue}>{existingSlOrder.triggerCondition}</Text>
                    <TouchableOpacity 
                      style={styles.cancelOrderButton}
                      onPress={() => cancelOrder(existingSlOrder.oid, existingSlOrder.coin)}
                    >
                      <Text style={styles.cancelOrderText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.expectedProfitRow}>
                    <Text style={styles.expectedProfitText}>
                    Expected profit:{Number(calculatePnLFromPrice(existingSlOrder.triggerPx)).toFixed(2)} USDC ({((Number(existingSlOrder.triggerPx) - Number(modalData.entryPx)) / Number(modalData.entryPx) * 100).toFixed(2)}%)
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <View style={styles.inputRow}>
                    <View style={styles.triggerInput}>
                      <TextInput 
                        style={styles.input}
                        placeholder="Trigger Price"
                        placeholderTextColor="#8F98A3"
                        keyboardType="numeric"
                        value={slTriggerPrice}
                        onChangeText={handleSlTriggerPriceChange}
                      />
                    </View>
                    <View style={styles.pnlInputContainer}>
                      <View style={styles.pnlInput}>
                        <TextInput 
                          style={styles.input}
                          placeholder="PnL"
                          placeholderTextColor="#8F98A3"
                          keyboardType="numeric"
                          value={slPnL}
                          onChangeText={handleSlPnLChange}
                        />
                      </View>
                      <TouchableOpacity style={styles.USDCSelector}>
                        <Text style={styles.USDCText}>USDC</Text>
                        <Text style={styles.dropdownIcon}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

           

            <TouchableOpacity style={styles.confirmButton}onPress={() => handletpsl(modalData.coin, modalData.size, modalData.entryPx, modalData.markPx)}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabView: { flex: 1 },
  tabBar: { backgroundColor: "#13141B" },
  tabIndicator: { backgroundColor: "#00C087" },
  tabLabel: { color: "#8E8E93", fontWeight: "500" },
  ordersContainer: { flex: 1, backgroundColor: "#13141B" },
  cancelAllButton: { justifyContent: "center" },
  cancelAllText: { color: "#8E8E93", fontSize: 14 },
  orderItem: {
    backgroundColor: "#13141B",
    margin: 8,
    borderRadius: 4,
    padding: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderCoin: { color: "#8E8E93", fontWeight: "500" },
  orderType: { color: "#8E8E93", fontSize: 12 },
  orderDate: { color: "#8E8E93", fontSize: 12 },
  cancelButton: { backgroundColor: "#1E1F26", padding: 4, borderRadius: 3 },
  cancelButtonText: { color: "#8E8E93", fontSize: 12 },
  progressBar: {
    height: 3,
    backgroundColor: "#1E1F26",
    borderRadius: 2,
    marginVertical: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00C087",
    width: "0%",
    borderRadius: 2,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  filledText: { color: "#8E8E93", fontSize: 12 },
  priceText: { color: "#8E8E93", fontSize: 12 },
  orderActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  chaseButton: {
    backgroundColor: "#1E1F26",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 3,
  },
  chaseButtonText: { color: "#8E8E93", fontSize: 12 },
  cancelButtonSmall: {
    backgroundColor: "#1E1F26",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 3,
  },
  positionsContainer: { flex: 1, backgroundColor: "#13141B" },
  positionItem: {
    backgroundColor: "#13141B",
    margin: 8,
    borderRadius: 4,
    padding: 12,
  },
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  coinText: { color: "#FFFFFF", fontWeight: "500" },
  leverageText: {  fontSize: 12 },
  pnlContainer: { alignItems: "flex-end" },
  pnlText: { fontSize: 14, fontWeight: "500", color: "#FF3B30" },
  pnlPercent: { fontSize: 12, color: "#FF3B30" },
  negative: { color: "#FF3B30" },
  positive: { color: "#00C087" },
  detailsRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  detailsColumn: { flex: 1, gap: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { color: "#8E8E93", fontSize: 12 },
  detailValue: { color: "#FFFFFF", fontSize: 12 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  leverageLabel: { color: "#8E8E93", fontSize: 12 },
  tpslButton: { backgroundColor: "#1E1F26", padding: 6, borderRadius: 3 },
  tpslText: { color: "#8E8E93", fontSize: 12 },
  closeButton: { backgroundColor: "#1E1F26", padding: 6, borderRadius: 3 },
  closeButtonText: { color: "#8E8E93", fontSize: 12 },
  statusText: { color: "#8E8E93", textAlign: "center", margin: 8 },
  ordersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#13141B",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: "#1E1F26",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1F26",
  },
  checkboxInner: {
    width: 8,
    height: 8,
    backgroundColor: "#00C087",
    borderRadius: 2,
  },
  filterText: {
    color: "#8E8E93",
    fontSize: 14,
  },
  positionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#13141B",
  },
  closeAllButton: { 
    justifyContent: "center",
    backgroundColor: "#1E1F26",
    padding: 6,
    borderRadius: 3,
  },
  closeAllText: { 
    color: "#8E8E93", 
    fontSize: 14 
  },
  bottomSheetBackground: {
    backgroundColor: '#1A1C24',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoContainer: {
    marginBottom: 16,
  },
  symbolContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  symbolValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  perpText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  markButton: {
    backgroundColor: '#1E1F26',
    padding: 4,
    borderRadius: 3,
  },
  markButtonText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  triggerInput: {
    flex: 1,
    backgroundColor: '#2A2E37',
    borderRadius: 4,
    padding: 12,
    height: 40,
  },
  pnlInputContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  pnlInput: {
    flex: 1,
    backgroundColor: '#2A2E37',
    borderRadius: 4,
    padding: 12,
    height: 40,
  },
  USDCSelector: {
    backgroundColor: '#2A2E37',
    borderRadius: 4,
    paddingHorizontal: 8,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
    height: '100%',
  },
  USDCText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  dropdownIcon: {
    color: '#8F98A3',
    fontSize: 12,
  },
  descriptionText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
  },
  helpContainer: {
    backgroundColor: '#1E1F26',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  confirmButton: {
    backgroundColor: '#FFB800',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  existingOrderContainer: {
    backgroundColor: '#1E2328',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  existingOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  existingOrderValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  expectedProfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expectedProfitText: {
    color: '#808A9D',
    fontSize: 13,
  },
  cancelOrderButton: {
    backgroundColor: 'transparent',
    padding: 4,
    marginLeft: 8,
  },
  cancelOrderText: {
    color: '#808A9D',
    fontSize: 14,
  },
});

export default OpenOrdersPositionsTabs;
