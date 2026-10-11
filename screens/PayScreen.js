import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';

const PURPLE = '#4A168C';
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const DAY_RATE = {
  'Evegah Fly': 149,
  'Evegah Mink': 199,
  'Evegah City': 229,
  'Evegah Pro': 299,
};
const DEPOSIT = 250;
const OFFER_OFF = 40;

function rupee(amount) {
  const sign = amount < 0 ? '−' : '';
  return `${sign}₹${Math.abs(Math.round(amount)).toLocaleString('en-IN')}`;
}

function billDays(start, end) {
  if (!start || !end || end <= start) return 1;
  const hours = (end - start) / 36e5;
  return Math.max(1, Math.ceil(hours / 24));
}

function spanLabel(start, end) {
  if (!start || !end || end <= start) return '1 day';
  const hours = Math.round((end - start) / 36e5);
  if (hours < 24) return hours <= 1 ? '1 hr' : `${hours} hr`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

function whenLine(ms) {
  if (!ms) return 'Select';
  const date = new Date(ms);
  const day = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

function Segment({ value, onChange }) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const markW = Math.max((width - 8) / 2, 0);

  useEffect(() => {
    x.value = withTiming(value === 'now' ? 0 : markW, {
      duration: 320,
      easing: EASE,
      reduceMotion: ReduceMotion.Never,
    });
  }, [markW, value, x]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={styles.segment} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Animated.View pointerEvents="none" style={[styles.segmentMark, { width: markW }, markStyle]} />
      {[
        ['now', 'Pay now'],
        ['later', 'Pay later'],
      ].map(([id, label]) => {
        const on = value === id;
        return (
          <Pressable key={id} style={styles.segmentBtn} onPress={() => onChange(id)}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PayScreen({ vehicle, trip, onBack, onPay }) {
  const insets = useSafeAreaInsets();
  const [offerOn, setOfferOn] = useState(false);
  const [depositWhen, setDepositWhen] = useState('now');
  const [method, setMethod] = useState('upi');
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const days = billDays(trip?.pickupAt, trip?.dropAt);
  const rate = DAY_RATE[vehicle?.name] || DAY_RATE['Evegah Mink'];
  const fare = rate * days;
  const discount = offerOn ? Math.min(OFFER_OFF, fare) : 0;
  const deposit = depositWhen === 'now' ? DEPOSIT : 0;
  const total = fare - discount + deposit;
  const span = spanLabel(trip?.pickupAt, trip?.dropAt);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Text pointerEvents="none" style={styles.headerTitle}>Checkout</Text>
          <Pressable hitSlop={8} style={styles.back} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color="#1C1C1C" />
          </Pressable>
          <View style={styles.secure}>
            <Ionicons name="lock-closed" size={12} color={PURPLE} />
            <Text style={styles.secureText}>Secure</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <Animated.View entering={cardEnter(0)} style={styles.card}>
          <View style={styles.hero}>
            <View style={[styles.heroArt, { backgroundColor: vehicle?.tint || '#F6F1FC' }]}>
              {vehicle?.image ? (
                <Image source={vehicle.image} style={styles.heroImage} contentFit="contain" />
              ) : null}
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroName}>{vehicle?.name || 'Your scooter'}</Text>
              <Text style={styles.heroLine}>{vehicle?.line || 'Electric ride'}</Text>
              <Text style={styles.heroMeta}>{vehicle?.range || ''}</Text>
            </View>
          </View>
          <View style={styles.rule} />
          <View style={styles.route}>
            <View style={styles.routeCol}>
              <Text style={styles.routeKicker}>Pickup</Text>
              <Text style={styles.routePlace} numberOfLines={1}>{trip?.pickupName || 'Select'}</Text>
              <Text style={styles.routeWhen} numberOfLines={1}>{whenLine(trip?.pickupAt)}</Text>
            </View>
            <View style={styles.routeMid}>
              <View style={styles.routeLine} />
              <Text style={styles.routeSpan}>{span}</Text>
            </View>
            <View style={[styles.routeCol, styles.routeEnd]}>
              <Text style={styles.routeKicker}>Drop</Text>
              <Text style={[styles.routePlace, styles.routeAlign]} numberOfLines={1}>{trip?.dropName || 'Select'}</Text>
              <Text style={[styles.routeWhen, styles.routeAlign]} numberOfLines={1}>{whenLine(trip?.dropAt)}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.Text entering={cardEnter(1)} style={styles.section}>Offer</Animated.Text>
        <Animated.View entering={cardEnter(1)}>
          <Pressable onPress={() => setOfferOn((on) => !on)} style={[styles.offer, offerOn && styles.offerOn]}>
            <View style={styles.offerMark}>
              <Ionicons name="pricetag" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.offerCopy}>
              <Text style={styles.offerCode}>EVE20</Text>
              <Text style={styles.offerText}>₹40 off this ride</Text>
            </View>
            <Text style={[styles.offerAction, offerOn && styles.offerActionOn]}>
              {offerOn ? 'Applied' : 'Apply'}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.Text entering={cardEnter(2)} style={styles.section}>Deposit</Animated.Text>
        <Animated.View entering={cardEnter(2)} style={styles.card}>
          <Segment value={depositWhen} onChange={setDepositWhen} />
          <Text style={styles.depositNote}>
            {depositWhen === 'now'
              ? `₹${DEPOSIT} is refundable and comes back after the ride.`
              : `₹${DEPOSIT} is due before pickup. It is refundable.`}
          </Text>
        </Animated.View>

        <Animated.Text entering={cardEnter(3)} style={styles.section}>Pay with</Animated.Text>
        <Animated.View entering={cardEnter(3)} style={styles.methods}>
          {[
            ['upi', 'UPI', 'phone-portrait-outline'],
            ['card', 'Card', 'card-outline'],
          ].map(([id, label, icon]) => {
            const on = method === id;
            return (
              <Pressable key={id} onPress={() => setMethod(id)} style={[styles.method, on && styles.methodOn]}>
                <Ionicons name={icon} size={20} color={on ? PURPLE : '#6E6878'} />
                <Text style={[styles.methodText, on && styles.methodTextOn]}>{label}</Text>
                {on ? <Ionicons name="checkmark-circle" size={16} color={PURPLE} /> : <View style={styles.methodDot} />}
              </Pressable>
            );
          })}
        </Animated.View>

        <Animated.Text entering={cardEnter(4)} style={styles.section}>Bill</Animated.Text>
        <Animated.View entering={cardEnter(4)} style={styles.card}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Ride fare · {days === 1 ? '1 day' : `${days} days`}</Text>
            <Text style={styles.billValue}>{rupee(fare)}</Text>
          </View>
          {discount > 0 ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.billRow}>
              <Text style={styles.billSave}>EVE20</Text>
              <Text style={styles.billSave}>{rupee(-discount)}</Text>
            </Animated.View>
          ) : null}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Security deposit</Text>
            <Text style={styles.billValue}>{deposit ? rupee(deposit) : 'Later'}</Text>
          </View>
          <View style={styles.billRule} />
          <View style={styles.billRow}>
            <Text style={styles.billTotal}>Total</Text>
            <Animated.Text key={total} entering={FadeIn.duration(220)} style={styles.billTotal}>
              {rupee(total)}
            </Animated.Text>
          </View>
          <Text style={styles.billHint}>Includes taxes</Text>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View>
          <Text style={styles.footerKicker}>To pay</Text>
          <Text style={styles.footerAmount}>{rupee(total)}</Text>
        </View>
        <Pressable
          onPress={() => onPay?.({
            total,
            fare,
            discount,
            deposit,
            days,
            method,
            depositWhen,
            offerOn,
          })}
          onPressIn={() => {
            btnScale.value = withSpring(0.96, { damping: 18, stiffness: 280 });
          }}
          onPressOut={() => {
            btnScale.value = withSpring(1, { damping: 14, stiffness: 220 });
          }}
        >
          <Animated.View style={[styles.pay, btnStyle]}>
            <Text style={styles.payText}>Pay {rupee(total)}</Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F7F8',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    lineHeight: 36,
    color: '#1C1C1C',
    fontSize: 17,
    fontWeight: '700',
  },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F6F1FC',
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 32,
  },
  secureText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroArt: {
    width: 92,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 84,
    height: 58,
  },
  heroCopy: {
    flex: 1,
    marginLeft: 14,
  },
  heroName: {
    color: '#1C1C1C',
    fontSize: 18,
    fontWeight: '700',
  },
  heroLine: {
    marginTop: 2,
    color: '#6E6878',
    fontSize: 13,
  },
  heroMeta: {
    marginTop: 6,
    color: PURPLE,
    fontSize: 12,
    fontWeight: '700',
  },
  rule: {
    height: 1,
    backgroundColor: '#F1F1F3',
    marginVertical: 14,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeCol: {
    flex: 1,
  },
  routeEnd: {
    alignItems: 'flex-end',
  },
  routeAlign: {
    textAlign: 'right',
  },
  routeKicker: {
    color: '#8A8496',
    fontSize: 11,
    fontWeight: '700',
  },
  routePlace: {
    marginTop: 2,
    color: '#1C1C1C',
    fontSize: 15,
    fontWeight: '700',
  },
  routeWhen: {
    marginTop: 2,
    color: '#6E6878',
    fontSize: 12,
  },
  routeMid: {
    width: 72,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  routeLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: '#E4D4F5',
  },
  routeSpan: {
    marginTop: 6,
    color: PURPLE,
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    marginTop: 22,
    marginBottom: 10,
    marginHorizontal: 20,
    color: '#1C1C1C',
    fontSize: 16,
    fontWeight: '700',
  },
  offer: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  offerOn: {
    borderColor: '#E4D4F5',
    backgroundColor: '#FCF9FF',
  },
  offerMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerCopy: {
    flex: 1,
    marginLeft: 12,
  },
  offerCode: {
    color: '#1C1C1C',
    fontSize: 15,
    fontWeight: '700',
  },
  offerText: {
    marginTop: 2,
    color: '#6E6878',
    fontSize: 12,
  },
  offerAction: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '700',
  },
  offerActionOn: {
    color: '#1F8A4C',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F6',
    borderRadius: 14,
    padding: 4,
  },
  segmentMark: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    color: '#8A8496',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextOn: {
    color: '#1C1C1C',
  },
  depositNote: {
    marginTop: 12,
    color: '#6E6878',
    fontSize: 13,
    lineHeight: 18,
  },
  methods: {
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  method: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodOn: {
    borderColor: PURPLE,
    backgroundColor: '#FCF9FF',
  },
  methodText: {
    flex: 1,
    color: '#3C3846',
    fontSize: 15,
    fontWeight: '700',
  },
  methodTextOn: {
    color: '#1C1C1C',
  },
  methodDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D9D4E0',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billLabel: {
    color: '#6E6878',
    fontSize: 14,
  },
  billValue: {
    color: '#1C1C1C',
    fontSize: 14,
    fontWeight: '600',
  },
  billSave: {
    color: '#1F8A4C',
    fontSize: 14,
    fontWeight: '700',
  },
  billRule: {
    height: 1,
    backgroundColor: '#F1F1F3',
    marginVertical: 8,
  },
  billTotal: {
    color: '#1C1C1C',
    fontSize: 16,
    fontWeight: '800',
  },
  billHint: {
    marginTop: 2,
    color: '#8A8496',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F1F3',
  },
  footerKicker: {
    color: '#8A8496',
    fontSize: 12,
    fontWeight: '600',
  },
  footerAmount: {
    color: '#1C1C1C',
    fontSize: 20,
    fontWeight: '800',
  },
  pay: {
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
