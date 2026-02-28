import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';

export default function DebugScreen({ navigation }) {
  const { colors } = useTheme();
  const { offerings, customerInfo, isProUser, isReady } = useRevenueCat();
  const [expanded, setExpanded] = useState(null);

  const currentOffering = offerings?.current;
  const allOfferings = offerings?.all || {};

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: colors.accent }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🔧 RC Debug</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Status</Text>
          <Row label="SDK Ready" value={isReady ? '✅ Yes' : '❌ No'} colors={colors} />
          <Row label="Is Pro User" value={isProUser ? '✅ Yes' : '❌ No'} colors={colors} />
          <Row label="Active Entitlements" value={
            Object.keys(customerInfo?.entitlements?.active || {}).join(', ') || 'None'
          } colors={colors} />
          <Row label="Customer ID" value={customerInfo?.originalAppUserId || 'N/A'} colors={colors} />
        </View>

        {/* Current Offering */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Current Offering</Text>
          {currentOffering ? (
            <>
              <Row label="Identifier" value={currentOffering.identifier} colors={colors} />
              <Row label="Packages" value={`${currentOffering.availablePackages?.length || 0} found`} colors={colors} />
            </>
          ) : (
            <Text style={[styles.warn, { color: colors.accentRed }]}>
              ⚠️ No current offering found. Check RevenueCat → Offerings → make sure one is marked as "Current".
            </Text>
          )}
        </View>

        {/* All Offerings */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>All Offerings ({Object.keys(allOfferings).length})</Text>
          {Object.keys(allOfferings).length === 0 && (
            <Text style={[styles.warn, { color: colors.accentRed }]}>
              ⚠️ No offerings returned by SDK. Check: RevenueCat project has offerings with products attached.
            </Text>
          )}
          {Object.entries(allOfferings).map(([key, offering]) => (
            <View key={key} style={[styles.offering, { borderTopColor: colors.border }]}>
              <Text style={[styles.offeringName, { color: colors.accent }]}>
                {offering.identifier} {offering.identifier === currentOffering?.identifier ? '(CURRENT)' : ''}
              </Text>
              {offering.availablePackages?.map((pkg, i) => (
                <PackageCard key={i} pkg={pkg} colors={colors} />
              ))}
            </View>
          ))}
        </View>

        {/* Packages Detail */}
        {currentOffering?.availablePackages?.map((pkg, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Package: {pkg.identifier}
            </Text>
            <PackageCard pkg={pkg} colors={colors} detailed />
          </View>
        ))}

        {/* Raw JSON */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          onPress={() => setExpanded(expanded === 'offerings' ? null : 'offerings')}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Raw Offerings JSON {expanded === 'offerings' ? '▼' : '▶'}
          </Text>
          {expanded === 'offerings' && (
            <Text style={[styles.json, { color: colors.textSecondary }]}>
              {JSON.stringify(offerings, null, 2)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          onPress={() => setExpanded(expanded === 'customer' ? null : 'customer')}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Raw CustomerInfo JSON {expanded === 'customer' ? '▼' : '▶'}
          </Text>
          {expanded === 'customer' && (
            <Text style={[styles.json, { color: colors.textSecondary }]}>
              {JSON.stringify(customerInfo, null, 2)}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, colors }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]} selectable>{value}</Text>
    </View>
  );
}

function PackageCard({ pkg, colors, detailed }) {
  const product = pkg.product;
  const intro = product?.introPrice;

  return (
    <View style={[styles.pkgCard, { borderColor: colors.border }]}>
      <Row label="Package ID" value={pkg.identifier} colors={colors} />
      <Row label="Product ID" value={product?.identifier || 'N/A'} colors={colors} />
      <Row label="Price" value={product?.priceString || 'N/A'} colors={colors} />
      <Row label="Period" value={product?.subscriptionPeriod || 'N/A'} colors={colors} />
      <Row label="Has Intro/Trial" value={intro ? '✅ Yes' : '❌ No'} colors={colors} />
      {intro && (
        <>
          <Row label="Intro Price" value={intro.priceString || `${intro.price}`} colors={colors} />
          <Row label="Intro Period" value={intro.periodUnit ? `${intro.periodNumberOfUnits} ${intro.periodUnit}` : JSON.stringify(intro)} colors={colors} />
          <Row label="Intro Type" value={intro.paymentMode || 'N/A'} colors={colors} />
        </>
      )}
      {detailed && (
        <Row label="Raw Product" value={JSON.stringify(product, null, 2)} colors={colors} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingRight: 20, paddingBottom: 8 },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 32, fontWeight: '300' },
  title: { fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 4,
  },
  rowLabel: { fontSize: 13, flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '600', flex: 1.5, textAlign: 'right' },
  warn: { fontSize: 13, lineHeight: 18, paddingVertical: 4 },
  offering: { paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  offeringName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  pkgCard: { paddingVertical: 6, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth },
  json: { fontSize: 10, fontFamily: 'Courier', lineHeight: 14, marginTop: 4 },
});
