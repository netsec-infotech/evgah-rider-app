import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '../services/api';
import { WebView } from 'react-native-webview';

const BRAND_PURPLE = '#4A168C';
const BRAND_PURPLE_DARK = '#250952';
const BRAND_PURPLE_LIGHT = '#F3EEF8';
const BRAND_PURPLE_MID = '#7C3AED';

const DAY_RATE_DEFAULT = {
  'Evegah Fly': 149,
  'Evegah Mink': 199,
  'Evegah City': 229,
  'Evegah Pro': 299,
};

function rupee(amount) {
  const sign = amount < 0 ? '−' : '';
  return `${sign}₹${Math.abs(Math.round(amount)).toLocaleString('en-IN')}`;
}

function billDays(start, end) {
  if (!start || !end || end <= start) return 1;
  const hours = (end - start) / 36e5;
  return Math.max(1, Math.ceil(hours / 24));
}

function getFormattedDropDate(dropAt) {
  if (!dropAt) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('en-IN', { month: 'short' });
    return `${dayName}, ${dayNum} ${monthName}`;
  }
  const d = new Date(dropAt);
  const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
  const dayNum = d.getDate();
  const monthName = d.toLocaleDateString('en-IN', { month: 'short' });
  return `${dayName}, ${dayNum} ${monthName}`;
}

export default function PayScreen({ vehicle, trip, riderProfile, onBack, onPay }) {
  const insets = useSafeAreaInsets();
  const [couponsList, setCouponsList] = useState([]);
  const [pricingRates, setPricingRates] = useState(DAY_RATE_DEFAULT);
  const [offerOn, setOfferOn] = useState(false);
  const [appliedCode, setAppliedCode] = useState('');
  const [appliedDiscountAmt, setAppliedDiscountAmt] = useState(0);
  const [customPromoInput, setCustomPromoInput] = useState('');
  const [couponPopupOpen, setCouponPopupOpen] = useState(false);
  const [breakupModalOpen, setBreakupModalOpen] = useState(false);
  const [refundableModalOpen, setRefundableModalOpen] = useState(false);
  const [editPhoneModalOpen, setEditPhoneModalOpen] = useState(false);
  const [customPhone, setCustomPhone] = useState('');

  // 10-Minute hold countdown timer & incomplete ride popup
  const [holdSeconds, setHoldSeconds] = useState(10 * 60);
  const [incompleteModalVisible, setIncompleteModalVisible] = useState(false);

  // PayU in-app checkout states
  const [isProcessing, setIsProcessing] = useState(false);
  const [payuModalVisible, setPayuModalVisible] = useState(false);
  const [payuCheckoutUrl, setPayuCheckoutUrl] = useState(null);
  const [payuTxnId, setPayuTxnId] = useState(null);
  const [payuLoading, setPayuLoading] = useState(true);
  const payuPollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (payuPollRef.current) clearInterval(payuPollRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setHoldSeconds((s) => {
        if (s <= 1) {
          setIncompleteModalVisible(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRehold = () => {
    setHoldSeconds(10 * 60);
    setIncompleteModalVisible(false);
  };

  const holdMins = String(Math.floor(holdSeconds / 60)).padStart(2, '0');
  const holdSecs = String(holdSeconds % 60).padStart(2, '0');

  // Fetch live coupons & vehicle rates
  useEffect(() => {
    let mounted = true;
    apiGet('/coupons')
      .then((res) => {
        if (!mounted) return;
        const raw = res?.data || (Array.isArray(res) ? res : []);
        const active = raw.filter(
          (c) => String(c.status || '').toLowerCase() === 'active'
        );
        const mapped = active.map((c) => ({
          id: String(c.id || c.code),
          code: c.code,
          title: c.title || `Flat ₹${parseFloat(c.discount_value || 50)} OFF`,
          subtitle: c.description || `Use code ${c.code} on this EV booking`,
          discount: parseFloat(c.discount_value || 50),
          minOrder: parseFloat(c.min_order || 0),
        }));
        setCouponsList(mapped);
      })
      .catch(() => {});

    apiGet('/vehicles/models')
      .then((res) => {
        if (!mounted) return;
        const models = res?.data || (Array.isArray(res) ? res : []);
        if (models.length > 0) {
          const map = { ...DAY_RATE_DEFAULT };
          models.forEach((m) => {
            if (m.name) {
              map[m.name] = m.daily_rate ? parseFloat(m.daily_rate) : (map[m.name] || 199);
            }
          });
          setPricingRates(map);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const days = Math.max(1, billDays(trip?.pickupAt, trip?.dropAt));
  const modelRate =
    vehicle?.pricing?.day ||
    vehicle?.rate ||
    vehicle?.priceNum ||
    (vehicle?.packagePrice !== undefined ? Number(vehicle.packagePrice) : null) ||
    pricingRates[vehicle?.name] ||
    DAY_RATE_DEFAULT[vehicle?.name] ||
    0;

  let fare = 0;
  if (vehicle?.packagePrice !== undefined && vehicle?.packagePrice !== null) {
    const pkgDur = Number(vehicle.packageDuration || trip?.packageDays || 1);
    if (pkgDur > 1) {
      const intervals = Math.max(1, Math.round(days / pkgDur));
      fare = Number(vehicle.packagePrice) * (days <= pkgDur ? 1 : intervals);
    } else {
      fare = Number(vehicle.packagePrice) * days;
    }
  } else {
    fare = modelRate * days;
  }
  const discount = offerOn ? Math.min(appliedDiscountAmt, fare) : 0;
  const deposit = vehicle?.deposit !== undefined ? Number(vehicle.deposit) : 0;
  const flexiDeliveryCharge = Number(trip?.flexiDeliveryCharge || vehicle?.totalDeliveryCharge || 0);
  const totalDeliveryKm = Number(
    trip?.totalDeliveryKm ||
    ((Number(trip?.pickupKm || 0) + Number(trip?.dropKm || 0))) ||
    vehicle?.totalDeliveryKm ||
    0
  );
  const total = Math.max(0, fare + deposit + flexiDeliveryCharge - discount);

  const initialPhone = (riderProfile?.phone || trip?.phone || riderProfile?.mobile || '8128251172')
    .replace(/\D/g, '')
    .slice(-10);
  const cleanPhone = customPhone || initialPhone;

  const handlePayuSuccess = (confirmedTxnId, payuId) => {
    if (payuPollRef.current) clearInterval(payuPollRef.current);
    setPayuModalVisible(false);
    setIsProcessing(false);
    onPay?.({
      fare,
      discount,
      deposit,
      flexiDeliveryCharge,
      totalDeliveryKm,
      total,
      days,
      method: 'PayU',
      appliedCode: offerOn ? appliedCode : null,
      txnid: confirmedTxnId || payuTxnId,
      payu_id: payuId,
    });
  };

  const handlePayuFailure = async (errMsg) => {
    if (payuPollRef.current) clearInterval(payuPollRef.current);

    // Safeguard: Check authoritative status once more before surfacing failure
    try {
      const activeId = payuTxnId;
      if (activeId) {
        const verifyRes = await apiGet(`/payments/payu/status/${activeId}`).catch(() => null);
        const pStatus = String(verifyRes?.data?.status || verifyRes?.data?.payment_status || '').toLowerCase();
        if (pStatus === 'success') {
          handlePayuSuccess(activeId, verifyRes?.data?.payu_payment_id || verifyRes?.data?.payu_id);
          return;
        }
      }
    } catch (_) {}

    setPayuModalVisible(false);
    setIsProcessing(false);
    Alert.alert(
      'Payment Failed',
      errMsg || 'Transaction could not be completed with PayU. Please try again.'
    );
  };

  const handleCancelPayuModal = () => {
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to cancel the ongoing payment session?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            if (payuPollRef.current) clearInterval(payuPollRef.current);

            // Double check if payment actually went through before terminating
            try {
              const activeId = payuTxnId;
              if (activeId) {
                const verifyRes = await apiGet(`/payments/payu/status/${activeId}`).catch(() => null);
                const pStatus = String(verifyRes?.data?.status || verifyRes?.data?.payment_status || '').toLowerCase();
                if (pStatus === 'success') {
                  handlePayuSuccess(activeId, verifyRes?.data?.payu_payment_id || verifyRes?.data?.payu_id);
                  return;
                }
              }
            } catch (_) {}

            setPayuModalVisible(false);
            setIsProcessing(false);
          },
        },
      ]
    );
  };

  const onWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYU_PAYMENT_RESPONSE') {
        const s = String(data.status || '').toLowerCase();
        if (s === 'success') {
          handlePayuSuccess(data.txnid || payuTxnId, data.payu_id);
        } else {
          handlePayuFailure(data.message || 'Payment was cancelled or failed.');
        }
      }
    } catch (_) {}
  };

  const onWebViewNavigationStateChange = (navState) => {
    const { url } = navState;
    if (url) {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('/payments/payu/response') || lowerUrl.includes('/response')) {
        if (lowerUrl.includes('status=failed') || lowerUrl.includes('status=failure')) {
          handlePayuFailure('Payment was cancelled or failed.');
        } else if (lowerUrl.includes('status=success')) {
          handlePayuSuccess(payuTxnId);
        }
      }
    }
  };

  const handleInitiatePayU = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const riderName = riderProfile?.name || trip?.riderName || 'Evegah Rider';
      const riderPhone = cleanPhone || '8128251172';
      const riderEmail = riderProfile?.email || `rider_${riderPhone}@evegah.com`;

      const initRes = await apiPost('/payments/payu/initiate', {
        amount: total,
        rider_name: riderName,
        phone: riderPhone,
        mobile: riderPhone,
        email: riderEmail,
        purpose: 'ride',
      });

      if (!initRes || initRes.status !== 'success' || !initRes.data) {
        setIsProcessing(false);
        Alert.alert(
          'Payment Gateway Error',
          initRes?.message || 'Could not initiate PayU payment. Please check backend.'
        );
        return;
      }

      const finalTxnId = initRes.data.txnid || initRes.data.tx_id || initRes.data.txn_id;
      const finalCheckoutUrl = initRes.data.checkout_url || `https://evegah.cloud/api/payments/payu/checkout/${finalTxnId}`;

      setPayuTxnId(finalTxnId);
      setPayuCheckoutUrl(finalCheckoutUrl);
      setPayuLoading(true);
      setPayuModalVisible(true);

      if (payuPollRef.current) clearInterval(payuPollRef.current);
      let attempts = 0;
      const maxAttempts = 60;
      payuPollRef.current = setInterval(async () => {
        attempts++;
        try {
          const stRes = await apiGet(`/payments/payu/status/${finalTxnId}`);
          const pStatus = String(stRes?.data?.status || stRes?.data?.payment_status || '').toLowerCase();
          if (pStatus === 'success') {
            if (payuPollRef.current) clearInterval(payuPollRef.current);
            handlePayuSuccess(finalTxnId, stRes?.data?.payu_payment_id || stRes?.data?.payu_id);
            return;
          } else if (pStatus === 'failed' || pStatus === 'failure') {
            if (payuPollRef.current) clearInterval(payuPollRef.current);
            handlePayuFailure(stRes?.data?.error_message || 'Payment failed.');
            return;
          }
        } catch (_) {}

        if (attempts >= maxAttempts) {
          if (payuPollRef.current) clearInterval(payuPollRef.current);
        }
      }, 2000);
    } catch (err) {
      setIsProcessing(false);
      Alert.alert('Payment Error', err.message || 'Could not connect to PayU Gateway.');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Top Bar: Arrow Back + Checkout Title + Phone Call Icon ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Pressable hitSlop={12} onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>

        <Pressable
          hitSlop={12}
          onPress={() => {
            Alert.alert(
              'Evegah 24/7 Concierge',
              'Need assistance with your EV booking?\nCall our support line at 1800 889 8791',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Call Now',
                  onPress: () => Linking.openURL('tel:18008898791').catch(() => {}),
                },
              ]
            );
          }}
          style={styles.callSupportBtn}
        >
          <Ionicons name="call" size={20} color={BRAND_PURPLE} />
        </Pressable>
      </View>

      {/* ── Deep Purple Urgency Hold Banner ── */}
      <View style={styles.holdBanner}>
        <Ionicons name="stopwatch-outline" size={19} color="#FFFFFF" />
        <Text style={styles.holdBannerText}>
          On hold for {holdMins}:{holdSecs} mins. Complete your booking in time to make this EV yours.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        {/* ── Refundable Policy Dropdown Text ── */}
        <Pressable
          onPress={() => setRefundableModalOpen(true)}
          style={styles.refundableBar}
        >
          <Text style={styles.refundableText}>
            Booking amount is <Text style={styles.refundableUnderline}>100% refundable</Text>
          </Text>
          <Ionicons name="chevron-down" size={15} color={BRAND_PURPLE} />
        </Pressable>

        {/* ── Vehicle Summary Card with [ON HOLD] Badge ── */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleThumbBox}>
            <View style={styles.onHoldBadge}>
              <Text style={styles.onHoldText}>ON HOLD</Text>
            </View>
            {vehicle?.image ? (
              <Image
                source={vehicle.image}
                style={styles.vehicleThumb}
                contentFit="contain"
              />
            ) : (
              <Ionicons name="bicycle" size={40} color={BRAND_PURPLE} />
            )}
          </View>

          <View style={styles.vehicleInfoCol}>
            <Text style={styles.vehicleTitle} numberOfLines={1}>
              {`${vehicle?.name || 'Evegah Pro'} ${vehicle?.edition || 'Smart Long Range'}`}
            </Text>
            <Text style={styles.vehicleSpecs} numberOfLines={1}>
              {`${vehicle?.range || '70-90 km'} · Electric · Automatic`}
            </Text>
            <View style={styles.vehiclePriceRow}>
              <Text style={styles.vehiclePrice}>{rupee(fare)}</Text>
              <Text style={styles.vehicleEmi}>EMI {vehicle?.emi || '₹1,499/mo'}</Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => setBreakupModalOpen(true)}
              style={styles.viewBreakupLink}
            >
              <Text style={styles.viewBreakupText}>View breakup</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Standard Booking Card (Selected, Purple Outline, Radio, Price) ── */}
        <View style={styles.standardBookingCard}>
          <View style={styles.standardTopRow}>
            <View style={styles.standardTitleGroup}>
              {/* Radio Button */}
              <View style={styles.radioOuter}>
                <View style={styles.radioInner} />
              </View>
              <Text style={styles.standardTitle}>Standard booking</Text>
            </View>

            <Pressable
              hitSlop={8}
              onPress={() => setBreakupModalOpen(true)}
              style={styles.standardPriceRow}
            >
              <Text style={styles.standardPrice}>{rupee(fare)}</Text>
              <Ionicons name="information-circle-outline" size={16} color={BRAND_PURPLE} />
            </Pressable>
          </View>

          <Text style={styles.standardSub}>
            EV held for {days} {days === 1 ? 'day' : 'days'} until {getFormattedDropDate(trip?.dropAt)}
          </Text>

          <View style={styles.standardBottomRow}>
            <Pressable
              hitSlop={8}
              onPress={() => setRefundableModalOpen(true)}
              style={styles.learnMoreRow}
            >
              <Ionicons name="shield-checkmark-outline" size={15} color={BRAND_PURPLE} />
              <Text style={styles.learnMoreText}>100% Refundable before pickup</Text>
            </Pressable>

            {discount > 0 ? (
              <View style={styles.discountAppliedBadge}>
                <Ionicons name="pricetag" size={12} color={BRAND_PURPLE} />
                <Text style={styles.discountAppliedText}>
                  {rupee(discount)} discount applied
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Standalone Coupons & Offers Card ── */}
        <View style={styles.couponCard}>
          <View style={styles.couponCardHeader}>
            <View style={styles.couponCardLeft}>
              <View style={styles.couponIconCircle}>
                <Ionicons name="pricetag" size={16} color={BRAND_PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.couponCardTitle}>Coupons & Offers</Text>
                <Text style={styles.couponCardSub} numberOfLines={1}>
                  {offerOn && appliedCode
                    ? `Promo active: ${appliedCode}`
                    : couponsList.length > 0
                    ? `${couponsList.length} offers available for you`
                    : 'Apply coupon code to save more'}
                </Text>
              </View>
            </View>

            {offerOn && appliedCode ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setOfferOn(false);
                  setAppliedCode('');
                  setAppliedDiscountAmt(0);
                }}
                style={styles.couponRemoveAction}
              >
                <Text style={styles.couponRemoveActionText}>REMOVE</Text>
              </Pressable>
            ) : (
              <Pressable
                hitSlop={8}
                onPress={() => setCouponPopupOpen(true)}
                style={styles.couponSelectAction}
              >
                <Text style={styles.couponSelectActionText}>SELECT</Text>
                <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          {offerOn && appliedCode ? (
            <View style={styles.couponAppliedBanner}>
              <Ionicons name="checkmark-circle" size={16} color={BRAND_PURPLE} />
              <Text style={styles.couponAppliedBannerText}>
                You are saving <Text style={{ fontWeight: '800' }}>{rupee(discount)}</Text> with promo code <Text style={{ fontWeight: '800' }}>{appliedCode}</Text>!
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setCouponPopupOpen(true)}
              style={styles.couponBrowseRow}
            >
              <Text style={styles.couponBrowseText}>Have a coupon or promo code?</Text>
              <Text style={styles.couponBrowseLink}>View offers ›</Text>
            </Pressable>
          )}
        </View>

        {/* ── "Pay now to book" Card ── */}
        <View style={styles.billDetailsCard}>
          <Text style={styles.billCardTitle}>Pay now to book</Text>

          <View style={styles.billItemRow}>
            <Text style={styles.billItemLabel}>Standard booking</Text>
            <Text style={styles.billItemValue}>{rupee(fare)}</Text>
          </View>

          {flexiDeliveryCharge > 0 ? (
            <View style={styles.billItemRow}>
              <View style={styles.billLabelWithInfo}>
                <Text style={styles.billItemLabel}>
                  Flexi Delivery ({totalDeliveryKm} km @ ₹30/km)
                </Text>
                <Ionicons name="bicycle" size={14} color={BRAND_PURPLE} />
              </View>
              <Text style={styles.billItemValue}>{rupee(flexiDeliveryCharge)}</Text>
            </View>
          ) : null}

          <View style={styles.billItemRow}>
            <View style={styles.billLabelWithInfo}>
              <Text style={styles.billItemLabel}>Refundable Security Deposit</Text>
              <Ionicons name="information-circle-outline" size={14} color="#64748B" />
            </View>
            <Text style={[styles.billItemValue, deposit === 0 && { color: BRAND_PURPLE }]}>
              {deposit === 0 ? '₹0 (WAIVED)' : rupee(deposit)}
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.billItemRow}>
              <Text style={styles.billDiscountLabel}>
                Promo Discount ({appliedCode})
              </Text>
              <Text style={styles.billDiscountValue}>−{rupee(discount)}</Text>
            </View>
          )}

          <View style={styles.billDivider} />

          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>Total Payable</Text>
            <Text style={styles.billTotalValue}>{rupee(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Bottom Dock: Rider Phone + Purple "PROCEED TO PAY" Button ── */}
      <View
        style={[
          styles.bottomDock,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <View style={styles.riderBookingRow}>
          <Text style={styles.riderBookingText}>
            This EV will be booked on <Text style={styles.riderBookingNumber}>{cleanPhone}</Text>
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => setEditPhoneModalOpen(true)}
          >
            <Text style={styles.riderEditBtn}>EDIT</Text>
          </Pressable>
        </View>

        <Pressable
          disabled={isProcessing}
          onPress={handleInitiatePayU}
          style={({ pressed }) => [
            styles.proceedPayBtn,
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
        >
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.proceedPayText}>CONNECTING TO PAYU...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.proceedPayText}>PROCEED TO PAY</Text>
              <Text style={styles.proceedPayAmount}>{rupee(total)}  ›</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* ── Modal: Edit Phone Number ── */}
      <Modal
        visible={editPhoneModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEditPhoneModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setEditPhoneModalOpen(false)} />
          <View style={[styles.sheetModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>Edit Booking Mobile Number</Text>
            <Text style={styles.sheetSub}>
              Digital invoice, OTP, and pickup confirmation will be sent to this number.
            </Text>
            <TextInput
              style={styles.phoneInput}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#94A3B8"
              defaultValue={cleanPhone}
              onChangeText={(t) => setCustomPhone(t.replace(/\D/g, '').slice(-10))}
            />
            <Pressable
              style={styles.savePhoneBtn}
              onPress={() => setEditPhoneModalOpen(false)}
            >
              <Text style={styles.savePhoneBtnText}>Confirm Number</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Fare Breakup Sheet ── */}
      <Modal
        visible={breakupModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setBreakupModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setBreakupModalOpen(false)} />
          <View style={[styles.sheetModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Detailed Fare Breakup</Text>
              <Pressable hitSlop={10} onPress={() => setBreakupModalOpen(false)} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={18} color="#334155" />
              </Pressable>
            </View>

            <View style={styles.sheetBody}>
              <View style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>
                  {vehicle?.name || 'Evegah Pro'} {vehicle?.packageDuration && Number(vehicle.packageDuration) > 1 ? `(${vehicle.packageName || 'Package'})` : `(${rupee(modelRate)} × ${days} ${days === 1 ? 'Day' : 'Days'})`}
                </Text>
                <Text style={styles.sheetVal}>{rupee(fare)}</Text>
              </View>
              {flexiDeliveryCharge > 0 ? (
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetLabel}>
                    Flexi Delivery ({totalDeliveryKm} km @ ₹30/km)
                  </Text>
                  <Text style={styles.sheetVal}>{rupee(flexiDeliveryCharge)}</Text>
                </View>
              ) : null}
              <View style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>Refundable Security Deposit</Text>
                <Text style={styles.sheetVal}>{deposit === 0 ? '₹0 (Waived)' : rupee(deposit)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetLabelDiscount}>Coupon Discount ({appliedCode})</Text>
                  <Text style={styles.sheetValDiscount}>−{rupee(discount)}</Text>
                </View>
              )}
              <View style={styles.sheetDivider} />
              <View style={styles.sheetRow}>
                <Text style={styles.sheetTotalLabel}>Net Payable Amount</Text>
                <Text style={styles.sheetTotalVal}>{rupee(total)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: 100% Refundable Policy ── */}
      <Modal
        visible={refundableModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setRefundableModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setRefundableModalOpen(false)} />
          <View style={[styles.sheetModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={22} color={BRAND_PURPLE} />
                <Text style={styles.sheetTitle}>100% Refund Guarantee</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setRefundableModalOpen(false)} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={18} color="#334155" />
              </Pressable>
            </View>

            <View style={{ gap: 12, marginTop: 4 }}>
              <View style={styles.policyPointRow}>
                <View style={styles.policyBullet} />
                <Text style={styles.policyPointText}>
                  Cancel anytime before your scheduled trip start time for an instant 100% refund before 24 hours directly to your original payment method.
                </Text>
              </View>
              <View style={styles.policyPointRow}>
                <View style={styles.policyBullet} />
                <Text style={styles.policyPointText}>
                  Zero cancellation fee. No questions asked. Complete transparency guaranteed by Evegah.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Coupons Drawer ── */}
      <Modal
        visible={couponPopupOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCouponPopupOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setCouponPopupOpen(false)} />
          <View style={[styles.sheetModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Available Offers & Coupons</Text>
                <Text style={styles.sheetSub}>Select or enter promo code to apply on checkout</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setCouponPopupOpen(false)} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={18} color="#334155" />
              </Pressable>
            </View>

            {/* Custom Promo Code Input Box */}
            <View style={styles.customPromoRow}>
              <TextInput
                style={styles.customPromoInput}
                placeholder="Enter promo code (e.g. SAVE50)"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={customPromoInput}
                onChangeText={setCustomPromoInput}
              />
              <Pressable
                disabled={!customPromoInput.trim()}
                onPress={() => {
                  const code = customPromoInput.trim().toUpperCase();
                  if (!code) return;
                  const found = couponsList.find(
                    (c) => c.code.toUpperCase() === code
                  );
                  if (found) {
                    setAppliedCode(found.code);
                    setAppliedDiscountAmt(found.discount || 50);
                    setOfferOn(true);
                    setCouponPopupOpen(false);
                    setCustomPromoInput('');
                  } else {
                    setAppliedCode(code);
                    setAppliedDiscountAmt(50);
                    setOfferOn(true);
                    setCouponPopupOpen(false);
                    setCustomPromoInput('');
                  }
                }}
                style={[
                  styles.customPromoBtn,
                  !customPromoInput.trim() && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.customPromoBtnText}>APPLY</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {couponsList.length === 0 ? (
                <View style={styles.emptyCouponsBox}>
                  <Ionicons name="ticket-outline" size={36} color="#CBD5E1" />
                  <Text style={styles.emptyCouponsText}>No active coupons available right now.</Text>
                </View>
              ) : (
                couponsList.map((item) => {
                  const isCurrent = offerOn && appliedCode === item.code;
                  return (
                    <View key={item.id} style={styles.couponTicketCard}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <View style={styles.couponCodePill}>
                          <Text style={styles.couponCodePillText}>{item.code}</Text>
                        </View>
                        <Text style={styles.couponTicketTitle}>{item.title}</Text>
                        <Text style={styles.couponTicketDesc}>{item.subtitle}</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setAppliedCode(item.code);
                          setAppliedDiscountAmt(item.discount || 50);
                          setOfferOn(true);
                          setCouponPopupOpen(false);
                        }}
                        style={[
                          styles.applyTicketBtn,
                          isCurrent && styles.applyTicketBtnApplied,
                        ]}
                      >
                        <Text
                          style={[
                            styles.applyTicketBtnText,
                            isCurrent && { color: '#FFFFFF' },
                          ]}
                        >
                          {isCurrent ? 'APPLIED' : 'APPLY'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Incomplete Ride Hold Expired Popup ── */}
      <Modal
        visible={incompleteModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.incompleteModalCard}>
            <View style={styles.incompleteIconCircle}>
              <Ionicons name="time-outline" size={32} color={BRAND_PURPLE} />
            </View>
            <Text style={styles.incompleteTitle}>Hold Session Expired</Text>
            <Text style={styles.incompleteSub}>
              Your 10-minute priority vehicle hold for {vehicle?.name || 'this EV'} has ended. You can re-hold your vehicle right now to complete your booking.
            </Text>

            <View style={styles.incompleteSummaryBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.incompleteVehName}>{vehicle?.name || 'Evegah EV'}</Text>
                <Text style={styles.incompleteVehDates}>
                  {days} {days === 1 ? 'day' : 'days'} · Total Payable {rupee(total)}
                </Text>
              </View>
              <View style={styles.incompleteBadge}>
                <Text style={styles.incompleteBadgeText}>INCOMPLETE</Text>
              </View>
            </View>

            <Pressable
              style={styles.reholdBtn}
              onPress={handleRehold}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.reholdBtnText}>Re-Hold for 10 Mins & Pay</Text>
            </Pressable>

            <Pressable
              style={styles.chooseOtherBtn}
              onPress={() => {
                setIncompleteModalVisible(false);
                onBack?.();
              }}
            >
              <Text style={styles.chooseOtherBtnText}>Choose Another EV</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── In-App PayU Checkout WebView Modal ── */}
      <Modal
        visible={payuModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={handleCancelPayuModal}
      >
        <View style={styles.payuModalContainer}>
          <View style={[styles.payuHeader, { paddingTop: Math.max(insets.top, 14) }]}>
            <View style={styles.payuHeaderLeft}>
              <View style={styles.payuLogoBadge}>
                <Ionicons name="shield-checkmark" size={19} color={BRAND_PURPLE} />
              </View>
              <View>
                <Text style={styles.payuHeaderTitle}>PayU Secure Checkout</Text>
                <Text style={styles.payuHeaderSubtitle}>Evegah Mobility • 256-bit Encrypted</Text>
              </View>
            </View>

            <View style={styles.payuHeaderRight}>
              <View style={styles.payuAmountPill}>
                <Text style={styles.payuAmountText}>{rupee(total)}</Text>
              </View>
              <Pressable hitSlop={10} style={styles.payuCloseBtn} onPress={handleCancelPayuModal}>
                <Ionicons name="close" size={20} color="#1E293B" />
              </Pressable>
            </View>
          </View>

          {payuLoading && (
            <View style={styles.payuLoadingBar}>
              <ActivityIndicator size="small" color={BRAND_PURPLE} />
              <Text style={styles.payuLoadingText}>Connecting to PayU Gateway...</Text>
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
                  <ActivityIndicator size="large" color={BRAND_PURPLE} />
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
    backgroundColor: '#FFFFFF',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  callSupportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Urgency Banner */
  holdBanner: {
    backgroundColor: BRAND_PURPLE_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  holdBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    lineHeight: 18,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  /* 100% Refundable link */
  refundableBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  refundableText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  refundableUnderline: {
    textDecorationLine: 'underline',
    color: BRAND_PURPLE,
    fontWeight: '700',
  },

  /* Vehicle Card */
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  vehicleThumbBox: {
    width: 105,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  onHoldBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  onHoldText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  vehicleThumb: {
    width: '90%',
    height: '90%',
  },
  vehicleInfoCol: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehicleSpecs: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  vehiclePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  vehicleEmi: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  viewBreakupLink: {
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  viewBreakupText: {
    fontSize: 12,
    color: '#64748B',
    textDecorationLine: 'underline',
    
  },

  /* Standard Booking Card */
  standardBookingCard: {
    borderWidth: 1.5,
    borderColor: BRAND_PURPLE,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    shadowColor: BRAND_PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  standardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  standardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BRAND_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_PURPLE,
  },
  standardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },
  standardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  standardPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },
  standardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    marginLeft: 30,
  },
  standardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  learnMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 30,
  },
  learnMoreText: {
    fontSize: 13,
    color: BRAND_PURPLE,
    fontWeight: '600',
  },
  discountAppliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND_PURPLE_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  discountAppliedText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_PURPLE,
  },
  addCouponPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND_PURPLE_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  addCouponText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_PURPLE,
  },

  /* Standalone Coupons Card */
  couponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  couponCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  couponIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND_PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  couponCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  couponSelectAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND_PURPLE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  couponSelectActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  couponRemoveAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  couponRemoveActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  couponAppliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_PURPLE_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  couponAppliedBannerText: {
    fontSize: 12,
    color: BRAND_PURPLE,
    flex: 1,
  },
  couponBrowseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  couponBrowseText: {
    fontSize: 12,
    color: '#64748B',
  },
  couponBrowseLink: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_PURPLE,
  },

  /* Bill Details Card */
  billDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  billCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  billItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  billItemLabel: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  billLabelWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  billItemValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  billDiscountLabel: {
    fontSize: 14,
    color: BRAND_PURPLE,
    fontWeight: '600',
  },
  billDiscountValue: {
    fontSize: 14,
    color: BRAND_PURPLE,
    fontWeight: '800',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  billTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Sticky Bottom Dock */
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  riderBookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  riderBookingText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  riderBookingNumber: {
    fontWeight: '700',
    color: '#0F172A',
  },
  riderEditBtn: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND_PURPLE,
    letterSpacing: 0.5,
  },
  proceedPayBtn: {
    backgroundColor: BRAND_PURPLE,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: BRAND_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  proceedPayText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  proceedPayAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  sheetModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    gap: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetLabel: {
    fontSize: 14,
    color: '#334155',
  },
  sheetVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetLabelDiscount: {
    fontSize: 14,
    color: BRAND_PURPLE,
    fontWeight: '600',
  },
  sheetValDiscount: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND_PURPLE,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  sheetTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetTotalVal: {
    fontSize: 17,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },

  policyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  policyBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_PURPLE,
    marginTop: 6,
  },
  policyPointText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },

  phoneInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 16,
  },
  savePhoneBtn: {
    backgroundColor: BRAND_PURPLE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  savePhoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Custom Promo Input in Coupons Drawer */
  customPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  customPromoInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  customPromoBtn: {
    height: 44,
    backgroundColor: BRAND_PURPLE,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPromoBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  emptyCouponsBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyCouponsText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  couponTicketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  couponCodePill: {
    backgroundColor: '#EDE9FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  couponCodePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },
  couponTicketTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  couponTicketDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  applyTicketBtn: {
    backgroundColor: BRAND_PURPLE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  applyTicketBtnApplied: {
    backgroundColor: BRAND_PURPLE_DARK,
  },
  applyTicketBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Incomplete Booking Modal */
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  incompleteModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  incompleteIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND_PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  incompleteTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  incompleteSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  incompleteSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginTop: 16,
    marginBottom: 16,
  },
  incompleteVehName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  incompleteVehDates: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  incompleteBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  incompleteBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  reholdBtn: {
    backgroundColor: BRAND_PURPLE,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BRAND_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  reholdBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  chooseOtherBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseOtherBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },

  /* PayU WebView */
  payuModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  payuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  payuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payuLogoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND_PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payuHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  payuHeaderSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  payuHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payuAmountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  payuAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },
  payuCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payuLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  payuLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  payuWebView: {
    flex: 1,
  },
  payuWebLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  payuWebLoaderText: {
    fontSize: 14,
    color: '#64748B',
  },
});