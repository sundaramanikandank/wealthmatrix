import { create } from 'zustand'
import type { Asset, MonthlySnapshot } from '../data/assetTypes'

interface WealthState {
  assets: Asset[]
  snapshots: MonthlySnapshot[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  
  setSnapshots: (snapshots: MonthlySnapshot[]) => void
  addSnapshot: (snapshot: MonthlySnapshot) => void
  
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useWealthStore = create<WealthState>((set) => ({
  assets: [],
  snapshots: [],
  isLoading: false,
  error: null,
  
  setAssets: (assets) => set({ assets }),
  
  addAsset: (asset) => set((state) => ({
    assets: [...state.assets, asset],
  })),
  
  updateAsset: (id, updates) => set((state) => ({
    assets: state.assets.map((a) => a.id === id ? { ...a, ...updates } as Asset : a),
  })),
  
  deleteAsset: (id) => set((state) => ({
    assets: state.assets.filter((a) => a.id !== id),
  })),
  
  setSnapshots: (snapshots) => set({ snapshots }),
  
  addSnapshot: (snapshot) => set((state) => ({
    snapshots: [...state.snapshots, snapshot].sort((a, b) => 
      b.snapshot_date.localeCompare(a.snapshot_date)
    ),
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
}))
