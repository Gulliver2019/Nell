import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const RevenueCatContext = createContext();

// TODO: Replace with production RevenueCat Apple API key before App Store submission
const API_KEY = 'test_bVlAWAteFsLVvKuSKoDHTaeSgBd';
const ENTITLEMENT_ID = 'GoalDigger Pro';

export function RevenueCatProvider({ children }) {
  const [isProUser, setIsProUser] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [offerings, setOfferings] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey: API_KEY });

        const info = await Purchases.getCustomerInfo();
        updateCustomerInfo(info);

        const offerings = await Purchases.getOfferings();
        setOfferings(offerings);
      } catch (e) {
        console.error('RevenueCat init error:', e);
      } finally {
        setIsReady(true);
      }
    };

    init();

    // Listen for customer info changes (e.g. subscription renewal/expiration)
    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      updateCustomerInfo(info);
    });

    return () => {
      listener.remove();
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
