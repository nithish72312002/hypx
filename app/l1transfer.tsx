import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useActiveAccount } from 'thirdweb/react';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { ethers } from 'ethers';
import axios from 'axios';
import {Toast} from '@/components/Toast';
import SafeViewAndroid from "@/components/SafeViewAndroid/SafeViewAndroid";

interface Balance {
  coin: string;
  total: string;
  hold: string;
  withdrawable: string;
}

type AccountType = 'spot' | 'perp';

export default function L1TransferPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const { sdk } = useHyperliquid();
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [showTokenList, setShowTokenList] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('spot');
  const [perpBalance, setPerpBalance] = useState('0');
  const [showAccountTypes, setShowAccountTypes] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success' | 'loading'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: 'error' | 'success' | 'loading') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const fetchWithdrawableBalance = async () => {
    if (!sdk || !account?.address) return;

    try {
      const response = await sdk.info.perpetuals.getClearinghouseState(account.address);
      setPerpBalance(response?.withdrawable || '0');
    } catch (error) {
      console.error('Error getting clearinghouse state:', error);
      setPerpBalance('0');
    }
  };

  const getSpotClearinghouseState = async () => {
    if (!sdk || !account?.address) return;

    try {
      const result = await sdk.info.spot.getSpotClearinghouseState(account.address);
      console.log('Spot clearinghouse state:', result);
      
      if (result?.balances?.length > 0) {
        const processedBalances = result.balances.map(balance => ({
          ...balance,
          coin: balance.coin.replace('-SPOT', ''),
          withdrawable: (parseFloat(balance.total) - parseFloat(balance.hold)).toString()
        }));
        
        setBalances(processedBalances);
        
        // Set default selected token
        if (!selectedToken && processedBalances.length > 0) {
          setSelectedToken(processedBalances[0].coin);
        }
      }
    } catch (error) {
      console.error('Error getting spot metadata:', error);
      setBalances([]);
    }
  };

  useEffect(() => {
    if (accountType === 'spot') {
      getSpotClearinghouseState();
    } else {
      fetchWithdrawableBalance();
    }
  }, [sdk, account, accountType]);


  const getTokenIdFromSpotMeta = async (tokenName: string) => {
    try {
      const spotMeta = await sdk.info.spot.getSpotMeta();
      console.log('Looking for token:', `${tokenName}-SPOT`);
      const token = spotMeta.tokens.find(t => t.name === `${tokenName}-SPOT`);
      if (!token) {
        throw new Error(`Token ${tokenName}-SPOT not found in spot metadata. Available tokens: ${spotMeta.tokens.map(t => t.name).join(', ')}`);
      }
      return token.tokenId;
    } catch (error) {
      console.error('Error getting token ID:', error);
      throw error;
    }
  };

  const spotsend = async () => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      console.log('Starting spot withdrawal with params:', {
        address: account?.address,
        amount,
        selectedToken,
        balances
      });

      if (!account?.address) {
        showToast('Please connect your wallet first', 'error');
        return;
      }

      if (!amount || amount === '0' || amount === '') {
        showToast('Please enter an amount', 'error');
        return;
      }

      if (!selectedToken) {
        showToast('Please select a token', 'error');
        return;
      }

      if (!destinationAddress || destinationAddress === '') {
        showToast('Please enter a destination address', 'error');
        return;
      }

      showToast('Transaction submitted', 'loading');

      const currentTimestamp = Date.now();

      try {
        console.log('Getting token ID from spot metadata...');
        const tokenId = await getTokenIdFromSpotMeta(selectedToken);
        console.log('Retrieved token ID:', tokenId);

        const domain = {
          name: "HyperliquidSignTransaction",
          version: "1",
          chainId: 421614,
          verifyingContract: "0x0000000000000000000000000000000000000000"
        };
        console.log('Domain:', domain);

        const message = {
          destination: destinationAddress,
          token: `${selectedToken}:${tokenId}`,
          amount: amount,
          time: currentTimestamp,
          type: "spotSend",
          signatureChainId: "0x66eee",
          hyperliquidChain: "Testnet"
        };
        console.log('Constructed message:', message);

        const types = {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" }
          ],
          "HyperliquidTransaction:SpotSend": [
            { name: "hyperliquidChain", type: "string" },
            { name: "destination", type: "string" },
            { name: "token", type: "string" },
            { name: "amount", type: "string" },
            { name: "time", type: "uint64" }
          ]
        };
        console.log('Types:', types);

        console.log('Requesting signature with:', {
          domain,
          message,
          primaryType: "HyperliquidTransaction:SpotSend",
          types
        });
        const signature = await account.signTypedData({
          domain,
          message,
          primaryType: "HyperliquidTransaction:SpotSend",
          types,
        });
        console.log('Received signature:', signature);

        const { v, r, s } = ethers.Signature.from(signature);
        console.log('Parsed signature components:', { v, r, s });

        const apiPayload = {
          action: message,
          nonce: currentTimestamp,
          signature: { r, s, v },
        };
        console.log('API payload:', apiPayload);

        const apiUrl = "https://api.hyperliquid-testnet.xyz/exchange";
        console.log('Sending request to:', apiUrl);
        const response = await axios.post(apiUrl, apiPayload, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log("Withdrawal Response:", response.data);

        if (response.data?.status === 'ok') {
          showToast('Transaction completed', 'success');
          setTimeout(() => {
            fetchWithdrawableBalance();
          },5000);
        } else {
          throw new Error('Withdrawal failed: ' + JSON.stringify(response.data));
        }
      } catch (error) {
        console.error("Withdrawal Error:", error);
        showToast('Failed to process withdrawal', 'error');
      }
    } catch (error) {
      console.error("Withdrawal Error:", error);
      showToast('Failed to process withdrawal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };  

  const perpsend = async () => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      console.log('Starting perp withdrawal with params:', {
        address: account?.address,
        amount,
      });

      if (!account?.address) {
        showToast('Please connect your wallet first', 'error');
        return;
      }

      if (!amount || amount === '0' || amount === '') {
        showToast('Please enter an amount', 'error');
        return;
      }

      if (!destinationAddress || destinationAddress === '') {
        showToast('Please enter a destination address', 'error');
        return;
      }

      showToast('Transaction submitted', 'loading');

      const currentTimestamp = Date.now();

      try {
        const domain = {
          name: "HyperliquidSignTransaction",
          version: "1",
          chainId: 421614,
          verifyingContract: "0x0000000000000000000000000000000000000000"
        };

        const message = {
          destination: destinationAddress,
          amount: amount,
          time: currentTimestamp,
          type: "usdSend",
          signatureChainId: "0x66eee",
          hyperliquidChain: "Testnet"
        };

        const types = {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" }
          ],
          "HyperliquidTransaction:UsdSend": [
            { name: "hyperliquidChain", type: "string" },
            { name: "destination", type: "string" },
            { name: "amount", type: "string" },
            { name: "time", type: "uint64" }
          ]
        };

        console.log('Requesting signature with:', {
          domain,
          message,
          primaryType: "HyperliquidTransaction:UsdSend",
          types
        });

        const signature = await account.signTypedData({
          domain,
          message,
          primaryType: "HyperliquidTransaction:UsdSend",
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

        console.log("Withdrawal Response:", response.data);

        if (response.data?.status === 'ok') {
          showToast('Transaction completed', 'success');
          setTimeout(() => {
            fetchWithdrawableBalance();
          }, 5000);
        } else {
          throw new Error('Withdrawal failed: ' + JSON.stringify(response.data));
        }
      } catch (error) {
        console.error("Withdrawal Error:", error);
        showToast('Failed to process withdrawal', 'error');
      }
    } catch (error) {
      console.error("Withdrawal Error:", error);
      showToast('Failed to process withdrawal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = () => {
    if (accountType === 'spot') {
      spotsend();
    } else {
      perpsend();
    }
  };

  const handleMaxClick = () => {
    console.log('Max clicked', { accountType, selectedBalance, perpBalance });
    if (accountType === 'spot' && selectedBalance) {
      const withdrawable = selectedBalance.withdrawable;
      console.log('Setting max spot amount:', withdrawable);
      setAmount(withdrawable);
    } else if (accountType === 'perp') {
      console.log('Setting max perp amount:', perpBalance);
      // Format the number to remove scientific notation and ensure it's a string
      const formattedAmount = Number(perpBalance).toLocaleString('en-US', {
        useGrouping: false,
        maximumFractionDigits: 20
      });
      console.log('Formatted perp amount:', formattedAmount);
      setAmount(formattedAmount);
    }
  };

  const selectedBalance = balances.find(b => b.coin === selectedToken);
  const displayBalance = accountType === 'spot' 
    ? (selectedBalance ? `${selectedBalance.withdrawable} ${selectedToken}` : '0')
    : `${perpBalance} USDC`;

  const renderTokenItem = ({ item }: { item: Balance }) => (
    <TouchableOpacity 
      style={styles.tokenItem} 
      onPress={() => {
        setSelectedToken(item.coin);
        setShowTokenList(false);
      }}
    >
      <View style={styles.tokenItemLeft}>
        <Text style={styles.tokenItemText}>{item.coin}</Text>
      </View>
      <Text style={styles.tokenItemBalance}>{item.withdrawable}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[SafeViewAndroid.AndroidSafeArea, styles.container]} >
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Send USDT</Text>
        <TouchableOpacity 
          onPress={() => router.push({
            pathname: '/history',
            params: { initialTab: 'transfers' }
          })}
          style={styles.historyButton}
        >
          <Ionicons name="time-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Toast 
        visible={toastVisible} 
        message={toastMessage} 
        type={toastType}
        onHide={hideToast}
      />
      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>From</Text>
          <TouchableOpacity 
            style={styles.accountSelector}
            onPress={() => setShowAccountTypes(!showAccountTypes)}
          >
            <View style={styles.accountSelectorContent}>
              <Text style={styles.accountSelectorText}>
                {accountType === 'spot' ? 'Spot Account' : 'Perp Account'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#808A9D" />
            </View>
          </TouchableOpacity>
          {showAccountTypes && (
            <View style={styles.accountTypeList}>
              <TouchableOpacity 
                style={styles.accountTypeItem}
                onPress={() => {
                  setAccountType('spot');
                  setShowAccountTypes(false);
                }}
              >
                <Text style={[
                  styles.accountTypeText,
                  accountType === 'spot' && styles.accountTypeTextActive
                ]}>Spot Account</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.accountTypeItem}
                onPress={() => {
                  setAccountType('perp');
                  setShowAccountTypes(false);
                }}
              >
                <Text style={[
                  styles.accountTypeText,
                  accountType === 'perp' && styles.accountTypeTextActive
                ]}>Perp Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>To</Text>
          <View style={styles.addressInputContainer}>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter an address or scan"
              placeholderTextColor="#666"
              value={destinationAddress}
              onChangeText={setDestinationAddress}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Ionicons name="scan-outline" size={20} color="#808A9D" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.amountHeader}>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.balanceText}>
              Balance: {displayBalance}
            </Text>
          </View>
          <View style={styles.amountInputContainer}>
            <View style={styles.amountInputWrapper}>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor="#666"
                value={amount}
                onChangeText={setAmount}
              />
              <TouchableOpacity 
                style={styles.maxButton}
                onPress={handleMaxClick}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>
            {accountType === 'spot' ? (
              <TouchableOpacity 
                style={styles.tokenSelector}
                onPress={() => setShowTokenList(!showTokenList)}
              >
                <Text style={styles.tokenText}>{selectedToken || 'Select'}</Text>
                <Ionicons name="chevron-down" size={16} color="#808A9D" />
              </TouchableOpacity>
            ) : (
              <View style={styles.tokenSelector}>
                <Text style={styles.tokenText}>USDC</Text>
              </View>
            )}
          </View>
        </View>

        {showTokenList && accountType === 'spot' && (
          <View style={styles.tokenList}>
            <FlatList
              data={balances}
              renderItem={renderTokenItem}
              keyExtractor={item => item.coin}
            />
          </View>
        )}

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contract Address</Text>
            <Text style={styles.detailValue}>0x55d3...7995</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Chain</Text>
            <Text style={styles.detailValue}>BNB Chain</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>1.00</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.sendButton, isSubmitting && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isSubmitting}
        >
          <Text style={styles.sendButtonText}>
            {isSubmitting ? 'Sending...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1C24',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  backButton: {
    width: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  historyButton: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  accountSelector: {
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    padding: 12,
  },
  accountSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountSelectorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  accountTypeList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1,
  },
  accountTypeItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1C24',
  },
  accountTypeText: {
    color: '#808A9D',
    fontSize: 16,
  },
  accountTypeTextActive: {
    color: '#FFFFFF',
  },
  label: {
    color: '#FFFFFF',
    marginBottom: 8,
    fontSize: 14,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    padding: 12,
  },
  addressInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    marginRight: 4,
  },
  scanButton: {
    padding: 4,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceText: {
    color: '#808A9D',
    fontSize: 14,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    padding: 12,
  },
  amountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  maxButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  maxButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D3A',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  tokenText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginHorizontal: 4,
  },
  tokenList: {
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    marginTop: -16,
    marginBottom: 24,
    maxHeight: 200,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1C24',
  },
  tokenItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  tokenItemBalance: {
    color: '#808A9D',
    fontSize: 14,
  },
  detailsContainer: {
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#808A9D',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2D3A',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#3B82F680',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
