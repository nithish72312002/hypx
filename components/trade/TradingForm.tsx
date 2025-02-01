import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useHyperliquid } from "@/context/HyperliquidContext";
import WebSocketManager from "@/api/WebSocketManager";
import { useEffect, useState } from "react";
import Slider from "@react-native-community/slider";
interface TradingFormProps {
  symbol?: string;
}

const TradingForm: React.FC<TradingFormProps> = ({ symbol = "BTC" }) => {
  const { sdk } = useHyperliquid();
  const [size, setSize] = useState('0.01');
  const [price, setPrice] = useState('3400');
  const [isBuy, setIsBuy] = useState(true);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [leverage, setLeverage] = useState(20);
  const [leverageMode, setLeverageMode] = useState<"cross" | "isolated">("cross");
  const [maxLeverage, setMaxLeverage] = useState(50);
  const fullSymbol = `${symbol}-PERP`;

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();
    const handleWebData = (data: any) => {
      if (data.clearinghouseState) {
        const position = data.clearinghouseState.assetPositions.find(
          (p: any) => p.position.coin === fullSymbol
        );
        if (position) {
          setLeverage(position.position.leverage.value);
          setLeverageMode(position.position.leverage.type);
          setMaxLeverage(position.position.maxLeverage);
        }

        // Get max leverage from universe meta
        const assetMeta = data.clearinghouseState.meta?.universe.find(
          (a: any) => a.name === fullSymbol.split('-')[0]
        );
        if (assetMeta) {
          setMaxLeverage(assetMeta.maxLeverage);
        }
      }
    };

    wsManager.addListener("webData2", handleWebData);
    return () => wsManager.removeListener("webData2", handleWebData);
  }, [fullSymbol]);

  const updateLeverage = async (newLeverage: number) => {
    console.log('[Leverage] Attempting to update leverage...', {
      symbol: fullSymbol,
      leverageMode,
      newLeverage,
      maxLeverage
    });

    if (!sdk) {
      const errorMsg = "SDK not initialized yet.";
      console.error('[Leverage] Error:', errorMsg);
      setTradeStatus(errorMsg);
      return;
    }

    try {
      console.log('[Leverage] Calling SDK updateLeverage...');
      const result = await sdk.exchange.updateLeverage(fullSymbol, leverageMode, newLeverage);

      console.log('[Leverage] Update successful:', {
        response: result,
        finalLeverage: newLeverage,
        mode: leverageMode
      });

      setLeverage(newLeverage);
      setTradeStatus(`Leverage updated to ${newLeverage}x (${leverageMode})`);

    } catch (error: any) {
      const errorMsg = `Failed to update leverage: ${error.message ?? "Unknown error"}`;
      console.error('[Leverage] Error:', {
        error: error.message,
        stack: error.stack,
        attemptedLeverage: newLeverage,
        mode: leverageMode
      });

      setTradeStatus(errorMsg);
      // Revert to previous leverage value
      setLeverage(leverage);
    }
  };

  const handleLeverageChange = async (value: number) => {
    const roundedValue = Math.round(value);
    setLeverage(roundedValue);
    await updateLeverage(roundedValue);
  };

  const handleModeChange = async (mode: "cross" | "isolated") => {
    setLeverageMode(mode);
    await updateLeverage(leverage);
  };

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
      <Text style={styles.title}>Place Order</Text>

      <Text style={styles.label}>Symbol</Text>
      <Text style={styles.symbolValue}>{fullSymbol}</Text>

      {/* Leverage Mode Picker */}
      <Text style={styles.label}>Leverage Mode</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={leverageMode}
          onValueChange={(value) => handleModeChange(value)}
          style={styles.picker}
        >
          <Picker.Item label="Cross" value="cross" />
          <Picker.Item label="Isolated" value="isolated" />
        </Picker>
      </View>

      {/* Leverage Slider */}
      <Text style={styles.label}>Leverage ({leverage}x)</Text>
      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={maxLeverage}
        step={1}
        value={leverage}
        onSlidingComplete={handleLeverageChange}
        minimumTrackTintColor="#1E90FF"
        maximumTrackTintColor="#d3d3d3"
      />
      <Text style={styles.leverageInfo}>Max Leverage: {maxLeverage}x</Text>

      {/* Size Input */}
      <Text style={styles.label}>Size</Text>
      <TextInput
        keyboardType="numeric"
        value={size}
        onChangeText={handleSizeChange}
        style={[styles.input]}
      />

      {/* Price Input */}
      <Text style={styles.label}>Price</Text>
      <TextInput
        keyboardType="numeric"
        value={price}
        onChangeText={handlePriceChange}
        style={[styles.input]}
      />

      {/* Buy/Sell Picker */}
      <Text style={styles.label}>Buy/Sell</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={isBuy ? "buy" : "sell"}
          onValueChange={(value) => setIsBuy(value === "buy")}
          style={styles.picker}
        >
          <Picker.Item label="Buy" value="buy" />
          <Picker.Item label="Sell" value="sell" />
        </Picker>
      </View>

      <TouchableOpacity style={styles.button} onPress={placeOrder}>
        <Text style={styles.buttonText}>Submit Order</Text>
      </TouchableOpacity>

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

export default TradingForm;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    width: "100%",
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  picker: {
    height: 40,
  },
  button: {
    backgroundColor: "#1E90FF",
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 16,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  tradeStatus: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  successText: {
    color: "green",
  },
  errorText: {
    color: "red",
  },
  symbolValue: { 
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
    backgroundColor: "#f5f5f5",
  },
});
