import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { useActiveAccount } from 'thirdweb/react';
import axios from 'axios';
import { ethers } from 'ethers';
import {Toast} from '@/components/Toast'; // Assuming Toast component is in a separate file

interface WithdrawButtonProps {
  onPress?: () => void;
}

export const WithdrawButton: React.FC<WithdrawButtonProps> = ({ onPress }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [withdrawableBalance, setWithdrawableBalance] = useState('0');
  const account = useActiveAccount();
  const [isDepositModalVisible, setIsDepositModalVisible] = useState(false);
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);

  const MIN_WITHDRAW = 2;
  useEffect(() => {
    if (account?.address) {
      fetchWithdrawableBalance();
    }
  }, [account?.address]);

 

  const handleMax = () => {
    setAmount(withdrawableBalance);
  };

  const handleAmountChange = (text: string) => {
    if (/^\d*\.?\d*$/.test(text)) {
      setAmount(text);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setAmount('');
      setIsModalVisible(true);
    }
  };

  const fetchWithdrawableBalance = async () => {
    if (!account?.address) return;

    try {
      const response = await axios.post(
        'https://api.hyperliquid-testnet.xyz/info',
        {
          type: "clearinghouseState",
          user: account.address
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data?.withdrawable) {
        setWithdrawableBalance(response.data.withdrawable);
      }
    } catch (error) {
      console.error('Error fetching withdrawable balance:', error);
    }
  };
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

  const withdraw3 = async () => {
    try {
      if (!account?.address) {
        showToast('Please connect your wallet first', 'loading');
        return;
      }

      if (!amount || parseFloat(amount) < MIN_WITHDRAW) {
        showToast(`Minimum withdrawal is ${MIN_WITHDRAW} USDC`, 'loading');
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          setIsModalVisible(false);
          setAmount('');
        }}
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
                    onPress={handleMax}
                    disabled={toastVisible && toastType === 'loading'}
                  >
                    <Text style={[styles.maxButtonText, (toastVisible && toastType === 'loading') && { opacity: 0.5 }]}>MAX</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.balanceContainer}>
                  <Text style={styles.balanceText}>
                    Withdrawable Balance: {withdrawableBalance} USDC
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, (!amount || parseFloat(amount) < MIN_WITHDRAW) && styles.modalButtonDisabled]}
                onPress={withdraw3}
                disabled={!amount || parseFloat(amount) < MIN_WITHDRAW}
              >
                <Text style={styles.modalButtonText}>
                  {!amount || parseFloat(amount) < MIN_WITHDRAW 
                    ? `Minimum Withdrawal ${MIN_WITHDRAW} USDC`
                    : 'Withdraw'
                  }
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
            {toastVisible && (
              <Toast 
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                onHide={hideToast}
              />
            )}
          </View>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6B46C1',
  },
  buttonText: {
    color: '#6B46C1',
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#2E2E3A',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    padding: 12,
    backgroundColor: 'transparent',
  },
  maxButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  maxButtonText: {
    color: '#fff',
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
    backgroundColor: '#FFFFFF',
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#6B46C1',
  },
  modalButtonDisabled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6B46C1',
    opacity: 0.5,
  },
  modalButtonText: {
    color: '#6B46C1',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
