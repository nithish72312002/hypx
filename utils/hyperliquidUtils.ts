// hyperliquidUtils.ts
import { encode as encodeMsgPack } from '@msgpack/msgpack';
import { ethers, keccak256, Wallet } from 'ethers';
import axios from 'axios';

// EIP-712 Domain & Types
export const phantomDomain = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

export const agentTypes = {
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' },
  ],
};

// Utility: Convert Ethereum address string into Uint8Array
export function addressToBytes(address: string): Uint8Array {
  return Uint8Array.from(Buffer.from(address.replace(/^0x/, ''), 'hex'));
}

/**
 * Create an action hash by:
 * 1. Encoding the action using MsgPack.
 * 2. Appending a nonce and optional vaultAddress.
 * 3. Hashing the final byte array with Keccak-256.
 */
export function actionHash(action: unknown, vaultAddress: string | null, nonce: number): string {
  const msgPackBytes = encodeMsgPack(action);
  const additionalBytesLength = vaultAddress ? 29 : 9;
  const data = new Uint8Array(msgPackBytes.length + additionalBytesLength);
  data.set(msgPackBytes);
  const view = new DataView(data.buffer);
  view.setBigUint64(msgPackBytes.length, BigInt(nonce), false);
  if (vaultAddress === null) {
    view.setUint8(msgPackBytes.length + 8, 0);
  } else {
    view.setUint8(msgPackBytes.length + 8, 1);
    data.set(addressToBytes(vaultAddress), msgPackBytes.length + 9);
  }
  return keccak256(data);
}

/**
 * Construct the phantom agent object used for signing.
 * "source" is 'a' on mainnet and 'b' on testnet.
 */
export function constructPhantomAgent(hash: string, isMainnet: boolean) {
  return { source: isMainnet ? 'a' : 'b', connectionId: hash };
}

/**
 * Low-level signing function that uses EIP-712 (_signTypedData).
 */
export async function signInner(
  wallet: Wallet,
  data: any
): Promise<{ r: string; s: string; v: number }> {
  const signature = await wallet.signTypedData(data.domain, data.types, data.message);
  const { v, r, s } = ethers.Signature.from(signature);
  return { v, r, s };
}

/**
 * Sign an L1 action (the order action) using the EIP-712 method.
 */
export async function signL1Action(
  wallet: Wallet,
  action: unknown,
  vaultAddress: string | null,
  nonce: number,
  isMainnet: boolean
): Promise<{ r: string; s: string; v: number }> {
  const hash = actionHash(action, vaultAddress, nonce);
  const phantomAgent = constructPhantomAgent(hash, isMainnet);
  const data = {
    domain: phantomDomain,
    types: agentTypes,
    primaryType: 'Agent',
    message: phantomAgent,
  };
  return signInner(wallet, data);
}

/**
 * Place an order by:
 * 1. Creating the order action.
 * 2. Signing the action using signL1Action.
 * 3. Sending the signed payload to the Hyperliquid API.
 */
export async function testplaceOrder(
  wallet: Wallet,
  orderRequest: any,
  isMainnet: boolean
): Promise<any> {
    const vaultAddress = null; 
    const nonce = Date.now();
  const signature = await signL1Action(wallet, orderRequest, vaultAddress, nonce, isMainnet);
  const payload = { action: orderRequest, nonce, signature, vaultAddress };
  const response = await axios.post('https://api.hyperliquid-testnet.xyz/exchange', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}
