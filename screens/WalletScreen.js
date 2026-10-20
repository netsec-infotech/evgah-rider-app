import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';
import { WebView } from 'react-native-webview';
import { apiPost } from '../services/api';
import { apiGet, getStoredRider, last10, rupee, shortDate } from '../services/api';

const BRAND_PURPLE = '#240B4C';
const BRAND_PURPLE_ACCENT = '#5B21B6';
const BRAND_VIOLET = '#7C3AED';
const PAGE = '#F4F6FB';

const AMOUNTS = [100, 250, 500, 1000];

const TX_FILTERS = [
  { id: 'all', label: 'All Activity' },
  { id: 'credit', label: 'Added / Refunds' },
  { id: 'debit', label: 'Ride Fares' },
];

const TRANSACTIONS = [
  {
    id: 'TXN_TOPUP_882',
    title: 'Wallet Top-Up',
    detail: 'Razorpay UPI Payment',
    date: '28 Aug 2026 · 10:15 AM',
    amount: '+₹500.00',
    credit: true,
    method: 'Razorpay UPI',
    status: 'Completed',
    booking: 'EVG_TOPUP_882',
    note: 'Added to main balance via Google Pay.',
  },
  {
    id: 'TXN_DEP_412',
    title: 'Security Deposit Held',
    detail: 'Refundable Security Deposit',
    date: '27 Aug 2026 · 02:30 PM',
    amount: '+₹250.00',
    credit: true,
    method: 'Wallet Deposit',
    status: 'Completed',
    booking: 'EVG270826',
    note: '₹250 refundable security deposit.',
  },
  {
    id: 'TXN_RIDE_991',
    title: 'EV Ride Reservation',
    detail: 'Gotri Zone · Evegah Mink',
    date: '28 Aug 2026 · 06:00 PM',
    amount: '−₹199.00',
    credit: false,
    method: 'UPI AutoPay',
    status: 'Completed',
    booking: 'EVG141026',
    note: 'Evegah Mink · Gotri to Manjalpur',
  },
  {
    id: 'TXN_RIDE_120',
    title: 'EV Ride Fare',
    detail: 'Alkapuri Zone · Evegah City',
    date: '12 Oct 2024 · 06:20 PM',
    amount: '−₹146.00',
    credit: false,
    method: 'UPI',
    status: 'Completed',
    booking: 'EVG121026',
    note: 'Evegah City · Alkapuri to Vasna',
  },
];

function moneyLabel(value) {
  return `₹${Math.abs(Math.round(Number(value) || 0)).toLocaleString('en-IN')}`;
}

export default function WalletScreen({
  onOpenHome,
  onOpenMyRide,
  onOpenScan,
  onOpenProfile,
  onOffers,
  onOpenTx,
  phone,
  enterCards = true,
}) {
  const insets = useSafeAreaInsets();
  const enter = (index) => (enterCards ? cardEnter(index) : undefined);
  const scrollRef = useRef(null);
  const [rows, setRows] = useState(TRANSACTIONS);
  const [txFilter, setTxFilter] = useState('all');
  const [balance, setBalance] = useState(null);
  const [added, setAdded] = useState(0);
  const [sheet, setSheet] = useState(null); // 'add' | 'out' | null
  const [picked, setPicked] = useState(250);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    let active = true;
    async function loadData() {
      let mobile = last10(phone);
      if (!mobile) {
        try {
          const stored = await getStoredRider();
          mobile = last10(stored?.mobile || stored?.phone);
        } catch (_) {}
      }
      if (!mobile) return;
      apiGet(`/wallet/balance?mobile=${mobile}`)
        .then((body) => {
          if (active && body?.data) setBalance(body.data);
        })
        .catch(() => {});
      apiGet(`/wallet/transactions?mobile=${mobile}`)
        .then((body) => {
          if (!active) return;
          const list = body?.data || [];
          if (!list.length) return;
          const seenKeys = new Set();
          const mapped = [];
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const rawId = item.transaction_id || item.id || `TXN_${i}`;
            const kind = String(item.type || '').toLowerCase();
            const credit = kind === 'credit' || kind.includes('add');
            if (!seenKeys.has(String(rawId))) {
              seenKeys.add(String(rawId));
              mapped.push({
                id: String(rawId),
                title: item.title,
                detail: item.subtitle || item.payment_method || '',
                date: shortDate(item.created_at),
                amount: rupee(item.amount, credit),
                credit,
                method: item.payment_method || 'UPI',
                status: item.status || 'Completed',
                booking: item.reservation_id || '',
                note: item.note || '',
              });
            }
          }
          if (mapped.length > 0) setRows(mapped);
        })
        .catch(() => {});
    }
    loadData();
    return () => {
      active = false;
    };
  }, [phone]);

  const mainNum = Number(balance?.main_balance || 350) + added;
  const bonusNum = Number(balance?.bonus_balance || 150);
  const totalNum = mainNum + bonusNum;
  const main = moneyLabel(mainNum);
  const bonus = moneyLabel(bonusNum);
  const total = moneyLabel(totalNum);
  const amount = custom.trim()
    ? Math.max(0, Math.round(Number(custom) || 0))
    : picked;

  const filteredRows = useMemo(() => {
    if (txFilter === 'credit') return rows.filter((r) => r.credit);
    if (txFilter === 'debit') return rows.filter((r) => !r.credit);
    return rows;
  }, [rows, txFilter]);

  const openSheet = (mode) => {
    if (mode === 'out') {
      Alert.alert(
        'Withdrawals Temporarily Paused',
        'Wallet withdrawals to external bank accounts are temporarily paused for scheduled banking gateway maintenance. Your complete balance remains 100% secure and available for all EV rides and battery swaps.',
        [{ text: 'Understood', style: 'default' }]
      );
      return;
    }
    setPicked(250);
    setCustom('');
    setSheet(mode);
  };

  const closeSheet = () => {
    setSheet(null);
    setCustom('');
  };

  // PayU Real Gateway Checkout States
  const [payuModalVisible, setPayuModalVisible] = useState(false);
  const [payuCheckoutUrl, setPayuCheckoutUrl] = useState(null);
  const [payuTxnId, setPayuTxnId] = useState(null);
  const [payuLoading, setPayuLoading] = useState(true);
  const [payuPendingAmount, setPayuPendingAmount] = useState(0);
  const payuPollRef = useRef(null);

  const fetchWalletData = async () => {
    let mobile = last10(phone);
    if (!mobile) {
      try {
        const stored = await getStoredRider();
        mobile = last10(stored?.mobile || stored?.phone);
      } catch (_) {}
    }
    if (!mobile) return;
    try {
      const bRes = await apiGet(`/wallet/balance?mobile=${mobile}`);
      if (bRes?.data) setBalance(bRes.data);
    } catch (_) {}
    try {
      const txRes = await apiGet(`/wallet/transactions?mobile=${mobile}`);
      const list = txRes?.data || [];
      if (list.length > 0) {
        const seenKeys = new Set();
        const mapped = [];
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          const rawId = t.transaction_id || t.id || `TXN_${i}`;
          if (!seenKeys.has(String(rawId))) {
            seenKeys.add(String(rawId));
            mapped.push({
              id: String(rawId),
              title: t.title || 'Wallet Top-Up',
              detail: t.subtitle || t.description || 'PayU India Secure Payment',
              date: shortDate(t.created_at || t.timestamp),
              amount: `${String(t.type || '').toLowerCase().includes('credit') ? '+' : '−'}₹${Math.abs(Number(t.amount || 0)).toFixed(2)}`,
              credit: String(t.type || '').toLowerCase().includes('credit'),
              method: t.payment_method || 'PayU India',
              status: t.status || 'Completed',
              booking: t.transaction_id || String(rawId),
              note: t.subtitle || 'Credited to Evegah wallet',
            });
          }
        }
        if (mapped.length > 0) setRows(mapped);
      }
    } catch (_) {}
  };

  const handlePayuSuccess = (confirmedTxnId) => {
    if (payuPollRef.current) clearInterval(payuPollRef.current);
    setPayuModalVisible(false);
    fetchWalletData();
    Alert.alert(
      'Wallet Top-Up Successful! 🎉',
      `₹${payuPendingAmount} has been successfully added to your Evegah Wallet via PayU.`
    );
  };

  const handlePayuFailure = (errMsg) => {
    if (payuPollRef.current) clearInterval(payuPollRef.current);
    setPayuModalVisible(false);
    Alert.alert(
      'Payment Incomplete',
      errMsg || 'Transaction could not be completed with PayU. No amount was deducted.'
    );
  };

  const handleCancelPayuModal = () => {
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to cancel the ongoing PayU top-up session?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            if (payuPollRef.current) clearInterval(payuPollRef.current);
            setPayuModalVisible(false);
          },
        },
      ]
    );
  };

  const onWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYU_PAYMENT_RESPONSE') {
        if (String(data.status || '').toLowerCase() === 'success') {
          handlePayuSuccess(data.txnid || payuTxnId);
        } else {
          handlePayuFailure(data.message || 'Payment was cancelled or failed.');
        }
      }
    } catch (_) {}
  };

  const onWebViewNavigationStateChange = (navState) => {
    const { url } = navState;
    if (url && (url.includes('/payments/payu/response') || url.includes('/response'))) {
      if (url.includes('status=failed') || url.includes('status=failure') || url.includes('error=')) {
        handlePayuFailure('Payment was cancelled or failed.');
      } else if (url.includes('status=success') || url.includes('status=SUCCESS')) {
        handlePayuSuccess(payuTxnId);
      }
    }
  };

  const startPayuStatusPolling = (txnId) => {
    if (payuPollRef.current) clearInterval(payuPollRef.current);
    let attempts = 0;
    payuPollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 50) {
        clearInterval(payuPollRef.current);
        return;
      }
      try {
        const stRes = await apiGet(`/payments/payu/status/${txnId}`);
        if (stRes?.status === 'success' && stRes?.data) {
          const pStatus = (stRes.data.status || '').toLowerCase();
          if (pStatus === 'success') {
            clearInterval(payuPollRef.current);
            handlePayuSuccess(txnId);
          } else if (pStatus === 'failed' || pStatus === 'failure') {
            clearInterval(payuPollRef.current);
            handlePayuFailure(stRes.data.error_message || 'Payment failed.');
          }
        }
      } catch (_) {}
    }, 3000);
  };

  const handleInitiatePayUWalletTopUp = async (topUpAmount) => {
    closeSheet();
    setPayuPendingAmount(topUpAmount);
    setPayuLoading(true);
    setPayuModalVisible(true);

    try {
      let mobile = last10(phone);
      let riderName = 'Evegah Rider';
      let riderEmail = '';
      try {
        const stored = await getStoredRider();
        if (stored) {
          mobile = last10(stored.mobile || stored.phone) || mobile;
          riderName = stored.rider_name || stored.name || riderName;
          riderEmail = stored.email || '';
        }
      } catch (_) {}

      const initRes = await apiPost('/payments/payu/initiate', {
        amount: topUpAmount,
        rider_name: riderName,
        phone: mobile || '9999999999',
        mobile: mobile || '9999999999',
        email: riderEmail || `rider_${mobile || 'topup'}@evegah.com`,
        purpose: 'wallet_topup',
      });

      if (!initRes || initRes.status !== 'success' || !initRes.data) {
        setPayuModalVisible(false);
        Alert.alert(
          'Payment Notice',
          initRes?.message || 'Could not initiate PayU checkout session. Please check your connection.'
        );
        return;
      }

      const { txnid, tx_id, checkout_url } = initRes.data;
      const finalTxnId = txnid || tx_id;
      const finalCheckoutUrl = checkout_url || `https://evegah.cloud/api/payments/payu/checkout/${finalTxnId}`;

      setPayuTxnId(finalTxnId);
      setPayuCheckoutUrl(finalCheckoutUrl);
      setPayuLoading(false);

      startPayuStatusPolling(finalTxnId);
    } catch (err) {
      setPayuModalVisible(false);
      Alert.alert('Payment Error', err.message || 'Could not connect to payment gateway.');
    }
  };

  const confirmSheet = () => {
    if (!amount) return;
    if (sheet === 'add') {
      handleInitiatePayUWalletTopUp(amount);
    } else {
      const take = Math.min(amount, mainNum);
      if (take > 0) {
        setAdded((value) => value - take);
        const newTx = {
          id: `TXN_WDR_${Date.now().toString().slice(-6)}`,
          title: 'Wallet Withdrawal',
          detail: 'Transferred to UPI Bank Account',
          date: 'Today · Just now',
          amount: `−${moneyLabel(take)}`,
          credit: false,
          method: 'Direct Bank UPI',
          status: 'Completed',
          booking: `EVG_WDR_${Date.now().toString().slice(-4)}`,
          note: `Withdrawn ${moneyLabel(take)} to linked bank account.`,
        };
        setRows((current) => [newTx, ...current]);
        Alert.alert(
          'Withdrawal Initiated',
          `${moneyLabel(take)} is being transferred to your linked UPI bank account.`
        );
      }
      closeSheet();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Deep Purple Hero Header */}
        <LinearGradient
          colors={['#120529', '#250952', '#3B0F7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroHeader, { paddingTop: insets.top + 10 }]}
        >
          {/* Ambient Glow Orbs */}
          <View style={styles.glowOrbTop} pointerEvents="none" />
          <View style={styles.glowOrbRight} pointerEvents="none" />

          {/* Top Navigation Row */}
          <View style={styles.topBar}>
            <Pressable
              hitSlop={10}
              onPress={onOpenHome}
              style={({ pressed }) => [
                styles.topIconBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>

            <View style={styles.topCenterCol}>
              <Text style={styles.topBarTitle}>Evegah Pay</Text>
              <Text style={styles.topBarSub}>DIGITAL MOBILITY WALLET</Text>
            </View>

            <Pressable
              hitSlop={10}
              onPress={() =>
                scrollRef.current?.scrollToEnd({ animated: true })
              }
              style={({ pressed }) => [
                styles.topIconBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name="receipt-outline" size={19} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Glassmorphism Balance Card */}
          <View style={styles.glassBalanceCard}>
            <View style={styles.balanceHeaderRow}>
              <View>
                <Text style={styles.balanceKicker}>TOTAL AVAILABLE BALANCE</Text>
                <Text style={styles.balanceHeroValue}>{total}</Text>
              </View>

              <View style={styles.insuredBadge}>
                <View style={styles.insuredDot} />
                <Ionicons name="shield-checkmark" size={13} color="#34D399" />
                <Text style={styles.insuredBadgeText}>RBI Compliant</Text>
              </View>
            </View>

            {/* 3-Column Sub-Balance Telemetry Strip */}
            <View style={styles.subBalanceStrip}>
              <View style={styles.subBalanceCol}>
                <View style={styles.subBalanceLabelRow}>
                  <Ionicons name="wallet-outline" size={13} color="#C4B5FD" />
                  <Text style={styles.subBalanceLabel}>Withdrawable</Text>
                </View>
                <Text style={styles.subBalanceVal}>{main}</Text>
              </View>

              <View style={styles.subBalanceDivider} />

              <View style={styles.subBalanceCol}>
                <View style={styles.subBalanceLabelRow}>
                  <Ionicons name="sparkles-outline" size={13} color="#FDE047" />
                  <Text style={styles.subBalanceLabel}>Ride Bonus</Text>
                </View>
                <Text style={[styles.subBalanceVal, { color: '#FEF08A' }]}>
                  {bonus}
                </Text>
              </View>

              <View style={styles.subBalanceDivider} />

              <View style={styles.subBalanceCol}>
                <View style={styles.subBalanceLabelRow}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={13}
                    color="#6EE7B7"
                  />
                  <Text style={styles.subBalanceLabel}>Deposit Held</Text>
                </View>
                <Text style={[styles.subBalanceVal, { color: '#A7F3D0' }]}>
                  ₹250
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Floating Quick Actions Dock overlapping the header curve */}
        <Animated.View entering={enter(0)} style={styles.floatingActionsWrap}>
          <View style={styles.actionsDockCard}>
            <Pressable
              onPress={() => openSheet('add')}
              style={({ pressed }) => [
                styles.actionItem,
                pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
              ]}
            >
              <View
                style={[styles.actionIconBox, { backgroundColor: '#F5F3FF' }]}
              >
                <Ionicons
                  name="add-circle"
                  size={22}
                  color={BRAND_PURPLE_ACCENT}
                />
              </View>
              <Text style={styles.actionLabel}>Add Money</Text>
            </Pressable>

            <View style={styles.actionDockDivider} />

            <Pressable
              onPress={() => openSheet('out')}
              style={({ pressed }) => [
                styles.actionItem,
                { opacity: 0.72 },
                pressed && { opacity: 0.5, transform: [{ scale: 0.96 }] },
              ]}
            >
              <View
                style={[styles.actionIconBox, { backgroundColor: '#F1F5F9' }]}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={22}
                  color="#64748B"
                />
              </View>
              <Text style={[styles.actionLabel, { color: '#64748B' }]}>Withdraw</Text>
            </Pressable>

            <View style={styles.actionDockDivider} />

            <Pressable
              onPress={onOffers}
              style={({ pressed }) => [
                styles.actionItem,
                pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
              ]}
            >
              <View
                style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}
              >
                <Ionicons name="pricetag-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.actionLabel}>Vouchers</Text>
            </Pressable>

            <View style={styles.actionDockDivider} />

            <Pressable
              onPress={() =>
                scrollRef.current?.scrollToEnd({ animated: true })
              }
              style={({ pressed }) => [
                styles.actionItem,
                pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
              ]}
            >
              <View
                style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#059669"
                />
              </View>
              <Text style={styles.actionLabel}>Statement</Text>
            </Pressable>
          </View>
        </Animated.View>

        <View style={styles.bodyContainer}>
          {/* Cashback / Bonus Offer Card */}
          <Animated.View entering={enter(1)}>
            <Pressable
              onPress={() => openSheet('add')}
              style={({ pressed }) => [
                styles.promoBannerOuter,
                pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
              ]}
            >
              <LinearGradient
                colors={['#2E1065', '#4C1D95', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.promoBannerGrad}
              >
                <View style={styles.promoBadgeBox}>
                  <Ionicons name="flash" size={20} color="#FDE047" />
                </View>

                <View style={styles.promoContentCol}>
                  <View style={styles.promoTagRow}>
                    <Text style={styles.promoTagText}>INSTANT REWARD</Text>
                  </View>
                  <Text style={styles.promoTitle}>
                    Get 10% Extra Ride Credits
                  </Text>
                  <Text style={styles.promoSub}>
                    Top up ₹500 or more & unlock zero-deposit fast unlocking.
                  </Text>
                </View>

                <View style={styles.promoCtaCircle}>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={BRAND_PURPLE}
                  />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Passbook Header & Filter Pills */}
          <View style={styles.passbookHeaderSection}>
            <View style={styles.passbookTitleRow}>
              <View>
                <Text style={styles.passbookTitle}>Passbook & History</Text>
                <Text style={styles.passbookSub}>
                  All UPI top-ups, ride fares & deposit logs
                </Text>
              </View>
              <View style={styles.recordCountPill}>
                <Text style={styles.recordCountText}>
                  {filteredRows.length} entries
                </Text>
              </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterPillsRow}>
              {TX_FILTERS.map((f) => {
                const active = txFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setTxFilter(f.id)}
                    style={[
                      styles.txFilterChip,
                      active && styles.txFilterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.txFilterChipText,
                        active && styles.txFilterChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Transactions List */}
          <View style={styles.txList}>
            {filteredRows.map((item, index) => {
              const isCredit = item.credit;
              return (
                <Animated.View key={`${item.id}_${index}`} entering={enter(index + 2)}>
                  <Pressable
                    onPress={() => onOpenTx?.(item)}
                    style={({ pressed }) => [
                      styles.txCard,
                      pressed && styles.txCardPressed,
                    ]}
                  >
                    {/* Left Icon */}
                    <View
                      style={[
                        styles.txIconBox,
                        isCredit
                          ? {
                              backgroundColor: '#ECFDF5',
                              borderColor: '#A7F3D0',
                            }
                          : {
                              backgroundColor: '#F5F3FF',
                              borderColor: '#DDD6FE',
                            },
                      ]}
                    >
                      <Ionicons
                        name={
                          isCredit
                            ? 'arrow-down-outline'
                            : 'bicycle-outline'
                        }
                        size={20}
                        color={isCredit ? '#059669' : BRAND_VIOLET}
                      />
                    </View>

                    {/* Center Details */}
                    <View style={styles.txDetailsCol}>
                      <View style={styles.txTopRow}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>

                      <Text style={styles.txSubtitle} numberOfLines={1}>
                        {item.detail || item.method}
                      </Text>

                      <View style={styles.txMetaRow}>
                        <Text style={styles.txDate}>{item.date}</Text>
                        {item.booking ? (
                          <>
                            <View style={styles.txMetaDot} />
                            <Text style={styles.txBookingTag}>
                              #{item.booking}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>

                    {/* Right Amount & Status */}
                    <View style={styles.txRightCol}>
                      <Text
                        style={[
                          styles.txAmount,
                          isCredit
                            ? styles.txAmountCredit
                            : styles.txAmountDebit,
                        ]}
                      >
                        {item.amount}
                      </Text>
                      <View style={styles.txMethodMiniRow}>
                        <Text style={styles.txMethodMiniText}>
                          {item.method}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={13}
                          color="#94A3B8"
                        />
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Modern Docked Bottom Navigation */}
      <View
        style={[
          styles.tabBarWrap,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <View style={styles.tabBar}>
          <Pressable style={styles.tabItem} onPress={onOpenHome}>
            <Ionicons name="home-outline" size={21} color="#94A3B8" />
            <Text style={styles.tabLabel}>Home</Text>
          </Pressable>

          <Pressable style={styles.tabItem} onPress={onOpenMyRide}>
            <Ionicons name="bicycle-outline" size={22} color="#94A3B8" />
            <Text style={styles.tabLabel}>My Rides</Text>
          </Pressable>

          <Pressable style={styles.scanTabItem} onPress={onOpenScan}>
            <LinearGradient
              colors={['#6D28D9', '#4C1D95']}
              style={styles.scanFloatingBtn}
            >
              <Ionicons name="qr-code-outline" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.scanTabLabel}>Scan</Text>
          </Pressable>

          <Pressable style={styles.tabItem}>
            <View style={styles.activeTabIndicator} />
            <Ionicons name="wallet" size={21} color={BRAND_PURPLE_ACCENT} />
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Wallet</Text>
          </Pressable>

          <Pressable style={styles.tabItem} onPress={onOpenProfile}>
            <Ionicons name="person-outline" size={21} color="#94A3B8" />
            <Text style={styles.tabLabel}>Profile</Text>
          </Pressable>
        </View>
      </View>

      {/* Add / Withdraw Bottom Sheet Modal */}
      {sheet ? (
        <Modal
          visible={Boolean(sheet)}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={closeSheet}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalTouchDismiss} onPress={closeSheet} />

            <View
              style={[
                styles.modalSheet,
                { paddingBottom: Math.max(insets.bottom, 22) },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.sheetHandle} />

              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleCol}>
                  <View style={styles.modalKickerPill}>
                    <Ionicons
                      name={
                        sheet === 'add'
                          ? 'flash-outline'
                          : 'arrow-up-circle-outline'
                      }
                      size={12}
                      color={BRAND_VIOLET}
                    />
                    <Text style={styles.modalKickerText}>
                      {sheet === 'add' ? 'INSTANT TOP-UP' : 'BANK TRANSFER'}
                    </Text>
                  </View>
                  <Text style={styles.modalTitle}>
                    {sheet === 'add'
                      ? 'Add Money to Wallet'
                      : 'Withdraw to Bank'}
                  </Text>
                  <Text style={styles.modalSub}>
                    {sheet === 'add'
                      ? 'Zero convenience fees • Instant ride credits'
                      : `Available withdrawable balance: ${main}`}
                  </Text>
                </View>

                <Pressable
                  hitSlop={12}
                  onPress={closeSheet}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </Pressable>
              </View>

              {/* Amount Input Display Box */}
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  keyboardType="number-pad"
                  placeholder={String(picked)}
                  placeholderTextColor="#0F172A"
                  style={styles.amountInput}
                />
                {custom.length > 0 ? (
                  <Pressable hitSlop={10} onPress={() => setCustom('')}>
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </Pressable>
                ) : (
                  <View style={styles.selectedTagPill}>
                    <Text style={styles.selectedTagText}>Selected</Text>
                  </View>
                )}
              </View>

              {/* Quick Preset Chips with Bonus Badges */}
              <View style={styles.presetChipsRow}>
                {AMOUNTS.map((val) => {
                  const isActive = !custom.trim() && picked === val;
                  const hasBonus = sheet === 'add' && val >= 500;
                  return (
                    <Pressable
                      key={val}
                      onPress={() => {
                        setCustom('');
                        setPicked(val);
                      }}
                      style={[
                        styles.presetChip,
                        isActive && styles.presetChipActive,
                      ]}
                    >
                      {hasBonus && (
                        <View style={styles.bonusMiniRibbon}>
                          <Text style={styles.bonusMiniRibbonText}>+10%</Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.presetChipText,
                          isActive && styles.presetChipTextActive,
                        ]}
                      >
                        +₹{val}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Security Guarantee Strip */}
              <View style={styles.securityBanner}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#059669"
                />
                <Text style={styles.securityBannerText}>
                  {sheet === 'add'
                    ? '256-bit Encrypted UPI Payment • Powered by PayU'
                    : 'Direct IMPS/UPI settlement to your verified bank account'}
                </Text>
              </View>

              {/* Primary Confirm CTA */}
              <Pressable
                onPress={confirmSheet}
                style={({ pressed }) => [
                  styles.modalPrimaryBtn,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LinearGradient
                  colors={['#5B21B6', '#3B0F7A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalPrimaryGrad}
                >
                  <Ionicons
                    name={
                      sheet === 'add'
                        ? 'shield-checkmark-outline'
                        : 'paper-plane-outline'
                    }
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.modalPrimaryText}>
                    {sheet === 'add'
                      ? `Proceed to Add ${moneyLabel(amount)}`
                      : `Withdraw ${moneyLabel(amount)}`}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* PayU Wallet Top-Up In-App Checkout Modal */}
      <Modal
        visible={payuModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancelPayuModal}
      >
        <View style={styles.payuModalContainer}>
          <StatusBar style="dark" />
          <View style={[styles.payuHeader, { paddingTop: insets.top + 8 }]}>
            <View style={styles.payuHeaderLeft}>
              <View style={styles.payuLogoBadge}>
                <Ionicons name="card" size={18} color="#4A168C" />
              </View>
              <View>
                <Text style={styles.payuHeaderTitle}>Add Money to Wallet</Text>
                <Text style={styles.payuHeaderSubtitle}>Secure 256-bit SSL encrypted</Text>
              </View>
            </View>
            <View style={styles.payuHeaderRight}>
              <View style={styles.payuAmountPill}>
                <Text style={styles.payuAmountText}>₹{payuPendingAmount}</Text>
              </View>
              <Pressable
                onPress={handleCancelPayuModal}
                style={styles.payuCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#334155" />
              </Pressable>
            </View>
          </View>

          {payuLoading && (
            <View style={styles.payuLoadingBar}>
              <ActivityIndicator size="small" color="#4A168C" />
              <Text style={styles.payuLoadingText}>Connecting to Payment Gateway...</Text>
            </View>
          )}

          {payuCheckoutUrl ? (
            <WebView
              source={{ uri: payuCheckoutUrl }}
              style={styles.payuWebView}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.payuWebLoader}>
                  <ActivityIndicator size="large" color="#4A168C" />
                  <Text style={styles.payuWebLoaderText}>Loading PayU Payment Interface...</Text>
                </View>
              )}
              onLoadStart={() => setPayuLoading(true)}
              onLoadEnd={() => setPayuLoading(false)}
              onNavigationStateChange={onWebViewNavigationStateChange}
              onMessage={onWebViewMessage}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 118,
  },

  /* Hero Header */
  heroHeader: {
    paddingHorizontal: 18,
    paddingBottom: 52,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -70,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  glowOrbRight: {
    position: 'absolute',
    bottom: -30,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenterCol: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  topBarSub: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1.1,
    marginTop: 2,
  },

  /* Glassmorphism Balance Card */
  glassBalanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.11)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 18,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  balanceKicker: {
    fontSize: 10.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 1,
  },
  balanceHeroValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginTop: 3,
  },
  insuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  insuredDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34D399',
  },
  insuredBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D1FAE5',
  },
  subBalanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  subBalanceCol: {
    flex: 1,
    alignItems: 'center',
  },
  subBalanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  subBalanceLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
  },
  subBalanceVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subBalanceDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  /* Floating Quick Actions Dock */
  floatingActionsWrap: {
    paddingHorizontal: 16,
    marginTop: -30,
    zIndex: 20,
  },
  actionsDockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 5,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  actionDockDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#F1F5F9',
  },

  /* Main Body */
  bodyContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Cashback / Bonus Offer Card */
  promoBannerOuter: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: BRAND_PURPLE_ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  promoBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  promoBadgeBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  promoContentCol: {
    flex: 1,
    paddingRight: 8,
  },
  promoTagRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(253, 224, 71, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  promoTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.7,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  promoSub: {
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    lineHeight: 16,
  },
  promoCtaCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Passbook Header & Filters */
  passbookHeaderSection: {
    marginBottom: 14,
  },
  passbookTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  passbookTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  passbookSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  recordCountPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  recordCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  txFilterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txFilterChipActive: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  txFilterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  txFilterChipTextActive: {
    color: '#FFFFFF',
  },

  /* Transaction Cards */
  txList: {
    gap: 11,
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
  },
  txCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  txIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetailsCol: {
    flex: 1,
    paddingRight: 8,
  },
  txTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  txSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  txDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  txMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  txBookingTag: {
    fontSize: 10.5,
    fontWeight: '800',
    color: BRAND_VIOLET,
  },
  txRightCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15.5,
    fontWeight: '900',
  },
  txAmountCredit: {
    color: '#059669',
  },
  txAmountDebit: {
    color: '#0F172A',
  },
  txMethodMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  txMethodMiniText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },

  /* Bottom Navigation Dock */
  tabBarWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  activeTabIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: BRAND_PURPLE_ACCENT,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 3,
  },
  tabLabelActive: {
    color: BRAND_PURPLE_ACCENT,
    fontWeight: '800',
  },
  scanTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFloatingBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: BRAND_PURPLE_ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  scanTabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 3,
  },

  /* Modal Bottom Sheet */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'flex-end',
  },
  modalTouchDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  modalKickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  modalKickerText: {
    fontSize: 10,
    fontWeight: '800',
    color: BRAND_VIOLET,
    letterSpacing: 0.6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Amount Input Box */
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 58,
    marginBottom: 14,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    paddingVertical: 0,
  },
  selectedTagPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: BRAND_VIOLET,
  },

  /* Preset Chips */
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  presetChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: BRAND_VIOLET,
  },
  bonusMiniRibbon: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  bonusMiniRibbonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  presetChipTextActive: {
    color: BRAND_PURPLE_ACCENT,
  },

  /* Security Banner */
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 18,
  },
  securityBannerText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#065F46',
  },

  /* Modal Primary Button */
  modalPrimaryBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: BRAND_PURPLE_ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  modalPrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  /* PayU Checkout Styles */
  payuModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  payuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  payuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payuLogoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BRAND_PURPLE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payuHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  payuHeaderSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  payuHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payuAmountPill: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  payuAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND_PURPLE_ACCENT,
  },
  payuCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payuLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  payuLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  payuWebView: {
    flex: 1,
  },
  payuWebLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  payuWebLoaderText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});