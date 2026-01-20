import { createContext, useContext, useState, useEffect } from 'react';
import type { User, Wallet } from '../lib/api-client';

interface UserContextType {
  user: User | null;
  wallet: Wallet | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setLocation: (lat: number, lng: number) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    try {
      const { api } = await import('../lib/api-client');
      const [userData, walletData] = await Promise.all([
        api.getMe(),
        api.getWallet(),
      ]);
      setUser(userData.user);
      setWallet(walletData.wallet);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadUserData();
  };

  const setLocation = async (lat: number, lng: number) => {
    try {
      const { api } = await import('../lib/api-client');
      await api.updateLocation(lat, lng);
      if (user) {
        setUser({ ...user, last_location: { lat, lng } });
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  return (
    <UserContext.Provider value={{ user, wallet, loading, refresh, setLocation }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
