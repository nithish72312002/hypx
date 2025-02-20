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
import { useRouter } from 'expo-router';

interface DepositButtonProps {
  onPress?: () => void;
}

export const DepositButton: React.FC<DepositButtonProps> = ({ onPress }) => {
  const router = useRouter();
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
    router.push('/deposit?tab=onchain');
  };

  const handleDepositFromDifferentAddress = () => {
    bottomSheetModalRef.current?.dismiss();
    router.push('/deposit?tab=qr');
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
        handleIndicatorStyle={{ backgroundColor: "#808A9D", width: 50 }}
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
