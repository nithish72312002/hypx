import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Dimensions } from 'react-native';
import { arbitrumSepolia } from 'thirdweb/chains';
import { useActiveAccount, useWalletBalance } from 'thirdweb/react';
import { client } from '@/constants/thirdweb';
import { useAppInitializer } from '@/components/AppInitializer';
import { batcheddeposit, MIN_DEPOSIT, USDC_ADDRESS } from '@/utils/deposit';
import axios from 'axios';
import { ethers, Interface } from 'ethers';
import { defineChain, getContract, readContract } from 'thirdweb';
import { Toast } from '@/components/Toast';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

interface DepositButtonProps {
  onPress?: () => void;
}

export const DepositButton: React.FC<DepositButtonProps> = ({ onPress }) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const account = useActiveAccount();
  const address = account?.address;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'loading' | 'success'>('loading');

  const MIN_DEPOSIT = 5;

  const snapPoints = useMemo(() => ['45%'], []);

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
      bottomSheetModalRef.current?.present();
    }
  };

  const handleOnChainDeposit = () => {
    bottomSheetModalRef.current?.dismiss();
    setIsModalVisible(true);
    refetchBalance();
  };

  const handleDepositFromDifferentAddress = () => {
    bottomSheetModalRef.current?.dismiss();
    setIsQRModalVisible(true);
  };

  const handleCopyAddress = async () => {
    if (account?.address) {
      await Clipboard.setStringAsync(account.address);
      // You might want to show a toast here
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

      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={['35%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#1E2026" }}
        handleIndicatorStyle={{ backgroundColor: "#808A9D", width: 32 }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>Select Deposit Method</Text>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleOnChainDeposit}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionButtonText}>On-Chain Deposit</Text>
              <Text style={styles.optionDescription}>Deposit crypto from your wallet</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleDepositFromDifferentAddress}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionButtonText}>Deposit from different address</Text>
              <Text style={styles.optionDescription}>Transfer from another wallet address</Text>
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
                <Ionicons name="close" size={24} color="#808A9D" />
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={isQRModalVisible}
        onRequestClose={() => setIsQRModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1} 
          onPress={() => setIsQRModalVisible(false)}
        >
          <View style={styles.modalContentWrapper}>
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsQRModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#808A9D" />
              </TouchableOpacity>

              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={account?.address || ''}
                    size={180}
                    backgroundColor="#FFFFFF"
                    color="#000000"
                    quietZone={16}
                  />
                </View>
              </View>

              <View style={styles.addressContainer}>
                <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                  {account?.address?.slice(0, 20)}...{account?.address?.slice(-6)}
                </Text>
                <TouchableOpacity onPress={handleCopyAddress} style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={16} color="#808A9D" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
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
    alignItems: 'stretch',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 5,
    padding: 10,
    zIndex: 1,
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
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 20,
    color: '#FFFFFF',
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
  optionIcon: {
    fontSize: 18,
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
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    width: '85%',
    backgroundColor: '#1E2026',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  qrModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  qrCodeContainer: {
    padding: 10,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#363B44',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  qrCodeText: {
    color: '#808A9D',
    fontSize: 12,
    textAlign: 'center',
    padding: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
  },
  addressText: {
    color: '#808A9D',
    fontSize: 13,
    flex: 1,
    marginRight: 12,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 4,
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
});
