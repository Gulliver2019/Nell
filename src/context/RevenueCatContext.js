import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const RevenueCatContext = createContext();

const API_KEY = 'appl_DAxZGGbcBkxcpJbYKzIeqeGvufz';
const ENTITLEMENT_ID = 'Nell Pro';

export function RevenueCatProvider({ children }) {
  const [isProUser, setIsProUser] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [offerings, setOfferings] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let listener;
    const init = async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        await Purchases.configure({ apiKey: API_KEY });

        // Force fresh data
        await Purchases.invalidateCustomerInfoCache();

        const info = await Purchases.getCustomerInfo();
        updateCustomerInfo(info);

        const offs = await Purchases.getOfferings();
        console.log('[RC] offerings:', JSON.stringify(offs?.current?.availablePackages?.map(p => p.packageType)));
        setOfferings(offs);

        listener = Purchases.addCustomerInfoUpdateListener((info) => {
          updateCustomerInfo(info);
        });
      } catch (e) {
        console.warn('RevenueCat init error:', e.message || e);
      } finally {
        setIsReady(true);
      }
    };

    init();

    return () => {
      if (listener) listener.remove();
    };
  }, []);

  const updateCustomerInfo = (info) => {
    setCustomerInfo(info);
    const entitlement = info?.entitlements?.active?.[ENTITLEMENT_ID];
    setIsProUser(!!entitlement);
  };

  const purchasePackage = useCallback(async (pkg) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      updateCustomerInfo(customerInfo);
      return { success: true, customerInfo };
    } catch (e) {
      if (!e.userCancelled) {
        console.error('Purchase error:', e);
      }
      return { success: false, error: e, userCancelled: e.userCancelled };
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      updateCustomerInfo(info);
      return { success: true, customerInfo: info };
    } catch (e) {
      console.error('Restore error:', e);
      return { success: false, error: e };
    }
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      updateCustomerInfo(info);
      return info;
    } catch (e) {
      console.error('Refresh error:', e);
      return null;
    }
  }, []);

  const value = {
    isProUser,
    customerInfo,
    offerings,
    isReady,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export const useRevenueCat = () => useContext(RevenueCatContext);
export { ENTITLEMENT_ID };
