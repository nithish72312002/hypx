import { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useActiveAccount } from "thirdweb/react";
import { useAgentWalletContext } from "@/context/AgentWalletContext";

export const useApproveAgent = () => {
  const { wallet, loading: walletLoading } = useAgentWalletContext();
  const account = useActiveAccount();
  const [error, setError] = useState(null);

  const approveAgent = async () => {
    try {
      if (walletLoading || !wallet || !account) {
        console.log("Agent wallet or external wallet is not ready.");
        return;
      }

      const currentTimestamp = Date.now();
      const validUntilTimestamp = currentTimestamp + 170 * 24 * 60 * 60 * 1000;

      const message = {
        hyperliquidChain: "Testnet",
        signatureChainId: "0x66eee",
        agentAddress: wallet.address,
        agentName: `hypx valid_until ${validUntilTimestamp}`,
        nonce: currentTimestamp,
        type: "approveAgent",
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
        "HyperliquidTransaction:ApproveAgent": [
          { name: "hyperliquidChain", type: "string" },
          { name: "agentAddress", type: "address" },
          { name: "agentName", type: "string" },
          { name: "nonce", type: "uint64" },
        ],
      };

      const signature = await account.signTypedData({
        domain,
        message,
        primaryType: "HyperliquidTransaction:ApproveAgent",
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
        console.error("Agent approval failed:", response.data.response);
      }
    } catch (err) {
      console.error("Error approving agent wallet:", err);
      setError(err);
    }
  };

  return { approveAgent, error };
};
