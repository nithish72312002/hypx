// store/useTradingStore.ts
import { create } from 'zustand'

interface FuturesTradingState {
  orderType: 'Limit' | 'Market'
  price: string
  setOrderType: (type: 'Limit' | 'Market') => void
  setPrice: (price: string) => void
}

interface SpotTradingState {
  orderType: 'Limit' | 'Market'
  price: string
  setOrderType: (type: 'Limit' | 'Market') => void
  setPrice: (price: string) => void
}

export const useTradingStore = create<FuturesTradingState>((set) => ({
  orderType: 'Limit',
  price: '',
  setOrderType: (type) => set({ orderType: type }),
  setPrice: (price) => set({ price }),
}))

export const usespotTradingStore = create<SpotTradingState>((set) => ({
  orderType: 'Limit',
  price: '',
  setOrderType: (type) => set({ orderType: type }),
  setPrice: (price) => set({ price }),
}))