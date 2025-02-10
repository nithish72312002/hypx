import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { arbitrumSepolia } from 'thirdweb/chains';
import { useActiveAccount, useWalletBalance } from 'thirdweb/react';
import { client } from '@/constants/thirdweb';
import { useAppInitializer } from '@/components/AppInitializer';
import { batcheddeposit, MIN_DEPOSIT, USDC_ADDRESS } from '@/utils/deposit';
import axios from 'axios';
import { ethers, Interface } from 'ethers';
import { defineChain, getContract, readContract } from 'thirdweb';
import { Toast } from '@/components/Toast';

interface DepositButtonProps {
  onPress?: () => void;
}

export const DepositButton: React.FC<DepositButtonProps> = ({ onPress }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const account = useActiveAccount();
  const address = account?.address;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'loading' | 'success'>('loading');
 
  const MIN_DEPOSIT = 5;

  const showToast = (message: string, type: 'loading' | 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };
 
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setAmount('');
      setIsModalVisible(true);
      refetchBalance();
    }
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
  const batcheddeposit = async () => {
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
    
      const currentNonce =  await readContract({
        contract,
        method:
          "function nonces(address owner) view returns (uint256)",
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

      // Create the exact format needed for the contract call
      const deposits = [
        {
          user: account.address,
          usd: ethers.parseUnits(amount.toString(), 6).toString(),
          deadline: deadline.toString(),
          signature: {
            r: ethers.hexlify(r),
            s: ethers.hexlify(s),
            v: v
          }
        }
      ];

     
      
      // Get bridge contract
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
        setIsModalVisible(false);
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
  return (
    <>
      <TouchableOpacity 
        style={[styles.button, styles.depositButton]} 
        onPress={handlePress}
      >
        <Text style={styles.buttonText}>Deposit</Text>
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
                style={[styles.modalButton, (!amount || parseFloat(amount) < MIN_DEPOSIT) && styles.modalButtonDisabled]}
                onPress={batcheddeposit}
                disabled={!amount || parseFloat(amount) < MIN_DEPOSIT}
              >
                <Text style={styles.modalButtonText}>
                  {!amount || parseFloat(amount) < MIN_DEPOSIT 
                    ? `Minimum Deposit ${MIN_DEPOSIT} USDC`
                    : 'Deposit'
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
  depositButton: {
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
