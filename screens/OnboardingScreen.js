import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const EVEGAH_LOGO = require('../assets/login/evegah-logo.png');
const VEHICLE_PURPLE = require('../assets/home/vehicle-city.png');
const RIDER_IMG = require('../assets/login/otp-rider.png');

const SLIDES = [
  {
    id: '01',
    tag: 'ECO SMART MOBILITY',
    tagIcon: 'leaf',
    tagColor: '#059669',
    tagBg: '#ECFDF5',
    headlineTop: 'Cleaner Rides,',
    headlineAccent: 'Brighter Tomorrow',
    subtitle:
      'Experience whisper-quiet electric scooters designed for zero emissions and effortless urban commuting.',
    image: RIDER_IMG,
    badgeTopLeft: { icon: 'shield-checkmark', title: '100% Green', sub: 'Zero Tailpipe CO₂', color: '#10B981' },
    badgeBottomRight: { icon: 'battery-charging', title: 'Smart Swap', sub: 'Full Charge in 2m', color: '#6D28D9' },
    auraColors: ['#F3E8FF', '#ECFDF5', '#FFFFFF'],
  },
  {
    id: '02',
    tag: 'INSTANT FLEET ACCESS',
    tagIcon: 'flash',
    tagColor: '#4F46E5',
    tagBg: '#EEF2FF',
    headlineTop: 'Rent Your',
    headlineAccent: 'EV Ride Easily',
    subtitle:
      'Choose from a wide range of smart electric scooters available at convenient EVegah zones across your city.',
    image: VEHICLE_PURPLE,
    badgeTopLeft: { icon: 'location', title: '25+ City Zones', sub: 'Near You', color: '#4F46E5' },
    badgeBottomRight: { icon: 'bluetooth', title: 'Keyless Unlock', sub: '1-Tap App Start', color: '#7C3AED' },
    auraColors: ['#EEF2FF', '#F5F3FF', '#FFFFFF'],
  },
  {
    id: '03',
    tag: 'FLEXIBLE PLANS',
    tagIcon: 'wallet',
    tagColor: '#7C3AED',
    tagBg: '#F5F3FF',
    headlineTop: 'Pocket-Friendly',
    headlineAccent: 'Rides Every Day',
    subtitle:
      'Pick hourly, daily, or weekly rental packages with transparent pricing and zero fuel expenses.',
    image: RIDER_IMG,
    badgeTopLeft: { icon: 'trending-down', title: 'Save 65%', sub: 'vs Petrol Rides', color: '#059669' },
    badgeBottomRight: { icon: 'headset', title: '24/7 Roadside', sub: 'Instant Support', color: '#4F46E5' },
    auraColors: ['#F5F3FF', '#EFF6FF', '#FFFFFF'],
  },
];

export default function OnboardingScreen({ onFinish }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Continuous ambient floating animation for hero illustrations
  const floatAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const idx = Math.round(event.contentOffset.x / SCREEN_W);
      runOnJS(setActiveIndex)(Math.max(0, Math.min(SLIDES.length - 1, idx)));
    },
  });

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_W,
        animated: true,
      });
    } else {
      onFinish?.();
    }
  };

  const handleSkip = () => {
    onFinish?.();
  };

  // Morphing button width on the final slide
  const ctaButtonAnimatedStyle = useAnimatedStyle(() => {
    const isLastSlideProgress = interpolate(
      scrollX.value,
      [(SLIDES.length - 2) * SCREEN_W, (SLIDES.length - 1) * SCREEN_W],
      [0, 1],
      Extrapolation.CLAMP
    );

    const width = interpolate(isLastSlideProgress, [0, 1], [58, 168]);
    const borderRadius = interpolate(isLastSlideProgress, [0, 1], [29, 28]);

    return {
      width,
      borderRadius,
    };
  });

  const ctaTextAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [(SLIDES.length - 1.4) * SCREEN_W, (SLIDES.length - 1) * SCREEN_W],
      [0, 1],
      Extrapolation.CLAMP
    );
    const translateX = interpolate(
      scrollX.value,
      [(SLIDES.length - 1.4) * SCREEN_W, (SLIDES.length - 1) * SCREEN_W],
      [12, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Top Persistent Navigation Bar */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.topBar, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.logoRow}>
          <Image
            source={EVEGAH_LOGO}
            style={styles.brandLogo}
            contentFit="contain"
          />
          <View style={styles.mobilityPill}>
            <View style={styles.liveDot} />
            <Text style={styles.mobilityPillText}>Mobility</Text>
          </View>
        </View>

        <View style={styles.topRightRow}>
          <View style={styles.stepCounterChip}>
            <Text style={styles.stepCounterActive}>0{activeIndex + 1}</Text>
            <Text style={styles.stepCounterTotal}>/0{SLIDES.length}</Text>
          </View>

          <Pressable
            hitSlop={14}
            onPress={handleSkip}
            style={({ pressed }) => [
              styles.skipChip,
              pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
            ]}
          >
            <Text style={styles.skipChipText}>Skip</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Main Horizontal Pager */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide, index) => (
          <OnboardingSlide
            key={slide.id}
            slide={slide}
            index={index}
            scrollX={scrollX}
            floatAnim={floatAnim}
            pulseAnim={pulseAnim}
          />
        ))}
      </Animated.ScrollView>

      {/* Bottom Floating Control Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom + 14, 28) },
        ]}
      >
        {/* Expanding Liquid Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => (
            <LiquidDot key={idx} index={idx} scrollX={scrollX} />
          ))}
        </View>

        {/* Morphing Next / Get Started Button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          <Animated.View style={[styles.ctaButtonWrap, ctaButtonAnimatedStyle]}>
            <LinearGradient
              colors={['#3B1078', '#1E1238']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Animated.View style={[styles.ctaLabelWrap, ctaTextAnimatedStyle]}>
                <Text style={styles.ctaLabelText} numberOfLines={1}>
                  Get Started
                </Text>
              </Animated.View>
              <View style={styles.ctaIconWrap}>
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   INDIVIDUAL SLIDE WITH 3D PARALLAX & FLOATING TELEMETRY CARDS
   ────────────────────────────────────────────────────────────── */
function OnboardingSlide({
  slide,
  index,
  scrollX,
  floatAnim,
  pulseAnim,
}) {
  const inputRange = [
    (index - 1) * SCREEN_W,
    index * SCREEN_W,
    (index + 1) * SCREEN_W,
  ];

  // Foreground Hero Image Parallax + Idle Levitation
  const heroAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [SCREEN_W * 0.28, 0, -SCREEN_W * 0.28],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.78, 1, 0.78],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.15, 1, 0.15],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { translateX },
        { translateY: floatAnim.value },
        { scale },
      ],
    };
  });

  // City Skyline Slower Parallax Layer
  const skylineAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [SCREEN_W * 0.5, 0, -SCREEN_W * 0.5],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX }],
    };
  });

  // Breathing Halo Rings
  const ringAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.6, pulseAnim.value, 0.6],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
    };
  });

  // Floating Telemetry Badges Parallax
  const topLeftBadgeStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [70, 0, -70],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [25, -floatAnim.value * 0.6, 25],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateX }, { translateY }],
    };
  });

  const bottomRightBadgeStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [-70, 0, 70],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [-25, floatAnim.value * 0.7, -25],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateX }, { translateY }],
    };
  });

  // Typography Reveal Animation
  const textContentStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [24, 0, 24],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      {/* Soft Ambient Mesh Aura */}
      <LinearGradient
        colors={slide.auraColors}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Interactive Illustration Stage */}
      <View style={styles.artStage}>
        {/* Concentric Breathing Glow Rings */}
        <Animated.View style={[styles.outerGlowCircle, ringAnimatedStyle]} />
        <Animated.View style={[styles.innerGlowCircle, ringAnimatedStyle]} />

        {/* Parallax Modern City Silhouette */}
        <Animated.View style={[styles.citySkylineContainer, skylineAnimatedStyle]}>
          <View style={[styles.buildingBlock, { height: 135, left: '12%', width: 34 }]} />
          <View style={[styles.buildingBlock, { height: 185, left: '25%', width: 42 }]} />
          <View style={[styles.buildingBlock, { height: 120, left: '42%', width: 36 }]} />
          <View style={[styles.buildingBlock, { height: 170, left: '58%', width: 44 }]} />
          <View style={[styles.buildingBlock, { height: 130, left: '76%', width: 34 }]} />

          {/* Perspective Road Track */}
          <View style={styles.roadSurface}>
            <View style={styles.roadDashRow}>
              <View style={styles.roadDash} />
              <View style={styles.roadDash} />
              <View style={styles.roadDash} />
              <View style={styles.roadDash} />
            </View>
          </View>
        </Animated.View>

        {/* Top-Left Floating Telemetry Card */}
        <Animated.View style={[styles.floatingCardTopLeft, topLeftBadgeStyle]}>
          <View style={[styles.floatingCardIcon, { backgroundColor: `${slide.badgeTopLeft.color}18` }]}>
            <Ionicons name={slide.badgeTopLeft.icon} size={16} color={slide.badgeTopLeft.color} />
          </View>
          <View>
            <Text style={styles.floatingCardTitle}>{slide.badgeTopLeft.title}</Text>
            <Text style={styles.floatingCardSub}>{slide.badgeTopLeft.sub}</Text>
          </View>
        </Animated.View>

        {/* Main EV / Rider Foreground Image */}
        <Animated.View style={[styles.heroImageContainer, heroAnimatedStyle]}>
          <Image
            source={slide.image}
            style={styles.heroImage}
            contentFit="contain"
          />
          <View style={styles.groundShadow} />
        </Animated.View>

        {/* Bottom-Right Floating Telemetry Card */}
        <Animated.View style={[styles.floatingCardBottomRight, bottomRightBadgeStyle]}>
          <View style={[styles.floatingCardIcon, { backgroundColor: `${slide.badgeBottomRight.color}18` }]}>
            <Ionicons name={slide.badgeBottomRight.icon} size={16} color={slide.badgeBottomRight.color} />
          </View>
          <View>
            <Text style={styles.floatingCardTitle}>{slide.badgeBottomRight.title}</Text>
            <Text style={styles.floatingCardSub}>{slide.badgeBottomRight.sub}</Text>
          </View>
        </Animated.View>
      </View>

      {/* Editorial Typography Card */}
      <Animated.View style={[styles.textSection, textContentStyle]}>
        <View style={[styles.tagPill, { backgroundColor: slide.tagBg }]}>
          <Ionicons name={slide.tagIcon} size={13} color={slide.tagColor} />
          <Text style={[styles.tagPillText, { color: slide.tagColor }]}>
            {slide.tag}
          </Text>
        </View>

        <Text style={styles.headlinePrimary}>
          {slide.headlineTop}{'\n'}
          <Text style={styles.headlineHighlight}>{slide.headlineAccent}</Text>
        </Text>

        <Text style={styles.subtitleText}>{slide.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   LIQUID PAGINATION DOT
   ────────────────────────────────────────────────────────────── */
function LiquidDot({
  index,
  scrollX,
}) {
  const inputRange = [
    (index - 1) * SCREEN_W,
    index * SCREEN_W,
    (index + 1) * SCREEN_W,
  ];

  const animatedDotStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 30, 8],
      Extrapolation.CLAMP
    );
    const backgroundColor = interpolateColor(
      scrollX.value,
      inputRange,
      ['#CBD5E1', '#2A195C', '#CBD5E1']
    );

    return {
      width,
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.liquidDot, animatedDotStyle]} />;
}

/* ──────────────────────────────────────────────────────────────
   STYLES
   ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pager: {
    flex: 1,
  },

  /* Top Header */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
    zIndex: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 116,
    height: 34,
  },
  mobilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  mobilityPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.2,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepCounterChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(241, 245, 249, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  stepCounterActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E1238',
  },
  stepCounterTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  skipChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  skipChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },

  /* Slide Layout */
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingBottom: 12,
  },

  /* Interactive Illustration Stage */
  artStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 8,
  },
  outerGlowCircle: {
    position: 'absolute',
    width: SCREEN_W * 0.78,
    height: SCREEN_W * 0.78,
    borderRadius: (SCREEN_W * 0.78) / 2,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.12)',
  },
  innerGlowCircle: {
    position: 'absolute',
    width: SCREEN_W * 0.56,
    height: SCREEN_W * 0.56,
    borderRadius: (SCREEN_W * 0.56) / 2,
    backgroundColor: 'rgba(99, 102, 241, 0.07)',
  },
  citySkylineContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 28,
  },
  buildingBlock: {
    position: 'absolute',
    bottom: 48,
    backgroundColor: 'rgba(226, 232, 240, 0.55)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  roadSurface: {
    width: '100%',
    height: 48,
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1.5,
    borderTopColor: '#E2E8F0',
    justifyContent: 'center',
  },
  roadDashRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  roadDash: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },

  /* Hero Foreground Image */
  heroImageContainer: {
    width: '100%',
    height: '84%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroImage: {
    width: '92%',
    height: '92%',
  },
  groundShadow: {
    width: '56%',
    height: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(30, 18, 56, 0.10)',
    marginTop: -12,
  },

  /* Floating Glassmorphic Telemetry Cards */
  floatingCardTopLeft: {
    position: 'absolute',
    top: 22,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1238',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 15,
  },
  floatingCardBottomRight: {
    position: 'absolute',
    bottom: 26,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1238',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 15,
  },
  floatingCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  floatingCardSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Typography Section */
  textSection: {
    paddingTop: 18,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  tagPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headlinePrimary: {
    fontSize: 31,
    fontWeight: '900',
    color: '#1E1238',
    lineHeight: 39,
    letterSpacing: -0.6,
  },
  headlineHighlight: {
    color: '#5B21B6',
  },
  subtitleText: {
    marginTop: 10,
    fontSize: 14.5,
    lineHeight: 22,
    color: '#64748B',
    fontWeight: '500',
  },

  /* Bottom Bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liquidDot: {
    height: 8,
    borderRadius: 4,
  },

  /* Morphing CTA Button */
  ctaButtonWrap: {
    height: 58,
    overflow: 'hidden',
    shadowColor: '#2A195C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 17,
  },
  ctaLabelWrap: {
    position: 'absolute',
    left: 20,
  },
  ctaLabelText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ctaIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});