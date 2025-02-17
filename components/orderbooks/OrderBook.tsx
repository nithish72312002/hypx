import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Dimensions, TouchableOpacity } from "react-native";
import WebSocketManager from "@/api/WebSocketManager";
import { useTradingStore } from "@/store/useTradingStore";

interface OrderBookProps {
  symbol: string;
  onPriceSelect?: (price: number) => void;
}

interface OrderLevel {
  px: number;
  sz: number;
  cumulative: number;
}

const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');

const OrderBook: React.FC<OrderBookProps> = ({
  symbol,
}) => {
  const [fullBids, setFullBids] = useState<OrderLevel[]>([]);
  const [fullAsks, setFullAsks] = useState<OrderLevel[]>([]);
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { orderType , setPrice } = useTradingStore();
  const maxLevels = orderType === 'Limit' ? 8 : 6;

  const orderBookListener = (data: any) => {
    if (!data?.levels || data.coin !== symbol) return;

    const [bidsData, asksData] = data.levels;
    if (!Array.isArray(bidsData) || !Array.isArray(asksData)) return;

    let cumulativeBidSize = 0;
    const processedBids = bidsData.map((level: any) => {
      cumulativeBidSize += parseFloat(level.sz);
      return {
        px: parseFloat(level.px),
        sz: parseFloat(level.sz),
        cumulative: cumulativeBidSize
      };
    });

    let cumulativeAskSize = 0;
    const processedAsks = asksData.map((level: any) => {
      cumulativeAskSize += parseFloat(level.sz);
      return {
        px: parseFloat(level.px),
        sz: parseFloat(level.sz),
        cumulative: cumulativeAskSize
      };
    });

    setFullBids(processedBids);
    setFullAsks(processedAsks);
    setIsLoading(false);
  };

  const allMidsListener = (data: any) => {
    if (data?.mids?.[symbol]) {
      setMidPrice(parseFloat(data.mids[symbol]));
    } else {
      setMidPrice(NaN);
    }
  };

  useEffect(() => {
    if (fullBids.length === 0 || fullAsks.length === 0) return;

    const processedBids = fullBids.slice(0, maxLevels);
    const processedAsks = fullAsks.slice(0, maxLevels);

    const maxCumulative = Math.max(
      processedBids[processedBids.length - 1]?.cumulative || 0,
      processedAsks[processedAsks.length - 1]?.cumulative || 0
    );

    setBids(
      processedBids.map(level => ({
        ...level,
        barWidth: `${(level.cumulative / maxCumulative) * 100}%`
      }))
    );

    setAsks(
      processedAsks.map(level => ({
        ...level,
        barWidth: `${(level.cumulative / maxCumulative) * 100}%`
      }))
    );
  }, [fullBids, fullAsks, maxLevels]);

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();

    wsManager.subscribe(
      "l2Book",
      { type: "l2Book", coin: symbol, nSigFigs: null },
      orderBookListener
    );
    wsManager.subscribe("allMids", { type: "allMids" }, allMidsListener);

    return () => {
      wsManager.unsubscribe(
        "l2Book",
        { type: "l2Book", coin: symbol, nSigFigs: null },
        orderBookListener
      );
      wsManager.unsubscribe("allMids", { type: "allMids" }, allMidsListener);
    };
  }, [symbol]);

  const renderOrder = (
    { item }: { item: any; index: number },
    isAsk: boolean
  ) => {
    if (!item || typeof item.px !== "number" || typeof item.sz !== "number") {
      return null;
    }

    return (
      <TouchableOpacity
      onPress={() => setPrice(item.px.toString())}

      >
        <View style={[styles.orderRow, { marginVertical: 2 }]}>
          <View
            style={[
              styles.bar,
              isAsk ? styles.askBar : styles.bidBar,
              { width: item.barWidth },
            ]}
          />
          <View style={styles.priceCell}>
            <Text style={[styles.priceText, isAsk ? styles.askText : styles.bidText]}>
              {item.px}
            </Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.amountText}>{item.sz}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading order book...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!bids.length && !asks.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No data available for {symbol}.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.orderBookContainer}>
        <View style={styles.headerRow}>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>Price</Text>
          </View>
          <View style={styles.headerCell}>
            <Text style={[styles.headerText, styles.amountHeaderText]}>Amount</Text>
          </View>
        </View>
        <FlatList
          data={asks}
          keyExtractor={(_, index) => `ask-${index}`}
          renderItem={(item) => renderOrder(item, true)}
          scrollEnabled={false}
          inverted
        />
        <View style={styles.midPriceContainer}>
          <Text style={styles.midPriceText}>
            {midPrice !== null ? midPrice.toPrecision(6) : "NaN"}
          </Text>
        </View>
        <FlatList
          data={bids}
          keyExtractor={(_, index) => `bid-${index}`}
          renderItem={(item) => renderOrder(item, false)}
          scrollEnabled={false}
        />
      </View>
    </View>
  );
};

const styles =  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#13141B",
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBookContainer: {
    flex: 1,
    width: "100%",
  },
  midPriceContainer: {
    backgroundColor: "#1E1F26",
    borderRadius: 4,
    paddingVertical: 8,
    marginVertical: 4,
    alignItems: "center",
    width: "100%",
  },
  midPriceText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#00C087",
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: height * 0.025,
    paddingHorizontal: 6,
    position: "relative",
  },
  bar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.1,
    borderRadius: 2,
  },
  askBar: {
    backgroundColor: "#FF3B30",
  },
  bidBar: {
    backgroundColor: "#00C087",
  },
  priceText: {
    fontSize: width * height * 0.00003,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  amountText: {
    fontSize: width * height * 0.00003,
    color: "#8E8E93",
    textAlign: "right",
  },
  loadingText: {
    fontSize: width * height * 0.00003,
    color: "#8E8E93",
    marginTop: 8,
  },
  askText: {
    color: "#FF3B30",
  },
  bidText: {
    color: "#00C087",
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    position: "relative",
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
  },
  headerText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  amountHeaderText: {
    textAlign: 'right',
  },
  priceCell: {
    flex: 1,
  },
  amountCell: {
    flex: 1,
  },
});

export default OrderBook;