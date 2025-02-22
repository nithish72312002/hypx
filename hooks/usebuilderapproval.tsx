import { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useActiveAccount } from "thirdweb/react";
import { BUILDER_ADDRESS } from "@/constants/env";

export const useapprovebuilderfee = () => {
  const account = useActiveAccount();
  const [error, setError] = useState(null);

  const approvebuilderfee = async () => {
    try {
      if (!account) {
        console.log("Agent wallet or external wallet is not ready.");
        return;
      }

      const currentTimestamp = Date.now();

      const message = {
        type: "approveBuilderFee",
        hyperliquidChain: "Testnet",
        signatureChainId: "0x66eee",
        maxFeeRate: "0.1%",
        builder: BUILDER_ADDRESS,
        nonce: currentTimestamp,
      };

      const domain = {
        name: "HyperliquidSignTransaction",
        version: "1",
        chainId: 421614,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      };

      const types = {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        "HyperliquidTransaction:ApproveBuilderFee": [
          { name: "hyperliquidChain", type: "string" },
          { name: "maxFeeRate", type: "string" },
          { name: "builder", type: "address" },
          { name: "nonce", type: "uint64" },
        ],
      };

      const signature = await account.signTypedData({
        domain,
        message,
        primaryType: "HyperliquidTransaction:ApproveBuilderFee",
        types,
      });

      const { v, r, s } = ethers.Signature.from(signature);

      console.log("EIP-712 Signature:", signature);
      console.log("Split Signature:", { v, r, s });

      const apiPayload = {
        action: message,
        nonce: currentTimestamp,
        signature: { r, s, v },
      };

      const apiUrl = "https://api.hyperliquid-testnet.xyz/exchange";
      const headers = { "Content-Type": "application/json" };

      const response = await axios.post(apiUrl, apiPayload, { headers });
      console.log("API Response:", response.data);

      if (response.data.status === "err") {
        const error = new Error(response.data.response);
        console.error("builder approval failed:", response.data.response);
        throw error; // Make sure error is thrown
      }

      return response.data;
    } catch (err) {
      console.error("Error approving builder wallet:", err);
      setError(err);
      throw err; // Re-throw to propagate to caller
    }
  };

  return { approvebuilderfee, error };
};
