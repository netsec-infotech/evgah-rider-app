import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';

const PURPLE = '#4A168C';

const EXTRA = {
  'Evegah Fly': {
    battery: '1.2 kWh',
    motor: '1000 W',
    charge: '4–5 hours',
    load: '150 kg',
    wheels: '12 inch',
    about: 'A light scooter for short city hops. Quiet, easy to handle, and enough range for the usual round trip.',
  },
  'Evegah Mink': {
    battery: '3.2 kWh',
    motor: '3000 W',
    charge: '4–5 hours',
    load: '200 kg',
    wheels: '12 inch',
    about: 'Built for smoother, longer city miles. A stronger motor and a larger battery for everyday riding.',
  },
  'Evegah City': {
    battery: '2.3 kWh',
    motor: '2500 W',
    charge: '4–5 hours',
    load: '150 kg',
    wheels: '12 inch',
    about: 'A quiet commuter for moving across town. Steady power, a comfortable seat, and a range that covers the day.',
  },
  'Evegah Pro': {
    battery: '2.5 kWh',
    motor: '2500 W',
    charge: '4–5 hours',
    load: '150 kg',
    wheels: '12 inch',
    about: 'The long-ride scooter. More range and a higher top speed when the trip is more than a quick hop.',
  },
};

const HIGHLIGHTS = [
  { icon: 'leaf-outline', title: 'Zero emission', text: 'All-electric ride' },
  { icon: 'flash-outline', title: 'Home charging', text: '4–5 hours' },
  { icon: 'phone-portrait-outline', title: 'Smart display', text: 'Digital console' },
  { icon: 'shield-checkmark-outline', title: 'Covered', text: '1 year warranty' },
];

const REVIEWS = [
  {
    name: 'Priya Patel',
    score: '4.9',
    text: 'Smooth through Vadodara traffic, and the seat stays comfortable on a full day of riding.',
  },
  {
    name: 'Rohan Das',
    score: '4.8',
    text: 'Pickup at the hub was quick. The range on the card matched the ride I actually got.',
  },
];

const QUESTIONS = [
  {
    q: 'What do I need to rent this?',
    a: 'A valid driving licence and completed Aadhaar KYC.',
  },
  {
    q: 'How does charging work?',
    a: 'Plug into a standard home socket, or use an Evegah charging hub.',
  },
  {
    q: 'Is a helmet included?',
    a: 'Yes. A sanitized helmet is handed over at the pickup zone.',
  },
];

function Stars({ score }) {
  const full = Math.round(Number(score));
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }, (_, index) => (
        <Ionicons
          key={index}
          name={index < full ? 'star' : 'star-outline'}
          size={13}
          color="#E0A106"
        />
      ))}
    </View>
  );
}

export default function VehicleDetailsScreen({ vehicle, onBack, onBook }) {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const btnScale = useSharedValue(1);
  const extra = {
    ...(EXTRA[vehicle?.name] || EXTRA['Evegah Mink']),
    ...(vehicle?.battery ? { battery: vehicle.battery } : {}),
    ...(vehicle?.motor ? { motor: vehicle.motor } : {}),
    ...(vehicle?.charge ? { charge: vehicle.charge } : {}),
    ...(vehicle?.load ? { load: vehicle.load } : {}),
    ...(vehicle?.wheels ? { wheels: vehicle.wheels } : {}),
    ...(vehicle?.about ? { about: vehicle.about } : {}),
  };
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const specs = [
    ['Motor', extra.motor],
    ['Battery', extra.battery],
    ['Battery type', vehicle?.batteryType || 'Lithium-ion'],
    ['Brakes', vehicle?.brakes || 'Disc, front and rear'],
    ['Wheels', extra.wheels],
    ['Charge time', extra.charge],
    ['Load', extra.load],
    ['Water resistance', vehicle?.water || 'IP67'],
    ['Warranty', vehicle?.warranty || '1 year'],
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
      >
        <View style={[styles.hero, { backgroundColor: vehicle?.tint || '#F6F1FC', paddingTop: insets.top + 64 }]}>
          <Animated.View entering={FadeIn.duration(640)}>
            <Image source={vehicle?.image} style={styles.heroImage} contentFit="contain" />
          </Animated.View>
        </View>

        <Animated.View entering={cardEnter(0)} style={styles.identity}>
          <View style={styles.identityTop}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{vehicle?.tag || 'E-Scooter'}</Text>
            </View>
            <View style={styles.rating}>
              <Ionicons name="star" size={13} color="#E0A106" />
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.ratingCount}>128 reviews</Text>
            </View>
          </View>
          <Text style={styles.name}>{vehicle?.name}</Text>
          <Text style={styles.line}>{vehicle?.line}</Text>
          <Text style={styles.about}>{extra.about}</Text>
          <View style={styles.specRow}>
            <View style={styles.specChip}>
              <Ionicons name="navigate" size={16} color={PURPLE} />
              <Text style={styles.specValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {vehicle?.range}
              </Text>
              <Text style={styles.specLabel}>Range</Text>
            </View>
            <View style={styles.specChip}>
              <Ionicons name="speedometer" size={16} color={PURPLE} />
              <Text style={styles.specValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {vehicle?.speed}
              </Text>
              <Text style={styles.specLabel}>Top speed</Text>
            </View>
            <View style={styles.specChip}>
              <Ionicons name="battery-charging" size={16} color={PURPLE} />
              <Text style={styles.specValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {extra.battery}
              </Text>
              <Text style={styles.specLabel}>Battery</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={cardEnter(1)} style={styles.block}>
          <Text style={styles.section}>Highlights</Text>
          <View style={styles.highlightGrid}>
            {HIGHLIGHTS.map((item) => (
              <View key={item.title} style={styles.highlight}>
                <View style={styles.highlightIcon}>
                  <Ionicons name={item.icon} size={18} color={PURPLE} />
                </View>
                <Text style={styles.highlightTitle}>{item.title}</Text>
                <Text style={styles.highlightText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={cardEnter(2)} style={styles.block}>
          <Text style={styles.section}>Specifications</Text>
          <View style={styles.specCard}>
            {specs.map(([label, value], index) => (
              <View key={label} style={[styles.specLine, index === specs.length - 1 && styles.specLineLast]}>
                <Text style={styles.specName}>{label}</Text>
                <Text style={styles.specFact}>{value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={cardEnter(3)} style={styles.block}>
          <Text style={styles.section}>Rider reviews</Text>
          {REVIEWS.map((review) => (
            <View key={review.name} style={styles.review}>
              <View style={styles.reviewTop}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewInitial}>{review.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.reviewCopy}>
                  <Text style={styles.reviewName}>{review.name}</Text>
                  <Stars score={review.score} />
                </View>
                <Text style={styles.reviewScore}>{review.score}</Text>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={cardEnter(4)} style={styles.block}>
          <Text style={styles.section}>Before you book</Text>
          <View style={styles.faqCard}>
            {QUESTIONS.map((item, index) => {
              const open = openFaq === index;
              return (
                <Pressable
                  key={item.q}
                  onPress={() => setOpenFaq(open ? -1 : index)}
                  style={[styles.faqRow, index === QUESTIONS.length - 1 && styles.faqRowLast]}
                >
                  <View style={styles.faqHead}>
                    <Text style={styles.faqQ}>{item.q}</Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#8A8496" />
                  </View>
                  {open ? <Text style={styles.faqA}>{item.a}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Pressable hitSlop={8} style={styles.iconBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color="#1C1C1C" />
        </Pressable>
        <Pressable hitSlop={8} style={styles.iconBtn} onPress={() => setSaved((value) => !value)}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#E2557A' : '#1C1C1C'} />
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={onBook}
          onPressIn={() => {
            btnScale.value = withSpring(0.98, { damping: 18, stiffness: 280 });
          }}
          onPressOut={() => {
            btnScale.value = withSpring(1, { damping: 14, stiffness: 220 });
          }}
        >
          <Animated.View style={[styles.bookBtn, btnStyle]}>
            <Text style={styles.bookText}>Book This Ride</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
  hero: {
    alignItems: 'center',
    paddingBottom: 28,
  },
  heroImage: {
    width: 280,
    height: 190,
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  identity: {
    marginTop: -18,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    backgroundColor: '#F6F1FC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: '700',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#1C1C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  ratingCount: {
    color: '#8A8496',
    fontSize: 12,
  },
  name: {
    marginTop: 14,
    color: '#1C1C1C',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  line: {
    marginTop: 4,
    color: PURPLE,
    fontSize: 14,
    fontWeight: '600',
  },
  about: {
    marginTop: 10,
    color: '#6E6878',
    fontSize: 14,
    lineHeight: 21,
  },
  specRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  specChip: {
    flex: 1,
    backgroundColor: '#F7F7F8',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  specValue: {
    color: '#1C1C1C',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  specLabel: {
    color: '#8A8496',
    fontSize: 11,
  },
  block: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 12,
    color: '#1C1C1C',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  highlightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  highlight: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F6F1FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTitle: {
    marginTop: 10,
    color: '#1C1C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  highlightText: {
    marginTop: 2,
    color: '#8A8496',
    fontSize: 12,
  },
  specCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  specLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F3',
    gap: 12,
  },
  specLineLast: {
    borderBottomWidth: 0,
  },
  specName: {
    color: '#8A8496',
    fontSize: 14,
  },
  specFact: {
    color: '#1C1C1C',
    fontSize: 14,
    fontWeight: '600',
  },
  review: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F6F1FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewInitial: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewCopy: {
    flex: 1,
    marginLeft: 10,
  },
  reviewName: {
    color: '#1C1C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  stars: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 1,
  },
  reviewScore: {
    color: '#1C1C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewText: {
    marginTop: 10,
    color: '#6E6878',
    fontSize: 13,
    lineHeight: 19,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  faqRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F3',
  },
  faqRowLast: {
    borderBottomWidth: 0,
  },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faqQ: {
    flex: 1,
    color: '#1C1C1C',
    fontSize: 14,
    fontWeight: '600',
  },
  faqA: {
    marginTop: 8,
    color: '#6E6878',
    fontSize: 13,
    lineHeight: 19,
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
  bookBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
