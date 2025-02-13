import { create } from 'zustand';

interface Token {
  name: string;
  address: string;
  decimals: number;
  fullName: string | null;
  symbol: string;
}

interface TokenStore {
  tokens: Token[];
  isLoading: boolean;
  error: string | null;
  fetchTokens: () => Promise<void>;
}

export const useTokenStore = create<TokenStore>((set) => ({
  tokens: [],
  isLoading: false,
  error: null,
  fetchTokens: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('https://api.hyperliquid-testnet.xyz/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'spotMeta' }),
      });

      const data = await response.json();
      
      // Filter and map tokens that have EVM contracts
      const evmTokens = data.tokens
        .filter((token: any) => 
          token.evmContract !== null && 
          token.name !== 'HYPE' &&
          token.evmContract.address !== '0x0000000000000000000000000000000000000000'
        )
        .map((token: any) => ({
          name: token.name,
          address: token.evmContract.address,
          decimals: token.weiDecimals + (token.evmContract.evm_extra_wei_decimals || 0),
          fullName: token.fullName,
          symbol: token.name,
        }));

      set({ tokens: evmTokens, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
      set({ error: 'Failed to load token list', isLoading: false });
    }
  },
}));
