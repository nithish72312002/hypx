import { useState, useEffect } from 'react';
import axios from 'axios';

interface Token {
  name: string;
  index: number;
  fullName: string | null;
}

interface UniversePair {
  tokens: number[];
  name: string;
  index: number;
  isCanonical: boolean;
}

interface SpotMetaResponse {
  universe: UniversePair[];
  tokens: Token[];
}

export const useSpotName = (symbol: string | undefined) => {
  const [tokenName, setTokenName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpotMeta = async () => {
      if (!symbol) {
        setTokenName('');
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.post('https://api.hyperliquid-testnet.xyz/info', {
          type: 'spotMeta'
        });

        const data = response.data as SpotMetaResponse;
        
        // Find the universe pair matching our symbol
        const pair = data.universe.find(p => p.name === symbol);
        
        if (pair) {
          // Get the base token index (first in the tokens array)
          const baseTokenIndex = pair.tokens[0];
          
          // Find the token details using the index
          const token = data.tokens.find(t => t.index === baseTokenIndex);
          
          if (token) {
            // Use fullName if available, otherwise use token name
            setTokenName(token.name);
          } else {
            setTokenName(symbol);
          }
        } else {
          setTokenName(symbol);
        }

        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching spot meta:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTokenName(symbol || '');
        setIsLoading(false);
      }
    };

    fetchSpotMeta();
  }, [symbol]);

  return {
    name: tokenName,
    isLoading,
    error
  };
};
