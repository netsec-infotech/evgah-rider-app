import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';
import { apiGet } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 16;
const TAB_PURPLE = '#4A168C';
const SLIDE_WIDTH = SCREEN_W;
const SLIDE_HEIGHT = Math.round(SCREEN_W * (360 / 401));
const PROMO_VIDEO =
  'https://res.cloudinary.com/dh3fdtkbe/video/upload/a6af77a7-e952-dc4d-b8fe-51185a5c699b_custom_1_hfjeld.mp4';
const PROMO_VIDEO_HEIGHT = Math.round(SCREEN_W * (416 / 410));
const FOOTER_ART = require('../assets/home/footer-evegah.png');
const FOOTER_ART_HEIGHT = Math.round(SCREEN_W * (673 / 861));

const OFFER_SLIDE = require('../assets/home/ride-more-slide.png');
const SLIDES = [OFFER_SLIDE, OFFER_SLIDE];
const LOOP = [...SLIDES, SLIDES[0]];
const RIDE_CARD_W = Math.round(SCREEN_W * 0.7);
const RIDE_SNAP = Math.round(SCREEN_W * 0.54);
const VEHICLES = [
  {
    name: 'Evegah Fly',
    tag: 'E-Scooter',
    line: 'Light for every day',
    range: '40-60 km',
    speed: '25 km/h',
    tint: '#EEF3FF',
    image: require('../assets/home/vehicle-fly.png'),
  },
  {
    name: 'Evegah Mink',
    tag: 'E-Scooter',
    line: 'Smooth city miles',
    range: '70-90 km',
    speed: '45 km/h',
    tint: '#F6F1FC',
    image: require('../assets/home/vehicle-mink.png'),
  },
  {
    name: 'Evegah City',
    tag: 'E-Scooter',
    line: 'Quiet across town',
    range: '80-90 km',
    speed: '45 km/h',
    tint: '#F3FBF6',
    image: require('../assets/home/vehicle-city.png'),
  },
  {
    name: 'Evegah Pro',
    tag: 'E-Scooter',
    line: 'Built for longer rides',
    range: '110-130 km',
    speed: '75 km/h',
    tint: '#FFF6F2',
    image: require('../assets/home/vehicle-pro.png'),
  },
];

function GyroFooterArt() {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
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
      rotateY.value += ((roll / 0.7) * 22 - rotateY.value) * blend;
      rotateX.value += ((-pitch / 0.7) * 18 - rotateX.value) * blend;
      shiftX.value += (roll * -42 - shiftX.value) * blend;
      shiftY.value += (pitch * 28 - shiftY.value) * blend;
    });

    return () => subscription.remove();
  }, [rotateX, rotateY, shiftX, shiftY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: shiftX.value },
      { translateY: shiftY.value },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  return (
    <View style={styles.footerPerspective} collapsable={false}>
      <Animated.View
        collapsable={false}
        renderToHardwareTextureAndroid
        style={[styles.footerStage, style]}
      >
        <Image source={FOOTER_ART} style={styles.footerArt} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RideCard({ vehicle, index, scrollX, active, onOpenVehicle }) {
  const [saved, setSaved] = useState(false);
  const paint = useSharedValue(active ? 1 : 0);
  const btnWidth = useSharedValue(RIDE_CARD_W - 32);
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * RIDE_SNAP, index * RIDE_SNAP, (index + 1) * RIDE_SNAP];
    const raw = interpolate(scrollX.value, input, [-1, 0, 1], Extrapolation.CLAMP);
    const eased = Math.sign(raw) * Math.pow(Math.abs(raw), 1.35);
    return {
      zIndex: Math.abs(raw) < 0.5 ? 8 : 1,
      transform: [
        { perspective: 1200 },
        { translateX: eased * 14 },
        { rotateY: `${eased * -28}deg` },
        { scale: 1 - Math.abs(eased) * 0.08 },
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
      duration: 560,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [active, paint]);

  return (
    <Animated.View
      collapsable={false}
      style={[
        styles.rideSlot,
        index < VEHICLES.length - 1 && styles.rideSlotOverlap,
        style,
      ]}
    >
      <View style={[styles.rideCard, { backgroundColor: vehicle.tint }]}>
        <View style={styles.rideTop}>
          <View style={styles.ridePill}>
            <Text style={styles.ridePillText}>{vehicle.tag}</Text>
          </View>
          <Pressable hitSlop={8} style={styles.rideHeart} onPress={() => setSaved((value) => !value)}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#E2557A' : '#7A7388'} />
          </Pressable>
        </View>
        <Text style={styles.rideName}>{vehicle.name}</Text>
        <Text style={styles.rideLine}>{vehicle.line}</Text>
        <Image source={vehicle.image} style={styles.rideImage} contentFit="contain" />
        <View style={styles.rideSpecs}>
          <View style={styles.rideSpec}>
            <Ionicons name="navigate" size={15} color={TAB_PURPLE} />
            <Text style={styles.rideSpecValue}>{vehicle.range}</Text>
            <Text style={styles.rideSpecLabel}>Range</Text>
          </View>
          <View style={styles.rideSpec}>
            <Ionicons name="speedometer" size={15} color={TAB_PURPLE} />
            <Text style={styles.rideSpecValue}>{vehicle.speed}</Text>
            <Text style={styles.rideSpecLabel}>Top Speed</Text>
          </View>
        </View>
        <AnimatedPressable
          style={[styles.rideBtn, buttonStyle]}
          onPress={() => onOpenVehicle?.(vehicle)}
          onLayout={(event) => {
            btnWidth.value = event.nativeEvent.layout.width;
          }}
        >
          <View style={styles.rideBtnFace}>
            <Text style={styles.rideBtnText}>View Details</Text>
            <Ionicons name="arrow-forward" size={14} color={TAB_PURPLE} />
          </View>
          <Animated.View pointerEvents="none" style={[styles.rideBtnPaint, paintStyle]}>
            <Animated.View style={[styles.rideBtnPaintLabel, paintLabelStyle]}>
              <Text style={[styles.rideBtnText, styles.rideBtnTextOn]}>Book This Ride</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

function MergeSlide({ index, source, scrollX }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * SLIDE_WIDTH, index * SLIDE_WIDTH, (index + 1) * SLIDE_WIDTH];
    return {
      opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            scrollX.value,
            input,
            [SLIDE_WIDTH * 0.42, 0, -SLIDE_WIDTH * 0.42],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(scrollX.value, input, [0.94, 1, 0.94], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.slide, style]}>
      <Image source={source} style={styles.slideImage} contentFit="cover" />
    </Animated.View>
  );
}

export default function HomeScreen({
  onOpenLocation,
  onOpenMyRide,
  onOpenScan,
  onOpenProfile,
  onOpenWallet,
  onOpenVehicle,
  onOpenNotifications,
  onOpenInsights,
  onOpenBms,
  hasUnread,
}) {
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState(VEHICLES);
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

  const scrollRef = useRef(null);
  const scrollX = useSharedValue(0);
  const rideX = useSharedValue(RIDE_SNAP);
  const rideRef = useRef(null);
  const [rideIndex, setRideIndex] = useState(1);
  const pageRef = useRef(0);
  const timerRef = useRef(null);
  const promoPlayer = useVideoPlayer(PROMO_VIDEO, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });
  const onRideScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      rideX.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      rideRef.current?.scrollTo({ x: RIDE_SNAP, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const stopAuto = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startAuto = () => {
    stopAuto();
    timerRef.current = setInterval(() => {
      const next = pageRef.current + 1;
      scrollRef.current?.scrollTo({ x: next * SLIDE_WIDTH, animated: true });
    }, 3200);
  };

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.slider}>
        {LOOP.map((source, index) => (
          <MergeSlide key={index} index={index} source={source} scrollX={scrollX} />
        ))}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onScrollBeginDrag={stopAuto}
          onMomentumScrollEnd={(event) => {
            const page = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
            if (page >= SLIDES.length) {
              pageRef.current = 0;
              scrollX.value = 0;
              scrollRef.current?.scrollTo({ x: 0, animated: false });
            } else {
              pageRef.current = page;
            }
            startAuto();
          }}
          style={styles.sliderTouch}
        >
          {LOOP.map((_, index) => (
            <View key={index} style={styles.slideSpacer} />
          ))}
        </Animated.ScrollView>
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <Pressable hitSlop={8} onPress={onOpenBms} style={styles.hamburger}>
            <View style={styles.hamShort} />
            <View style={styles.hamLong} />
            <View style={styles.hamShort} />
          </Pressable>
          <Pressable hitSlop={12} onPress={() => onOpenLocation?.()} style={styles.location}>
            <Text style={styles.locationText}>Gotri, Vadodara</Text>
            <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
        <Pressable hitSlop={8} onPress={onOpenNotifications} style={styles.bell}>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          {hasUnread ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.planHead}>
          <Text style={styles.rentalTitle}>Choose Your Plan</Text>
          <Pressable style={styles.planCustom}>
            <Text style={styles.planCustomText}>Custom</Text>
          </Pressable>
        </View>
        <View style={styles.planRow}>
          <Animated.View entering={cardEnter(0)} style={[styles.planCard, styles.planDaily]}>
            <View style={styles.popular}>
              <Text style={styles.popularText}>Most Popular</Text>
            </View>
            <Text style={styles.planName}>Daily Plan</Text>
            <View style={styles.planBody}>
              <View style={styles.planCopy}>
                <Text style={styles.planDrive} numberOfLines={1}>
                  Daily drive
                </Text>
                <Text style={styles.planLength} numberOfLines={1}>
                  24 hours
                </Text>
              </View>
              <Image
                source={require('../assets/home/vehicle-mink.png')}
                style={styles.planVehicle}
                contentFit="contain"
                contentPosition="left"
              />
            </View>
            {['Unlimited km', 'Swap anytime', 'Doorstep delivery'].map((item) => (
              <View key={item} style={styles.planPoint}>
                <Ionicons name="checkmark" size={12} color="#1F8A4C" />
                <Text style={styles.planPointText}>{item}</Text>
              </View>
            ))}
            <View style={styles.planSpacer} />
            <Pressable style={styles.planBtn}>
              <Text style={styles.planBtnText}>Book Daily</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={cardEnter(1)} style={[styles.planCard, styles.planMonthly]}>
            <Text style={styles.planName}>Monthly Plan</Text>
            <View style={styles.planBody}>
              <View style={styles.planCopy}>
                <Text style={styles.planDrive} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  Monthly drive
                </Text>
                <Text style={styles.planLength} numberOfLines={1}>
                  30 days
                </Text>
              </View>
              <Image
                source={require('../assets/home/vehicle-city.png')}
                style={styles.planVehicle}
                contentFit="contain"
                contentPosition="left"
              />
            </View>
            {['Unlimited km', 'Priority support', 'Best value'].map((item) => (
              <View key={item} style={styles.planPoint}>
                <Ionicons name="checkmark" size={12} color="#1F8A4C" />
                <Text style={styles.planPointText}>{item}</Text>
              </View>
            ))}
            <View style={styles.planSpacer} />
            <Pressable style={[styles.planBtn, styles.planBtnSoft]}>
              <Text style={[styles.planBtnText, styles.planBtnTextSoft]}>Book Monthly</Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.sectionHead}>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>Choose Your EV Ride</Text>
            <Text style={styles.sectionSubtitle}>Clean Rides. Greener Tomorrows.</Text>
          </View>
          <Pressable style={styles.viewAll}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={TAB_PURPLE} />
          </Pressable>
        </View>

        <Animated.View entering={cardEnter(2)} style={styles.rideDeck}>
          <Animated.ScrollView
            ref={rideRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="normal"
            snapToInterval={RIDE_SNAP}
            snapToAlignment="start"
            nestedScrollEnabled
            scrollEventThrottle={16}
            contentOffset={{ x: RIDE_SNAP, y: 0 }}
            contentContainerStyle={styles.rideTrack}
            onScroll={onRideScroll}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / RIDE_SNAP);
              setRideIndex(Math.max(0, Math.min(vehicles.length - 1, next)));
            }}
          >
            {vehicles.map((vehicle, index) => (
              <RideCard
                key={vehicle.name}
                vehicle={vehicle}
                index={index}
                scrollX={rideX}
                active={index === rideIndex}
                onOpenVehicle={onOpenVehicle}
              />
            ))}
          </Animated.ScrollView>
        </Animated.View>

        <Animated.View entering={cardEnter(6)} style={styles.promoVideo}>
          <VideoView
            player={promoPlayer}
            style={styles.promoVideoView}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        </Animated.View>

        <Animated.View entering={cardEnter(7)} style={styles.impactCard}>
          <Pressable onPress={onOpenInsights}>
          <View style={styles.impactHead}>
            <View style={styles.impactTitleRow}>
              <View style={styles.impactLeaf}>
                <Ionicons name="leaf" size={16} color="#1F8A4C" />
              </View>
              <Text style={styles.impactTitle}>Your Green Impact</Text>
            </View>
            <View style={styles.monthPill}>
              <Ionicons name="leaf-outline" size={12} color="#1F8A4C" />
              <Text style={styles.monthText}>THIS MONTH</Text>
            </View>
          </View>
          <View style={styles.impactStats}>
            <View style={styles.impactStat}>
              <Ionicons name="leaf" size={18} color="#1F8A4C" />
              <Text style={styles.impactValue}>0.0 kg</Text>
              <Text style={styles.impactLabel}>CO₂ Saved</Text>
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.impactStat}>
              <Ionicons name="bicycle" size={18} color="#1F8A4C" />
              <Text style={styles.impactValue}>0 Rides</Text>
              <Text style={styles.impactLabel}>Zero Emission</Text>
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.impactStat}>
              <Ionicons name="flash" size={18} color="#1F8A4C" />
              <Text style={styles.impactValue}>0.0 kWh</Text>
              <Text style={styles.impactLabel}>Clean Energy</Text>
            </View>
          </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={cardEnter(8)} style={styles.benefitCard}>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#E7F6EC' }]}>
              <Ionicons name="leaf" size={20} color="#1F8A4C" />
            </View>
            <Text style={styles.benefitTitle}>Eco Friendly</Text>
            <Text style={styles.benefitSub}>Zero Emission</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#F3EEF8' }]}>
              <Ionicons name="wallet" size={20} color={TAB_PURPLE} />
            </View>
            <Text style={styles.benefitTitle}>Affordable</Text>
            <Text style={styles.benefitSub}>Save More</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#FFF4E8' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#E07A1F" />
            </View>
            <Text style={styles.benefitTitle}>Safe & Reliable</Text>
            <Text style={styles.benefitSub}>Ride with Confidence</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#E8F4FC' }]}>
              <Ionicons name="earth" size={20} color="#2B7BB9" />
            </View>
            <Text style={styles.benefitTitle}>Sustainable</Text>
            <Text style={styles.benefitSub}>A Cleaner Tomorrow</Text>
          </View>
        </Animated.View>

        <Animated.View entering={cardEnter(9)}>
          <LinearGradient
            colors={['#F7F7F8', '#F6F1FC', '#E6D4FA']}
            locations={[0, 0.42, 1]}
            style={styles.footer}
          >
            <GyroFooterArt />
          </LinearGradient>
        </Animated.View>
      </ScrollView>

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
    backgroundColor: '#FFFFFF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    minHeight: 44,
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
  },
  sliderTouch: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  slideSpacer: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  },
  slide: {
    position: 'absolute',
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    backgroundColor: '#111111',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: '#F7F7F8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 2,
  },
  sheetContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  rentalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planCustom: {
    backgroundColor: TAB_PURPLE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  planCustomText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 36,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  planDaily: {
    backgroundColor: '#F4EEFB',
  },
  planMonthly: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DDF3',
  },
  popular: {
    position: 'absolute',
    top: 10,
    left: 12,
    backgroundColor: TAB_PURPLE,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  popularText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  planBody: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  planCopy: {
    flexShrink: 0,
  },
  planDrive: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6E6E6E',
  },
  planLength: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: TAB_PURPLE,
  },
  planPoint: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planPointText: {
    flex: 1,
    fontSize: 11,
    color: '#3A3A3A',
  },
  planVehicle: {
    flex: 1,
    height: 74,
    marginLeft: -2,
    marginRight: -8,
  },
  planSpacer: {
    flex: 1,
    minHeight: 14,
  },
  planBtn: {
    backgroundColor: TAB_PURPLE,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  planBtnSoft: {
    backgroundColor: '#F3EEF8',
  },
  planBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planBtnTextSoft: {
    color: TAB_PURPLE,
  },
  sectionHead: {
    marginTop: 18,
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
    fontWeight: '700',
    color: '#2A2140',
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#8E8E93',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F3EEF8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: TAB_PURPLE,
  },
  rideDeck: {
    marginHorizontal: -16,
    marginBottom: 4,
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
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#1A1030',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  rideTop: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ridePill: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  ridePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6880',
  },
  rideHeart: {
    position: 'absolute',
    right: 0,
    top: 2,
  },
  rideName: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1430',
    textAlign: 'center',
  },
  rideLine: {
    marginTop: 4,
    fontSize: 13,
    color: '#8A8496',
    textAlign: 'center',
  },
  rideImage: {
    width: '100%',
    height: 132,
    marginTop: 6,
  },
  rideSpecs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rideSpec: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    paddingVertical: 10,
    gap: 2,
  },
  rideSpecValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1430',
  },
  rideSpecLabel: {
    fontSize: 10,
    color: '#8A8496',
  },
  rideBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: '#E4D8F4',
    backgroundColor: 'rgba(255,255,255,0.7)',
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
    fontWeight: '700',
    color: TAB_PURPLE,
  },
  rideBtnTextOn: {
    color: '#FFFFFF',
  },
  promoVideo: {
    marginTop: 18,
    marginHorizontal: -16,
    width: SCREEN_W,
    height: PROMO_VIDEO_HEIGHT,
    backgroundColor: '#000000',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1B6B3A',
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
  footer: {
    marginTop: 28,
    marginHorizontal: -16,
    marginBottom: -20,
    paddingTop: 28,
    paddingBottom: 8,
    alignItems: 'center',
    overflow: 'visible',
  },
  footerPerspective: {
    width: SCREEN_W,
    height: FOOTER_ART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ perspective: 900 }],
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
  },
  promoVideoView: {
    width: '100%',
    height: '100%',
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
});
