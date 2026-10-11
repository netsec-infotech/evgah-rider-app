import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';

const PURPLE = '#4A168C';

const STEPS = [
  { icon: 'location-outline', title: 'Reach the zone', text: 'The scooter stays at the pickup point you chose.' },
  { icon: 'card-outline', title: 'Carry your licence', text: 'A valid driving licence is checked before the ride.' },
  { icon: 'shield-checkmark-outline', title: 'Helmet is included', text: 'A sanitized helmet is handed over with the scooter.' },
];

function rupee(amount) {
  return `₹${Math.abs(Math.round(amount || 0)).toLocaleString('en-IN')}`;
}

function whenLine(ms) {
  if (!ms) return 'Select';
  const date = new Date(ms);
  const day = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

function spanLabel(start, end) {
  if (!start || !end || end <= start) return '1 day';
  const hours = Math.round((end - start) / 36e5);
  if (hours < 24) return hours <= 1 ? '1 hr' : `${hours} hr`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

export default function BookingConfirmedScreen({ vehicle, trip, receipt, onBack, onStart }) {
  const insets = useSafeAreaInsets();
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));
  const paidLater = receipt?.depositWhen === 'later';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable hitSlop={8} style={styles.back} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color="#1C1C1C" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <Animated.View entering={ZoomIn.duration(480).springify()} style={styles.markWrap}>
          <View style={styles.mark}>
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          </View>
        </Animated.View>
        <Animated.Text entering={cardEnter(0)} style={styles.title}>Booking confirmed</Animated.Text>
        <Animated.Text entering={cardEnter(0)} style={styles.subtitle}>
          Show this at the pickup zone.
        </Animated.Text>

        <Animated.View entering={cardEnter(1)} style={styles.idCard}>
          <View>
            <Text style={styles.idKicker}>Booking ID</Text>
            <Text style={styles.idValue}>{receipt?.bookingId || 'EVG00000000'}</Text>
          </View>
          <View style={styles.status}>
            <Text style={styles.statusText}>Confirmed</Text>
          </View>
        </Animated.View>

        <Animated.View entering={cardEnter(2)} style={styles.card}>
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
              <Text style={styles.routeWhen} numberOfLines={2}>{whenLine(trip?.pickupAt)}</Text>
            </View>
            <View style={styles.routeMid}>
              <View style={styles.routeLine} />
              <Text style={styles.routeSpan}>{spanLabel(trip?.pickupAt, trip?.dropAt)}</Text>
            </View>
            <View style={[styles.routeCol, styles.routeEnd]}>
              <Text style={styles.routeKicker}>Drop</Text>
              <Text style={[styles.routePlace, styles.align]} numberOfLines={1}>{trip?.dropName || 'Select'}</Text>
              <Text style={[styles.routeWhen, styles.align]} numberOfLines={2}>{whenLine(trip?.dropAt)}</Text>
            </View>
          </View>
        </Animated.View>

        {paidLater ? (
          <Animated.View entering={cardEnter(3)} style={styles.note}>
            <Ionicons name="time-outline" size={18} color={PURPLE} />
            <Text style={styles.noteText}>
              {rupee(250)} security deposit is due before pickup. The ride fare is confirmed.
            </Text>
          </Animated.View>
        ) : null}

        <Animated.Text entering={cardEnter(4)} style={styles.section}>At pickup</Animated.Text>
        <Animated.View entering={cardEnter(4)} style={styles.card}>
          {STEPS.map((step, index) => (
            <View key={step.title} style={[styles.step, index === STEPS.length - 1 && styles.stepLast]}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={18} color={PURPLE} />
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={cardEnter(5)} style={styles.paid}>
          <Text style={styles.paidLabel}>{paidLater ? 'Ride fare confirmed' : 'Paid'}</Text>
          <Text style={styles.paidValue}>
            {rupee(receipt?.total)} · {receipt?.method === 'card' ? 'Card' : 'UPI'}
          </Text>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={onStart}
          onPressIn={() => {
            btnScale.value = withSpring(0.96, { damping: 18, stiffness: 280 });
          }}
          onPressOut={() => {
            btnScale.value = withSpring(1, { damping: 14, stiffness: 220 });
          }}
        >
          <Animated.View style={[styles.start, btnStyle]}>
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.startText}>Start ride</Text>
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
    paddingBottom: 4,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    textAlign: 'center',
    color: '#1C1C1C',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    textAlign: 'center',
    color: '#6E6878',
    fontSize: 14,
  },
  idCard: {
    marginTop: 18,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idKicker: {
    color: '#8A8496',
    fontSize: 11,
    fontWeight: '700',
  },
  idValue: {
    marginTop: 3,
    color: '#1C1C1C',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  status: {
    backgroundColor: '#F6F1FC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    marginTop: 12,
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
    alignItems: 'flex-start',
  },
  routeCol: {
    flex: 1,
  },
  routeEnd: {
    alignItems: 'flex-end',
  },
  align: {
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
    lineHeight: 16,
  },
  routeMid: {
    width: 72,
    alignItems: 'center',
    paddingTop: 14,
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
  note: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#F6F1FC',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: {
    flex: 1,
    color: '#3C3846',
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginTop: 22,
    marginBottom: 2,
    marginHorizontal: 20,
    color: '#1C1C1C',
    fontSize: 16,
    fontWeight: '700',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F3',
  },
  stepLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F6F1FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: {
    flex: 1,
    marginLeft: 12,
  },
  stepTitle: {
    color: '#1C1C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    marginTop: 2,
    color: '#6E6878',
    fontSize: 12,
    lineHeight: 17,
  },
  paid: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paidLabel: {
    color: '#8A8496',
    fontSize: 13,
    fontWeight: '600',
  },
  paidValue: {
    color: '#1C1C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F1F3',
  },
  start: {
    height: 52,
    borderRadius: 16,
    backgroundColor: PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
