import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type ShopSettings } from '../api';
import { SEED_SHOP } from '../api/seed';

interface ShopCtx {
  shop: ShopSettings;
  refresh: () => void;
}

const Ctx = createContext<ShopCtx>({ shop: SEED_SHOP, refresh: () => {} });

/** Shop name, address and hours for headers, footers, pickup details and emails. */
export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopSettings>(SEED_SHOP);
  const refresh = useCallback(() => {
    api.getShop().then(setShop).catch(() => {
      /* keep the last known details; pages still render */
    });
  }, []);
  useEffect(() => {
    refresh();
    return api.subscribeOrders(refresh);
  }, [refresh]);
  useEffect(() => {
    document.title = shop.name;
  }, [shop.name]);
  return <Ctx.Provider value={{ shop, refresh }}>{children}</Ctx.Provider>;
}

export const useShop = () => useContext(Ctx);
