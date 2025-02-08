import { ethers, Interface } from 'ethers';
import { defineChain, getContract, readContract } from 'thirdweb';
import axios from 'axios';
import { Alert } from 'react-native';

export const MIN_DEPOSIT = 5;
export const isMainnet = false;
export const USDC_ADDRESS = isMainnet 
  ? "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"  // Arbitrum Mainnet USDC
  : "0x1baAbB04529D43a73232B713C0FE471f7c7334d5"; // Arbitrum Testnet USDC

export const BRIDGE_ADDRESS = isMainnet
  ? "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7"  // Mainnet Bridge
  : "0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89"; // Testnet Bridge

export const batcheddeposit = async (
  account: any,
  amount: string,
  client: any,
  onSuccess: () => void,
  checkDepositStatus: () => Promise<void>
) => {
  try {
    if (!account) {
      Alert.alert("Error", "Wallet is still loading or not available.");
      return;
    }

    if (!amount || parseFloat(amount) < MIN_DEPOSIT) {
      Alert.alert("Error", `Minimum deposit amount is ${MIN_DEPOSIT} USDC`);
      return;
    }

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
      value: ethers.parseUnits(amount.toString(), 6),
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
      onSuccess();
      // Check deposit status after successful deposit
      setTimeout(async () => {
        await checkDepositStatus();
      }, 10000);
    } catch (error) {
      console.error('API Error:', error);
      Alert.alert("Error", "Failed to submit transaction. Check console for details.");
    }
  } catch (error) {
    console.error("Permit Error:", error);
    Alert.alert("Error", error.message || "Failed to generate permit. Please try again.");
  }
};
