import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import WebSocketManager from "@/api/WebSocketManager";
import { ethers } from 'ethers';
import axios from 'axios';
import { Alert } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import { Toast } from '@/components/Toast';

const TransferPage = () => {
  const [amount, setAmount] = useState('');
  const [fromWallet, setFromWallet] = useState('Spot Wallet');
  const [toWallet, setToWallet] = useState('USD-M Futures');
  const [spotBalance, setSpotBalance] = useState('0');
  const [perpBalance, setPerpBalance] = useState('0');
  const [signStatus, setSignStatus] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'loading' | 'success'>('loading');
  const account = useActiveAccount();

  const hideToast = () => {
    setToastVisible(false);
  };

  const showToast = (message: string, type: 'loading' | 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    const wsManager = WebSocketManager.getInstance();
    const listener = (data: any) => {
      try {
        // Get Spot USDC balance
        const spotBalances = data?.spotState?.balances || [];
        const usdcBalance = spotBalances.find(
          (balance: any) => balance.coin === 'USDC'
        );
        if (usdcBalance) {
          setSpotBalance(usdcBalance.total);
        }

        // Get Perp withdrawable balance
        const withdrawable = data?.clearinghouseState?.withdrawable;
        if (withdrawable) {
          setPerpBalance(withdrawable);
        }
      } catch (err) {
        console.error('Error processing WebSocket data:', err);
      }
    };

    wsManager.addListener('webData2', listener);
    return () => {
      wsManager.removeListener('webData2', listener);
    };
  }, []);

  const handleConfirmTransfer = () => {
    // Implement transfer logic here
    console.log('Transfer:', { amount, fromWallet, toWallet });
  };

  const handleExchange = () => {
    // Swap the wallet values
    const temp = fromWallet;
    setFromWallet(toWallet);
    setToWallet(temp);
  };

  const getAvailableBalance = () => {
    if (fromWallet === 'Spot Wallet') {
      return `Available ${parseFloat(spotBalance).toFixed(8)} USDC`;
    } else {
      return `Available ${parseFloat(perpBalance).toFixed(8)} USDC`;
    }
  };

  const generateNonce = () => Date.now();

  const onClicktransfer = async () => {
    try {
      if (!account) {
        Alert.alert("Error", "Wallet is still loading or not available.");
        return;
      }

      // Show loading toast before starting transfer
      setToastMessage('Processing transfer...');
      setToastType('loading');
      setToastVisible(true);

      const currentTimestamp = generateNonce();
      const destination = fromWallet === 'Spot Wallet' ? true : false;

      const message = {
        type: "usdClassTransfer",
        amount: amount,
        toPerp: destination,
        nonce: currentTimestamp,
        signatureChainId: "0x66eee",
        hyperliquidChain: "Testnet"
      };

      const domain = {
        name: "HyperliquidSignTransaction",
        version: "1",
        chainId: 421614,
        verifyingContract: "0x0000000000000000000000000000000000000000"
      };

      const types = {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" }
        ],
        "HyperliquidTransaction:UsdClassTransfer": [
          { name: "hyperliquidChain", type: "string" },
          { name: "amount", type: "string" },
          { name: "toPerp", type: "bool" },
          { name: "nonce", type: "uint64" }
        ]
      };

      const signature = await account.signTypedData({
        domain,
        message,
        primaryType: "HyperliquidTransaction:UsdClassTransfer",
        types,
      });

      const { v, r, s } = ethers.Signature.from(signature);

      const apiPayload = {
        action: message,
        nonce: currentTimestamp,
        signature: { r, s, v },
      };

      const apiUrl = "https://api.hyperliquid-testnet.xyz/exchange";
      const response = await axios.post(apiUrl, apiPayload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data?.status === 'ok') {
        // Show success toast
        setToastMessage(`Successfully transferred ${amount} USDC ${destination ? 'to Futures' : 'to Spot'} wallet`);
        setToastType('success');
        setToastVisible(true);
      } else {
        throw new Error('Transfer failed: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      console.error("Transfer Error:", error);
      setToastVisible(false); // Hide toast on error
      Alert.alert("Error", error.message || "Failed to transfer. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* From Wallet Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>From</Text>
          <TouchableOpacity style={styles.selector}>
            <Text style={styles.selectorText}>{fromWallet}</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Exchange Icon */}
        <TouchableOpacity style={styles.exchangeButton} onPress={handleExchange}>
          <Text style={styles.exchangeIcon}>⇅</Text>
        </TouchableOpacity>

        {/* To Wallet Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>To</Text>
          <TouchableOpacity style={styles.selector}>
            <Text style={styles.selectorText}>{toWallet}</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Coin Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Coin</Text>
          <TouchableOpacity style={styles.selector}>
            <View style={styles.coinInfo}>
              <View style={styles.coinIcon} />
              <Text style={styles.selectorText}>USDC</Text>
              <Text style={styles.coinSubtext}>USD Coin</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              editable={!toastVisible || toastType !== 'loading'}
            />
            <Text style={styles.currencyLabel}>USDC</Text>
            <TouchableOpacity 
              style={styles.maxButton}
              onPress={() => {
                const balance = fromWallet === 'Spot Wallet' ? spotBalance : perpBalance;
                setAmount(balance);
              }}
              disabled={toastVisible && toastType === 'loading'}
            >
              <Text style={[styles.maxButtonText, (toastVisible && toastType === 'loading') && { opacity: 0.5 }]}>Max</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.availableBalance}>{getAvailableBalance()}</Text>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !amount && styles.confirmButtonDisabled,
          ]}
          onPress={onClicktransfer}
          disabled={!amount || parseFloat(amount) <= 0 || (toastVisible && toastType === 'loading')}
        >
          <Text style={styles.confirmButtonText}>Confirm Transfer</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.toastContainer}>
        {toastVisible && (
          <Toast 
            visible={toastVisible}
            message={toastMessage}
            type={toastType}
            onHide={hideToast}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2F',
  },
  content: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2E2E3A',
    borderRadius: 8,
  },
  selectorText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#888',
  },
  exchangeButton: {
    alignSelf: 'center',
    padding: 12,
    marginVertical: -12,
    zIndex: 1,
    backgroundColor: '#2E2E3A',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#1E1E2F',
  },
  exchangeIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    marginRight: 8,
  },
  coinSubtext: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E2E3A',
    borderRadius: 8,
    padding: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
  },
  currencyLabel: {
    fontSize: 16,
    color: '#888',
    marginHorizontal: 8,
  },
  maxButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  maxButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  availableBalance: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButtonDisabled: {
    backgroundColor: '#333',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default TransferPage;
