import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI from 'react-native-purchases-ui';
import { useTheme } from '../context/ThemeContext';
import { useRevenueCat } from '../context/RevenueCatContext';

const PRIVACY_URL = 'https://sr6labs.co.uk/privacy.html';
const TERMS_URL = 'https://sr6labs.co.uk/privacy.html';

export default function PaywallScreen({ onComplete }) {
  const { colors } = useTheme();
  const { isReady, isProUser, restorePurchases } = useRevenueCat();
  const [isRestoring, setIsRestoring] = useState(false);

  // If user already has pro, skip paywall
  if (isProUser) {
    onComplete();
    return null;
  }

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const handleRestore = async () => {
    setIsRestoring(true);
    const result = await restorePurchases();
    setIsRestoring(false);
    if (result.success) {
      const hasEntitlement = result.customerInfo?.entitlements?.active?.['GoalDigger Pro'];
      if (hasEntitlement) {
        onComplete();
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }
    } else {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <RevenueCatUI.Paywall
        style={styles.paywall}
        onPurchaseCompleted={({ customerInfo }) => {
          if (customerInfo?.entitlements?.active?.['GoalDigger Pro']) {
            onComplete();
          }
        }}
        onRestoreCompleted={({ customerInfo }) => {
          if (customerInfo?.entitlements?.active?.['GoalDigger Pro']) {
            onComplete();
          }
        }}
      />

      <View style={[styles.footer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.disclosure, { color: colors.textMuted }]}>
          Payment will be charged to your Apple ID account at confirmation of purchase.
          Subscription automatically renews unless cancelled at least 24 hours before the
          end of the current period. You can manage and cancel your subscriptions in your
          Apple ID account settings.
        </Text>

        <TouchableOpacity onPress={handleRestore} disabled={isRestoring} style={styles.restoreBtn}>
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.accent }]}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[styles.legalLink, { color: colors.accent }]}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={[styles.legalSep, { color: colors.textMuted }]}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={[styles.legalLink, { color: colors.accent }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  paywall: { flex: 1 },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  disclosure: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  restoreBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingBottom: 4,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '500',
  },
  legalSep: {
    fontSize: 12,
  },
});
