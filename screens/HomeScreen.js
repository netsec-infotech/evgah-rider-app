import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';
import { apiGet } from '../services/api';
import AnalogClockModal, {
  formatClockString,
  parseOperatingHours,
} from '../components/AnalogClockPicker';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 16;
const TAB_PURPLE = '#4A168C';
const SLIDE_WIDTH = SCREEN_W;
const SLIDE_HEIGHT = Math.round(SCREEN_W * (380 / 401));
const GARBA_W = Math.round(SCREEN_W * 0.58);
const GARBA_H = Math.round(GARBA_W * (960 / 1042));
const SLIDER2_FRONT_W = Math.round(SCREEN_W * 0.55);
const SLIDER2_FRONT_H = Math.round(SLIDER2_FRONT_W * (377 / 355));
const SLIDER3_FRONT_W = Math.round(SCREEN_W * 0.58);
const SLIDER3_FRONT_H = Math.round(SLIDER3_FRONT_W * 1.12);
const SOCIAL_CARD_W = Math.round(SCREEN_W * 0.405);
const SOCIAL_CARD_H = Math.round(SOCIAL_CARD_W * 1.59);
const SOCIAL_GAP = 14;
const REVIEW_CARD_W = Math.round(SCREEN_W * 0.70);
const REVIEW_CARD_H = Math.round(REVIEW_CARD_W * 1.50);
const REVIEW_GAP = 14;
const REVIEW_SNAP = REVIEW_CARD_W + REVIEW_GAP;
const REVIEW_PILLS = [
  'Fastest Growing',
  'Customer Supportive',
  'Price Guarantee',
  'Trust',
  'Doorstep Evaluation',
  'Multi-Zone Across India',
  'Hassle free pay-Zone',
  'Inspection Quality',
];
const CUSTOMER_REVIEWS = [
  {
    id: 'murthy',
    name: 'Murthy Kasturi',
    city: 'Ahmedabad',
    quote:
      'The entire process was seamless and very quick. I checked the quote online and EVegah executive came for evaluation the same day. The entire...',
    readMore: true,
    badge: 'Rent Evegah City',
    image:
      'https://media.assettype.com/outlookbusiness/2025-07-18/mf49u3l7/ChatGPT-Image-Jul-18-2025-032837-PM.png?w=801&auto=format%2Ccompress&fit=max&format=webp&dpr=1.0',
  },
  {
    id: 'surinder',
    name: 'Surinder Pal Singh',
    city: 'Guwahati',
    quote:
      'From inspection to paperwork, I completed the entire process from the comfort of home. EVegah team was very professional and friendly.',
    readMore: false,
    badge: 'Rent Evegeh Mink',
    image:
      'https://www.evegah.com/images/t2.webp',
  },
  {
    id: 'sanjeev',
    name: 'Sanjeev Gupta',
    city: 'Daman',
    quote:
      "We didn't think Renting  Scooter could be so fast and easy. We received the best amount and it was same as the online estimate.",
    readMore: false,
    badge: 'Rent Evegah Fly',
    image:
      'https://www.evegah.com/images/t1.webp',
  },
  {
    id: 'tejashree',
    name: 'Tejashree Kale',
    city: 'Vadodara',
    quote:
      'I love my Vehicle and with EVegah I got the confidence that the vehicle will be in safe custody.',
    readMore: false,
    badge: 'Rent Evegah Pro',
    image:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQErT7Zy_-UNWmvrhjzk_ZKRFlI9IKHSwa5wtgygjRe-JPHbYcipYjdoL0&s=10',
  },
  {
    id: 'vikrant',
    name: 'Vikrant Jadhav',
    city: 'Aatapi',
    quote:
      "EVegah valued  Vehicle with the best price for Vehicle and I don't think anyone can compete with the prices offered",
    readMore: false,
    badge: 'Rent Evegah Max',
    image:
      'https://www.evegah.com/images/partner-blinkit.jpg',
  },
];
const REVIEW_LOOP = [...CUSTOMER_REVIEWS, ...CUSTOMER_REVIEWS, ...CUSTOMER_REVIEWS];
const SOCIAL_VIDEOS = [
  require('../assets/home/vid1.mp4'),
  require('../assets/home/vid2.mp4'),
  require('../assets/home/vid3.mp4'),
  require('../assets/home/vid4.mp4'),
];
const FOOTER_ART = require('../assets/home/footer-evegah.png');
const FOOTER_ART_HEIGHT = Math.round(SCREEN_W * (673 / 861));

const SLIDES = [
  {
    kind: 'navratri',
    bg: require('../assets/home/ride-more-slide.png'),
    front: require('../assets/home/garba.png'),
    frontWidth: GARBA_W,
    frontHeight: GARBA_H,
    frontRight: -10,
    frontBottom: 22,
    cta: 'Rent EVs',
  },
  {
    kind: 'headline',
    bg: require('../assets/home/slider2.png'),
    front: require('../assets/home/slider2_front.png'),
    frontWidth: SLIDER2_FRONT_W,
    frontHeight: SLIDER2_FRONT_H,
    frontRight: 0,
    frontBottom: 20,
    lines: ['Rent your EV', 'for the', 'Right price'],
    cta: 'Rent EV',
  },
  {
    kind: 'smart',
    bg: require('../assets/home/slider3.png'),
    front: require('../assets/home/slider3-top.png'),
    frontWidth: SLIDER3_FRONT_W,
    frontHeight: SLIDER3_FRONT_H,
    frontRight: -8,
    frontBottom: 18,
    lines: ['smart way', 'to ride'],
    subLines: ['zero deposit plan', 'options'],
    cta: 'Go With EV',
  },
];
const LOOP = [...SLIDES, SLIDES[0]];
const RIDE_CARD_W = Math.round(SCREEN_W * 0.74);
const RIDE_SNAP = Math.round(SCREEN_W * 0.58);
const VEHICLES = [
  {
    name: 'Evegah Fly',
    tag: 'Lite EV',
    year: '2026',
    price: '₹149/day',
    swap: '2 min swap',
    line: 'Light for every day',
    range: '40-60 km',
    speed: '25 km/h',
    tint: '#EEF3FF',
    accent: '#3B5BDB',
    image: require('../assets/home/vehicle-fly.png'),
  },
  {
    name: 'Evegah Mink',
    tag: 'Most Popular',
    year: '2026',
    price: '₹199/day',
    swap: '2 min swap',
    line: 'Smooth city miles',
    range: '70-90 km',
    speed: '45 km/h',
    tint: '#F6F1FC',
    accent: '#4A168C',
    image: require('../assets/home/vehicle-mink.png'),
  },
  {
    name: 'Evegah City',
    tag: 'Urban Pro',
    year: '2026',
    price: '₹229/day',
    swap: '2 min swap',
    line: 'Quiet across town',
    range: '80-90 km',
    speed: '45 km/h',
    tint: '#F3FBF6',
    accent: '#15803D',
    image: require('../assets/home/vehicle-city.png'),
  },
  {
    name: 'Evegah Pro',
    tag: 'Long Range',
    year: '2026',
    price: '₹279/day',
    swap: 'Dual Pack',
    line: 'Built for longer rides',
    range: '110-130 km',
    speed: '75 km/h',
    tint: '#FFF6F2',
    accent: '#C2410C',
    image: require('../assets/home/vehicle-pro.png'),
  },
];

function GyroFooterArt() {
  const rotateZ = useSharedValue(0);
  const shiftX = useSharedValue(0);
  const shiftY = useSharedValue(0);

  useEffect(() => {
    const samples = [];
    const smooth = { x: 0, y: 0 };
    Accelerometer.setUpdateInterval(32);
    const subscription = Accelerometer.addListener(({ x, y }) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      smooth.x += (x - smooth.x) * 0.22;
      smooth.y += (y - smooth.y) * 0.22;

      if (samples.length < 6) {
        samples.push({ x: smooth.x, y: smooth.y });
        return;
      }
      if (samples.base == null) {
        const count = samples.length;
        samples.base = samples.reduce(
          (acc, sample) => ({
            x: acc.x + sample.x / count,
            y: acc.y + sample.y / count,
          }),
          { x: 0, y: 0 },
        );
      }

      const roll = Math.max(-0.7, Math.min(0.7, smooth.x - samples.base.x));
      const pitch = Math.max(-0.7, Math.min(0.7, smooth.y - samples.base.y));
      const blend = 0.12;
      rotateZ.value += ((roll / 0.7) * -4 - rotateZ.value) * blend;
      shiftX.value += (roll * -36 - shiftX.value) * blend;
      shiftY.value += (pitch * 22 - shiftY.value) * blend;
    });

    return () => subscription.remove();
  }, [rotateZ, shiftX, shiftY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: shiftX.value },
      { translateY: shiftY.value },
      { rotateZ: `${rotateZ.value}deg` },
    ],
  }));

  return (
    <View style={styles.footerPerspective} collapsable={false}>
      <Animated.View collapsable={false} style={[styles.footerStage, style]}>
        <Image source={FOOTER_ART} style={styles.footerArt} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RideCard({ vehicle, index, totalCount, scrollX, active, onOpenVehicle, onOpenRent }) {
  const [saved, setSaved] = useState(false);
  const paint = useSharedValue(active ? 1 : 0);
  const btnWidth = useSharedValue(RIDE_CARD_W - 28);
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * RIDE_SNAP, index * RIDE_SNAP, (index + 1) * RIDE_SNAP];
    const raw = interpolate(scrollX.value, input, [-1, 0, 1], Extrapolation.CLAMP);
    const eased = Math.sign(raw) * Math.pow(Math.abs(raw), 1.35);
    return {
      zIndex: Math.abs(raw) < 0.5 ? 8 : 1,
      transform: [
        { translateX: eased * 14 },
        { scale: 1 - Math.abs(eased) * 0.085 },
      ],
    };
  });
  const paintStyle = useAnimatedStyle(() => ({
    width: btnWidth.value * paint.value,
  }));
  const paintLabelStyle = useAnimatedStyle(() => ({
    width: btnWidth.value,
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(paint.value, [0, 1], ['#E4D8F4', TAB_PURPLE]),
  }));

  useEffect(() => {
    paint.value = withTiming(active ? 1 : 0, {
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [active, paint]);

  return (
    <Animated.View
      collapsable={false}
      style={[
        styles.rideSlot,
        index < totalCount - 1 && styles.rideSlotOverlap,
        style,
      ]}
    >
      <View
        style={[
          styles.rideCard,
          active && styles.rideCardActive,
        ]}
      >
        {/* Top Studio Stage */}
        <LinearGradient
          colors={[vehicle.tint || '#F6F1FC', '#FFFFFF']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.rideStageBox}
        >
          <View style={styles.rideTop}>
            <View style={styles.rideAssuredPill}>
              <Ionicons name="flash" size={11} color={TAB_PURPLE} />
              <Text style={styles.ridePillText}>{vehicle.tag}</Text>
            </View>
            <Pressable
              hitSlop={8}
              style={styles.rideHeart}
              onPress={() => setSaved((value) => !value)}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={17}
                color={saved ? '#E2557A' : '#5E5470'}
              />
            </Pressable>
          </View>

          <View style={styles.rideHaloCircle} />
          <View style={styles.rideFloorShadow} />
          <Image
            source={vehicle.image}
            style={styles.rideImage}
            contentFit="contain"
          />

          <View style={styles.ridePriceFloatPill}>
            <Text style={styles.ridePriceFloatText}>
              {vehicle.price || '₹199/day'}
            </Text>
          </View>
        </LinearGradient>

        {/* Vehicle Identity & Telemetry */}
        <View style={styles.rideBodyContent}>
          <View style={styles.rideTitleHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rideName} numberOfLines={1}>
                {vehicle.name}
              </Text>
              <Text style={styles.rideLine} numberOfLines={1}>
                {vehicle.line}
              </Text>
            </View>
            <View style={styles.rideYearTag}>
              <Text style={styles.rideYearTagText}>EV</Text>
            </View>
          </View>

          <View style={styles.rideSpecs}>
            <View style={styles.rideSpec}>
              <View style={styles.rideSpecIconBox}>
                <Ionicons name="navigate" size={13} color={TAB_PURPLE} />
              </View>
              <Text style={styles.rideSpecValue}>{vehicle.range}</Text>
              <Text style={styles.rideSpecLabel}>Range</Text>
            </View>

            <View style={styles.rideSpecDivider} />

            <View style={styles.rideSpec}>
              <View style={styles.rideSpecIconBox}>
                <Ionicons name="speedometer" size={13} color={TAB_PURPLE} />
              </View>
              <Text style={styles.rideSpecValue}>{vehicle.speed}</Text>
              <Text style={styles.rideSpecLabel}>Top Speed</Text>
            </View>

            <View style={styles.rideSpecDivider} />

            <View style={styles.rideSpec}>
              <View style={styles.rideSpecIconBox}>
                <Ionicons name="battery-charging" size={13} color="#15803D" />
              </View>
              <Text style={styles.rideSpecValue}>{vehicle.swap || '2m Swap'}</Text>
              <Text style={styles.rideSpecLabel}>Fast Zone</Text>
            </View>
          </View>

          <AnimatedPressable
            style={[styles.rideBtn, buttonStyle]}
            onPress={() => (onOpenRent ? onOpenRent(vehicle) : onOpenVehicle?.(vehicle))}
            onLayout={(event) => {
              btnWidth.value = event.nativeEvent.layout.width;
            }}
          >
            <View style={styles.rideBtnFace}>
              <Text style={styles.rideBtnText}>View Details</Text>
              <Ionicons name="arrow-forward" size={14} color={TAB_PURPLE} />
            </View>
            <Animated.View
              pointerEvents="none"
              style={[styles.rideBtnPaint, paintStyle]}
            >
              <Animated.View style={[styles.rideBtnPaintLabel, paintLabelStyle]}>
                <Ionicons name="flash" size={14} color="#FDE68A" />
                <Text style={[styles.rideBtnText, styles.rideBtnTextOn]}>
                  Book This Ride
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </Animated.View>
            </Animated.View>
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}

function SocialVideoCard({ source, paused, onPress }) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  useEffect(() => {
    player.loop = true;
    if (paused) {
      player.pause();
    } else {
      player.muted = true;
      player.play();
    }
  }, [paused, player]);

  return (
    <Pressable onPress={onPress} style={styles.socialCard}>
      <View pointerEvents="none" style={styles.socialVideo}>
        <VideoView
          player={player}
          style={styles.socialVideo}
          contentFit="cover"
          surfaceType="textureView"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      </View>
    </Pressable>
  );
}

function StatusVideoSlide({ source, muted, onProgress, onEnded }) {
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;

  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = muted;
    instance.volume = 1.0;
    instance.timeUpdateEventInterval = 0.05;
    instance.play();
  });

  useEffect(() => {
    player.loop = true;
    player.muted = muted;
    player.play();
  }, [muted, player, source]);

  useEffect(() => {
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      const duration = player.duration;
      if (duration > 0) {
        onProgressRef.current?.(Math.min(1, Math.max(0, currentTime / duration)));
      }
    });

    const endSub = player.addListener('playToEnd', () => {
      onEndedRef.current?.();
    });

    return () => {
      timeSub.remove();
      endSub.remove();
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.statusVideo}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

function SocialStatusModal({ initialIndex, onClose }) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replayTick, setReplayTick] = useState(0);
  const touchStartXRef = useRef(null);

  const goPrev = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev - 1 + SOCIAL_VIDEOS.length) % SOCIAL_VIDEOS.length);
    setReplayTick((t) => t + 1);
  };

  const goNext = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % SOCIAL_VIDEOS.length);
    setReplayTick((t) => t + 1);
  };

  return (
    <View style={styles.statusRoot}>
      <StatusBar style="light" />
      <View style={[styles.statusBarsRow, { marginTop: insets.top + 8 }]}>
        {SOCIAL_VIDEOS.map((_, idx) => {
          const fillPercent =
            idx < currentIndex ? 100 : idx === currentIndex ? Math.min(100, Math.max(0, progress * 100)) : 0;
          return (
            <View key={idx} style={styles.statusBarTrack}>
              <View style={[styles.statusBarFill, { width: `${fillPercent}%` }]} />
            </View>
          );
        })}
      </View>

      <View
        style={[styles.statusStage, { marginBottom: Math.max(insets.bottom, 12) }]}
        onTouchStart={(e) => {
          touchStartXRef.current = e.nativeEvent.pageX;
        }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current == null) return;
          const dx = e.nativeEvent.pageX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(dx) > 42) {
            if (dx < 0) goNext();
            else goPrev();
          }
        }}
      >
        <StatusVideoSlide
          key={`${currentIndex}-${replayTick}`}
          source={SOCIAL_VIDEOS[currentIndex]}
          muted={muted}
          onProgress={setProgress}
          onEnded={goNext}
        />

        <View style={styles.statusTapLayer}>
          <Pressable style={styles.statusTapLeft} onPress={goPrev} />
          <Pressable style={styles.statusTapRight} onPress={goNext} />
        </View>

        <Pressable hitSlop={12} style={[styles.statusNavArrow, styles.statusNavArrowLeft]} onPress={goPrev}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable hitSlop={12} style={[styles.statusNavArrow, styles.statusNavArrowRight]} onPress={goNext}>
          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </Pressable>

        <View style={styles.statusControls}>
          <Pressable
            hitSlop={10}
            style={styles.statusCircleBtn}
            onPress={() => setMuted((prev) => !prev)}
          >
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable hitSlop={10} style={styles.statusCircleBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MergeSlide({ index, slide, scrollX }) {
  const bgStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * SLIDE_WIDTH, index * SLIDE_WIDTH, (index + 1) * SLIDE_WIDTH];
    return {
      opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            scrollX.value,
            input,
            [SLIDE_WIDTH * 0.24, 0, -SLIDE_WIDTH * 0.24],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(scrollX.value, input, [1.04, 1, 1.04], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const copyStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * SLIDE_WIDTH, index * SLIDE_WIDTH, (index + 1) * SLIDE_WIDTH];
    return {
      opacity: interpolate(
        scrollX.value,
        [input[0] + SLIDE_WIDTH * 0.14, input[1], input[2] - SLIDE_WIDTH * 0.14],
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            scrollX.value,
            input,
            [SLIDE_WIDTH * 0.56, 0, -SLIDE_WIDTH * 0.56],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const frontStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * SLIDE_WIDTH, index * SLIDE_WIDTH, (index + 1) * SLIDE_WIDTH];
    return {
      opacity: interpolate(
        scrollX.value,
        [input[0] + SLIDE_WIDTH * 0.08, input[1], input[2] - SLIDE_WIDTH * 0.08],
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            scrollX.value,
            input,
            [SLIDE_WIDTH * 0.82, 0, -SLIDE_WIDTH * 0.82],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(scrollX.value, input, [0.93, 1, 0.93], Extrapolation.CLAMP),
        },
      ],
    };
  });
  const bgSource = typeof slide.bg === 'string' ? { uri: resolveMediaUrl(slide.bg) } : slide.bg;
  const frontSource = typeof slide.front === 'string' ? { uri: resolveMediaUrl(slide.front) } : slide.front;

  return (
    <View pointerEvents="none" style={styles.slide}>
      <Animated.View style={[styles.slideBgWrap, bgStyle]}>
        <Image source={bgSource} style={styles.slideImage} contentFit="cover" />
        {slide.kind !== 'navratri' ? (
          <LinearGradient
            colors={['rgba(10, 12, 18, 0.62)', 'rgba(10, 12, 18, 0.24)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.78, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
      </Animated.View>

      <Animated.View style={[styles.slideCopyWrap, copyStyle]}>
        {slide.kind === 'navratri' ? (
          <View style={styles.navratriEmblem}>
            <View style={styles.navratriArchRow}>
              <View style={styles.navratriArchWing} />
              <View style={styles.navratriArchDome}>
                <Ionicons name="sparkles" size={12} color="#B51F38" />
              </View>
              <View style={styles.navratriArchWing} />
            </View>
            <Text style={styles.navratriHelloText}>HELLO,</Text>
            <Text style={styles.navratriMainText}>NAVRATRI</Text>
            <View style={styles.navratriSwirlBar} />
          </View>
        ) : (
          <View style={styles.slideHeadlineBlock}>
            <View style={styles.slideAccentVector}>
              <View style={styles.slideAccentDot} />
              <View style={styles.slideAccentLine} />
            </View>
            {slide.lines?.map((line) => (
              <Text key={line} style={styles.slideHeadlineText}>
                {line}
              </Text>
            ))}
            {slide.subLines ? (
              <View style={styles.slideSubBlock}>
                {slide.subLines.map((sub) => (
                  <Text key={sub} style={styles.slideSubText}>
                    {sub}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}

        <View
          style={[
            styles.slideCtaBtn,
            slide.kind === 'navratri' && styles.slideCtaBtnGold,
          ]}
        >
          <Text style={styles.slideCtaText}>{slide.cta}</Text>
        </View>
      </Animated.View>

      {slide.front ? (
        <Animated.View
          style={[
            styles.slideFrontWrap,
            {
              width: slide.frontWidth,
              height: slide.frontHeight,
              right: slide.frontRight ?? 0,
              bottom: slide.frontBottom,
            },
            frontStyle,
          ]}
        >
          <Image source={frontSource} style={styles.slideFrontImage} contentFit="contain" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const TICKER_LOOP = [...REVIEW_PILLS, ...REVIEW_PILLS];
const TICKER_SET_W = 1220;

function ReviewPillTicker() {
  const offsetX = useSharedValue(0);

  useEffect(() => {
    offsetX.value = 0;
    offsetX.value = withRepeat(
      withTiming(-TICKER_SET_W, {
        duration: 22000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [offsetX]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  return (
    <View style={styles.reviewTickerClip}>
      <Animated.View style={[styles.reviewTickerTrack, trackStyle]}>
        {TICKER_LOOP.map((label, idx) => (
          <View key={`${label}-${idx}`} style={styles.reviewTickerPill}>
            <Text style={styles.reviewTickerPillText}>{label}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function AnimatedCounter({ target, duration = 1800, format = 'int', suffix = '', style }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let frameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = ease * target;

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  const formatted = useMemo(() => {
    if (format === 'indian') {
      const rounded = Math.floor(displayValue);
      return rounded.toLocaleString('en-IN') + suffix;
    }
    if (format === 'decimal1') {
      return displayValue.toFixed(1) + suffix;
    }
    return Math.floor(displayValue) + suffix;
  }, [displayValue, format, suffix]);

  return <Text style={style}>{formatted}</Text>;
}

function CustomerReviewCard({ item, index }) {
  const stampScale = useSharedValue(1.6);
  const stampOpacity = useSharedValue(0);
  const stampPulse = useSharedValue(1);

  const badgeTranslateY = useSharedValue(12);
  const badgeOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    const baseDelay = (index % 5) * 100 + 150;

    // Stamp slam-down impact animation
    stampScale.value = withDelay(
      baseDelay,
      withSpring(1, { damping: 11, stiffness: 220 })
    );
    stampOpacity.value = withDelay(
      baseDelay,
      withTiming(1, { duration: 180 })
    );

    // Continuous breathing pulse on the stamp
    stampPulse.value = withDelay(
      baseDelay + 400,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Bottom badge entrance & continuous pulse
    badgeTranslateY.value = withDelay(
      baseDelay + 180,
      withSpring(0, { damping: 12, stiffness: 180 })
    );
    badgeOpacity.value = withDelay(
      baseDelay + 180,
      withTiming(1, { duration: 220 })
    );

    badgeScale.value = withDelay(
      baseDelay + 550,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [index, stampScale, stampOpacity, stampPulse, badgeTranslateY, badgeOpacity, badgeScale]);

  const stampAnimStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity.value,
    transform: [
      { rotate: '-18deg' },
      { scale: stampScale.value * stampPulse.value },
    ],
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [
      { translateY: badgeTranslateY.value },
      { scale: badgeScale.value },
    ],
  }));

  return (
    <View style={styles.customerReviewCard}>
      <Image
        source={{ uri: item.image }}
        style={styles.customerReviewImage}
        contentFit="cover"
      />

      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0)',
          'rgba(0, 0, 0, 0.05)',
          'rgba(14, 10, 24, 0.70)',
          'rgba(10, 7, 18, 0.95)',
        ]}
        locations={[0, 0.35, 0.66, 0.96]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Animated Stamp Badge */}
      <Animated.View style={[styles.soldStampOuter, stampAnimStyle]} pointerEvents="none">
        <View style={styles.soldStampInner}>
          <Text style={styles.soldStampStars}>★ ★ ★</Text>
          <View style={styles.soldStampBand}>
            <Text style={styles.soldStampText}>RENT</Text>
          </View>
          <Text style={styles.soldStampStars}>★ ★ ★</Text>
        </View>
      </Animated.View>

      <View style={styles.customerReviewBottomContent}>
        <Text style={styles.customerReviewName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.customerReviewCity} numberOfLines={1}>
          {item.city}
        </Text>
        <Text style={styles.customerReviewQuote} numberOfLines={4}>
          {item.quote}
        </Text>
        {item.badge ? (
          <Animated.View style={[styles.customerSoldBadge, badgeAnimStyle]}>
            <Text style={styles.customerSoldBadgeText}>{item.badge}</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function extractZonePackages(zoneObj) {
  if (!zoneObj?.pricing) return [];
  const pricing = zoneObj.pricing;
  const model = (pricing.pricingModel || '').toLowerCase();
  const hasHourly =
    (Array.isArray(pricing.hourlyPricing) && pricing.hourlyPricing.length > 0) ||
    (pricing.basePrice !== null && pricing.basePrice !== undefined && pricing.basePrice > 0);
  const hasPackages = Array.isArray(pricing.packages) && pricing.packages.length > 0;
  if (model.includes('hour') || model.includes('minute') || (hasHourly && !hasPackages)) {
    return [];
  }

  const rawPackages = Array.isArray(pricing.packages) ? pricing.packages : [];
  if (rawPackages.length === 0 && pricing.modelPackages) {
    rawPackages.push(...Object.values(pricing.modelPackages).flat());
  }

  const map = new Map();
  rawPackages.forEach((pkg) => {
    if (!pkg) return;
    const name = (pkg.name || 'Daily').trim();
    const dur = parseInt(pkg.duration, 10) || 1;
    const key = dur === 1 ? 'daily' : dur === 7 ? 'weekly' : dur === 30 ? 'monthly' : (name.toLowerCase() + '_' + dur);
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        label: name,
        sub: dur + ' day' + (dur > 1 ? 's' : ''),
        days: dur,
        price: pkg.price,
        deposit: pkg.deposit,
        model: pkg.model,
      });
    }
  });

  return Array.from(map.values());
}

const PACKAGE_OPTIONS = [
  { id: 'daily', label: 'Daily', sub: '24 hrs', days: 1 },
  { id: 'weekly', label: 'Weekly', sub: '7 days', days: 7 },
  { id: 'monthly', label: 'Monthly', sub: '30 days', days: 30 },
  { id: 'custom', label: 'Custom', sub: 'Flexi', days: null },
];

const HOUR_SLOTS = [
  { hour24: 6, label: '06 AM', full: '6:00AM' },
  { hour24: 7, label: '07 AM', full: '7:00AM' },
  { hour24: 8, label: '08 AM', full: '8:00AM' },
  { hour24: 9, label: '09 AM', full: '9:00AM' },
  { hour24: 10, label: '10 AM', full: '10:00AM' },
  { hour24: 11, label: '11 AM', full: '11:00AM' },
  { hour24: 12, label: '12 PM', full: '12:00PM' },
  { hour24: 13, label: '01 PM', full: '1:00PM' },
  { hour24: 14, label: '02 PM', full: '2:00PM' },
  { hour24: 15, label: '03 PM', full: '3:00PM' },
  { hour24: 16, label: '04 PM', full: '4:00PM' },
  { hour24: 17, label: '05 PM', full: '5:00PM' },
  { hour24: 18, label: '06 PM', full: '6:00PM' },
  { hour24: 19, label: '07 PM', full: '7:00PM' },
  { hour24: 20, label: '08 PM', full: '8:00PM' },
  { hour24: 21, label: '09 PM', full: '9:00PM' },
  { hour24: 22, label: '10 PM', full: '10:00PM' },
];

const CAL_WEEKDAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function cleanDay(d) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDaysToDate(d, days) {
  const next = cleanDay(d);
  next.setDate(next.getDate() + days);
  return next;
}

function combineDateAndHour(day, hour24, minute = '00') {
  const next = cleanDay(day);
  next.setHours(hour24, parseInt(minute, 10) || 0, 0, 0);
  return next.getTime();
}

function formatHourToDisplay(hour24, minute = '00') {
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const m = String(minute).padStart(2, '0');
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
}

function formatBoxDateTime(day, hour24, minute = '00') {
  if (!day) return 'Select';
  const monthShort = day.toLocaleDateString('en-US', { month: 'short' });
  const dNum = day.getDate();
  const timeStr = formatHourToDisplay(hour24, minute);
  return `${monthShort} ${dNum}, ${timeStr}`;
}

function formatPopupRangeLine(startDay, startHour, startMin, endDay, endHour, endMin) {
  const fmtOne = (d, h, m) => {
    if (!d) return 'Select';
    const wk = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const mon = d.toLocaleDateString('en-US', { month: 'short' });
    const yr = String(d.getFullYear()).slice(-2);
    const timeStr = formatHourToDisplay(h, m);
    return `${wk}, ${dayNum} ${mon} '${yr}, ${timeStr}`;
  };
  return `${fmtOne(startDay, startHour, startMin)} → ${fmtOne(endDay, endHour, endMin)}`;
}

function buildMonthCellsMondayFirst(year, month) {
  const first = new Date(year, month, 1);
  const monFirstOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: monFirstOffset }, () => null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

const TIME_WHEEL_ITEM_H = 40;
const AVAILABLE_ZONES_QUICK = [
  { id: 'bill', name: 'Bill, Vadodara-391410', shortName: 'Bill', count: '14 EVs' },
  { id: 'manjalpur', name: 'Manjalpur, Vadodara-390011', shortName: 'Manjalpur', count: '9 EVs' },
  { id: 'gotri', name: 'Gotri, Vadodara-390021', shortName: 'Gotri', count: '18 EVs' },
  { id: 'aatapi', name: 'Aatapi, Vadodara-391510', shortName: 'Aatapi', count: '11 EVs' },
];

function TimeWheelColumn({ title, hour24, onChangeHour }) {
  const wheelRef = useRef(null);
  const idx = Math.max(
    0,
    HOUR_SLOTS.findIndex((s) => s.hour24 === hour24)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      wheelRef.current?.scrollTo({
        y: idx * TIME_WHEEL_ITEM_H,
        animated: true,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [idx]);

  const handleMomentumEnd = (e) => {
    const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
    const nextIdx = Math.min(
      HOUR_SLOTS.length - 1,
      Math.max(0, Math.round(offsetY / TIME_WHEEL_ITEM_H))
    );
    const chosen = HOUR_SLOTS[nextIdx];
    if (chosen && chosen.hour24 !== hour24) {
      onChangeHour(chosen.hour24);
    }
  };

  return (
    <View style={styles.timeWheelCol}>
      <Text style={styles.timeWheelTitle}>{title}</Text>

      <View style={styles.timeWheelViewport}>
        <View pointerEvents="none" style={styles.timeWheelCenterHighlight} />
        <ScrollView
          ref={wheelRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={TIME_WHEEL_ITEM_H}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingVertical: TIME_WHEEL_ITEM_H,
          }}
          onMomentumScrollEnd={handleMomentumEnd}
          onScrollEndDrag={handleMomentumEnd}
        >
          {HOUR_SLOTS.map((slot, sIdx) => {
            const isSelected = slot.hour24 === hour24;
            return (
              <Pressable
                key={slot.hour24}
                onPress={() => {
                  onChangeHour(slot.hour24);
                  wheelRef.current?.scrollTo({
                    y: sIdx * TIME_WHEEL_ITEM_H,
                    animated: true,
                  });
                }}
                style={styles.timeWheelItemRow}
              >
                <Text
                  style={[
                    styles.timeWheelGhostText,
                    isSelected && styles.timeWheelSelectedText,
                  ]}
                >
                  {slot.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function BookingCalendarModal({
  visible,
  zoneName,
  zoneShortName,
  packageId,
  startDay,
  endDay,
  pickupHour,
  pickupMinute = '00',
  dropHour,
  dropMinute = '00',
  operatingHours,
  packageOptions = [],
  isHourlyZone = false,
  onSelectPackage,
  onChangeDates,
  onChangeHours,
  onClear,
  onChangeZone,
  onConfirm,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const [clockModalTarget, setClockModalTarget] = useState(null);
  const activeOptions = (packageOptions && packageOptions.length > 0) ? packageOptions : PACKAGE_OPTIONS;
  const baseDate = startDay || cleanDay(new Date());
  const monthsToShow = [
    new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
    new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1),
    new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 1),
  ];

  const handleDayPress = (day) => {
    const clicked = cleanDay(day);
    const pkg = activeOptions.find((p) => p.id === packageId);
    if (pkg && pkg.days) {
      const autoEnd = addDaysToDate(clicked, pkg.days);
      onChangeDates(clicked, autoEnd);
      onChangeHours(pickupHour, pickupHour, pickupMinute, pickupMinute);
      return;
    }
    if (!startDay || (startDay && endDay && endDay.getTime() !== startDay.getTime())) {
      onChangeDates(clicked, clicked);
      return;
    }
    if (clicked.getTime() < startDay.getTime()) {
      onChangeDates(clicked, startDay);
    } else {
      onChangeDates(startDay, clicked);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.calModalRoot, { paddingTop: insets.top + 8 }]}>
        <StatusBar style="dark" />

        {/* Back Button */}
        <View style={styles.calTopBar}>
          <Pressable hitSlop={10} onPress={onClose} style={styles.calBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#24083C" />
          </Pressable>
        </View>

        {/* Where Location Summary Bar */}
        <Pressable onPress={onChangeZone} style={styles.calWhereCard}>
          <Text style={styles.calWhereLabel}>Pickup Zone</Text>
          <View style={styles.calWhereRight}>
            <View style={styles.calZoneDot} />
            <Text style={styles.calWhereValue} numberOfLines={1}>
              {zoneName || zoneShortName || 'Find Zones near to you'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={TAB_PURPLE} />
          </View>
        </Pressable>

        {/* Main White Calendar + Scrollable Time Card */}
        <View
          style={[
            styles.calSheetCard,
            { marginBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={styles.calCardHeaderRow}>
            <Text style={styles.calCardMainTitle}>
              Select <Text style={styles.customerReviewAccent}>Date &amp; Time</Text>
            </Text>
            <Pressable hitSlop={8} onPress={onClear}>
              <Text style={styles.calClearText}>CLEAR</Text>
            </Pressable>
          </View>

          <Text style={styles.calRangeSubText} numberOfLines={1}>
            {formatPopupRangeLine(startDay, pickupHour, pickupMinute, endDay, dropHour, dropMinute)}
          </Text>

          {/* Package Pills inside Popup (Auto-selects End Date & Time) */}
          {isHourlyZone ? (
            <View style={styles.calHourlyNoticeWrap}>
              <Ionicons name="time" size={15} color={TAB_PURPLE} />
              <Text style={styles.calHourlyNoticeText}>Hourly / Minute Rental Zone</Text>
            </View>
          ) : (
            <View style={styles.calPackageRow}>
              {activeOptions.map((pkg) => {
              const isSelected = packageId === pkg.id;
              return (
                <Pressable
                  key={pkg.id}
                  onPress={() => onSelectPackage(pkg.id)}
                  style={[
                    styles.calPkgChip,
                    isSelected && styles.calPkgChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.calPkgChipLabel,
                      isSelected && styles.calPkgChipLabelActive,
                    ]}
                  >
                    {pkg.label}
                  </Text>
                  <Text
                    style={[
                      styles.calPkgChipSub,
                      isSelected && styles.calPkgChipSubActive,
                    ]}
                  >
                    {pkg.sub}
                  </Text>
                </Pressable>
              );
            })}
            </View>
          )}

          {/* Weekday Header Row (M T W T F S S) */}
          <View style={styles.calWeekdayBar}>
            {CAL_WEEKDAYS_MON.map((dayChar, idx) => (
              <Text key={`${dayChar}-${idx}`} style={styles.calWeekdayText}>
                {dayChar}
              </Text>
            ))}
          </View>

          {/* Scrollable Multi-Month Calendar */}
          <ScrollView
            style={styles.calMonthsScroll}
            showsVerticalScrollIndicator={false}
          >
            {monthsToShow.map((mDate) => {
              const yr = mDate.getFullYear();
              const mo = mDate.getMonth();
              const monthTitle = `${mDate.toLocaleDateString('en-US', {
                month: 'long',
              })} '${String(yr).slice(-2)}`;
              const cells = buildMonthCellsMondayFirst(yr, mo);

              return (
                <View key={`${yr}-${mo}`} style={styles.calMonthBlock}>
                  <Text style={styles.calMonthHeading}>{monthTitle}</Text>
                  <View style={styles.calMonthGrid}>
                    {cells.map((cellDate, cIdx) => {
                      if (!cellDate) {
                        return (
                          <View key={`empty-${cIdx}`} style={styles.calDayCell} />
                        );
                      }
                      const t = cleanDay(cellDate).getTime();
                      const sT = startDay ? cleanDay(startDay).getTime() : null;
                      const eT = endDay ? cleanDay(endDay).getTime() : null;
                      const isStart = sT === t;
                      const isEnd = eT === t;
                      const inRange =
                        sT != null && eT != null && t > sT && t < eT;

                      return (
                        <Pressable
                          key={cellDate.toISOString()}
                          onPress={() => handleDayPress(cellDate)}
                          style={[
                            styles.calDayCell,
                            inRange && styles.calDayCellInRange,
                            isStart && eT > sT && styles.calDayCellRangeStart,
                            isEnd && eT > sT && styles.calDayCellRangeEnd,
                          ]}
                        >
                          <View
                            style={[
                              styles.calDayCircle,
                              (isStart || isEnd) && styles.calDayCircleSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.calDayNumText,
                                inRange && styles.calDayNumInRangeText,
                                (isStart || isEnd) && styles.calDayNumSelectedText,
                              ]}
                            >
                              {String(cellDate.getDate()).padStart(2, '0')}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.calTimeDivider} />

          {/* Interactive Pickup Time & Drop Off Time Cards (Trigger Analog Clock) */}
          <View style={styles.calTimeCardsRow}>
            <Pressable
              onPress={() => setClockModalTarget('pickup')}
              style={styles.calTimeCard}
            >
              <View style={styles.calTimeCardHeader}>
                <Ionicons name="time-outline" size={14} color={TAB_PURPLE} />
                <Text style={styles.calTimeCardTitle}>Pickup Time</Text>
              </View>
              <Text style={styles.calTimeCardValue}>
                {formatHourToDisplay(pickupHour, pickupMinute)}
              </Text>
              <View style={styles.calTimeCardBadge}>
                <Ionicons name="alarm-outline" size={12} color={TAB_PURPLE} />
                <Text style={styles.calTimeCardBadgeText}>Tap for Analog Clock</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setClockModalTarget('drop')}
              style={styles.calTimeCard}
            >
              <View style={styles.calTimeCardHeader}>
                <Ionicons name="time-outline" size={14} color={TAB_PURPLE} />
                <Text style={styles.calTimeCardTitle}>Drop Off Time</Text>
              </View>
              <Text style={styles.calTimeCardValue}>
                {formatHourToDisplay(dropHour, dropMinute)}
              </Text>
              <View style={styles.calTimeCardBadge}>
                <Ionicons name="alarm-outline" size={12} color={TAB_PURPLE} />
                <Text style={styles.calTimeCardBadgeText}>Tap for Analog Clock</Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              onConfirm?.();
              onClose?.();
            }}
            style={styles.calContinueBtn}
          >
            <Text style={styles.calContinueBtnText}>Confirm Date &amp; Time</Text>
          </Pressable>
        </View>

        {/* Analog Clock Modal for Hours & Minute Selection */}
        <AnalogClockModal
          visible={clockModalTarget !== null}
          title={clockModalTarget === 'pickup' ? 'Select Pickup Time' : 'Select Return Time'}
          operatingHours={operatingHours}
          initialTime={
            clockModalTarget === 'pickup'
              ? formatHourToDisplay(pickupHour, pickupMinute)
              : formatHourToDisplay(dropHour, dropMinute)
          }
          onClose={() => setClockModalTarget(null)}
          onConfirm={({ hour24, minute }) => {
            if (clockModalTarget === 'pickup') {
              const pkg = activeOptions.find((p) => p.id === packageId);
              if (pkg && pkg.days) {
                onChangeHours?.(hour24, hour24, minute, minute);
              } else {
                onChangeHours?.(hour24, dropHour, minute, dropMinute);
              }
            } else {
              onChangeHours?.(pickupHour, hour24, pickupMinute, minute);
            }
            setClockModalTarget(null);
          }}
        />
      </View>
    </Modal>
  );
}

export default function HomeScreen({
  selectedZone,
  calendarTriggerTick,
  onOpenLocation,
  onOpenMyRide,
  onOpenScan,
  onOpenProfile,
  onOpenWallet,
  onOpenVehicle,
  onOpenRent,
  onOpenVehicleList,
  onSearchVehicles,
  onOpenNotifications,
  onOpenInsights,
  onOpenBms,
  hasUnread,
}) {
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState(VEHICLES);
  const [packageId, setPackageId] = useState('daily');
  const [startDay, setStartDay] = useState(() => cleanDay(new Date()));
  const [endDay, setEndDay] = useState(() => addDaysToDate(cleanDay(new Date()), 1));
  const [pickupHour, setPickupHour] = useState(() => new Date().getHours());
  const [pickupMinute, setPickupMinute] = useState(() => String(new Date().getMinutes()).padStart(2, '0'));
  const [dropHour, setDropHour] = useState(() => new Date().getHours());
  const [dropMinute, setDropMinute] = useState(() => String(new Date().getMinutes()).padStart(2, '0'));
  const [deliveryAnywhere, setDeliveryAnywhere] = useState(false);

  // Active Ride live polling from backend
  const [activeRideData, setActiveRideData] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function checkActive() {
      try {
        const stored = await getStoredRider();
        const mobile = last10(stored?.mobile || stored?.phone);
        if (!mobile) return;
        const res = await apiGet(`/reservations/active-ride?mobile=${mobile}`);
        if (mounted) {
          if (res?.has_active_ride && res?.data) {
            setActiveRideData(res.data);
          } else {
            setActiveRideData(null);
          }
        }
      } catch (_) {}
    }
    checkActive();
    const interval = setInterval(checkActive, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [dateTimeConfirmed, setDateTimeConfirmed] = useState(false);
  const [localZone, setLocalZone] = useState(null);
  const prevTickRef = useRef(calendarTriggerTick);

  useEffect(() => {
    if (calendarTriggerTick > 0 && calendarTriggerTick !== prevTickRef.current) {
      prevTickRef.current = calendarTriggerTick;
      if (selectedZone) setLocalZone(selectedZone);
      const timer = setTimeout(() => {
        setCalendarModalOpen(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [calendarTriggerTick]);

  const [zoneFullData, setZoneFullData] = useState(null);

  useEffect(() => {
    if (effectiveZone) {
      if (effectiveZone.pricing) {
        setZoneFullData(effectiveZone);
      } else {
        apiGet('/zones')
          .then((res) => {
            const list = res?.data || (Array.isArray(res) ? res : []);
            const targetName = (effectiveZone.name || effectiveZone.shortName || '').toLowerCase();
            const found = list.find((z) => {
              const zn = (z.name || '').toLowerCase();
              const zl = (z.locality || '').toLowerCase();
              return zn.includes(targetName) || targetName.includes(zn) || zl.includes(targetName) || targetName.includes(zl);
            });
            if (found) {
              setZoneFullData(found);
            }
          })
          .catch(() => {});
      }
    }
  }, [effectiveZone]);

  const zonePricingTarget = zoneFullData || effectiveZone;
  const zonePackageOptions = useMemo(() => {
    return extractZonePackages(zonePricingTarget);
  }, [zonePricingTarget]);

  const isHourlyZone = useMemo(() => {
    if (!zonePricingTarget?.pricing) return false;
    const pricing = zonePricingTarget.pricing;
    const model = (pricing.pricingModel || '').toLowerCase();
    const hasHourly =
      (Array.isArray(pricing.hourlyPricing) && pricing.hourlyPricing.length > 0) ||
      (pricing.basePrice !== null && pricing.basePrice !== undefined && pricing.basePrice > 0);
    const hasPackages = Array.isArray(pricing.packages) && pricing.packages.length > 0;
    return model.includes('hour') || model.includes('minute') || (hasHourly && !hasPackages);
  }, [zonePricingTarget]);

  useEffect(() => {
    if (isHourlyZone) {
      setPackageId('hourly');
    } else if (zonePackageOptions.length > 0) {
      const exists = zonePackageOptions.some((p) => p.id === packageId);
      if (!exists) {
        setPackageId(zonePackageOptions[0].id);
      }
    }
  }, [isHourlyZone, zonePackageOptions]);

  const handleSelectPackage = (nextPkgId) => {
    setPackageId(nextPkgId);
    const currentOptions = zonePackageOptions.length > 0 ? zonePackageOptions : PACKAGE_OPTIONS;
    const pkg = currentOptions.find((p) => p.id === nextPkgId);
    if (pkg && pkg.days) {
      const base = startDay || cleanDay(new Date());
      setStartDay(base);
      setEndDay(addDaysToDate(base, pkg.days));
      setDropHour(pickupHour);
      setDropMinute(pickupMinute);
    }
  };

  const effectiveZone = localZone || selectedZone;
  const isZoneSelected = Boolean(effectiveZone);
  const activeZoneLabel = isZoneSelected
    ? effectiveZone.name
    : 'Select Zone';
  const activeZoneShort = isZoneSelected
    ? effectiveZone.shortName
    : 'Select Zone';

  // Automatically select nearest available zone on mount instead of static placeholder
  useEffect(() => {
    if (!effectiveZone) {
      apiGet('/zones')
        .then((res) => {
          const list = res?.data || (Array.isArray(res) ? res : []);
          if (list.length > 0) {
            const first = list[0];
            const cityName = first.city ? String(first.city).trim() : 'Vadodara';
            setLocalZone({
              id: String(first.code || first.id || 'gotri').toLowerCase(),
              name: first.name ? `${first.name}, ${cityName}` : 'Gotri Zone, Vadodara',
              shortName: first.locality || first.name?.replace(/ Zone.*$/i, '') || 'Gotri',
              address: first.address || '',
              city: cityName,
              pricing: first.pricing,
            });
          }
        })
        .catch(() => {
          apiGet('/v1/getzoneDetailWithBikeCountList')
            .then((data) => {
              const list = Array.isArray(data) ? data : (data?.data || []);
              if (list.length > 0) {
                const first = list[0];
                const cityName = first.city ? String(first.city).trim() : 'Vadodara';
                setLocalZone({
                  id: String(first.code || first.id || 'gotri').toLowerCase(),
                  name: first.name ? `${first.name}, ${cityName}` : 'Gotri Zone, Vadodara',
                  shortName: first.locality || first.name?.replace(/ Zone.*$/i, '') || 'Gotri',
                  address: first.address || '',
                  city: cityName,
                });
              }
            })
            .catch(() => {});
        });
    }
  }, [effectiveZone]);

  // Rent button is disabled until both zone AND date/time are selected & confirmed
  const isRentButtonDisabled = !isZoneSelected || !dateTimeConfirmed;

  // Enforce zone operating hours constraint on initial mount / zone change
  useEffect(() => {
    const zoneHoursStr =
      effectiveZone?.hours ||
      (effectiveZone?.open_time && `${effectiveZone.open_time} - ${effectiveZone.close_time}`) ||
      '06:00 – 23:00';
    const op = parseOperatingHours(zoneHoursStr);
    if (!op.is24Hours) {
      if (pickupHour < op.openHour || pickupHour > op.closeHour) {
        const clampedH = Math.min(Math.max(pickupHour, op.openHour), op.closeHour);
        setPickupHour(clampedH);
      }
      if (dropHour < op.openHour || dropHour > op.closeHour) {
        const clampedH = Math.min(Math.max(dropHour, op.openHour), op.closeHour);
        setDropHour(clampedH);
      }
    }
  }, [effectiveZone]);

  const handleSearchPress = () => {
    if (isRentButtonDisabled) {
      if (!isZoneSelected) {
        onOpenLocation?.();
      } else if (!dateTimeConfirmed) {
        setCalendarModalOpen(true);
      }
      return;
    }

    const pAt = combineDateAndHour(startDay, pickupHour, pickupMinute);
    const dAt = combineDateAndHour(endDay, dropHour, dropMinute);
    const currentOptions = zonePackageOptions.length > 0 ? zonePackageOptions : PACKAGE_OPTIONS;
    const chosenPkg = currentOptions.find((p) => p.id === packageId) || currentOptions[0];
    const isHourly = Boolean(isHourlyZone);
    const tripPayload = {
      pickupName: activeZoneShort,
      pickupFullAddress: effectiveZone?.address || activeZoneLabel,
      pickupZone: zonePricingTarget || effectiveZone,
      dropName: activeZoneShort,
      dropZone: zonePricingTarget || effectiveZone,
      pickupAt: pAt,
      dropAt: dAt,
      pickupDate: startDay,
      dropDate: endDay,
      pickupHour,
      pickupMinute,
      dropHour,
      dropMinute,
      packageId: isHourly ? 'hourly' : (chosenPkg?.id || packageId),
      packageName: isHourly ? 'Hourly / Minute Rental' : (chosenPkg?.label || 'Daily'),
      packageDays: isHourly ? 0 : (chosenPkg?.days || 1),
      isHourlyZone: isHourly,
      pricingModel: isHourly ? 'Hourly Based' : 'Package Based',
      selectedPackage: chosenPkg || null,
      flexiEnabled: deliveryAnywhere,
    };
    // Route directly to vehicle list page as zone, date and time are already selected
    if (onSearchVehicles) {
      onSearchVehicles(tripPayload);
    } else if (onOpenVehicleList) {
      onOpenVehicleList();
    } else if (onOpenRent) {
      onOpenRent(null, tripPayload);
    }
  };

  useEffect(() => {
    apiGet('/vehicles/models')
      .then((body) => {
        const rows = body?.data || [];
        if (!rows.length) return;
        setVehicles(VEHICLES.map((item) => {
          const live = rows.find((row) => String(row.name || '').toLowerCase() === item.name.toLowerCase());
          if (!live) return item;
          return {
            ...item,
            tag: live.category || item.tag,
            line: live.tagline || item.line,
            range: live.range || item.range,
            speed: live.top_speed || item.speed,
            battery: live.battery_capacity,
            motor: live.motor_power,
            about: live.description,
            charge: live.charging_time,
            load: live.load_capacity,
            wheels: live.wheel_size,
            batteryType: live.battery_type,
            brakes: live.brakes,
            water: live.water_resistance,
            warranty: live.warranty,
          };
        }));
      })
      .catch(() => {});
  }, []);

  const rideLoop = [...vehicles, ...vehicles, ...vehicles];
  const initialRideIdx = vehicles.length + 1;

  const scrollRef = useRef(null);
  const scrollX = useSharedValue(0);
  const isUserDragging = useSharedValue(false);
  const rideX = useSharedValue(initialRideIdx * RIDE_SNAP);
  const rideRef = useRef(null);
  const [rideIndex, setRideIndex] = useState(initialRideIdx);
  const [activeSocialIndex, setActiveSocialIndex] = useState(null);
  const pageRef = useRef(0);
  const timerRef = useRef(null);

  const reviewRef = useRef(null);
  const reviewIdxRef = useRef(CUSTOMER_REVIEWS.length);
  const reviewDraggingRef = useRef(false);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (isUserDragging.value) {
        scrollX.value = event.contentOffset.x;
      }
    },
  });
  const onRideScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      rideX.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      rideX.value = initialRideIdx * RIDE_SNAP;
      rideRef.current?.scrollTo({ x: initialRideIdx * RIDE_SNAP, animated: false });
      reviewRef.current?.scrollTo({
        x: CUSTOMER_REVIEWS.length * REVIEW_SNAP,
        animated: false,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [initialRideIdx, rideX]);

  useEffect(() => {
    const reviewTimer = setInterval(() => {
      if (reviewDraggingRef.current) return;
      const count = CUSTOMER_REVIEWS.length;
      let nextIdx = reviewIdxRef.current + 1;
      reviewIdxRef.current = nextIdx;
      reviewRef.current?.scrollTo({
        x: nextIdx * REVIEW_SNAP,
        animated: true,
      });
      if (nextIdx >= count * 2) {
        setTimeout(() => {
          if (reviewDraggingRef.current) return;
          const resetIdx = count + (nextIdx % count);
          reviewIdxRef.current = resetIdx;
          reviewRef.current?.scrollTo({
            x: resetIdx * REVIEW_SNAP,
            animated: false,
          });
        }, 420);
      }
    }, 3600);
    return () => clearInterval(reviewTimer);
  }, []);

  const [homeSliderList, setHomeSliderList] = useState(SLIDES);
  const homeSliderLoop = useMemo(() => [...homeSliderList, homeSliderList[0]], [homeSliderList]);

  // Dynamic Slider Fetch from Backend
  useEffect(() => {
    let mounted = true;
    apiGet('/app-sliders')
      .then((res) => {
        if (!mounted) return;
        const raw = res?.data?.home_sliders || res?.data?.home || [];
        const active = raw.filter((s) => s.active !== false);
        if (active.length > 0) {
          const mapped = active.map((s, idx) => {
            const fallback = SLIDES[idx % SLIDES.length];
            return {
              id: s.id || `home-${idx}`,
              kind: s.kind || fallback.kind,
              bg: s.bg ? resolveMediaUrl(s.bg) : fallback.bg,
              front: s.front ? resolveMediaUrl(s.front) : fallback.front,
              frontWidth: s.frontWidth || fallback.frontWidth,
              frontHeight: s.frontHeight || fallback.frontHeight,
              frontRight: s.frontRight ?? fallback.frontRight,
              frontBottom: s.frontBottom ?? fallback.frontBottom,
              tag: s.tag || fallback.tag,
              lines: Array.isArray(s.lines)
                ? s.lines
                : (s.title ? s.title.split('\n') : fallback.lines),
              subLines: Array.isArray(s.subLines)
                ? s.subLines
                : (s.sub ? [s.sub] : fallback.subLines),
              cta: s.cta || fallback.cta,
            };
          });
          setHomeSliderList(mapped);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const syncNativeSlideScroll = (targetPage) => {
    if (targetPage >= homeSliderList.length) {
      pageRef.current = 0;
      scrollX.value = 0;
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    } else {
      pageRef.current = targetPage;
      scrollRef.current?.scrollTo({ x: targetPage * SLIDE_WIDTH, animated: false });
    }
  };

  const stopAuto = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startAuto = () => {
    stopAuto();
    timerRef.current = setInterval(() => {
      isUserDragging.value = false;
      const next = pageRef.current + 1;
      scrollX.value = withTiming(
        next * SLIDE_WIDTH,
        {
          duration: 1550,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(syncNativeSlideScroll)(next);
          }
        }
      );
    }, 4500);
  };

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.slider}>
          {homeSliderLoop.map((slide, index) => (
            <MergeSlide key={index} index={index} slide={slide} scrollX={scrollX} />
          ))}
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            onScrollBeginDrag={() => {
              isUserDragging.value = true;
              stopAuto();
            }}
            onMomentumScrollEnd={(event) => {
              const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
              const page = Math.round(offsetX / SLIDE_WIDTH);
              if (page >= homeSliderList.length) {
                pageRef.current = 0;
                scrollX.value = 0;
                scrollRef.current?.scrollTo({ x: 0, animated: false });
              } else {
                pageRef.current = page;
                scrollX.value = page * SLIDE_WIDTH;
              }
              isUserDragging.value = false;
              startAuto();
            }}
            style={styles.sliderTouch}
          >
            {homeSliderLoop.map((_, index) => (
              <View key={index} style={styles.slideSpacer}>
                <Pressable
                  style={styles.slideSpacerCta}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 16 }}
                  onPress={() => onOpenRent?.()}
                />
              </View>
            ))}
          </Animated.ScrollView>

          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerLeft}>
                <Pressable hitSlop={12} onPress={() => onOpenLocation?.()} style={styles.location}>
                  <Ionicons name="location-sharp" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.locationText}>
                    {isZoneSelected
                      ? `${activeZoneShort}${effectiveZone?.city ? `, ${effectiveZone.city}` : ''}`
                      : 'Select Zone'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
              <Pressable hitSlop={8} onPress={onOpenNotifications} style={styles.bell}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                {hasUnread ? <View style={styles.bellDot} /> : null}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          {/* Search EV Vehicle Booking Card */}
          <Animated.View entering={cardEnter(0)} style={styles.bookingSearchCard}>
            
            {/* Location Search Row (Opens Zone Selection Page) */}
            <Pressable
              onPress={() => onOpenLocation?.()}
              style={({ pressed }) => [
                styles.bookingLocationInput,
                pressed && { opacity: 0.88 },
              ]}
            >
              <View style={styles.bookingLocationIconWrap}>
                <Ionicons name="location" size={18} color={TAB_PURPLE} />
              </View>
              <View style={styles.bookingLocationCopy}>
                <Text style={styles.bookingLocationText} numberOfLines={1}>
                  {activeZoneLabel}
                </Text>
               
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8A819C" />
            </Pressable>

            {/* Trip Start & Trip End Side-by-Side Boxes */}
            <View style={styles.bookingDatesRow}>
              <Pressable
                onPress={() => setCalendarModalOpen(true)}
                style={styles.bookingDateBox}
              >
                <View style={styles.bookingDateLabelRow}>
                  <Ionicons name="calendar-outline" size={13} color={TAB_PURPLE} />
                  <Text style={styles.bookingDateLabel}>Ride Start</Text>
                </View>
                <Text style={styles.bookingDateValue} numberOfLines={1}>
                  {formatBoxDateTime(startDay, pickupHour, pickupMinute)}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCalendarModalOpen(true)}
                style={[styles.bookingDateBox, styles.bookingDateBoxRight]}
              >
                <View style={styles.bookingDateLabelRow}>
                  <Text style={[styles.bookingDateLabel, styles.textRight]}>
                    Ride End
                  </Text>
                  <Ionicons name="time-outline" size={13} color={TAB_PURPLE} />
                </View>
                <Text
                  style={[styles.bookingDateValue, styles.textRight]}
                  numberOfLines={1}
                >
                  {formatBoxDateTime(endDay, dropHour, dropMinute)}
                </Text>
              </Pressable>
            </View>

            {/* Delivery & Pick-up Checkbox Row */}
            <Pressable
              onPress={() => setDeliveryAnywhere((v) => !v)}
              style={styles.bookingDeliveryCheckRow}
            >
              <View
                style={[
                  styles.bookingCheckbox,
                  deliveryAnywhere && styles.bookingCheckboxChecked,
                ]}
              >
                {deliveryAnywhere ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : null}
              </View>
              <Text style={styles.bookingDeliveryCheckLabel}>
                Delivery &amp; Pick-up, from anywhere
              </Text>
            </Pressable>

            {/* Primary Search Button (Disabled until Zone and Date/Time are selected) */}
            <Pressable
              onPress={handleSearchPress}
              style={({ pressed }) => [
                styles.bookingSearchBtn,
                isRentButtonDisabled && styles.bookingSearchBtnDisabled,
                pressed && !isRentButtonDisabled && { opacity: 0.92, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text
                style={[
                  styles.bookingSearchBtnText,
                  isRentButtonDisabled && styles.bookingSearchBtnTextDisabled,
                ]}
              >
                Rent Your EV
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={isRentButtonDisabled ? '#8A819C' : '#FFFFFF'}
              />
            </Pressable>
          </Animated.View>

          {/* Choose Your EV Ride Header (Unified Typography with Bringing Smiles Section) */}
          <View style={styles.sectionHead}>
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle}>
                Choose your <Text style={styles.customerReviewAccent}>EV Ride</Text>
              </Text>
              <Text style={styles.sectionSubtitle}>
                Clean Rides. Greener Tomorrows.
              </Text>
            </View>
            <Pressable style={styles.viewAll} onPress={handleSearchPress}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={TAB_PURPLE} />
            </Pressable>
          </View>

        <Animated.View entering={cardEnter(2)} style={styles.rideDeck}>
          <Animated.ScrollView
            ref={rideRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={RIDE_SNAP}
            snapToAlignment="start"
            nestedScrollEnabled
            scrollEventThrottle={16}
            contentOffset={{ x: initialRideIdx * RIDE_SNAP, y: 0 }}
            contentContainerStyle={styles.rideTrack}
            onScroll={onRideScroll}
            onMomentumScrollEnd={(event) => {
              const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
              const count = vehicles.length;
              const rawIdx = Math.round(offsetX / RIDE_SNAP);
              const mod = ((rawIdx % count) + count) % count;
              const centeredIdx = count + mod;
              if (rawIdx < count || rawIdx >= count * 2) {
                rideX.value = centeredIdx * RIDE_SNAP;
                rideRef.current?.scrollTo({ x: centeredIdx * RIDE_SNAP, animated: false });
              }
              setRideIndex(centeredIdx);
            }}
          >
            {rideLoop.map((vehicle, index) => (
              <RideCard
                key={`${vehicle.name}-${index}`}
                vehicle={vehicle}
                index={index}
                totalCount={rideLoop.length}
                scrollX={rideX}
                active={index % vehicles.length === rideIndex % vehicles.length}
                onOpenVehicle={onOpenVehicle}
                onOpenRent={onOpenRent}
              />
            ))}
          </Animated.ScrollView>
        </Animated.View>

        <Animated.View entering={cardEnter(9)} style={styles.customerReviewSection}>
          <Text style={styles.customerReviewHeading}>
            Bringing smiles to over{' '}
            <Text style={styles.customerReviewAccent}>2 Lakh people</Text>
          </Text>

          <ReviewPillTicker />

          <ScrollView
            ref={reviewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={REVIEW_SNAP}
            snapToAlignment="start"
            nestedScrollEnabled
            contentOffset={{ x: CUSTOMER_REVIEWS.length * REVIEW_SNAP, y: 0 }}
            contentContainerStyle={styles.customerReviewTrack}
            onScrollBeginDrag={() => {
              reviewDraggingRef.current = true;
            }}
            onMomentumScrollEnd={(event) => {
              const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
              const count = CUSTOMER_REVIEWS.length;
              const rawIdx = Math.round(offsetX / REVIEW_SNAP);
              const mod = ((rawIdx % count) + count) % count;
              const centeredIdx = count + mod;
              reviewIdxRef.current = centeredIdx;
              if (rawIdx < count || rawIdx >= count * 2) {
                reviewRef.current?.scrollTo({
                  x: centeredIdx * REVIEW_SNAP,
                  animated: false,
                });
              }
              reviewDraggingRef.current = false;
            }}
          >
           {REVIEW_LOOP.map((item, idx) => (
              <CustomerReviewCard key={`${item.id}-${idx}`} item={item} index={idx} />
            ))}
                              </ScrollView>
        </Animated.View>

        <Animated.View entering={cardEnter(10)} style={styles.socialSection}>
          <Text style={styles.socialTitle}>
            <Text style={styles.customerReviewAccent}>Social</Text> Stories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SOCIAL_CARD_W + SOCIAL_GAP}
            snapToAlignment="start"
            nestedScrollEnabled
            contentContainerStyle={styles.socialTrack}
          >
            {SOCIAL_VIDEOS.map((videoSource, index) => (
              <SocialVideoCard
                key={index}
                source={videoSource}
                paused={activeSocialIndex !== null}
                onPress={() => setActiveSocialIndex(index)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={cardEnter(8)} style={styles.trustedSection}>
          <Text style={styles.trustedHeading}>
            <Text style={styles.customerReviewAccent}>Trusted</Text> by people across India
          </Text>

          <LinearGradient
            colors={['#2E0E56', '#210840']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.trustedHeroCard}
          >
            <View style={styles.trustedWave1} />
            <View style={styles.trustedWave2} />
            <View style={styles.trustedWave3} />

            <View style={styles.trustedHeroCopy}>
              <AnimatedCounter target={263923} format="indian" suffix="+" style={styles.trustedHeroNumber} duration={2000} />
              <Text style={styles.trustedHeroSub}>
                riders trusted Evegah in EV 
              </Text>
            </View>

            <View style={styles.trustedKeyWrap}>
              <View style={styles.trustedCuff} />
              <View style={styles.trustedKeyRing}>
                <Ionicons name="key" size={18} color="#9E7BFF" />
              </View>
            </View>

            <Image
              source={require('../assets/home/vehicle-mink.png')}
              style={styles.trustedHeroVehicle}
              contentFit="contain"
            />
          </LinearGradient>

          <View style={styles.trustedGridRow}>
            <LinearGradient
              colors={['#6C79F7', '#5866F2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.trustedCitiesCard}
            >
              <View style={styles.trustedCitiesGrid} />
              <View style={styles.trustedCitiesCopy}>
                <Text style={styles.trustedSmallLabel}>Spread across</Text>
                <AnimatedCounter target={25} format="int" suffix="+" style={styles.trustedCitiesNum} duration={1600} />
                <Text style={styles.trustedCitiesSub}>Zones in India</Text>
              </View>
              <View style={styles.trustedMapGraphic}>
                <Ionicons name="earth" size={78} color="rgba(255,255,255,0.24)" />
                <View style={[styles.mapDot, { top: 18, left: 32 }]} />
                <View style={[styles.mapDot, { top: 30, left: 22 }]} />
                <View style={[styles.mapDot, { top: 34, left: 44 }]} />
                <View style={[styles.mapDot, { top: 48, left: 30 }]} />
                <View style={[styles.mapDot, { top: 60, left: 36 }]} />
              </View>
            </LinearGradient>

            <LinearGradient
              colors={['#7400BD', '#52008A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.trustedRatingCard}
            >
              <View style={styles.trustedRatingChevron} />
              <Text style={styles.trustedSmallLabel}>Ratings</Text>
              <AnimatedCounter target={4.9} format="decimal1" style={styles.trustedRatingNum} duration={1600} />
              <View style={styles.trustedStarsRow}>
                <Ionicons name="star" size={18} color="#FFD21E" />
                <Ionicons name="star" size={18} color="#FFD21E" />
                <Ionicons name="star" size={18} color="#FFD21E" />
                <Ionicons name="star" size={18} color="#FFD21E" />
                <Ionicons name="star-half" size={18} color="#FFD21E" />
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View entering={cardEnter(10)}>
          <LinearGradient
            colors={['#F7F7F8', '#F6F1FC', '#E6D4FA']}
            locations={[0, 0.42, 1]}
            style={styles.footer}
          >
            <GyroFooterArt />
            <View style={styles.footerCreditWrap}>
              <Text style={styles.footerCreditText}>
                App Designed by <Text style={styles.footerCreditHandle}>@netsecinfotech</Text>
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
        </View>
      </ScrollView>

      <BookingCalendarModal
        visible={calendarModalOpen}
        zoneName={activeZoneLabel}
        zoneShortName={activeZoneShort}
        packageId={packageId}
        startDay={startDay}
        endDay={endDay}
        pickupHour={pickupHour}
        pickupMinute={pickupMinute}
        dropHour={dropHour}
        dropMinute={dropMinute}
        packageOptions={zonePackageOptions}
        isHourlyZone={isHourlyZone}
        operatingHours={
          effectiveZone?.hours ||
          (effectiveZone?.open_time && `${effectiveZone.open_time} - ${effectiveZone.close_time}`) ||
          '06:00 – 23:00'
        }
        onSelectPackage={handleSelectPackage}
        onChangeDates={(nextStart, nextEnd) => {
          setStartDay(nextStart);
          setEndDay(nextEnd);
        }}
        onChangeHours={(nextPickupH, nextDropH, nextPickupM = '00', nextDropM = '00') => {
          setPickupHour(nextPickupH);
          setPickupMinute(nextPickupM);
          const pkg = PACKAGE_OPTIONS.find((p) => p.id === packageId);
          if (pkg && pkg.days) {
            setDropHour(nextPickupH);
            setDropMinute(nextPickupM);
          } else {
            setDropHour(nextDropH);
            setDropMinute(nextDropM);
          }
        }}
        onClear={() => {
          const now = new Date();
          const defStart = cleanDay(now);
          setStartDay(defStart);
          setEndDay(addDaysToDate(defStart, 1));
          setPackageId('daily');
          setPickupHour(now.getHours());
          setPickupMinute(String(now.getMinutes()).padStart(2, '0'));
          setDropHour(now.getHours());
          setDropMinute(String(now.getMinutes()).padStart(2, '0'));
          setDateTimeConfirmed(false);
        }}
        onChangeZone={() => {
          setCalendarModalOpen(false);
          onOpenLocation?.();
        }}
        onConfirm={() => {
          setDateTimeConfirmed(true);
          setCalendarModalOpen(false);
        }}
        onClose={() => setCalendarModalOpen(false)}
      />

      <Modal
        visible={activeSocialIndex !== null}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setActiveSocialIndex(null)}
      >
        {activeSocialIndex !== null ? (
          <SocialStatusModal
            initialIndex={activeSocialIndex}
            onClose={() => setActiveSocialIndex(null)}
          />
        ) : null}
      </Modal>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={styles.tab}>
          <Ionicons name="home" size={22} color={TAB_PURPLE} />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={onOpenMyRide}>
          <Ionicons name="bicycle-outline" size={22} color="#8A8A8A" />
          <Text style={styles.tabLabel}>My Rides</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={onOpenScan}>
          <View style={styles.scanButton}>
            <Ionicons name="scan-outline" size={26} color="#FFFFFF" />
            <Ionicons name="qr-code" size={12} color="#FFFFFF" style={styles.scanQr} />
          </View>
          <Text style={styles.tabLabel}>Scan</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={onOpenWallet}>
          <Ionicons name="wallet-outline" size={22} color="#8A8A8A" />
          <Text style={styles.tabLabel}>Wallet</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={onOpenProfile}>
          <Ionicons name="person-outline" size={22} color="#8A8A8A" />
          <Text style={styles.tabLabel}>Profile</Text>
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
  mainScroll: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    elevation: 8,
    paddingHorizontal: H_PAD,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburger: {
    width: 22,
    height: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bell: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TAB_PURPLE,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  hamShort: {
    width: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  hamLong: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  slider: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    backgroundColor: '#111111',
    overflow: 'hidden',
    position: 'relative',
  },
  sliderTouch: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  slideSpacer: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  },
  slideSpacerCta: {
    position: 'absolute',
    left: 16,
    bottom: 44,
    width: 140,
    height: 44,
    borderRadius: 999,
  },
  slide: {
    position: 'absolute',
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    overflow: 'hidden',
  },
  slideBgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideCopyWrap: {
    position: 'absolute',
    left: 16,
    bottom: 48,
    maxWidth: SCREEN_W * 0.5,
    zIndex: 2,
  },
  navratriEmblem: {
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  navratriArchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
    gap: 3,
  },
  navratriArchWing: {
    width: 22,
    height: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#C5283D',
  },
  navratriArchDome: {
    width: 28,
    height: 18,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#A91B30',
    backgroundColor: 'rgba(255, 232, 189, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navratriHelloText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#9B162C',
    letterSpacing: 0.6,
  },
  navratriMainText: {
    marginTop: -3,
    fontSize: 22,
    fontWeight: '900',
    color: '#881024',
    letterSpacing: 0.4,
  },
  navratriSwirlBar: {
    marginTop: 3,
    width: 84,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C5283D',
  },
  slideHeadlineBlock: {
    alignItems: 'flex-start',
  },
  slideAccentVector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 5,
  },
  slideAccentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFD166',
  },
  slideAccentLine: {
    width: 34,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  slideHeadlineText: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slideSubBlock: {
    marginTop: 5,
  },
  slideSubText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  slideCtaBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#141414',
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.76)',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  slideCtaBtnGold: {
    borderColor: '#D6A354',
  },
  slideCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  slideFrontWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideFrontImage: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    marginTop: -28,
    backgroundColor: '#F7F7F8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    zIndex: 2,
  },
  bookingSearchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E5DFEF',
    shadowColor: '#1A0F30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  bookingCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookingCardHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: -0.3,
  },
  bookingReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3EEFA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bookingReadyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B7BA3',
  },
  bookingReadyDotActive: {
    backgroundColor: '#12804A',
  },
  bookingReadyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5F5475',
  },
  bookingReadyTextActive: {
    color: '#12804A',
  },
  bookingLocationInput: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.3,
    borderColor: '#DFD9EA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookingLocationInputSelected: {
    borderColor: TAB_PURPLE,
    backgroundColor: '#FAF7FE',
  },
  bookingLocationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingLocationIconWrapActive: {
    backgroundColor: TAB_PURPLE,
  },
  bookingLocationCopy: {
    flex: 1,
  },
  bookingLocationText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#24083C',
  },
  bookingLocationPlaceholder: {
    color: '#736D80',
    fontWeight: '600',
  },
  bookingZoneAvailInline: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bookingZoneAvailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#12804A',
  },
  bookingZoneAvailText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#12804A',
  },
  bookingZoneHintText: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#8B8499',
  },
  bookingZoneTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bookingZoneTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#12804A',
  },
  bookingQuickZonesRow: {
    paddingTop: 10,
    paddingBottom: 2,
    gap: 8,
  },
  bookingQuickZoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4DDF0',
    backgroundColor: '#FAF8FD',
  },
  bookingQuickZoneChipActive: {
    backgroundColor: TAB_PURPLE,
    borderColor: TAB_PURPLE,
  },
  bookingQuickZoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#12804A',
  },
  bookingQuickZoneDotActive: {
    backgroundColor: '#7FFFD4',
  },
  bookingQuickZoneName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  bookingQuickZoneNameActive: {
    color: '#FFFFFF',
  },
  bookingQuickZoneCount: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#736D80',
  },
  bookingQuickZoneCountActive: {
    color: '#E9D5FF',
  },
  bookingDatesRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  bookingDateBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.3,
    borderColor: '#DFD9EA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  bookingDateBoxConfirmed: {
    borderColor: TAB_PURPLE,
    backgroundColor: '#FAF7FE',
  },
  bookingDateBoxRight: {
    alignItems: 'flex-end',
  },
  bookingDateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bookingDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#736D80',
  },
  bookingDateValue: {
    marginTop: 4,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: -0.2,
  },
  bookingDatePlaceholder: {
    fontWeight: '600',
    color: '#8B8499',
  },
  textRight: {
    textAlign: 'right',
  },
  bookingDeliveryCheckRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bookingCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.6,
    borderColor: '#363042',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  bookingCheckboxChecked: {
    backgroundColor: TAB_PURPLE,
    borderColor: TAB_PURPLE,
  },
  bookingDeliveryCheckLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  bookingSearchBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 14,
    backgroundColor: TAB_PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: TAB_PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  bookingSearchBtnDisabled: {
    backgroundColor: '#EAE6F2',
    shadowOpacity: 0,
    elevation: 0,
  },
  bookingSearchBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bookingSearchBtnTextDisabled: {
    color: '#8A819C',
    fontSize: 13.5,
    fontWeight: '700',
  },
  calModalRoot: {
    flex: 1,
    backgroundColor: '#F6F5F8',
    paddingHorizontal: 14,
  },
  calTopBar: {
    height: 42,
    justifyContent: 'center',
  },
  calBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calWhereCard: {
    marginTop: 4,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#160E29',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calWhereLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#736D80',
  },
  calWhereRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calWhereValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#24083C',
  },
  calSheetCard: {
    flex: 1,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#160E29',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  calCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calCardMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: -0.3,
  },
  calClearText: {
    fontSize: 13,
    fontWeight: '700',
    color: TAB_PURPLE,
    letterSpacing: 0.4,
  },
  calRangeSubText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#280D42',
  },
  hourlyRentalBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    gap: 4,
  },
  hourlyRentalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hourlyRentalBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  hourlyRentalDescText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  calHourlyNoticeWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAF5FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  calHourlyNoticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: TAB_PURPLE,
  },
  calPackageRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  calPkgChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E5DFEF',
    backgroundColor: '#FAF8FD',
    alignItems: 'center',
  },
  calPkgChipActive: {
    backgroundColor: TAB_PURPLE,
    borderColor: TAB_PURPLE,
  },
  calPkgChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#24083C',
  },
  calPkgChipLabelActive: {
    color: '#FFFFFF',
  },
  calPkgChipSub: {
    fontSize: 10,
    color: '#7E7690',
    fontWeight: '600',
  },
  calPkgChipSubActive: {
    color: '#E9D5FF',
  },
  calWeekdayBar: {
    marginTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE9F2',
    flexDirection: 'row',
  },
  calWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#6E687A',
  },
  calMonthsScroll: {
    flex: 1,
    marginTop: 6,
  },
  calMonthBlock: {
    marginBottom: 16,
  },
  calMonthHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#24083C',
    marginTop: 8,
    marginBottom: 8,
  },
  calMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calDayCellInRange: {
    backgroundColor: '#F3E8FF',
  },
  calDayCellRangeStart: {
    backgroundColor: '#F3E8FF',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  calDayCellRangeEnd: {
    backgroundColor: '#F3E8FF',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  calDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayCircleSelected: {
    backgroundColor: TAB_PURPLE,
  },
  calDayNumText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#24083C',
  },
  calDayNumInRangeText: {
    color: TAB_PURPLE,
    fontWeight: '700',
  },
  calDayNumSelectedText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calTimeDivider: {
    height: 1,
    backgroundColor: '#ECE9F2',
    marginVertical: 8,
  },
  calTimeCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 6,
  },
  calTimeCard: {
    flex: 1,
    backgroundColor: '#FAF7FD',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    alignItems: 'center',
  },
  calTimeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  calTimeCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  calTimeCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: TAB_PURPLE,
    letterSpacing: -0.2,
    marginVertical: 2,
  },
  calTimeCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EEF8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  calTimeCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: TAB_PURPLE,
  },
  calTimeColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
    gap: 14,
  },
  timeWheelCol: {
    flex: 1,
    alignItems: 'center',
  },
  timeWheelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#24083C',
    marginBottom: 6,
  },
  timeWheelViewport: {
    width: '94%',
    height: TIME_WHEEL_ITEM_H * 3,
    position: 'relative',
    justifyContent: 'center',
  },
  timeWheelHighlightPill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: TIME_WHEEL_ITEM_H,
    height: TIME_WHEEL_ITEM_H,
    borderRadius: 19,
    backgroundColor: '#F2EFF7',
    borderWidth: 1,
    borderColor: '#E2DAF0',
  },
  timeWheelItemRow: {
    height: TIME_WHEEL_ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeWheelGhostText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#B6AEC4',
    letterSpacing: 0.3,
  },
  timeWheelSelectedText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: 0.2,
  },
  calContinueBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 12,
    backgroundColor: TAB_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calContinueBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fleetEyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 5,
  },
  fleetEyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: TAB_PURPLE,
    letterSpacing: 0.5,
  },
  sectionHead: {
    marginTop: 22,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionText: {
    flex: 1,
    paddingRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
    color: '#280D42',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3EEF8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: TAB_PURPLE,
  },
  rideDeck: {
    marginHorizontal: -16,
    marginBottom: 6,
  },
  rideTrack: {
    paddingHorizontal: (SCREEN_W - RIDE_CARD_W) / 2,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rideSlot: {
    width: RIDE_CARD_W,
  },
  rideSlotOverlap: {
    marginRight: RIDE_SNAP - RIDE_CARD_W,
  },
  rideCard: {
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EDE7F6',
    overflow: 'hidden',
    shadowColor: '#1A1030',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
  rideCardActive: {
    borderColor: '#C9A9F5',
    shadowColor: TAB_PURPLE,
    shadowOpacity: 0.22,
  },
  rideStageBox: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  rideTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  rideAssuredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderWidth: 1,
    borderColor: '#E9D8FD',
  },
  ridePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: TAB_PURPLE,
  },
  rideHeart: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideHaloCircle: {
    position: 'absolute',
    top: 30,
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  rideFloorShadow: {
    position: 'absolute',
    bottom: 14,
    width: '68%',
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(36, 12, 70, 0.08)',
  },
  rideImage: {
    width: '100%',
    height: 132,
    marginTop: 4,
  },
  ridePriceFloatPill: {
    alignSelf: 'flex-end',
    backgroundColor: '#240646',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: -6,
  },
  ridePriceFloatText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
  },
  rideBodyContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  rideTitleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rideName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: -0.3,
  },
  rideLine: {
    marginTop: 2,
    fontSize: 13,
    color: '#280D42',
    fontWeight: '600',
  },
  rideYearTag: {
    backgroundColor: '#F5F0FC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rideYearTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: TAB_PURPLE,
  },
  rideSpecs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F7FC',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EFEAF6',
  },
  rideSpec: {
    flex: 1,
    alignItems: 'center',
  },
  rideSpecIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFE6FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  rideSpecDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5DFEF',
  },
  rideSpecValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1430',
  },
  rideSpecLabel: {
    fontSize: 9.5,
    color: '#827A90',
    fontWeight: '600',
  },
  rideBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4D8F4',
    backgroundColor: '#FBF9FE',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  rideBtnFace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rideBtnPaint: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: TAB_PURPLE,
  },
  rideBtnPaintLabel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rideBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: TAB_PURPLE,
  },
  rideBtnTextOn: {
    color: '#FFFFFF',
  },
  impactCard: {
    marginTop: 18,
    backgroundColor: '#F3FBF6',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9F0E2',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
  impactHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  impactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  impactLeaf: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E3F6EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: -0.3,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D9F0E2',
  },
  monthText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#1F8A4C',
  },
  impactStats: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  impactValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  impactLabel: {
    fontSize: 11,
    color: '#6A9A7C',
    textAlign: 'center',
  },
  impactDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#D3EBD9',
  },
  benefitCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  benefitItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1C',
    textAlign: 'center',
  },
  benefitSub: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 12,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  trustedSection: {
    marginTop: 20,
    marginHorizontal: -16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 18,
  },
  trustedHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  trustedAccent: {
    color: '#7A25D9',
    fontWeight: '800',
  },
  trustedHeroCard: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 22,
    minHeight: 146,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trustedWave1: {
    position: 'absolute',
    right: -30,
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  trustedWave2: {
    position: 'absolute',
    right: -60,
    top: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  trustedWave3: {
    position: 'absolute',
    right: -95,
    top: -105,
    width: 350,
    height: 350,
    borderRadius: 175,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  trustedHeroCopy: {
    zIndex: 2,
    maxWidth: '72%',
  },
  trustedHeroNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  trustedHeroSub: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  trustedKeyWrap: {
    position: 'absolute',
    top: 10,
    right: 16,
    alignItems: 'center',
  },
  trustedCuff: {
    width: 26,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FFD21E',
    transform: [{ rotate: '-24deg' }],
  },
  trustedKeyRing: {
    marginTop: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#C5B3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustedHeroVehicle: {
    position: 'absolute',
    right: 6,
    bottom: -6,
    width: 112,
    height: 82,
    opacity: 0.94,
  },
  trustedGridRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  trustedCitiesCard: {
    flex: 1.28,
    borderRadius: 20,
    padding: 16,
    minHeight: 136,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trustedCitiesGrid: {
    position: 'absolute',
    right: -12,
    top: -12,
    bottom: -12,
    width: 110,
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trustedCitiesCopy: {
    zIndex: 2,
  },
  trustedSmallLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  trustedCitiesNum: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trustedCitiesSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trustedMapGraphic: {
    position: 'absolute',
    right: 6,
    top: 22,
    width: 82,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  trustedRatingCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 136,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trustedRatingChevron: {
    position: 'absolute',
    right: -24,
    top: 18,
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    transform: [{ rotate: '45deg' }],
  },
  trustedRatingNum: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trustedStarsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  customerReviewSection: {
    marginTop: 10,
    marginHorizontal: -16,
    backgroundColor: '#FFFFFF',
    paddingTop: 22,
    paddingBottom: 24,
  },
  customerReviewHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24083C',
    paddingHorizontal: 16,
    letterSpacing: -0.3,
  },
  customerReviewAccent: {
    color: '#7A25D9',
    fontWeight: '800',
  },
  reviewTickerClip: {
    marginTop: 14,
    width: SCREEN_W,
    overflow: 'hidden',
  },
  reviewTickerTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  reviewTickerPill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8.5,
  },
  reviewTickerPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#280D42',
  },
  customerReviewTrack: {
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: Math.round((SCREEN_W - REVIEW_CARD_W) / 2),
    gap: REVIEW_GAP,
  },
  customerReviewCard: {
    width: REVIEW_CARD_W,
    height: REVIEW_CARD_H,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1E172B',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  customerReviewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  soldStampOuter: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-18deg' }],
    zIndex: 3,
  },
  soldStampInner: {
    width: 63,
    height: 63,
    borderRadius: 31.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
  },
  soldStampStars: {
    color: 'rgba(255, 255, 255, 0.50)',
    fontSize: 6.5,
    letterSpacing: 2,
  },
  soldStampBand: {
    width: 68,
    paddingVertical: 1.5,
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.48)',
    backgroundColor: 'rgba(20, 16, 28, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldStampText: {
    color: 'rgba(255, 255, 255, 0.70)',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  customerReviewBottomContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    zIndex: 4,
  },
  customerReviewName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  customerReviewCity: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.78)',
  },
  customerReviewQuote: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18.5,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.94)',
  },
  customerReviewReadMore: {
    marginTop: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customerSoldBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  customerSoldBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1B1726',
    letterSpacing: -0.1,
  },
    socialSection: {
    marginTop: 10,
    marginHorizontal: -16,
    backgroundColor: '#FFFFFF',
    paddingTop: 22,
    paddingBottom: 26,
  },
  socialTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24083C',
    paddingHorizontal: 16,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  socialTrack: {
    paddingHorizontal: 16,
    gap: SOCIAL_GAP,
  },
  socialCard: {
    width: SOCIAL_CARD_W,
    height: SOCIAL_CARD_H,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  socialVideo: {
    width: '100%',
    height: '100%',
  },
  statusRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  statusBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  statusBarTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  statusStage: {
    flex: 1,
    marginTop: 10,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  statusVideo: {
    width: '100%',
    height: '100%',
  },
  statusTapLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  statusTapLeft: {
    flex: 1,
  },
  statusTapRight: {
    flex: 1,
  },
  statusNavArrow: {
    position: 'absolute',
    top: '48%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 20, 26, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  statusNavArrowLeft: {
    left: 12,
  },
  statusNavArrowRight: {
    right: 12,
  },
  statusControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  statusCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(110, 110, 118, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 12,
    marginHorizontal: -16,
    marginBottom: -20,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'visible',
  },
  footerPerspective: {
    width: SCREEN_W,
    height: FOOTER_ART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerStage: {
    width: SCREEN_W,
    height: FOOTER_ART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerArt: {
    width: SCREEN_W * 0.94,
    height: FOOTER_ART_HEIGHT * 0.94,
    opacity: 0.35,
  },
  footerCreditWrap: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(74, 22, 140, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCreditText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4E3869',
    letterSpacing: 0.2,
  },
  footerCreditHandle: {
    fontWeight: '800',
    color: TAB_PURPLE,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
    zIndex: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: TAB_PURPLE,
    fontWeight: '700',
  },
  scanButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: TAB_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: TAB_PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  scanQr: {
    position: 'absolute',
    top: 15,
    left: 15,
  },

  /* Home Active Ride Banner */
  homeActiveRideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  homeActiveRideLeft: {
    flex: 1,
    marginRight: 10,
  },
  homeActiveRideLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  homeActiveRideLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  homeActiveRideLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  homeActiveRideVehicleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  homeActiveRideSubText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  homeActiveRideResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  homeActiveRideResumeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
