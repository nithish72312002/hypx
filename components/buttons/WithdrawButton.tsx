import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import axios from 'axios';
import { ethers } from 'ethers';
import {Toast} from '@/components/Toast';
import { useHyperliquid } from '@/context/HyperliquidContext';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';

interface WithdrawButtonProps {
  onPress?: () => void;
}

export const WithdrawButton: React.FC<WithdrawButtonProps> = ({ onPress }) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [withdrawableBalance, setWithdrawableBalance] = useState('0');
  const account = useActiveAccount();
  const { sdk } = useHyperliquid();
  const MIN_WITHDRAW = 2;
  const router = useRouter();

  const hyberliquiddisabled = true;

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handlePress = () => {
    bottomSheetModalRef.current?.present();
  };

  const handleOnChainWithdraw = () => {
    bottomSheetModalRef.current?.dismiss();
    setAmount('');
    setIsModalVisible(true);
  };

  const handleTransferToL1 = () => {
    bottomSheetModalRef.current?.dismiss();
    router.push('/l1transfer');
  };

  const handleMax = () => {
    setAmount(withdrawableBalance);
  };

  const handleAmountChange = (text: string) => {
    if (/^\d*\.?\d*$/.test(text)) {
      setAmount(text);
    }
  };

  const fetchWithdrawableBalance = async () => {
    if (!sdk || !account?.address) return;

    try {
      const state = await sdk.info.perpetuals.getClearinghouseState(account.address);
      if (state?.withdrawable) {
        setWithdrawableBalance(state.withdrawable.toString());
      }
    } catch (error) {
      console.error('Error getting clearinghouse state:', error);
    }
  };

  const getSpotClearinghouseState = async () => {
    if (!sdk || !account?.address) return;

    try {
      const result = await sdk.info.spot.getSpotClearinghouseState(account.address);
      console.log('Spot clearinghouse state:', result);
      
      if (result?.balances?.length > 0) {
        // Clean up spot suffix and calculate withdrawable balance
        const processedBalances = result.balances.map(balance => ({
          ...balance,
          coin: balance.coin.replace('-SPOT', ''),
          withdrawable: (parseFloat(balance.total) - parseFloat(balance.hold)).toString()
        }));
        
        setBalances(processedBalances);
        
        // Find USDC balance or first available balance
        const usdcBalance = processedBalances.find(b => b.coin === 'USDC');
        
        if (usdcBalance) {
          setWithdrawableBalance(usdcBalance.withdrawable);
        } else if (processedBalances.length > 0) {
          setWithdrawableBalance(processedBalances[0].withdrawable);
          setSelectedToken(processedBalances[0].coin);
        }
      } else {
        setBalances([]);
        setWithdrawableBalance('0');
      }
    } catch (error) {
      console.error('Error getting spot metadata:', error);
      setBalances([]);
      setWithdrawableBalance('0');
    }
  };

  const [balances, setBalances] = useState([]);
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState('arbitrum');
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle chain switching
  useEffect(() => {
    if (selectedChain === 'hyperliquid') {
      getSpotClearinghouseState();
    } else {
      setBalances([]);
      setSelectedToken('USDC');
      fetchWithdrawableBalance();
    }
  }, [selectedChain]);

  // Update withdrawable balance when token changes in Hyperliquid
  useEffect(() => {
    if (selectedChain === 'hyperliquid' && balances.length > 0) {
      console.log('Updating selected token from balances:', {
        selectedToken,
        balances,
        selectedBalance: balances.find(b => b.coin === selectedToken)
      });
      const selectedBalance = balances.find(b => b.coin === selectedToken);
      if (selectedBalance) {
        setWithdrawableBalance(selectedBalance.withdrawable);
      }
    }
  }, [selectedToken, selectedChain, balances]);

  const generateNonce = () => Date.now();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'loading' | 'success'>('loading');

  const showToast = (message: string, type: 'loading' | 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

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

  const withdraw3 = async () => {
    try {
      setIsLoading(true);
      if (!account?.address) {
        showToast('Please connect your wallet first', 'loading');
        setIsLoading(false);
        return;
      }

      if (!amount || parseFloat(amount) < MIN_WITHDRAW) {
        showToast(`Minimum withdrawal is ${MIN_WITHDRAW} USDC`, 'loading');
        setIsLoading(false);
        return;
      }

      showToast('Transaction submitted', 'loading');

      const currentTimestamp = Date.now();

      const message = {
        destination: account.address,
        amount: amount,
        time: currentTimestamp,
        type: "withdraw3",
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
        "HyperliquidTransaction:Withdraw": [
          { name: "hyperliquidChain", type: "string" },
          { name: "destination", type: "string" },
          { name: "amount", type: "string" },
          { name: "time", type: "uint64" },
        ]
      };

      const signature = await account.signTypedData({
        domain,
        message,
        primaryType: "HyperliquidTransaction:Withdraw",
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
          setIsModalVisible(false);
          fetchWithdrawableBalance();
        }, 3000);
      } else {
        throw new Error('Withdrawal failed: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      console.error("Withdrawal Error:", error);
      showToast('Failed to process withdrawal', 'loading');
    } finally {
      setIsLoading(false);
    }
  };

  const spotwithdraw = async () => {
    try {
      setIsLoading(true);
      console.log('Starting spot withdrawal with params:', {
        address: account?.address,
        amount,
        selectedToken,
        selectedChain,
        balances
      });

      if (!account?.address) {
        showToast('Please connect your wallet first', 'loading');
        setIsLoading(false);
        return;
      }

      if (!amount || amount === '0' || amount === '') {
        showToast('Please enter an amount', 'loading');
        setIsLoading(false);
        return;
      }

      if (!selectedToken) {
        showToast('Please select a token', 'loading');
        setIsLoading(false);
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
          destination: "0x2222222222222222222222222222222222222222",
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
            setIsModalVisible(false);
            fetchWithdrawableBalance();
          },5000);
        } else {
          throw new Error('Withdrawal failed: ' + JSON.stringify(response.data));
        }
      } catch (error) {
        console.error("Withdrawal Error:", error);
        showToast('Failed to process withdrawal', 'loading');
      }
    } catch (error) {
      console.error("Withdrawal Error:", error);
      showToast('Failed to process withdrawal', 'loading');
    } finally {
      setIsLoading(false);
    }
  };  

  return (
    <>
      <TouchableOpacity
        style={[styles.button, styles.withdrawButton]}
        onPress={handlePress}
      >
        <Text style={styles.buttonText}>Withdraw</Text>
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={['35%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#1E2026" }}
        handleIndicatorStyle={{ backgroundColor: "#808A9D", width: 32 }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleOnChainWithdraw}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="arrow-up-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionButtonText}>On-Chain Withdraw</Text>
              <Text style={styles.optionDescription}>Withdraw crypto to your wallet</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleTransferToL1}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionButtonText}>Transfer on hyperliquid L1</Text>
              <Text style={styles.optionDescription}>Transfer to another account on L1</Text>
            </View>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1} 
          onPress={() => {
            setIsModalVisible(false);
            setAmount('');
          }}
        >
          <View style={styles.modalContentWrapper}>
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setIsModalVisible(false);
                  setAmount('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Destination Chain</Text>
                <View style={styles.chainDropdownContainer}>
                  <TouchableOpacity 
                    style={styles.selector}
                    onPress={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
                  >
                    <Text style={styles.selectorText}>
                      {selectedChain === 'hyperliquid' ? 'Hyperliquid' : 'Arbitrum'}
                    </Text>
                    <Text style={styles.arrowIcon}>▼</Text>
                  </TouchableOpacity>
                  
                  {isChainDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          selectedChain === 'arbitrum' && styles.selectedDropdownItem
                        ]}
                        onPress={() => {
                          setSelectedChain('arbitrum');
                          setIsChainDropdownOpen(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownText,
                          selectedChain === 'arbitrum' && styles.selectedDropdownText
                        ]}>Arbitrum</Text>
                      </TouchableOpacity>
                      {!hyberliquiddisabled && (
                        <TouchableOpacity 
                          style={[
                            styles.dropdownItem,
                            selectedChain === 'hyperliquid' && styles.selectedDropdownItem
                          ]}
                          onPress={() => {
                            setSelectedChain('hyperliquid');
                            setIsChainDropdownOpen(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownText,
                            selectedChain === 'hyperliquid' && styles.selectedDropdownText
                          ]}>Hyperliquid</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Token selector - only show for Hyperliquid */}
              {selectedChain === 'hyperliquid' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Token</Text>
                  <View style={styles.tokenDropdownContainer}>
                    <TouchableOpacity 
                      style={styles.selector}
                      onPress={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                    >
                      <Text style={styles.selectorText}>{selectedToken}</Text>
                      <Text style={styles.arrowIcon}>▼</Text>
                    </TouchableOpacity>
                    
                    {isTokenDropdownOpen && (
                      <View style={styles.dropdownMenu}>
                        {balances.length > 0 ? balances.map((balance) => (
                          <TouchableOpacity 
                            key={balance.coin}
                            style={[
                              styles.dropdownItem,
                              selectedToken === balance.coin && styles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setSelectedToken(balance.coin);
                              setIsTokenDropdownOpen(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownText,
                              selectedToken === balance.coin && styles.selectedDropdownText
                            ]}>
                              {balance.coin} ({balance.withdrawable})
                            </Text>
                          </TouchableOpacity>
                        )) : (
                          <TouchableOpacity style={styles.dropdownItem}>
                            <Text style={styles.dropdownText}>USDC (0)</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Only show USDC for Arbitrum */}
              {selectedChain === 'arbitrum' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Token</Text>
                  <View style={styles.tokenDropdownContainer}>
                    <TouchableOpacity style={styles.selector}>
                      <Text style={styles.selectorText}>USDC</Text>
                      <Text style={styles.arrowIcon}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

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
                    onPress={handleMax}
                    disabled={toastVisible && toastType === 'loading'}
                  >
                    <Text style={[styles.maxButtonText, (toastVisible && toastType === 'loading') && { opacity: 0.5 }]}>MAX</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.balanceContainer}>
                  <Text style={styles.balanceText}>
                    Withdrawable Balance: {selectedChain === 'hyperliquid' ? withdrawableBalance : withdrawableBalance} {selectedToken}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  ((!amount || amount === '0' || amount === '') || 
                   (parseFloat(amount) < MIN_WITHDRAW) ||
                   isLoading) && 
                  styles.modalButtonDisabled
                ]}
                onPress={selectedChain === 'hyperliquid' ? spotwithdraw : withdraw3}
                disabled={(!amount || amount === '0' || amount === '') || 
                         (parseFloat(amount) < MIN_WITHDRAW) ||
                         isLoading}
              >
                <Text style={styles.modalButtonText}>
                  {isLoading ? 'Processing...' : 
                   !amount || amount === '0' || amount === '' ? 'Enter amount' :
                   parseFloat(amount) < MIN_WITHDRAW ? `Minimum withdrawal ${MIN_WITHDRAW} USDC` :
                   'Withdraw'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
          {toastVisible && (
            <Toast 
              visible={toastVisible}
              message={toastMessage}
              type={toastType}
              onHide={hideToast}
            />
          )}
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  withdrawButton: {
    backgroundColor: '#1E2026',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContentWrapper: {
    width: '90%',
    position: 'relative',
  },
  modalContent: {
    backgroundColor: '#1A1C24',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 5,
    padding: 10,
    zIndex: 1,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    width: '100%',
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
    backgroundColor: 'transparent',
  },
  maxButton: {
    backgroundColor: '#363A45',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  maxButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  balanceContainer: {
    marginTop: 8,
  },
  balanceText: {
    color: '#888',
    fontSize: 12,
  },
  modalButton: {
    backgroundColor: '#5e69ee',
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalButtonDisabled: {
    backgroundColor: '#2A2D3A',
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownContainer: {
    position: 'relative',
    width: '100%',
  },
  chainDropdownContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 2,
  },
  tokenDropdownContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedDropdownItem: {
    backgroundColor: '#333',
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  selectedDropdownText: {
    color: '#0066FF',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#2B2F36',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#363B44',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    color: '#808A9D',
    fontSize: 13,
  },
});