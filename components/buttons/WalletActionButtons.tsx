import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { arbitrumSepolia } from 'thirdweb/chains';
import { useActiveAccount, useWalletBalance } from 'thirdweb/react';
import { client } from '@/constants/thirdweb';
import { Alert } from 'react-native';
import axios from 'axios';
import { ethers, Interface } from 'ethers';
import { defineChain, getContract, readContract, encode } from 'thirdweb';

interface WalletActionButtonsProps {
  onDepositPress?: () => void;
  onWithdrawPress?: () => void;
}

const WalletActionButtons: React.FC<WalletActionButtonsProps> = ({
  onDepositPress,
  onWithdrawPress,
}) => {
  const [isDepositModalVisible, setIsDepositModalVisible] = useState(false);
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [withdrawableBalance, setWithdrawableBalance] = useState('0');
  const account = useActiveAccount();
  const tokenAddress = "0x1baAbB04529D43a73232B713C0FE471f7c7334d5";
  const address = account?.address;
  const { data: tokenBalance, isLoading, isError, refetch: refetchBalance } = useWalletBalance({
    chain: arbitrumSepolia,
    address,
    client,
    tokenAddress,
  });
  const isMainnet = false;
  const USDC_ADDRESS = isMainnet 
    ? "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"  // Arbitrum Mainnet USDC
    : "0x1baAbB04529D43a73232B713C0FE471f7c7334d5"; // Arbitrum Testnet USDC
  
  const BRIDGE_ADDRESS = isMainnet
    ? "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7"  // Mainnet Bridge
    : "0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89"; // Testnet Bridge
  useEffect(() => {
    fetchWithdrawableBalance();
  }, [account?.address]);

  useEffect(() => {
    if (isDepositModalVisible) {
      refetchBalance();
    }
  }, [isDepositModalVisible]);

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

  const handleDepositPress = () => {
    if (onDepositPress) {
      onDepositPress();
    } else {
      setAmount('');
      setIsDepositModalVisible(true);
      refetchBalance();
    }
  };

  const handleWithdrawPress = () => {
    if (onWithdrawPress) {
      onWithdrawPress();
    } else {
      setAmount('');
      setIsWithdrawModalVisible(true);
    }
  };

  const handleTransferPress = () => {
    router.push('/transfer');
  };

  const handleMax = () => {
    if (isWithdrawModalVisible) {
      setAmount(withdrawableBalance);
    } else {
      setAmount(tokenBalance?.displayValue || '0');
    }
  };

  const generateNonce = () => Date.now();

  const withdraw3 = async () => {
    try {
      if (!account) {
        Alert.alert("Error", "Wallet is still loading or not available.");
        return;
      }

      const currentTimestamp = generateNonce();

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
        Alert.alert("Success", "Withdrawal successful");
        setIsWithdrawModalVisible(false);
        fetchWithdrawableBalance();
      } else {
        throw new Error('Withdrawal failed: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      console.error("Withdrawal Error:", error);
      Alert.alert("Error", error.message || "Failed to withdraw. Please try again.");
    }
  };

  const batcheddeposit = async () => {
    try {
      if (!account) {
        Alert.alert("Error", "Wallet is still loading or not available.");
        return;
      }

      if (!amount) {
        Alert.alert("Error", "Please enter an amount");
        return;
      }

      const contract = getContract({
        client,
        chain: defineChain(421614),
        address: "0x1baAbB04529D43a73232B713C0FE471f7c7334d5",
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

      // Log all necessary data for manual testing
      console.log('=== Permit Data for Manual Testing ===');
      console.log('Contract call payload:');
      console.log(JSON.stringify(deposits, null, 2));
      
      console.log('\nRaw values for reference:');
      console.log('Token (USDC):', USDC_ADDRESS);
      console.log('Bridge:', BRIDGE_ADDRESS);
      console.log('Owner:', account.address);
      console.log('Amount (in USDC):', amount);
      console.log('Nonce:', currentNonce.toString());
      
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

        console.log('API Response:', response.data);
        Alert.alert("Success", "Transaction submitted successfully!");
        setIsDepositModalVisible(false);
        refetchBalance();
      } catch (error) {
        console.error('API Error:', error);
        Alert.alert("Error", "Failed to submit transaction. Check console for details.");
      }
    } catch (error) {
      console.error("Permit Error:", error);
      Alert.alert("Error", error.message || "Failed to generate permit. Please try again.");
    }
  };

  

  return (
    <View style={styles.container}>
      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.depositButton]} 
          onPress={handleDepositPress}
        >
          <Text style={styles.buttonText}>Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.withdrawButton]} 
          onPress={handleWithdrawPress}
        >
          <Text style={styles.buttonText}>Withdraw</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.transferButton]} 
          onPress={handleTransferPress}
        >
          <Text style={styles.buttonText}>Transfer</Text>
        </TouchableOpacity>
      </View>

      {/* Deposit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDepositModalVisible}
        onRequestClose={() => setIsDepositModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsDepositModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Source Chain</Text>
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
              <View style={styles.amountContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Amount"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.maxButton} onPress={handleMax}>
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.availableText}>
                Available to deposit: {tokenBalance?.displayValue || '0.00'} {tokenBalance?.symbol}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, !amount && styles.modalButtonDisabled]}
              onPress={batcheddeposit}
              disabled={!amount}
            >
              <Text style={styles.modalButtonText}>Deposit</Text>
            </TouchableOpacity> 
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isWithdrawModalVisible}
        onRequestClose={() => setIsWithdrawModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsWithdrawModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
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
              <View style={styles.amountContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Amount"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.maxButton} onPress={handleMax}>
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.availableText}>
                Available to withdraw: {Number(withdrawableBalance).toFixed(2)} USDC
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, !amount && styles.modalButtonDisabled]}
              onPress={withdraw3}
              disabled={!amount}
            >
              <Text style={styles.modalButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#AB47BC',
  },
  depositButton: {
    backgroundColor: '#FFFFFF',
  },
  withdrawButton: {
    backgroundColor: '#FFFFFF',
  },
  transferButton: {
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    color: '#AB47BC',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E2F',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  inputGroup: {
    marginBottom: 16,
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
    backgroundColor: '#2E2E3A',
    padding: 16,
    borderRadius: 8,
  },
  selectorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  arrowIcon: {
    color: '#888',
    fontSize: 12,
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
    color: '#FFFFFF',
    fontSize: 16,
    padding: 0,
  },
  maxButton: {
    backgroundColor: 'transparent',
  },
  maxButtonText: {
    color: '#00C076',
    fontSize: 14,
  },
  availableText: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  modalButton: {
    backgroundColor: '#00C076',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: '#888',
    fontSize: 24,
    lineHeight: 24,
  },
});

export default WalletActionButtons;
