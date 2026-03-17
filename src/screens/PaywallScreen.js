import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Linking, ScrollView, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useRevenueCat } from '../context/RevenueCatContext';

const PRIVACY_URL = 'https://sr6labs.co.uk/privacy';
const TERMS_URL = 'https://sr6labs.co.uk/terms';

const FEATURES = [
  { image: require('../../assets/rapid.png'), title: 'Rapid Logging', desc: 'Thoughts into tasks instantly' },
  { image: require('../../assets/pom.png'), title: 'Pomodoro Timer', desc: 'Smart focus sessions' },
  { image: require('../../assets/project.png'), title: 'Project Boards', desc: 'Kanban boards & calendar sync' },
  { image: require('../../assets/refresh.png'), title: 'Unlimited Everything', desc: 'No limits on tasks or projects' },
];

export default function PaywallScreen({ onComplete }) {
  const { colors } = useTheme();
  const { isReady, isProUser, offerings, purchasePackage, restorePurchases } = useRevenueCat();
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Auto-dismiss if already pro
  React.useEffect(() => {
    if (isProUser) onComplete();
  }, [isProUser]);

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isProUser) return null;

  const packages = offerings?.current?.availablePackages || [];
  const annual = packages.find(p => p.packageType === 'ANNUAL');
  const monthly = packages.find(p => p.packageType === 'MONTHLY');
  const displayPackages = [annual, monthly].filter(Boolean);

  // Auto-select annual (best value) or first available
  if (!selectedPkg && displayPackages.length > 0) {
    setTimeout(() => setSelectedPkg(annual || displayPackages[0]), 0);
  }

  // Calculate savings
  const savingsText = useMemo(() => {
    if (!annual || !monthly) return null;
    const annualMonthly = annual.product.price / 12;
    const pct = Math.round((1 - annualMonthly / monthly.product.price) * 100);
    return pct > 0 ? `Save ${pct}%` : null;
  }, [annual, monthly]);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setIsPurchasing(true);
    const result = await purchasePackage(selectedPkg);
    setIsPurchasing(false);
    if (result.success) {
      onComplete();
    } else if (!result.userCancelled) {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    const result = await restorePurchases();
    setIsRestoring(false);
    if (result.success) {
      if (result.customerInfo?.entitlements?.active?.['Nell Pro']) {
        onComplete();
      } else {
        Alert.alert('No Purchases Found', "We couldn't find any previous purchases to restore.");
      }
    } else {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    }
  };

  const formatPrice = (pkg) => {
    if (!pkg) return '';
    const p = pkg.product;
    if (pkg.packageType === 'ANNUAL') {
      return `${p.priceString}/year`;
    }
    return `${p.priceString}/month`;
  };

  const formatSubPrice = (pkg) => {
    if (!pkg || pkg.packageType !== 'ANNUAL') return null;
    const p = pkg.product;
    const monthlyPrice = p.price / 12;
    // Use Intl to format in the user's locale with the correct currency
    try {
      const formatted = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: p.currencyCode,
      }).format(monthlyPrice);
      return `Just ${formatted}/month`;
    } catch {
      return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.icon}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            Unlock Nell Pro
          </Text>
          <Text style={[styles.subtitle, { color: colors.accent }]}>
            7-day free trial — cancel anytime
          </Text>
        </View>

        {/* Package Options */}
        {displayPackages.length > 0 && (
          <View style={styles.packages}>
            {displayPackages.map((pkg) => {
              const isSelected = selectedPkg?.identifier === pkg.identifier;
              const isAnnual = pkg.packageType === 'ANNUAL';
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.pkgCard,
                    {
                      backgroundColor: isSelected ? colors.accent + '15' : colors.bgCard,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedPkg(pkg)}
                  activeOpacity={0.7}
                >
                  {isAnnual && savingsText && (
                    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                      <Text style={styles.badgeText}>{savingsText}</Text>
                    </View>
                  )}
                  <View style={styles.pkgContent}>
                    <View style={[styles.radio, { borderColor: isSelected ? colors.accent : colors.textMuted }]}>
                      {isSelected && <View style={[styles.radioFill, { backgroundColor: colors.accent }]} />}
                    </View>
                    <View style={styles.pkgInfo}>
                      <Text style={[styles.pkgName, { color: colors.text }]}>
                        {isAnnual ? 'Annual' : 'Monthly'}
                      </Text>
                      <Text style={[styles.pkgPrice, { color: colors.textSecondary }]}>
                        {formatPrice(pkg)}
                      </Text>
                      <Text style={[styles.pkgTrial, { color: colors.accentGreen || '#4CAF50' }]}>
                        7-day free trial
                      </Text>
                      {formatSubPrice(pkg) && (
                        <Text style={[styles.pkgSub, { color: colors.accent }]}>
                          {formatSubPrice(pkg)}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <Image source={f.image} style={styles.featureIcon} resizeMode="contain" />
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
              </View>
              <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>
            </View>
          ))}
        </View>

        {/* No packages fallback */}
        {displayPackages.length === 0 && (
          <View style={[styles.noPackages, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.noPackagesText, { color: colors.textSecondary }]}>
              Subscription options are loading...
            </Text>
            <TouchableOpacity
              onPress={onComplete}
              style={{ marginTop: 16, padding: 10 }}
            >
              <Text style={[styles.linkText, { color: colors.accent }]}>Continue for free →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.purchaseBtn, { backgroundColor: colors.accent }]}
          onPress={handlePurchase}
          disabled={isPurchasing || !selectedPkg}
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.purchaseBtnText}>Start Free Trial</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclosure, { color: colors.textMuted }]}>
          7-day free trial, then payment will be charged to your Apple ID account.
          Subscription automatically renews unless cancelled at least 24 hours before the
          end of the current period.
        </Text>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={[styles.linkText, { color: colors.accent }]}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.linkSep, { color: colors.textMuted }]}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[styles.linkText, { color: colors.accent }]}>Terms</Text>
          </TouchableOpacity>
          <Text style={[styles.linkSep, { color: colors.textMuted }]}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={[styles.linkText, { color: colors.accent }]}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  icon: { width: 52, height: 52, borderRadius: 12, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  subtitle: { fontSize: 14, fontWeight: '700' },

  trialBanner: { display: 'none' },
  trialBannerText: { display: 'none' },
  trialBannerSub: { display: 'none' },

  featuresCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  featureIcon: { width: 24, height: 24, marginRight: 10 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  featureDesc: { fontSize: 13 },
  checkmark: { fontSize: 18, fontWeight: '700', marginLeft: 8 },

  packages: { gap: 10, marginBottom: 14 },
  pkgCard: { borderRadius: 12, padding: 14, position: 'relative', overflow: 'hidden' },
  badge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  pkgContent: { flexDirection: 'row', alignItems: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  pkgInfo: { flex: 1 },
  pkgName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  pkgPrice: { fontSize: 14 },
  pkgTrial: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  pkgSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  noPackages: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center' },
  noPackagesText: { fontSize: 14 },

  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6, borderTopWidth: StyleSheet.hairlineWidth },
  purchaseBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  purchaseBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  disclosure: { fontSize: 10, lineHeight: 14, textAlign: 'center', marginBottom: 6 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 4 },
  linkText: { fontSize: 13, fontWeight: '600' },
  linkSep: { fontSize: 10 },
});
