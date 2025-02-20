import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { arbitrumSepolia } from 'thirdweb/chains';
import { useActiveAccount, useWalletBalance } from 'thirdweb/react';
import { client } from '@/constants/thirdweb';
import { useAppInitializer } from '@/components/AppInitializer';
import { batcheddeposit, MIN_DEPOSIT, USDC_ADDRESS } from '@/utils/deposit';
import axios from 'axios';
import { ethers, Interface } from 'ethers';
import { defineChain, getContract, readContract } from 'thirdweb';
import { Toast } from '@/components/Toast';
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface BTCAddressResponse {
  address: string;
  signatures?: { [nodeId: string]: string };
  status: string;
  error?: string;
}


const DepositPage = () => {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const isQRMode = searchParams?.tab === 'qr';
  const [amount, setAmount] = useState('');
  const account = useActiveAccount();
  const address = account?.address;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'loading' | 'success'>('loading');
  const [selectedNetwork, setSelectedNetwork] = useState<'btc' | 'hyperliquid'>('hyperliquid');
  const [btcAddress, setBtcAddress] = useState('');

  const MIN_DEPOSIT = 5;

  const showToast = (message: string, type: 'loading' | 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const isMainnet = false;
  const USDC_ADDRESS = isMainnet 
    ? "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"  // Arbitrum Mainnet USDC
    : "0x1baAbB04529D43a73232B713C0FE471f7c7334d5"; // Arbitrum Testnet USDC
  
  const BRIDGE_ADDRESS = isMainnet
    ? "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7"  // Mainnet Bridge
    : "0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89"; // Testnet Bridge

  const { data: tokenBalance, isLoading, isError, refetch: refetchBalance } = useWalletBalance({
    chain: arbitrumSepolia,
    address,
    client,
    tokenAddress: USDC_ADDRESS,
  });

  useEffect(() => {
    const fetchBtcAddress = async () => {
      if (!address) return;
      
      try {
        const response = await fetch(`https://api.hyperunit-testnet.xyz/gen/bitcoin/hyperliquid/btc/${address}`);
        const data: BTCAddressResponse = await response.json();
        console.log("BTC address response:", data);
        if (data.error) {
          console.error('Error from API:', data.error);
          return;
        }
        
        if (data.status === 'OK' && data.address) {
          setBtcAddress(data.address);
        }
      } catch (error) {
        console.error('Error fetching BTC address:', error);
      }
    };

    if (selectedNetwork === 'btc') {
      fetchBtcAddress();
    }
  }, [selectedNetwork, address]);

  const handleBatchedDeposit = async () => {
    try {
      if (!account) {
        showToast('Please connect your wallet first', 'loading');
        return;
      }

      if (!amount || parseFloat(amount) < MIN_DEPOSIT) {
        showToast(`Minimum deposit is ${MIN_DEPOSIT} USDC`, 'loading');
        return;
      }

      showToast('Transaction submitted', 'loading');

      const contract = getContract({
        client,
        chain: defineChain(421614),
        address: USDC_ADDRESS,
      });
    
      const currentNonce = await readContract({
        contract,
        method: "function nonces(address owner) view returns (uint256)",
        params: [account.address],
      });
      
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const domain = {
        name: isMainnet ? "USD Coin" : "USDC2",
        version: isMainnet ? "2" : "1",
        chainId: isMainnet ? 42161 : 421614,
        verifyingContract: USDC_ADDRESS,
      };

      const payload = {
        owner: account.address,
        spender: BRIDGE_ADDRESS,
        value: ethers.parseUnits(amount.toString(), 6), // USDC has 6 decimals
        nonce: currentNonce,
        deadline,
      };
      
      const permitTypes = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      
      const dataToSign = {
        domain,
        types: permitTypes,
        primaryType: "Permit",
        message: payload,
      } as const;

      const signature = await account.signTypedData(dataToSign);
      const { v, r, s } = ethers.Signature.from(signature);

      const deposits = [{
        user: account.address,
        usd: ethers.parseUnits(amount.toString(), 6).toString(),
        deadline: deadline.toString(),
        signature: {
          r: ethers.hexlify(r),
          s: ethers.hexlify(s),
          v: v
        }
      }];

      const iface = new Interface([
        "function batchedDepositWithPermit((address user, uint64 usd, uint64 deadline, (uint256 r, uint256 s, uint8 v) signature)[] deposits)",
      ]);

      const encodedData = iface.encodeFunctionData("batchedDepositWithPermit", [deposits]);
      console.log("Encoded data:", encodedData);

      try {
        const response = await axios.post(
          "https://api.defender.openzeppelin.com/actions/cdad05d0-37e1-4a84-82ce-8c46a9579ca4/runs/webhook/79ec3a98-4ad9-47b2-9cda-ad825e513bda/ENWSP8YhV2p9P3DknmVXqh",
          {
            data: encodedData
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        showToast('Transaction completed', 'success');
        setTimeout(() => {
          refetchBalance();
        }, 1000);
      } catch (error) {
        console.error('API Error:', error);
        showToast('Failed to submit transaction', 'loading');
      }
    } catch (error) {
      console.error("Permit Error:", error);
      showToast(error.message || "Failed to generate permit", 'loading');
    }
  };

  const handleMaxDeposit = () => {
    setAmount(tokenBalance?.displayValue || "0");
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(text)) {
      setAmount(text);
    }
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      setToastMessage('Address copied to clipboard');
      setToastType('success');
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2000);
    } catch (error) {
      console.error('Error copying address:', error);
    }
  };

  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);

  const networks = [
    { id: 'hyperliquid', label: 'Hyperliquid L1' },
    { id: 'btc', label: 'Bitcoin' }
  ];

  return (
    <ScrollView style={styles.container}>
     

      <View style={styles.content}>
        {isQRMode ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Network</Text>
              <View>
                <TouchableOpacity 
                  style={styles.selector}
                  onPress={() => setShowNetworkDropdown(!showNetworkDropdown)}
                >
                  <Text style={styles.selectorText}>
                    {networks.find(n => n.id === selectedNetwork)?.label}
                  </Text>
                  <Text style={styles.arrowIcon}>▼</Text>
                </TouchableOpacity>
                
                {showNetworkDropdown && (
                  <View style={styles.dropdownMenu}>
                    {networks.map((network) => (
                      <TouchableOpacity
                        key={network.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedNetwork(network.id as 'btc' | 'hyperliquid');
                          setShowNetworkDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedNetwork === network.id && styles.dropdownItemTextSelected
                        ]}>
                          {network.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.qrCodeContainer}>
              <View style={styles.qrCodeWrapper}>
                {selectedNetwork === 'btc' ? (
                  btcAddress ? (
                    <QRCode
                      value={btcAddress}
                      size={180}
                      backgroundColor="#FFFFFF"
                      color="#000000"
                      quietZone={16}
                    />
                  ) : (
                    <Text style={styles.loadingText}>Loading BTC address...</Text>
                  )
                ) : account?.address ? (
                  <QRCode
                    value={account.address}
                    size={180}
                    backgroundColor="#FFFFFF"
                    color="#000000"
                    quietZone={16}
                  />
                ) : null}
              </View>
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                {selectedNetwork === 'btc' 
                  ? (btcAddress 
                      ? `${btcAddress.slice(0, 20)}...${btcAddress.slice(-6)}`
                      : 'Loading BTC address...')
                  : account?.address 
                    ? `${account.address.slice(0, 20)}...${account.address.slice(-6)}`
                    : 'No address available'
                }
              </Text>
              {((selectedNetwork === 'btc' && btcAddress) || 
                (selectedNetwork === 'hyperliquid' && account?.address)) && (
                <TouchableOpacity 
                  onPress={() => handleCopyAddress(
                    selectedNetwork === 'btc' ? btcAddress : account?.address || ''
                  )} 
                  style={styles.copyButton}
                >
                  <Ionicons name="copy-outline" size={16} color="#808A9D" />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>from </Text>
              <TouchableOpacity style={styles.selector}>
                <Text style={styles.selectorText}>Arbitrum</Text>
                <Text style={styles.arrowIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <TouchableOpacity style={styles.selector}>
                <Text style={styles.selectorText}>USDC</Text>
                <Text style={styles.arrowIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.amountInputContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#666"
                  editable={!toastVisible || toastType !== 'loading'}
                />
                <TouchableOpacity 
                  style={styles.maxButton}
                  onPress={handleMaxDeposit}
                  disabled={toastVisible && toastType === 'loading'}
                >
                  <Text style={[styles.maxButtonText, (toastVisible && toastType === 'loading') && { opacity: 0.5 }]}>MAX</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceText}>
                  Balance: {tokenBalance?.value ? ethers.formatUnits(tokenBalance.value, 6) : '0'} {tokenBalance?.symbol || 'USDC'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.depositButton, (!amount || parseFloat(amount) < MIN_DEPOSIT) && styles.depositButtonDisabled]}
              onPress={handleBatchedDeposit}
              disabled={!amount || parseFloat(amount) < MIN_DEPOSIT}
            >
              <Text style={styles.depositButtonText}>
                {!amount || parseFloat(amount) < MIN_DEPOSIT 
                  ? `Minimum Deposit ${MIN_DEPOSIT} USDC`
                  : 'Deposit'
                }
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {toastVisible && (
        <Toast 
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onHide={hideToast}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13141B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2026',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#FFFFFF',
    marginBottom: 8,
    fontSize: 14,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2D3A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#363A45',
  },
  amountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 12,
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#363A45',
    borderRadius: 4,
    marginRight: 8,
  },
  maxButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  balanceContainer: {
    marginTop: 8,
  },
  balanceText: {
    color: '#808A9D',
    fontSize: 14,
  },
  depositButton: {
    backgroundColor: '#00C087',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  depositButtonDisabled: {
    backgroundColor: '#2A2D3A',
  },
  depositButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2D3A',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  copyButton: {
    padding: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#363A45',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#363A45',
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  dropdownItemTextSelected: {
    color: '#00C087',
  },
  loadingText: {
    color: '#808A9D',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DepositPage;
