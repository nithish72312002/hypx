import { ethers } from 'ethers';
import axios from 'axios';
import { Alert } from 'react-native';

export const MIN_WITHDRAW = 2;

export const fetchWithdrawableBalance = async (accountAddress: string): Promise<string> => {
  try {
    const response = await axios.post(
      'https://api.hyperliquid-testnet.xyz/info',
      {
        type: "clearinghouseState",
        user: accountAddress
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.withdrawable) {
      return response.data.withdrawable;
    }
    return '0';
  } catch (error) {
    console.error('Error fetching withdrawable balance:', error);
    return '0';
  }
};

export const withdraw3 = async (
  account: any,
  amount: string,
  onSuccess: () => void,
  refreshBalance: () => void
) => {
  try {
    if (!account?.address) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    if (!amount || parseFloat(amount) < MIN_WITHDRAW) {
      Alert.alert("Error", `Minimum withdrawal amount is ${MIN_WITHDRAW} USDC`);
      return;
    }

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
      Alert.alert("Success", "Withdrawal successful");
      onSuccess();
      refreshBalance();
    } else {
      throw new Error('Withdrawal failed: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error("Withdrawal Error:", error);
    Alert.alert("Error", error.message || "Failed to withdraw. Please try again.");
  }
};
