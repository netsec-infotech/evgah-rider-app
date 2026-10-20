import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Image as RNImage,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  View,
} from 'react-native';
import {
  useFonts,
  Caveat_400Regular,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import { Image } from 'expo-image';
import { useEventListener } from 'expo';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';
import LocationScreen, { EVEGAH_ZONES } from './LocationScreen';
import {
  AnalogClockDial,
  parseClockString,
  formatClockString,
  parseOperatingHours,
  clampTimeToOperatingHours,
  getValidHoursForMeridiem,
} from '../components/AnalogClockPicker';
import { apiGet, resolveMediaUrl } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');

const BRAND_DEEP = '#120529';
const PURPLE = '#4A168C';
const BRAND_PURPLE_ACCENT = '#5B21B6';
const BRAND_VIOLET = '#7C3AED';
const PAGE = '#F4F6FB';

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const TOAST_OFFSCREEN_Y = -120;
const TOAST_ENTER_MS = 560;
const TOAST_EXIT_MS = 480;
const TOAST_VISIBLE_MS = 4000;
const TOAST_EASE_IN = Easing.bezier(0.4, 0, 0.2, 1);

const INTRO_VIDEO = require('../assets/intro-ride.mp4');
const GLIDE_RATE = 1.5;
const SCOOTER_WIDTH = 60;
const SCOOTER_HEIGHT = 32;
const TRAIL_WIDTH = 30;
const RIDE_GROUP_WIDTH = SCOOTER_WIDTH + TRAIL_WIDTH;
const ROAD_DASHES = Array.from({ length: 16 }, (_, index) => index);
const VIDEO_MARKS = [0, 1.5, 3, 4.5, 6, 7.5, 9.2];

// ============================================================================
// FULL SLIDER CONSTANTS & SLIDES (HOMESCREEN MULTI-LAYER PARALLAX)
// ============================================================================
const SLIDE_WIDTH = SCREEN_W;
const SLIDE_HEIGHT = Math.round(SCREEN_W * (340 / 401));

const RENT_SLIDES = [
  {
    kind: 'corporate',
    bg: require('../assets/rent/slider-1.png'),
    front: require('../assets/rent/slider1-bg.png'),
    frontWidth: Math.round(SLIDE_HEIGHT * 0.52),
    frontHeight: Math.round(SLIDE_HEIGHT * 0.85),
    frontRight: 8,
    frontBottom: 8,
    tag: 'DAILY COMMUTE',
    lines: ['Smart Rides for', 'Corporate Pros'],
    sub: 'Zero petrol. 100% savings.',
    cta: 'Rent EV',
  },
  {
    kind: 'campus',
    bg: require('../assets/rent/slider-2.png'),
    front: require('../assets/rent/slider2-bg.png'),
    frontWidth: Math.round(SLIDE_HEIGHT * 0.70),
    frontHeight: Math.round(SLIDE_HEIGHT * 0.70),
    frontRight: 4,
    frontBottom: 10,
    tag: 'CAMPUS RIDES',
    lines: ['College Travel,', 'Made Effortless'],
    sub: 'Special student hourly rates.',
    cta: 'Book Now',
  },
  {
    kind: 'delivery',
    bg: require('../assets/rent/slider-3.png'),
    front: require('../assets/rent/slider3-front.png'),
    frontWidth: Math.round(SLIDE_HEIGHT * 0.52),
    frontHeight: Math.round(SLIDE_HEIGHT * 0.82),
    frontRight: 8,
    frontBottom: 8,
    tag: 'DELIVERY FLEET',
    lines: ['Earn More With', 'Evegah EV Fleet'],
    sub: 'High range & zero maintenance.',
    cta: 'Start Earning',
  },
];
const RENT_LOOP = [...RENT_SLIDES, RENT_SLIDES[0]];

const ZONES = [
  { id: 'gotri', name: 'Gotri', shortName: 'Gotri', area: 'Gotri Main Road', distance: '1.2 km' },
  { id: 'manjalpur', name: 'Manjalpur', shortName: 'Manjalpur', area: 'Manjalpur Main Road', distance: '2.8 km' },
  { id: 'aatapi', name: 'Aatapi', shortName: 'Aatapi', area: 'Ajwa Nimeta Road', distance: '4.5 km' },
  { id: 'kpgu', name: 'KPGU', shortName: 'KPGU', area: 'Babaria Institute Campus', distance: '5.1 km' },
];

function startOfDay(offset) {
  const date = new Date(2026, 9, 14);
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date;
}

const DAYS = [
  startOfDay(0),
  startOfDay(1),
  startOfDay(2),
  startOfDay(3),
  startOfDay(4),
  startOfDay(5),
  startOfDay(6),
];

function dayName(date, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
}

function clockToDate(day, time) {
  if (!day || !time) return null;
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const out = new Date(day.getTime());
  out.setHours(hours, minutes, 0, 0);
  return out;
}

function spanLabel(start, end) {
  if (!start || !end) return '';
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const diffMins = Math.max(15, Math.round(diffMs / (1000 * 60)));
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  const days = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  if (days === 0) {
    if (remMins === 0) return `${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    if (diffHours === 0) return `${remMins} mins`;
    return `${diffHours}h ${remMins}m`;
  }
  if (remHours === 0 && remMins === 0) return `${days} ${days === 1 ? 'day' : 'days'}`;
  if (remMins === 0) return `${days}d ${remHours}h`;
  return `${days}d ${remHours}h ${remMins}m`;
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
    const key = `${name.toLowerCase()}_${dur}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        label: name,
        sub: `${dur} day${dur > 1 ? 's' : ''}`,
        days: dur,
        price: pkg.price,
        deposit: pkg.deposit,
      });
    }
  });

  return Array.from(map.values());
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ['00', '15', '30', '45'];
const CLOCK_SIZE = 240;

function parseClock(value) {
  if (!value) return { hour: 8, minute: '00', meridiem: 'AM' };
  const match = value.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return { hour: 8, minute: '00', meridiem: 'AM' };
  return {
    hour: parseInt(match[1], 10) || 8,
    minute: match[2] || '00',
    meridiem: match[3].toUpperCase() === 'PM' ? 'PM' : 'AM',
  };
}

function formatClock(hour, minute, meridiem) {
  return `${hour}:${minute} ${meridiem}`;
}

function ringSpot(index, count, radius) {
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
  return {
    left: radius + radius * Math.cos(angle) - 18,
    top: radius + radius * Math.sin(angle) - 18,
  };
}

const CAL_ANCHOR = new Date();

function monthCells(cursor) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const total = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const cells = [];
  for (let i = 0; i < lead; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= total; day += 1) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

function dayInWindow(day) {
  if (!day) return false;
  const start = new Date(CAL_ANCHOR.getFullYear(), CAL_ANCHOR.getMonth(), CAL_ANCHOR.getDate());
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 90);
  return day.getTime() >= start.getTime() && day.getTime() <= end.getTime();
}

function rangeCaption(start, end) {
  if (!start) return 'Select trip dates';
  const sText = start.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
  if (!end) return `${sText} (Pick drop date)`;
  const eText = end.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
  return `${sText}  ${eText}`;
}

function missingStep({
  pickupZone,
  dropPlace,
  pickupDay,
  pickupTime,
  dropDay,
  dropTime,
}) {
  if (!pickupZone) return 'Choose pickup Zone';
  if (!dropPlace) return 'Choose drop Zone';
  if (!pickupDay) return 'Choose pickup date';
  if (!pickupTime) return 'Choose pickup time';
  if (!dropDay) return 'Choose drop date';
  if (!dropTime) return 'Choose drop time';
  return null;
}

// ============================================================================
// MERGE SLIDE COMPONENT (MULTI-LAYER PARALLAX: FIXED BG, MOVING COPY & FRONT)
// ============================================================================
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
            [-SLIDE_WIDTH * 0.22, 0, SLIDE_WIDTH * 0.22],
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
      {/* LAYER 1 & 2: Background Image + White Gradient Overlay */}
      {/* Keeping LinearGradient inside slideBgWrap ensures inactive slides' gradients hide when opacity is 0 */}
      <Animated.View style={[styles.slideBgWrap, bgStyle]}>
        <Image source={bgSource} style={styles.slideImage} contentFit="cover" />
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.72)',
            'rgba(255, 255, 255, 0.50)',
            'rgba(255, 255, 255, 0.20)',
            'rgba(255, 255, 255, 0.0)',
          ]}
          locations={[0, 0.28, 0.55, 0.82]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          style={styles.slideOverlayGradient}
        />
      </Animated.View>

      {/* LAYER 3: Foreground Cutout Image (Scooter & Rider) */}
      {slide.front ? (
        <Animated.View
          style={[
            styles.slideFrontWrap,
            {
              width: slide.frontWidth,
              height: slide.frontHeight,
              right: slide.frontRight ?? 0,
              bottom: slide.frontBottom ?? 10,
            },
            frontStyle,
          ]}
        >
          <Image source={frontSource} style={styles.slideFrontImage} contentFit="contain" />
        </Animated.View>
      ) : null}

      {/* LAYER 4: Text Lines, Tag, Subtext & CTA Button (Strictly on top of everything) */}
      <Animated.View style={[styles.slideCopyWrap, copyStyle]}>
        <View style={styles.slideHeadlineBlock}>
          {slide.tag ? (
            <View style={styles.slideTagPill}>
              <View style={styles.slideAccentDot} />
              <Text style={styles.slideTagText}>{slide.tag}</Text>
            </View>
          ) : (
            <View style={styles.slideAccentVector}>
              <View style={styles.slideAccentDot} />
              <View style={styles.slideAccentLine} />
            </View>
          )}

          {slide.lines?.map((line) => (
            <Text key={line} style={styles.slideHeadlineText}>
              {line}
            </Text>
          ))}

          {slide.sub ? (
            <View style={styles.slideSubBlock}>
              <Text style={styles.slideSubText}>{slide.sub}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.slideCtaBtn}>
          <Text style={styles.slideCtaText}>{slide.cta || 'Rent EV'}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
// ============================================================================
// POPUP SHELL & PICKERS (DATE, TIME, ETC.)
// ============================================================================
function PopupShell({ blurTarget, onClose, children }) {
  const opacity = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const cardTranslateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 240, easing: EASE });
    cardScale.value = withSpring(1, { damping: 20, stiffness: 260 });
    cardTranslateY.value = withSpring(0, { damping: 20, stiffness: 260 });
  }, [cardScale, cardTranslateY, opacity]);

  const requestClose = useCallback(() => {
    opacity.value = withTiming(0, { duration: 180, easing: EASE });
    cardScale.value = withTiming(0.94, { duration: 180, easing: EASE });
    cardTranslateY.value = withTiming(18, { duration: 180, easing: EASE }, (done) => {
      if (done && onClose) runOnJS(onClose)();
    });
  }, [cardScale, cardTranslateY, onClose, opacity]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { translateY: cardTranslateY.value }],
  }));

  return (
    <View style={styles.popupRoot}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.popupBackdrop, backdropStyle]}
      >
        <BlurView
          intensity={40}
          tint="dark"
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={requestClose} />
      </Animated.View>
      <Animated.View style={[styles.popupCard, cardStyle]}>
        {typeof children === 'function' ? children(requestClose) : children}
      </Animated.View>
    </View>
  );
}

function ClockPopup({ blurTarget, time, title, operatingHours, onClose, onConfirm }) {
  const opHours = useMemo(() => parseOperatingHours(operatingHours), [operatingHours]);
  const initial = useMemo(() => {
    const p = parseClockString(time);
    return clampTimeToOperatingHours(p.hour, p.minute, p.meridiem, opHours);
  }, [time, opHours]);

  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [meridiem, setMeridiem] = useState(initial.meridiem);
  const [mode, setMode] = useState('hour'); // 'hour' | 'minute'

  const amAllowed = useMemo(
    () => opHours.is24Hours || getValidHoursForMeridiem('AM', opHours).length > 0,
    [opHours]
  );
  const pmAllowed = useMemo(
    () => opHours.is24Hours || getValidHoursForMeridiem('PM', opHours).length > 0,
    [opHours]
  );

  const handleSelectHour = (h) => {
    setHour(h);
    setMode('minute');
  };

  const handleSelectMinute = (m) => {
    setMinute(m);
  };

  const handleSwitchMeridiem = (nextMer) => {
    if (nextMer === meridiem) return;
    const clamped = clampTimeToOperatingHours(hour, minute, nextMer, opHours);
    setHour(clamped.hour);
    setMinute(clamped.minute);
    setMeridiem(clamped.meridiem);
  };

  const adjustMinute = (delta) => {
    const cur = parseInt(minute, 10) || 0;
    let next = (cur + delta + 60) % 60;
    const h24 = (hour % 12) + (meridiem === 'PM' ? 12 : 0);
    if (!opHours.is24Hours && h24 === opHours.closeHour && opHours.closeMinute != null && next > opHours.closeMinute) {
      next = opHours.closeMinute;
    } else if (!opHours.is24Hours && h24 === opHours.openHour && opHours.openMinute != null && next < opHours.openMinute) {
      next = opHours.openMinute;
    }
    setMinute(String(next).padStart(2, '0'));
    setMode('minute');
  };

  return (
    <PopupShell blurTarget={blurTarget} onClose={onClose}>
      {(requestClose) => (
        <>
          <Text style={styles.popupTitle}>{title}</Text>
          <Text style={styles.popupHint}>
            {mode === 'hour' ? 'Tap an operational hour' : 'Tap or drag any minute (00–59)'}
          </Text>

          {/* Zone Operating Hours Banner */}
          <View style={styles.clockZoneHoursBanner}>
            <View style={styles.clockZoneHoursIconWrap}>
              <Ionicons name="time" size={11} color={BRAND_PURPLE_ACCENT} />
            </View>
            <Text style={styles.clockZoneHoursLabelText} numberOfLines={1}>
              {opHours.is24Hours ? '24/7 Operational Hub' : `Zone Hours: ${opHours.label}`}
            </Text>
            <View style={[styles.clockZoneHoursStatusDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.clockZoneHoursStatusText}>Open</Text>
          </View>

          {/* Digital Time & Mode Switcher Display */}
          <View style={styles.clockDigitalHeader}>
            <View style={styles.clockDigitsWrap}>
              <Pressable
                onPress={() => setMode('hour')}
                style={[styles.clockDigitBox, mode === 'hour' && styles.clockDigitBoxActive]}
              >
                <Text style={[styles.clockDigitNum, mode === 'hour' && styles.clockDigitNumActive]}>
                  {String(hour).padStart(2, '0')}
                </Text>
                <Text style={[styles.clockDigitSub, mode === 'hour' && styles.clockDigitSubActive]}>
                  HOURS
                </Text>
              </Pressable>

              <Text style={styles.clockColonText}>:</Text>

              <Pressable
                onPress={() => setMode('minute')}
                style={[styles.clockDigitBox, mode === 'minute' && styles.clockDigitBoxActive]}
              >
                <Text style={[styles.clockDigitNum, mode === 'minute' && styles.clockDigitNumActive]}>
                  {String(minute).padStart(2, '0')}
                </Text>
                <Text style={[styles.clockDigitSub, mode === 'minute' && styles.clockDigitSubActive]}>
                  MINUTES
                </Text>
              </Pressable>

              <View style={styles.minuteStepperCol}>
                <Pressable
                  hitSlop={6}
                  onPress={() => adjustMinute(1)}
                  style={styles.stepBtn}
                >
                  <Ionicons name="chevron-up" size={13} color={BRAND_PURPLE_ACCENT} />
                </Pressable>
                <Pressable
                  hitSlop={6}
                  onPress={() => adjustMinute(-1)}
                  style={styles.stepBtn}
                >
                  <Ionicons name="chevron-down" size={13} color={BRAND_PURPLE_ACCENT} />
                </Pressable>
              </View>
            </View>

            <View style={styles.clockMeridiemWrap}>
              {(['AM', 'PM']).map((m) => {
                const on = meridiem === m;
                const allowed = m === 'AM' ? amAllowed : pmAllowed;
                return (
                  <Pressable
                    key={m}
                    disabled={!allowed}
                    style={[
                      styles.clockMeridiemPill,
                      on && styles.clockMeridiemPillActive,
                      !allowed && { opacity: 0.3 },
                    ]}
                    onPress={() => allowed && handleSwitchMeridiem(m)}
                  >
                    <Text
                      style={[
                        styles.clockMeridiemText,
                        on && styles.clockMeridiemTextActive,
                        !allowed && { color: '#9CA3AF' },
                      ]}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Analog Clock Dial (with 60-minute selection & zone operational hours constraint) */}
          <AnalogClockDial
            mode={mode}
            hour={hour}
            minute={minute}
            meridiem={meridiem}
            operatingHours={operatingHours}
            onSelectHour={handleSelectHour}
            onSelectMinute={handleSelectMinute}
          />

          <View style={styles.popupActions}>
            <Pressable style={styles.popupCancel} onPress={requestClose}>
              <Text style={styles.popupCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.popupSet}
              onPress={() => {
                const clamped = clampTimeToOperatingHours(hour, minute, meridiem, opHours);
                onConfirm(formatClockString(clamped.hour, clamped.minute, clamped.meridiem));
                requestClose();
              }}
            >
              <Text style={styles.popupSetText}>Confirm Time</Text>
            </Pressable>
          </View>
        </>
      )}
    </PopupShell>
  );
}

function DatePopup({
  blurTarget,
  pickupDay,
  dropDay,
  packageId: initialPkgId = 'daily',
  packageOptions = [],
  isHourlyZone = false,
  hourlyInfo = null,
  onClose,
  onConfirm,
}) {
  const [cursor, setCursor] = useState(() => (pickupDay ? new Date(pickupDay) : new Date(CAL_ANCHOR)));
  const [draftStart, setDraftStart] = useState(() => (pickupDay ? new Date(pickupDay) : new Date(CAL_ANCHOR)));
  const [draftEnd, setDraftEnd] = useState(() => {
    if (dropDay) return new Date(dropDay);
    const d = new Date(CAL_ANCHOR);
    if (isHourlyZone) return d;
    const currentPkg = packageOptions.find((p) => p.id === initialPkgId) || packageOptions[0];
    const daysToAdd = currentPkg?.days || 1;
    d.setDate(d.getDate() + daysToAdd);
    return d;
  });
  const [packageId, setPackageId] = useState(() => {
    if (isHourlyZone) return 'hourly';
    if (packageOptions.some((p) => p.id === initialPkgId)) return initialPkgId;
    return packageOptions[0]?.id || 'daily';
  });

  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const monthTitle = cursor.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const prevAllowed =
    cursor.getFullYear() > CAL_ANCHOR.getFullYear() ||
    (cursor.getFullYear() === CAL_ANCHOR.getFullYear() && cursor.getMonth() > CAL_ANCHOR.getMonth());

  const nextAllowed = (() => {
    const maxDate = new Date(CAL_ANCHOR);
    maxDate.setDate(maxDate.getDate() + 90);
    return cursor.getTime() < maxDate.getTime();
  })();

  const handleSelectPackage = (pkgId) => {
    setPackageId(pkgId);
    const pkg = packageOptions.find((p) => p.id === pkgId);
    if (pkg && pkg.days) {
      const base = draftStart || new Date(CAL_ANCHOR);
      setDraftStart(base);
      const autoEnd = new Date(base);
      autoEnd.setDate(autoEnd.getDate() + pkg.days);
      setDraftEnd(autoEnd);
    }
  };

  const handlePick = (day) => {
    if (isHourlyZone) {
      // In hourly zone, tapping sets same-day rental by default or toggles
      if (!draftStart || (draftStart && draftEnd && draftStart.getTime() !== draftEnd.getTime())) {
        setDraftStart(day);
        setDraftEnd(day);
        return;
      }
      if (day.getTime() < draftStart.getTime()) {
        setDraftStart(day);
        setDraftEnd(day);
        return;
      }
      setDraftEnd(day);
      return;
    }

    const pkg = packageOptions.find((p) => p.id === packageId);
    if (pkg && pkg.days) {
      setDraftStart(day);
      const autoEnd = new Date(day);
      autoEnd.setDate(autoEnd.getDate() + pkg.days);
      setDraftEnd(autoEnd);
      return;
    }
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(day);
      setDraftEnd(null);
      return;
    }
    if (day.getTime() < draftStart.getTime()) {
      setDraftStart(day);
      setDraftEnd(null);
      return;
    }
    setDraftEnd(day);
  };

  const isSameDayHourly = isHourlyZone && draftStart && draftEnd && draftStart.getTime() === draftEnd.getTime();

  return (
    <PopupShell blurTarget={blurTarget} onClose={onClose}>
      {(requestClose) => (
        <>
          <Text style={styles.popupTitle}>Select Trip Dates</Text>
          <Text style={styles.popupHint}>
            {isSameDayHourly
              ? `${draftStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (Same Day Hourly Ride)`
              : rangeCaption(draftStart, draftEnd)}
          </Text>

          {/* If zone is Hourly Based: REMOVE ALL PACKAGES and show hourly info banner */}
          {isHourlyZone ? (
            <View style={styles.hourlyRentalBanner}>
              <View style={styles.hourlyRentalBadge}>
                <Ionicons name="time-outline" size={12} color="#FFFFFF" />
                <Text style={styles.hourlyRentalBadgeText}>HOURLY / MINUTE RENTAL</Text>
              </View>
              <Text style={styles.hourlyRentalDescText}>
                {hourlyInfo?.summary || 'Flexible Hourly / Minute Booking • Pay as you ride'}
              </Text>
            </View>
          ) : packageOptions.length > 0 ? (
            /* Otherwise show ONLY available packages from the backend */
            <View style={styles.rentPkgRow}>
              {packageOptions.map((pkg) => {
                const isSelected = packageId === pkg.id;
                return (
                  <Pressable
                    key={pkg.id}
                    onPress={() => handleSelectPackage(pkg.id)}
                    style={[
                      styles.rentPkgChip,
                      isSelected && styles.rentPkgChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rentPkgChipLabel,
                        isSelected && styles.rentPkgChipLabelActive,
                      ]}
                    >
                      {pkg.label}
                    </Text>
                    <Text
                      style={[
                        styles.rentPkgChipSub,
                        isSelected && styles.rentPkgChipSubActive,
                      ]}
                    >
                      {pkg.sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.monthRow}>
            <Pressable
              disabled={!prevAllowed}
              style={[styles.monthBtn, !prevAllowed && styles.monthBtnOff]}
              onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <Ionicons name="chevron-back" size={18} color="#1C1C1C" />
            </Pressable>
            <Text style={styles.monthLabel}>{monthTitle}</Text>
            <Pressable
              disabled={!nextAllowed}
              style={[styles.monthBtn, !nextAllowed && styles.monthBtnOff]}
              onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color="#1C1C1C" />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, index) => (
              <Text key={index} style={styles.weekText}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.calGrid}>
            {cells.map((day, index) => {
              if (!day) return <View key={index} style={styles.calCell} />;
              const allowed = dayInWindow(day);
              const isStart = draftStart && day.getTime() === draftStart.getTime();
              const isEnd = draftEnd && day.getTime() === draftEnd.getTime();
              const isMid =
                draftStart &&
                draftEnd &&
                day.getTime() > draftStart.getTime() &&
                day.getTime() < draftEnd.getTime();

              return (
                <View key={index} style={styles.calCell}>
                  {isMid && <View style={[styles.calBand, styles.calBandMid]} />}
                  {isStart && draftEnd && <View style={[styles.calBand, styles.calBandStart]} />}
                  {isEnd && <View style={[styles.calBand, styles.calBandEnd]} />}
                  <Pressable
                    disabled={!allowed}
                    style={[
                      styles.calDay,
                      (isStart || isEnd) && styles.calDayOn,
                    ]}
                    onPress={() => handlePick(day)}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        !allowed && styles.calDayOff,
                        isMid && styles.calDayBetween,
                        (isStart || isEnd) && styles.calDayTextOn,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.popupActions}>
            <Pressable style={styles.popupCancel} onPress={requestClose}>
              <Text style={styles.popupCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!draftStart || !draftEnd}
              style={[styles.popupSet, (!draftStart || !draftEnd) && styles.popupSetOff]}
              onPress={() => {
                onConfirm(draftStart, draftEnd, packageId);
                requestClose();
              }}
            >
              <Text style={styles.popupSetText}>Confirm Dates</Text>
            </Pressable>
          </View>
        </>
      )}
    </PopupShell>
  );
}

// ============================================================================
// MAIN RENT SCREEN
// ============================================================================
export default function RentScreen({
  vehicle,
  selectedZone,
  onBack,
  onContinue,
}) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Caveat_400Regular,
    Caveat_600SemiBold,
    Caveat_700Bold,
  });
  const blurTargetRef = useRef(null);
  const listRef = useRef(null);

  // Hidden video player for animation marker tracking
  const player = useVideoPlayer(INTRO_VIDEO, (video) => {
    video.loop = false;
    video.muted = true;
    video.playbackRate = GLIDE_RATE;
    video.timeUpdateEventInterval = 0.05;
    video.currentTime = 0;
    video.pause();
  });
  const targetRef = useRef(0);
  const movingRef = useRef(false);
  const stepRef = useRef(0);
  const settledStepRef = useRef(-1);

  const now = new Date();
  const nowH24 = now.getHours();
  const nowH12 = nowH24 % 12 === 0 ? 12 : nowH24 % 12;
  const nowMin = String(now.getMinutes()).padStart(2, '0');
  const nowMer = nowH24 >= 12 ? 'PM' : 'AM';
  const nowTimeStr = `${String(nowH12).padStart(2, '0')}:${nowMin} ${nowMer}`;

  // Booking Parameters
  const availableZones = EVEGAH_ZONES?.length ? EVEGAH_ZONES : ZONES;
  const [sameDrop, setSameDrop] = useState(true);
  const [pickupZone, setPickupZone] = useState(() => selectedZone || null);
  const [dropZone, setDropZone] = useState(() => selectedZone || null);
  const [pickupDay, setPickupDay] = useState(() => startOfDay(0));
  const [dropDay, setDropDay] = useState(() => startOfDay(1));
  const [pickupTime, setPickupTime] = useState(nowTimeStr);
  const [dropTime, setDropTime] = useState(nowTimeStr);
  const [rentPackageId, setRentPackageId] = useState('daily');
  const [deliveryAnywhere, setDeliveryAnywhere] = useState(false);

  // Live Backend Zones and Pricing Connection
  const [backendZones, setBackendZones] = useState([]);

  useEffect(() => {
    let mounted = true;
    apiGet('/zones', { forceRefresh: true })
      .then((res) => {
        if (!mounted) return;
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          setBackendZones(list);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const activeZoneData = useMemo(() => {
    const target = pickupZone || selectedZone;
    if (!target) return backendZones[0] || null;
    const targetId = String(target.id || '').toLowerCase();
    const targetName = (target.name || target.shortName || '').toLowerCase().trim();
    return (
      backendZones.find(
        (z) =>
          String(z.id).toLowerCase() === targetId ||
          (z.name && z.name.toLowerCase().trim() === targetName) ||
          (z.locality && z.locality.toLowerCase().trim() === targetName) ||
          (targetName && z.name && z.name.toLowerCase().includes(targetName)) ||
          (targetName && z.locality && targetName.includes(z.locality.toLowerCase()))
      ) || target
    );
  }, [backendZones, pickupZone, selectedZone]);

  const isHourlyZone = useMemo(() => {
    const pricing = activeZoneData?.pricing;
    if (!pricing) return false;
    const model = (pricing.pricingModel || '').toLowerCase();
    const hasHourly =
      (Array.isArray(pricing.hourlyPricing) && pricing.hourlyPricing.length > 0) ||
      (pricing.basePrice !== null && pricing.basePrice !== undefined && pricing.basePrice > 0);
    const hasPackages = Array.isArray(pricing.packages) && pricing.packages.length > 0;
    return model.includes('hour') || model.includes('minute') || (hasHourly && !hasPackages);
  }, [activeZoneData]);

  const hourlyInfo = useMemo(() => {
    if (!isHourlyZone) return null;
    const pricing = activeZoneData?.pricing;
    const hp = Array.isArray(pricing?.hourlyPricing) && pricing.hourlyPricing[0];
    const base = hp?.basePrice || pricing?.basePrice || 5;
    const extra = hp?.extraPrice || pricing?.extraPrice || 10;
    const rule = hp?.roundingRule || 'Per 15 Minutes';
    return {
      basePrice: base,
      extraPrice: extra,
      rule,
      summary: `₹${base}/hr base • ₹${extra} ${rule}`,
    };
  }, [isHourlyZone, activeZoneData]);

  const zonePackageOptions = useMemo(() => {
    if (isHourlyZone) return [];
    return extractZonePackages(activeZoneData);
  }, [isHourlyZone, activeZoneData]);

  // Synchronize package selection and default dates
  useEffect(() => {
    if (isHourlyZone) {
      setRentPackageId('hourly');
      if (pickupDay) {
        setDropDay(new Date(pickupDay));
      }
    } else if (zonePackageOptions.length > 0) {
      const exists = zonePackageOptions.some((p) => p.id === rentPackageId);
      if (!exists) {
        const firstPkg = zonePackageOptions[0];
        setRentPackageId(firstPkg.id);
        if (pickupDay && firstPkg.days) {
          const autoEnd = new Date(pickupDay);
          autoEnd.setDate(autoEnd.getDate() + firstPkg.days);
          setDropDay(autoEnd);
        }
      }
    }
  }, [isHourlyZone, zonePackageOptions]);

  // Location selection modal (replaces popup)
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationFor, setLocationFor] = useState('pickup'); // 'pickup' | 'drop'

  // Clock & Date popups
  const [clockFor, setClockFor] = useState(null);
  const [dateFor, setDateFor] = useState(null);

  // Enforce zone operating hours constraint when zones change
  useEffect(() => {
    const activePickupZone = pickupZone || selectedZone;
    const pOp = parseOperatingHours(
      activePickupZone?.hours ||
      (activePickupZone?.open_time && `${activePickupZone.open_time} - ${activePickupZone.close_time}`) ||
      '06:00 – 23:00'
    );
    if (!pOp.is24Hours) {
      const parsed = parseClockString(pickupTime);
      const clamped = clampTimeToOperatingHours(parsed.hour, parsed.minute, parsed.meridiem, pOp);
      const nextStr = formatClockString(clamped.hour, clamped.minute, clamped.meridiem);
      if (nextStr !== pickupTime) {
        setPickupTime(nextStr);
      }
    }

    const activeDropZone = (sameDrop ? pickupZone : dropZone) || selectedZone;
    const dOp = parseOperatingHours(
      activeDropZone?.hours ||
      (activeDropZone?.open_time && `${activeDropZone.open_time} - ${activeDropZone.close_time}`) ||
      '06:00 – 23:00'
    );
    if (!dOp.is24Hours) {
      const parsed = parseClockString(dropTime);
      const clamped = clampTimeToOperatingHours(parsed.hour, parsed.minute, parsed.meridiem, dOp);
      const nextStr = formatClockString(clamped.hour, clamped.minute, clamped.meridiem);
      if (nextStr !== dropTime) {
        setDropTime(nextStr);
      }
    }
  }, [pickupZone, dropZone, sameDrop, selectedZone]);

  // CTA Scooter Animation
  const [riding, setRiding] = useState(false);
  const buttonWidthRef = useRef(SCREEN_W - 32);
  const btnScale = useSharedValue(1);
  const textShift = useSharedValue(0);
  const textFade = useSharedValue(1);
  const arrowShift = useSharedValue(0);
  const lineShift = useSharedValue(40);
  const scooterX = useSharedValue(-RIDE_GROUP_WIDTH);

  // Full Screen Slider (Auto-mode & Loop, Multi-layer parallax)
  const [sliderList, setSliderList] = useState(RENT_SLIDES);
  const sliderLoop = useMemo(() => [...sliderList, sliderList[0]], [sliderList]);
  const slideScrollRef = useRef(null);
  const slidePageRef = useRef(0);
  const slideTimerRef = useRef(null);
  const slideScrollX = useSharedValue(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Dynamic Slider Fetch from Backend
  useEffect(() => {
    let mounted = true;
    apiGet('/app-sliders')
      .then((res) => {
        if (!mounted) return;
        const raw = res?.data?.rent_sliders || res?.data?.rent || [];
        const active = raw.filter((s) => s.active !== false);
        if (active.length > 0) {
          const mapped = active.map((s, idx) => {
            const fallback = RENT_SLIDES[idx % RENT_SLIDES.length];
            return {
              id: s.id || `rent-${idx}`,
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
              sub: s.sub || fallback.sub,
              cta: s.cta || fallback.cta,
            };
          });
          setSliderList(mapped);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const onSlideScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      slideScrollX.value = event.contentOffset.x;
    },
  });

  const syncNativeSlideScroll = (targetPage) => {
    if (targetPage >= sliderList.length) {
      slidePageRef.current = 0;
      slideScrollX.value = 0;
      slideScrollRef.current?.scrollTo({ x: 0, animated: false });
      setActiveSlideIndex(0);
    } else {
      slidePageRef.current = targetPage;
      slideScrollRef.current?.scrollTo({ x: targetPage * SLIDE_WIDTH, animated: false });
      setActiveSlideIndex(targetPage);
    }
  };

  const stopAutoSlide = () => {
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    slideTimerRef.current = null;
  };

  const startAutoSlide = () => {
    stopAutoSlide();
    slideTimerRef.current = setInterval(() => {
      const next = slidePageRef.current + 1;
      slideScrollX.value = withTiming(
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
    }, 4200);
  };

  useEffect(() => {
    startAutoSlide();
    return stopAutoSlide;
  }, []);

  // Toast System
  const [toastMessage, setToastMessage] = useState(null);
  const [toastTick, setToastTick] = useState(0);
  const toastTimerRef = useRef(null);
  const toastHidingRef = useRef(false);
  const toastOpacity = useSharedValue(0);
  const toastTranslateY = useSharedValue(TOAST_OFFSCREEN_Y);
  const toastScale = useSharedValue(0.96);

  const dropPlace = sameDrop ? pickupZone : dropZone;
  const pickupAt = clockToDate(pickupDay, pickupTime);
  const dropAt = clockToDate(dropDay, dropTime);
  const duration = pickupAt && dropAt ? spanLabel(pickupAt, dropAt) : '';
  const showDuration = Boolean(
    pickupZone &&
      dropPlace &&
      pickupDay &&
      pickupTime &&
      dropDay &&
      dropTime &&
      duration
  );
  const ready = showDuration;

  const step = [
    pickupZone,
    dropPlace,
    pickupDay,
    pickupTime,
    dropDay,
    dropTime,
  ].filter(Boolean).length;
  stepRef.current = step;

  const pickupDayIndex = pickupDay
    ? DAYS.findIndex((item) => item.getTime() === pickupDay.getTime())
    : -1;
  const dropDayIndex = dropDay
    ? DAYS.findIndex((item) => item.getTime() === dropDay.getTime())
    : -1;

  const markSettled = () => {
    settledStepRef.current = stepRef.current;
    movingRef.current = false;
    player.pause();
  };

  useEffect(() => {
    const target = VIDEO_MARKS[Math.min(step, VIDEO_MARKS.length - 1)];
    targetRef.current = target;
    const now = player.currentTime || 0;
    if (target <= now + 0.05) {
      markSettled();
      return;
    }
    if (movingRef.current && player.playing) return;
    movingRef.current = true;
    player.playbackRate = GLIDE_RATE;
    player.play();
  }, [player, step]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!movingRef.current) return;
    if (currentTime + 0.05 < targetRef.current) return;
    markSettled();
  });

  const finishHideToast = useCallback(() => {
    toastHidingRef.current = false;
    setToastMessage(null);
  }, []);

  const hideToast = useCallback(() => {
    if (toastHidingRef.current) return;
    toastHidingRef.current = true;
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    cancelAnimation(toastOpacity);
    cancelAnimation(toastTranslateY);
    cancelAnimation(toastScale);
    toastOpacity.value = withTiming(0, { duration: 360, easing: TOAST_EASE_IN });
    toastScale.value = withTiming(0.97, { duration: TOAST_EXIT_MS, easing: TOAST_EASE_IN });
    toastTranslateY.value = withTiming(
      TOAST_OFFSCREEN_Y,
      { duration: TOAST_EXIT_MS, easing: TOAST_EASE_IN },
      (finished) => {
        if (finished) runOnJS(finishHideToast)();
      }
    );
  }, [finishHideToast, toastOpacity, toastScale, toastTranslateY]);

  const showToast = useCallback(
    (message) => {
      if (!message) return;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastHidingRef.current = false;
      setToastMessage(message);
      setToastTick((tick) => tick + 1);
      toastTimerRef.current = setTimeout(hideToast, TOAST_VISIBLE_MS);
    },
    [hideToast]
  );

  useEffect(() => {
    if (!toastMessage) return;
    cancelAnimation(toastOpacity);
    cancelAnimation(toastTranslateY);
    cancelAnimation(toastScale);
    toastOpacity.value = 0;
    toastTranslateY.value = TOAST_OFFSCREEN_Y;
    toastScale.value = 0.94;
    toastOpacity.value = withTiming(1, { duration: TOAST_ENTER_MS, easing: EASE });
    toastScale.value = withSpring(1, { damping: 18, stiffness: 240, reduceMotion: ReduceMotion.Never });
    toastTranslateY.value = withSpring(0, { damping: 18, stiffness: 220, reduceMotion: ReduceMotion.Never });
  }, [toastMessage, toastOpacity, toastScale, toastTick, toastTranslateY]);

  const toastAnimStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [{ translateY: toastTranslateY.value }, { scale: toastScale.value }],
  }));
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));
  const continueTextStyle = useAnimatedStyle(() => ({
    opacity: textFade.value,
    transform: [{ translateY: textShift.value }],
  }));
  const rideLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lineShift.value }],
  }));
  const scooterSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scooterX.value }],
  }));

  const finishRide = () => {
    setRiding(false);
    const chosenPkg = zonePackageOptions.find((p) => p.id === rentPackageId);
    onContinue?.({
      pickupName: pickupZone?.shortName || pickupZone?.name || 'Gotri',
      pickupZone,
      dropName: dropPlace?.shortName || dropPlace?.name || 'Gotri',
      dropZone: dropPlace,
      pickupAt: pickupAt?.getTime() || null,
      dropAt: dropAt?.getTime() || null,
      pickupDate: pickupDay,
      dropDate: dropDay,
      pickupTime,
      dropTime,
      packageId: isHourlyZone ? 'hourly' : rentPackageId,
      packageName: isHourlyZone
        ? 'Hourly / Minute Rental'
        : (chosenPkg?.label || 'Daily'),
      pricingModel: isHourlyZone ? 'Hourly Based' : 'Package Based',
      isHourlyZone: Boolean(isHourlyZone),
      durationDays: isHourlyZone ? 0 : (chosenPkg?.days || 1),
      durationText: duration,
      hourlyPricing: activeZoneData?.pricing?.hourlyPricing || null,
      hourlyInfo: isHourlyZone ? hourlyInfo : null,
      deliveryAnywhere: Boolean(deliveryAnywhere),
    });
  };

  const playContinueRide = () => {
    if (riding) return;
    setRiding(true);
    textShift.value = 0;
    textFade.value = 1;
    arrowShift.value = 0;
    lineShift.value = 40;
    textShift.value = withTiming(-46, { duration: 420, easing: Easing.out(Easing.cubic) });
    textFade.value = withTiming(0, { duration: 360 });
    arrowShift.value = withTiming(72, { duration: 480, easing: Easing.out(Easing.cubic) });
    lineShift.value = withDelay(500, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
    scooterX.value = -RIDE_GROUP_WIDTH;
    scooterX.value = withDelay(
      920,
      withTiming(
        buttonWidthRef.current,
        { duration: 2200, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (!finished) return;
          lineShift.value = withTiming(40, { duration: 420, easing: Easing.in(Easing.cubic) }, (roadDone) => {
            if (!roadDone) return;
            textShift.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
            textFade.value = withTiming(1, { duration: 360 });
            arrowShift.value = withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }, (backDone) => {
              if (backDone) runOnJS(finishRide)();
            });
          });
        }
      )
    );
  };

  const choosePickupTime = (time) => {
    setPickupTime(time);
    if (!isHourlyZone) {
      const pkg = zonePackageOptions.find((p) => p.id === rentPackageId);
      if (pkg && pkg.days) {
        setDropTime(time);
      }
    }
  };

  const chooseDropTime = (time) => {
    setDropTime(time);
  };

  const openClock = (which) => {
    if (!pickupZone) {
      showToast('Select pickup station');
      return;
    }
    if (!dropPlace) {
      showToast('Select drop station');
      return;
    }
    if (!pickupDay) {
      showToast('Select date');
      return;
    }
    if (which === 'drop') {
      if (!pickupTime) {
        showToast('Select time');
        return;
      }
      if (!dropDay) {
        showToast('Select drop date');
        return;
      }
    }
    setClockFor(which);
  };

  const openDate = () => {
    if (!pickupZone) {
      showToast('Select pickup station');
      return;
    }
    if (!dropPlace) {
      showToast('Select drop station');
      return;
    }
    setDateFor('range');
  };

  return (
    <View style={styles.root}>
      <BlurTargetView ref={blurTargetRef} collapsable={false} style={styles.blurTarget}>
        <StatusBar style="light" />

        {/* ====================================================================
            HOMESCREEN MULTI-LAYER HERO SLIDER (AUTO-LOOP, FIXED BG, PARALLAX ART)
        ==================================================================== */}
        <View style={styles.sliderContainer}>
          {sliderLoop.map((slide, index) => (
            <MergeSlide key={index} index={index} slide={slide} scrollX={slideScrollX} />
          ))}

          {/* Swipe Touch Overlay */}
          <Animated.ScrollView
            ref={slideScrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onSlideScroll}
            onScrollBeginDrag={() => {
              stopAutoSlide();
            }}
            onMomentumScrollEnd={(event) => {
              const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
              const page = Math.round(offsetX / SLIDE_WIDTH);
              if (page >= sliderList.length) {
                slidePageRef.current = 0;
                slideScrollX.value = 0;
                slideScrollRef.current?.scrollTo({ x: 0, animated: false });
                setActiveSlideIndex(0);
              } else {
                slidePageRef.current = page;
                slideScrollX.value = page * SLIDE_WIDTH;
                setActiveSlideIndex(page);
              }
              startAutoSlide();
            }}
            style={styles.sliderTouch}
          >
            {sliderLoop.map((_, index) => (
              <View key={index} style={styles.slideSpacer} />
            ))}
          </Animated.ScrollView>

          {/* Top Bar Floating Over Slider */}
          <View style={[styles.sliderHeaderOverlay, { paddingTop: insets.top + 10 }]}>
            <View style={styles.sliderHeaderTopRow}>
              <Pressable
                hitSlop={10}
                style={styles.sliderBackBtn}
                onPress={onBack}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </Pressable>
            </View>
          </View>

          {/* Slider Pagination Dots */}
          <View style={styles.sliderDotsOverlay}>
            {sliderList.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.sliderDot,
                  activeSlideIndex === i && styles.sliderDotActive,
                ]}
              />
            ))}
          </View>

       

          {/* Hidden 0x0 VideoView for animation state tracking */}
          <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <VideoView
              player={player}
              style={{ width: 1, height: 1 }}
              nativeControls={false}
              allowsPictureInPicture={false}
              surfaceType="textureView"
            />
          </View>
        </View>

        {/* ====================================================================
            MAIN BOOKING CONFIGURATION SCROLLVIEW
        ==================================================================== */}
        <ScrollView
          ref={listRef}
          style={styles.formScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.formScrollContent,
            { paddingBottom: insets.bottom + 125 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. PICKUP & RETURN STATION CARD */}
          <Animated.View entering={cardEnter(0)} style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <View
                style={[
                  styles.sectionIconCircle,
                  { backgroundColor: '#F5F3FF' },
                ]}
              >
                <Ionicons name="location" size={17} color={BRAND_VIOLET} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeadText}>Station &amp; Zone</Text>
                <Text style={styles.sectionSubText}>
                  Choose your  EV pickup &amp; Drop Zone
                </Text>
              </View>
            </View>

            {/* Connected Pickup / Drop Station Selector Box */}
            <View style={styles.routeBox}>
              <Pressable
                onPress={() => {
                  setLocationFor('pickup');
                  setLocationModalOpen(true);
                }}
                style={({ pressed }) => [
                  styles.stationSelectRow,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.stationNodeCol}>
                  <View style={styles.pickupDotOuter}>
                    <View style={styles.pickupDotInner} />
                  </View>
                  {!sameDrop && <View style={styles.stationConnectorLine} />}
                </View>

                <View style={styles.stationCopyCol}>
                  <Text style={styles.stationTagLabel}>PICKUP Zone</Text>
                  <Text style={styles.stationNameText} numberOfLines={1}>
                    {pickupZone?.name || 'Select a pickup zone'}
                  </Text>
                  <Text style={styles.stationAreaSub} numberOfLines={1}>
                    {pickupZone?.address ||
                      pickupZone?.area ||
                      'Evegah Verified Charging Station'}
                  </Text>
                </View>

                <View style={styles.changeStationPill}>
                  <Text style={styles.changeStationPillText}>Select</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={13}
                    color={BRAND_PURPLE_ACCENT}
                  />
                </View>
              </Pressable>

              {!sameDrop ? (
                <Animated.View entering={FadeIn.duration(240)}>
                  <View style={styles.stationDivider} />
                  <Pressable
                    onPress={() => {
                      setLocationFor('drop');
                      setLocationModalOpen(true);
                    }}
                    style={({ pressed }) => [
                      styles.stationSelectRow,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={styles.stationNodeCol}>
                      <View style={styles.dropSquareNode} />
                    </View>

                    <View style={styles.stationCopyCol}>
                      <Text
                        style={[styles.stationTagLabel, { color: '#DB2777' }]}
                      >
                        RETURN Zone
                      </Text>
                      <Text style={styles.stationNameText} numberOfLines={1}>
                        {dropZone?.name || 'Select drop station'}
                      </Text>
                      <Text style={styles.stationAreaSub} numberOfLines={1}>
                        {dropZone?.address ||
                          dropZone?.area ||
                          'Different return Zone'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.changeStationPill,
                        { backgroundColor: '#FDF2F8' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.changeStationPillText,
                          { color: '#DB2777' },
                        ]}
                      >
                        Select
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={13}
                        color="#DB2777"
                      />
                    </View>
                  </Pressable>
                </Animated.View>
              ) : null}
            </View>

            {/* Same Return Station Checkbox Row */}
            <Pressable
              onPress={() => {
                const next = !sameDrop;
                setSameDrop(next);
                if (next) setDropZone(pickupZone);
              }}
              style={styles.sameDropRow}
            >
              <View
                style={[
                  styles.toggleCheckbox,
                  sameDrop && styles.toggleCheckboxOn,
                ]}
              >
                {sameDrop ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : null}
              </View>
              <Text style={styles.sameDropLabel}>
                Return scooter to same pickup station
              </Text>
            </Pressable>
          </Animated.View>

          {/* 2. RIDE SCHEDULE (PICKUP & DROP TIMELINE) CARD */}
          <Animated.View entering={cardEnter(1)} style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <View
                style={[
                  styles.sectionIconCircle,
                  { backgroundColor: '#ECFDF5' },
                ]}
              >
                <Ionicons name="calendar" size={17} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeadText}>Trip Schedule</Text>
                <Text style={styles.sectionSubText}>
                  Choose pickup date, start hour &amp; return window
                </Text>
              </View>
            </View>

            {/* Zone Pricing Model Pill */}
            {isHourlyZone ? (
              <View style={styles.schedulePricingBanner}>
                <Ionicons name="time-outline" size={14} color="#6D28D9" />
                <Text style={styles.schedulePricingBannerText}>
                  Hourly / Minute Rental ({hourlyInfo?.summary || 'Flexible Duration'})
                </Text>
              </View>
            ) : zonePackageOptions.length > 0 ? (
              <View style={[styles.schedulePricingBanner, { backgroundColor: '#F3EEF8', borderColor: '#E9E4F0' }]}>
                <Ionicons name="cube-outline" size={14} color="#4A168C" />
                <Text style={[styles.schedulePricingBannerText, { color: '#4A168C' }]}>
                  {zonePackageOptions.find((p) => p.id === rentPackageId)?.label || 'Daily'} Package (
                  {zonePackageOptions.find((p) => p.id === rentPackageId)?.sub || '24 hrs'})
                </Text>
              </View>
            ) : null}

            {/* Pickup Schedule Row */}
            <Text style={styles.dtSubHeading}>START RIDE</Text>
            <View style={styles.dtRow}>
              <Pressable style={styles.dtBox} onPress={openDate}>
                <View style={styles.dtBoxInner}>
                  <Ionicons name="calendar-outline" size={17} color={BRAND_VIOLET} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dtBoxLabel}>PICKUP DATE</Text>
                    <Text style={styles.dtBoxValue} numberOfLines={1}>
                      {pickupDay
                        ? (pickupDayIndex >= 0
                            ? dayName(pickupDay, pickupDayIndex)
                            : pickupDay.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              }))
                        : 'Select Date'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </View>
              </Pressable>

              <Pressable style={styles.dtBox} onPress={() => openClock('pickup')}>
                <View style={styles.dtBoxInner}>
                  <Ionicons name="time-outline" size={17} color={BRAND_VIOLET} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dtBoxLabel}>TIME</Text>
                    <Text style={styles.dtBoxValue} numberOfLines={1}>
                      {pickupTime || 'Select Time'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </View>
              </Pressable>
            </View>

            {/* Center Duration Bridge Indicator */}
            <View style={styles.dtDividerRow}>
              <View style={styles.dtDividerLine} />
              <View style={styles.dtSpanPill}>
                <Ionicons name="timer-outline" size={13} color="#059669" />
                <Text style={styles.dtSpanText}>
                  {duration ? duration : 'Select Duration'}
                </Text>
              </View>
              <View style={styles.dtDividerLine} />
            </View>

            {/* Drop / Return Schedule Row */}
            <Text style={[styles.dtSubHeading, { color: '#059669' }]}>
              END RIDE
            </Text>
            <View style={styles.dtRow}>
              <Pressable style={styles.dtBox} onPress={openDate}>
                <View style={styles.dtBoxInner}>
                  <Ionicons name="calendar-outline" size={17} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dtBoxLabel}>RETURN DATE</Text>
                    <Text style={styles.dtBoxValue} numberOfLines={1}>
                      {dropDay
                        ? (dropDayIndex >= 0
                            ? dayName(dropDay, dropDayIndex)
                            : dropDay.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              }))
                        : 'Select Date'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </View>
              </Pressable>

              <Pressable style={styles.dtBox} onPress={() => openClock('drop')}>
                <View style={styles.dtBoxInner}>
                  <Ionicons name="time-outline" size={17} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dtBoxLabel}>TIME</Text>
                    <Text style={styles.dtBoxValue} numberOfLines={1}>
                      {dropTime || 'Select Time'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </View>
              </Pressable>
            </View>
          </Animated.View>

          {/* 3. DOORSTEP FLEXI DELIVERY & PICKUP CARD */}
          <Animated.View entering={cardEnter(2)} style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <View
                style={[
                  styles.sectionIconCircle,
                  { backgroundColor: '#FFFBEB' },
                ]}
              >
                <Ionicons name="bicycle" size={17} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeadText}>Delivery Anywhere</Text>
                <Text style={styles.sectionSubText}>
                  Doorstep scooter handover &amp; return collection
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setDeliveryAnywhere((v) => !v)}
              style={styles.deliveryOptionRow}
            >
              <View style={styles.deliveryOptionInfo}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={styles.deliveryOptionTitle}>
                    Doorstep Flexi Delivery &amp; Pickup
                  </Text>
                  <View style={styles.flexiTagPill}>
                    <Text style={styles.flexiTagText}>Optional</Text>
                  </View>
                </View>
                <Text style={styles.deliveryOptionSub}>
                  We deliver the sanitized EV to your doorstep &amp; collect it
                  when your trip ends
                </Text>
              </View>

              <View
                style={[
                  styles.toggleCheckbox,
                  deliveryAnywhere && styles.toggleCheckboxOn,
                ]}
              >
                {deliveryAnywhere ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : null}
              </View>
            </Pressable>
          </Animated.View>

         
         
        </ScrollView>

        {/* ====================================================================
            STICKY BOTTOM DOCK WITH ANIMATED SCOOTER CTA BUTTON (NO PRICES)
        ==================================================================== */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 14) },
          ]}
        >
          {!ready ? (
            <View style={styles.bottomHintRow}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color="#64748B"
              />
              <Text style={styles.bottomHintText}>
                {missingStep({
                  pickupZone,
                  dropPlace,
                  pickupDay,
                  pickupTime,
                  dropDay,
                  dropTime,
                }) || 'Complete your station & schedule details above'}
              </Text>
            </View>
          ) : null}

          <Pressable
            disabled={riding}
            onPress={() => {
              const missed = missingStep({
                pickupZone,
                dropPlace,
                pickupDay,
                pickupTime,
                dropDay,
                dropTime,
              });
              if (missed) {
                showToast(missed);
                return;
              }
              playContinueRide();
            }}
            onPressIn={() => {
              if (riding) return;
              btnScale.value = withSpring(0.97, {
                damping: 18,
                stiffness: 280,
              });
            }}
            onPressOut={() => {
              btnScale.value = withSpring(1, { damping: 14, stiffness: 220 });
            }}
          >
            <Animated.View
              onLayout={(event) => {
                buttonWidthRef.current = event.nativeEvent.layout.width;
              }}
              style={[styles.searchEvBtn, btnAnimStyle]}
            >
              <LinearGradient
                colors={['#5B21B6', '#3B0F7A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />

              <Animated.View
                style={[styles.ctaLabelRow, continueTextStyle]}
              >
                <Ionicons name="flash" size={17} color="#FDE047" />
                <Text style={styles.searchEvBtnText}>
                  Search Available EVs
                </Text>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </Animated.View>

              {riding ? (
                <>
                  <Animated.View
                    style={[styles.rideLine, rideLineStyle]}
                    pointerEvents="none"
                  >
                    {ROAD_DASHES.map((dash) => (
                      <View key={dash} style={styles.roadDash} />
                    ))}
                  </Animated.View>

                  <Animated.View
                    style={[styles.scooterWrap, scooterSlideStyle]}
                    pointerEvents="none"
                  >
                    <View style={styles.speedLines}>
                      <View style={[styles.speedDash, styles.speedDashLong]} />
                      <View style={[styles.speedDash, styles.speedDashMid]} />
                      <View style={[styles.speedDash, styles.speedDashShort]} />
                    </View>
                    <RNImage
                      source={require('../assets/login/evegah-scooter.png')}
                      style={styles.scooter}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </>
              ) : null}
            </Animated.View>
          </Pressable>
        </View>
      </BlurTargetView>

      {/* ====================================================================
          FULL SCREEN LOCATION SELECTION MODAL
      ==================================================================== */}
      <Modal
        visible={locationModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setLocationModalOpen(false)}
      >
        <LocationScreen
          onBack={() => setLocationModalOpen(false)}
          onSelectZone={(selectedZoneObj) => {
            const matched = availableZones.find((z) => z.id === selectedZoneObj.id) || selectedZoneObj;
            if (locationFor === 'drop') {
              setDropZone(matched);
            } else {
              setPickupZone(matched);
              if (sameDrop) setDropZone(matched);
            }
            setLocationModalOpen(false);
          }}
        />
      </Modal>

      {/* ====================================================================
          CLOCK POPUP MODAL (PICKUP & DROP TIME)
      ==================================================================== */}
      {clockFor ? (
        <ClockPopup
          blurTarget={blurTargetRef}
          title={clockFor === 'drop' ? 'Select Return Time' : 'Select Pickup Time'}
          time={clockFor === 'drop' ? dropTime : pickupTime}
          operatingHours={
            clockFor === 'drop'
              ? (dropPlace?.hours || (dropPlace?.open_time && `${dropPlace.open_time} - ${dropPlace.close_time}`) || '06:00 – 23:00')
              : (pickupZone?.hours || (pickupZone?.open_time && `${pickupZone.open_time} - ${pickupZone.close_time}`) || '06:00 – 23:00')
          }
          onClose={() => setClockFor(null)}
          onConfirm={(time) => {
            if (clockFor === 'drop') chooseDropTime(time);
            else choosePickupTime(time);
          }}
        />
      ) : null}

      {/* ====================================================================
          CALENDAR DATE PICKUP & DROP POPUP MODAL
      ==================================================================== */}
      {dateFor ? (
        <DatePopup
          blurTarget={blurTargetRef}
          pickupDay={pickupDay}
          dropDay={dropDay}
          packageId={rentPackageId}
          packageOptions={zonePackageOptions}
          isHourlyZone={isHourlyZone}
          hourlyInfo={hourlyInfo}
          onClose={() => setDateFor(null)}
          onConfirm={(start, end, chosenPkgId) => {
            setPickupDay(start);
            setDropDay(end);
            if (chosenPkgId) setRentPackageId(chosenPkgId);
            const pkg = zonePackageOptions.find((p) => p.id === (chosenPkgId || rentPackageId));
            if (!isHourlyZone && pkg && pkg.days) {
              setDropTime(pickupTime);
            }
          }}
        />
      ) : null}

      {/* ====================================================================
          FLOATING ERROR / VALIDATION TOAST BANNER
      ==================================================================== */}
      {toastMessage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { top: Math.max(insets.top, 12) + 12 },
            toastAnimStyle,
          ]}
        >
          <View style={styles.toastIconBox}>
            <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ============================================================================
// STYLESHEET
// ============================================================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0320',
  },
  blurTarget: {
    flex: 1,
  },

  //  FULL SLIDER HERO 
  sliderContainer: {
    width: SCREEN_W,
    height: SLIDE_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
sliderTouch: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 5,
  elevation: 5,
},
  slideSpacer: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  },
  slide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    overflow: 'hidden',
    zIndex: 1,
  },
slideBgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    overflow: 'hidden',
    zIndex: 1,
    elevation: 1,
  },
  slideOverlayGradient: {
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  width: SCREEN_W,
  height: '100%',
  zIndex: 2,
  elevation: 2,
}, 

  slideBgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
    overflow: 'hidden',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
slideCopyWrap: {
  position: 'absolute',
  left: 18,
  bottom: 34,
  width: SCREEN_W * 0.58,
  maxWidth: SCREEN_W * 0.58,
  zIndex: 20,
  
},

slideTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 27, 75, 0.08)',
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(30, 27, 75, 0.16)',
  },
  slideTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: 1.1,
  },
  slideHeadlineBlock: {
    gap: 2,
  },
  slideAccentVector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  slideAccentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E1B4B',
  },
  slideAccentLine: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1E1B4B',
  },
slideHeadlineText: {
  color: '#242033',
  fontSize: 28,
  lineHeight: 36,
  fontWeight: '700',
  letterSpacing: -0.2,
  ...Platform.select({
    web: { fontFamily: 'Caveat, cursive' },
    default: { fontFamily: 'Caveat_700Bold' },
  }),
},
  slideSubBlock: {
    marginTop: 6,
    gap: 1,
  },
  slideSubText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    ...Platform.select({
      web: { fontFamily: 'Caveat, cursive' },
      default: { fontFamily: 'Caveat_600SemiBold' },
    }),
  },
  slideCtaBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 7.5,
    borderRadius: 16,
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  slideCtaBtnGold: {
    backgroundColor: '#1E1B4B',
  },
  slideCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
 slideFrontWrap: {
  position: 'absolute',
  zIndex: 10, // Clean separation for foreground rider
  alignItems: 'center',
  justifyContent: 'center',
},
  slideFrontImage: {
    width: '100%',
    height: '100%',
  },
  navratriEmblem: {
    alignItems: 'flex-start',
  },
  navratriArchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  navratriArchWing: {
    width: 14,
    height: 1.5,
    backgroundColor: '#FFD24C',
  },
  navratriArchDome: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD24C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navratriHelloText: {
    color: '#FFD24C',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  navratriMainText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: -2,
  },
  navratriSwirlBar: {
    width: 48,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#FFD24C',
    marginTop: 4,
  },

  //  Slider Overlays
  sliderHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  sliderHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderHeaderTitleGroup: {
    flex: 1,
  },
  sliderHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sliderHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  sliderZonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderZonePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  sliderDotsOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 18,
    zIndex: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sliderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
  },
  sliderDotActive: {
    width: 18,
    backgroundColor: '#1E1B4B',
  },

  //  Form ScrollView 
  formScroll: {
    flex: 1,
    backgroundColor: PAGE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -16,
    zIndex: 12,
  },
  formScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },

  //  Section Card Tokens 
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E4F0',
    shadowColor: '#170630',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadText: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.2,
  },
  sectionSubText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },

  // Zone Route Box
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  stationSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  stationNodeCol: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_VIOLET,
  },
  stationConnectorLine: {
    width: 2,
    height: 28,
    backgroundColor: '#CBD5E1',
    marginVertical: 3,
  },

  dropSquareNode: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#DB2777',
  },
  stationCopyCol: {
    flex: 1,
  },
  stationTagLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: BRAND_VIOLET,
    letterSpacing: 0.6,
  },
  stationNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 1,
    letterSpacing: -0.2,
  },
  stationAreaSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  changeStationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F3EEFB',
  },
  changeStationPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND_PURPLE_ACCENT,
  },
  stationDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
    marginLeft: 30,
  },
  sameDropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toggleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  toggleCheckboxOn: {
    backgroundColor: BRAND_PURPLE_ACCENT,
    borderColor: BRAND_PURPLE_ACCENT,
  },
  sameDropLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },

  //  Date/Time Section 
  dtSubHeading: {
    fontSize: 10.5,
    fontWeight: '900',
    color: BRAND_VIOLET,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  dtRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dtBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dtBoxInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  dtBoxLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  dtBoxValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  dtDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
  },
  dtDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dtSpanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dtSpanText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#059669',
  },

  //  Delivery Option Row 
  deliveryOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryOptionInfo: {
    flex: 1,
  },
  deliveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryOptionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  flexiTagPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flexiTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: BRAND_VIOLET,
  },
  deliveryOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 15,
  },

  //  Live Booking Overview Ticket (NO PRICES) 
  summaryTicketCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#BBF7D0',
  },
  summaryLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryModelName: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#14532D',
  },
  summaryReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  summaryReadyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  summaryReadyBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  summaryRouteText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
    marginTop: 2,
  },
  summaryFlexiSubText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    marginTop: 3,
  },

  //  Bottom Dock Bar & Animated CTA 
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E4F0',
    shadowColor: '#1A0633',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bottomHintText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  searchEvBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: BRAND_PURPLE_ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: BRAND_PURPLE_ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchEvBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  rideLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    height: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roadDash: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  scooterWrap: {
    position: 'absolute',
    left: 0,
    bottom: 16,
    width: RIDE_GROUP_WIDTH,
    height: SCOOTER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLines: {
    width: TRAIL_WIDTH,
    height: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  speedDash: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  speedDashLong: { width: 22 },
  speedDashMid: { width: 14 },
  speedDashShort: { width: 8 },
  scooter: {
    width: SCOOTER_WIDTH,
    height: SCOOTER_HEIGHT,
  },

  //  Toast System 
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 14,
  },
  toastIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  //  Popups (Clock & Date) 
  popupRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    elevation: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  popupBackdrop: {
    backgroundColor: 'rgba(12, 3, 26, 0.58)',
  },
  popupCard: {
    width: '100%',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#17032F',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 20,
  },
  popupTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  popupHint: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  popupActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  popupCancel: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCancelText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },
  popupSet: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: BRAND_PURPLE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupSetText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  popupSetOff: { opacity: 0.4 },

  //  Clock Popup Styles 
  meridiemRow: {
    marginTop: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  meridiem: {
    width: 64,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meridiemOn: { backgroundColor: BRAND_PURPLE_ACCENT },
  meridiemText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  meridiemTextOn: { color: '#FFFFFF' },

  // Hourly Rental Banner in DatePopup
  hourlyRentalBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 6,
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
  schedulePricingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignSelf: 'flex-start',
  },
  schedulePricingBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },

  // Package row in DatePopup
  rentPkgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
  },
  rentPkgChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F3EEF8',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9E4F0',
  },
  rentPkgChipActive: {
    backgroundColor: BRAND_PURPLE_ACCENT,
    borderColor: BRAND_PURPLE_ACCENT,
  },
  rentPkgChipLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  rentPkgChipLabelActive: {
    color: '#FFFFFF',
  },
  rentPkgChipSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  rentPkgChipSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Analog Clock Header & Digital Display in ClockPopup
  clockZoneHoursBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEF8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E9E4F0',
  },
  clockZoneHoursIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  clockZoneHoursLabelText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#3B1270',
  },
  clockZoneHoursStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  clockZoneHoursStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  clockDigitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7FD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  clockDigitsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockDigitBox: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3EEF8',
    alignItems: 'center',
    minWidth: 48,
  },
  clockDigitBoxActive: {
    backgroundColor: BRAND_PURPLE_ACCENT,
  },
  clockDigitNum: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND_PURPLE_ACCENT,
    fontVariant: ['tabular-nums'],
  },
  clockDigitNumActive: {
    color: '#FFFFFF',
  },
  clockDigitSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8A819C',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  clockDigitSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  clockColonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8A819C',
    marginHorizontal: 5,
  },
  clockMeridiemWrap: {
    flexDirection: 'row',
    backgroundColor: '#ECE7F4',
    borderRadius: 8,
    padding: 2,
  },
  clockMeridiemPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clockMeridiemPillActive: {
    backgroundColor: '#FFFFFF',
  },
  clockMeridiemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
  },
  clockMeridiemTextActive: {
    color: BRAND_PURPLE_ACCENT,
    fontWeight: '800',
  },
  minuteStepperCol: {
    flexDirection: 'column',
    marginLeft: 5,
    gap: 3,
  },
  stepBtn: {
    width: 20,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#ECE7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: {
    marginTop: 16,
    alignSelf: 'center',
    width: CLOCK_SIZE,
    height: CLOCK_SIZE,
    borderRadius: CLOCK_SIZE / 2,
    backgroundColor: '#F5F3FF',
  },
  clockReadout: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CLOCK_SIZE / 2 - 12,
    textAlign: 'center',
    color: BRAND_PURPLE_ACCENT,
    fontSize: 18,
    fontWeight: '900',
  },
  clockNum: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockNumOn: { backgroundColor: BRAND_PURPLE_ACCENT },
  clockNumText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },
  clockNumTextOn: { color: '#FFFFFF' },
  minuteRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  minute: {
    width: 44,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minuteOn: { backgroundColor: BRAND_PURPLE_ACCENT },
  minuteText: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '800',
  },
  minuteTextOn: { color: '#FFFFFF' },

  // 
  monthRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  monthBtnOff: { opacity: 0.4 },
  monthLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  weekRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  weekText: {
    width: '14.28%',
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
  calGrid: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calBand: {
    position: 'absolute',
    top: 4,
    height: 36,
    backgroundColor: '#EDE9FE',
  },
  calBandMid: { left: 0, right: 0 },
  calBandStart: { left: '50%', right: 0 },
  calBandEnd: { left: 0, right: '50%' },
  calDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    zIndex: 1,
  },
  calDayOn: { backgroundColor: BRAND_PURPLE_ACCENT },
  calDayText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  calDayOff: { color: '#CBD5E1' },
  calDayBetween: {
    color: BRAND_PURPLE_ACCENT,
    fontWeight: '800',
  },
  calDayTextOn: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
