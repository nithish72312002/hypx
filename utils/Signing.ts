// Signing.ts
import { encode } from "@msgpack/msgpack";
import { ethers, HDNodeWallet } from "ethers";
import { Decimal } from "decimal.js";
import axios from "axios";

// --- Type Definitions ---
export type Tif = "Alo" | "Ioc" | "Gtc" | "FrontendMarket";
export type Tpsl = "tp" | "sl";

export interface LimitOrderType {
  tif: Tif;
}

export interface TriggerOrderTypeWire {
  triggerPx: string;
  isMarket: boolean;
  tpsl: Tpsl;
}

export interface OrderTypeWire {
  limit?: LimitOrderType;
  trigger?: TriggerOrderTypeWire;
}

export interface OrderWire {
  a: number;
  b: boolean;
  p: string;
  s: string;
  r: boolean;
  t: OrderTypeWire;
  c?: string;
}

export interface TriggerOrderType {
  triggerPx: number;
  isMarket: boolean;
  tpsl: Tpsl;
}

export interface OrderType {
  limit?: LimitOrderType;
  trigger?: TriggerOrderType;
}

export interface OrderRequest {
  asset: number;
  is_buy: boolean;
  sz: number;
  limit_px: number;
  order_type: OrderType;
  reduce_only: boolean;
  cloid?: Cloid | null;
}

// Define the signature type
export type Signature = {
  r: string;
  s: string;
  v: number;
};

const IS_MAINNET = false;

export const phantomDomain = {
  name: "Exchange",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
};

export const agentTypes = {
  Agent: [
    { name: "source", type: "string" },
    { name: "connectionId", type: "bytes32" },
  ],
} as const;

export class Cloid {
  private _rawCloid: string;
  constructor(rawCloid: string) {
    this._rawCloid = rawCloid;
    this._validate();
  }
  private _validate(): void {
    if (!this._rawCloid.startsWith("0x")) {
      throw new Error("cloid is not a hex string");
    }
    if (this._rawCloid.slice(2).length !== 32) {
      throw new Error("cloid is not 16 bytes");
    }
  }
  static fromInt(cloid: number): Cloid {
    return new Cloid(`0x${cloid.toString(16).padStart(32, "0")}`);
  }
  static fromStr(cloid: string): Cloid {
    return new Cloid(cloid);
  }
  toRaw(): string {
    return this._rawCloid;
  }
}

function addressToBytes(address: string): Uint8Array {
  const hex = address.startsWith("0x") ? address.substring(2) : address;
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export function hashAction(
  action: unknown,
  vaultAddress: string | null,
  nonce: number
): string {
  const msgPackBytes = encode(action);
  const additionalBytesLength = vaultAddress === null ? 9 : 29;
  const data = new Uint8Array(msgPackBytes.length + additionalBytesLength);
  data.set(msgPackBytes);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  view.setBigUint64(msgPackBytes.length, BigInt(nonce), false);
  if (vaultAddress === null) {
    view.setUint8(msgPackBytes.length + 8, 0);
  } else {
    view.setUint8(msgPackBytes.length + 8, 1);
    data.set(addressToBytes(vaultAddress), msgPackBytes.length + 9);
  }
  return ethers.keccak256(data);
}

// --- Utility Functions ---
export function floatToWire(x: number): string {
  const rounded = x.toFixed(8);
  if (Math.abs(parseFloat(rounded) - x) >= 1e-12) {
    throw new Error("floatToWire causes rounding");
  }
  if (rounded === "-0") {
    return "0";
  }
  return new Decimal(rounded).toString();
}

export function orderTypeToWire(orderType: OrderType): OrderTypeWire {
  if ("limit" in orderType) {
    return { limit: orderType.limit };
  } else if ("trigger" in orderType && orderType.trigger) {
    return {
      trigger: {
        isMarket: orderType.trigger.isMarket,
        triggerPx: floatToWire(orderType.trigger.triggerPx),
        tpsl: orderType.trigger.tpsl,
      },
    };
  }
  throw new Error("Invalid order type");
}

export function orderRequestToOrderWire(order: OrderRequest): OrderWire {
  const orderWire: OrderWire = {
    a: order.asset,
    b: order.is_buy,
    p: floatToWire(order.limit_px),
    s: floatToWire(order.sz),
    r: order.reduce_only,
    t: orderTypeToWire(order.order_type),
  };
  if (order.cloid) {
    orderWire.c = order.cloid.toRaw();
  }
  return orderWire;
}

export function orderWiresToOrderAction(orderWires: OrderWire[]) {
  return {
    type: "order",
    orders: orderWires,
    grouping: "na",
  };
}

async function signInner(
  wallet: HDNodeWallet,
  data: any
): Promise<Signature> {
  const signedAgent = await wallet.signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return ethers.Signature.from(signedAgent);
}

export async function signStandardL1Action(
  action: unknown,
  wallet: HDNodeWallet,
  vaultAddress: string | null,
  nonce: number
): Promise<Signature> {
  if (!wallet) {
    throw new Error("Wallet is required");
  }

  const phantomAgent = {
    source: IS_MAINNET ? "a" : "b",
    connectionId: hashAction(action, vaultAddress, nonce),
  };
  const payloadToSign = {
    domain: phantomDomain,
    types: agentTypes,
    primaryType: "Agent",
    message: phantomAgent,
  } as const;
  return signInner(wallet, payloadToSign);
}

export async function placeOrderl1(
  orderRequest: OrderRequest,
  wallet: HDNodeWallet,
  nonce: number
): Promise<any> {
  if (!wallet) {
    throw new Error("Wallet is required");
  }

  const vault_or_subaccount_address = null;

  // Convert the order request into wire format
  const orderWire = orderRequestToOrderWire(orderRequest);
  const orderAction = orderWiresToOrderAction([orderWire]);

  // Sign the order
  const signature = await signStandardL1Action(
    orderAction,
    wallet,
    vault_or_subaccount_address,
    nonce
  );

  // Create the request payload
  const requestData = {
    action: orderAction,
    nonce: nonce,
    signature: signature,
  };

  // Send the order to Hyperliquid's API
  const response = await axios.post(
    IS_MAINNET 
      ? "https://api.hyperliquid.xyz/exchange" 
      : "https://api.hyperliquid-testnet.xyz/exchange",
    requestData,
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  return response.data;
}
