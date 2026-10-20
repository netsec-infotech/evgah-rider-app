import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');
const CLOCK_SIZE = 240;
const CLOCK_RADIUS = CLOCK_SIZE / 2; // 120
const RING_RADIUS = 88;
const ITEM_SIZE = 34;
const BRAND_PURPLE = '#4A168C';
const BRAND_PURPLE_LIGHT = '#F3EEF8';
const BRAND_ACCENT = '#7C3AED';

const HOURS_LIST = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_PRIMARY = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export function getCurrentClockTime() {
  const now = new Date();
  const h24 = now.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  const mer = h24 >= 12 ? 'PM' : 'AM';
  return {
    hour: h12,
    minute: m,
    meridiem: mer,
    formatted: `${String(h12).padStart(2, '0')}:${m} ${mer}`,
    hour24: h24,
  };
}

export function parseClockString(value) {
  if (!value) {
    return getCurrentClockTime();
  }
  if (typeof value === 'number') {
    const h24 = Math.max(0, Math.min(23, value));
    const mer = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { hour: h12, minute: '00', meridiem: mer };
  }
  const match = String(value || '').match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return getCurrentClockTime();
  let h = parseInt(match[1], 10);
  if (h === 0) h = 12;
  const m = match[2] != null ? match[2] : '00';
  const mer = (match[3] || (h >= 12 && h !== 12 ? 'PM' : 'AM')).toUpperCase();
  const clampedH = h > 12 ? h - 12 : h;
  return { hour: clampedH, minute: m.padStart(2, '0'), meridiem: mer };
}

export function formatClockString(hour, minute, meridiem) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${meridiem}`;
}

export function clockToHour24(hour, minute, meridiem) {
  let h = hour % 12;
  if (meridiem === 'PM') h += 12;
  return h;
}

export function parseOperatingHours(zoneOrHours) {
  if (!zoneOrHours) {
    return {
      openHour: 6,
      closeHour: 23,
      openMinute: 0,
      closeMinute: 0,
      is24Hours: false,
      label: '06:00 AM – 11:00 PM',
    };
  }

  if (typeof zoneOrHours === 'object') {
    if (zoneOrHours.is_24_hours || zoneOrHours.is24Hours) {
      return {
        openHour: 0,
        closeHour: 23,
        openMinute: 0,
        closeMinute: 59,
        is24Hours: true,
        label: 'Open 24 Hours',
      };
    }
    if (zoneOrHours.open_time && zoneOrHours.close_time) {
      return parseOperatingHours(`${zoneOrHours.open_time} - ${zoneOrHours.close_time}`);
    }
    if (zoneOrHours.hours) {
      return parseOperatingHours(zoneOrHours.hours);
    }
  }

  const rawStr = String(zoneOrHours || '').trim();
  if (/24\s*hour/i.test(rawStr) || /24\/7/i.test(rawStr)) {
    return {
      openHour: 0,
      closeHour: 23,
      openMinute: 0,
      closeMinute: 59,
      is24Hours: true,
      label: 'Open 24 Hours',
    };
  }

  const parts = rawStr.split(/[-–—]|(?:\s+to\s+)/i);
  if (parts.length >= 2) {
    const parseTimeComponent = (str) => {
      const match = str.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2] || '0', 10);
      const mer = match[3] ? match[3].toUpperCase() : null;
      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      return { hour24: h, minute: m };
    };

    const start = parseTimeComponent(parts[0]);
    const end = parseTimeComponent(parts[1]);

    if (start && end) {
      const openH = Math.max(0, Math.min(23, start.hour24));
      const closeH = Math.max(0, Math.min(23, end.hour24));
      const openM = Math.max(0, Math.min(59, start.minute));
      const closeM = Math.max(0, Math.min(59, end.minute));

      const fmtTime = (h, m) => {
        const mer = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${mer}`;
      };

      return {
        openHour: openH,
        closeHour: closeH,
        openMinute: openM,
        closeMinute: closeM,
        is24Hours: openH === 0 && closeH >= 23,
        label: `${fmtTime(openH, openM)} – ${fmtTime(closeH, closeM)}`,
      };
    }
  }

  return {
    openHour: 6,
    closeHour: 23,
    openMinute: 0,
    closeMinute: 0,
    is24Hours: false,
    label: '06:00 AM – 11:00 PM',
  };
}

export function isHourAllowed(hour12, meridiem, opHours) {
  if (!opHours || opHours.is24Hours) return true;
  let h24 = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);
  return h24 >= opHours.openHour && h24 <= opHours.closeHour;
}

export function getValidHoursForMeridiem(meridiem, opHours) {
  if (!opHours || opHours.is24Hours) return HOURS_LIST;
  return HOURS_LIST.filter((h) => {
    const h24 = (h % 12) + (meridiem === 'PM' ? 12 : 0);
    return h24 >= opHours.openHour && h24 <= opHours.closeHour;
  });
}

export function clampTimeToOperatingHours(hour12, minuteStr, meridiem, opHoursInput) {
  const op = opHoursInput && opHoursInput.openHour !== undefined
    ? opHoursInput
    : parseOperatingHours(opHoursInput);

  if (op.is24Hours) {
    return { hour: hour12, minute: minuteStr, meridiem, hour24: clockToHour24(hour12, minuteStr, meridiem) };
  }

  let h24 = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);
  let m = parseInt(minuteStr, 10) || 0;

  if (h24 < op.openHour) {
    h24 = op.openHour;
    m = Math.max(m, op.openMinute || 0);
  } else if (h24 > op.closeHour) {
    h24 = op.closeHour;
    m = Math.min(m, op.closeMinute ?? 59);
  } else if (h24 === op.closeHour && op.closeMinute != null && m > op.closeMinute) {
    m = op.closeMinute;
  } else if (h24 === op.openHour && op.openMinute != null && m < op.openMinute) {
    m = op.openMinute;
  }

  const nextMer = h24 >= 12 ? 'PM' : 'AM';
  const nextH12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    hour: nextH12,
    minute: String(m).padStart(2, '0'),
    meridiem: nextMer,
    hour24: h24,
  };
}

export function AnalogClockDial({
  mode = 'hour',
  hour = 8,
  minute = '00',
  meridiem = 'AM',
  operatingHours,
  onSelectHour,
  onSelectMinute,
}) {
  const isHourMode = mode === 'hour';
  const opHours = useMemo(() => parseOperatingHours(operatingHours), [operatingHours]);

  // Calculate rotation angle for clock hand
  const handAngle = useMemo(() => {
    if (isHourMode) {
      return ((hour % 12) / 12) * 360;
    }
    const mNum = parseInt(minute, 10) || 0;
    return (mNum / 60) * 360;
  }, [isHourMode, hour, minute]);

  // Touch & Drag handler across full 60 minutes or 12 hours
  const handleTouch = (evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - CLOCK_RADIUS;
    const dy = locationY - CLOCK_RADIUS;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 18) return; // ignore center dead-zone

    let rad = Math.atan2(dy, dx) + Math.PI / 2;
    if (rad < 0) rad += 2 * Math.PI;

    if (isHourMode) {
      let h = Math.round((rad / (2 * Math.PI)) * 12);
      if (h === 0) h = 12;
      if (h > 12) h = 12;

      // Operating hours constraint check
      if (!opHours.is24Hours) {
        const validHours = getValidHoursForMeridiem(meridiem, opHours);
        if (validHours.length > 0) {
          if (validHours.includes(h)) {
            onSelectHour?.(h);
          } else {
            // Find closest valid hour in this meridiem
            let closest = validHours[0];
            let minDiff = 999;
            for (const vh of validHours) {
              let diff = Math.abs((vh % 12) - (h % 12));
              if (diff > 6) diff = 12 - diff;
              if (diff < minDiff) {
                minDiff = diff;
                closest = vh;
              }
            }
            onSelectHour?.(closest);
          }
          return;
        }
      }
      onSelectHour?.(h);
    } else {
      let m = Math.round((rad / (2 * Math.PI)) * 60) % 60;
      // If hour is at boundary, clamp minute
      const h24 = (hour % 12) + (meridiem === 'PM' ? 12 : 0);
      if (!opHours.is24Hours && h24 === opHours.closeHour && opHours.closeMinute != null && m > opHours.closeMinute) {
        m = opHours.closeMinute;
      } else if (!opHours.is24Hours && h24 === opHours.openHour && opHours.openMinute != null && m < opHours.openMinute) {
        m = opHours.openMinute;
      }
      onSelectMinute?.(String(m).padStart(2, '0'));
    }
  };

  const currentMinNum = parseInt(minute, 10) || 0;

  return (
    <View style={styles.dialContainer}>
      <View
        style={styles.dialFace}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      >
        {/* Subtle decorative inner guide ring */}
        <View pointerEvents="none" style={styles.innerRingGuide} />

        {/* 60 Minute Tick Marks (small dots around perimeter) */}
        {!isHourMode &&
          Array.from({ length: 60 }).map((_, idx) => {
            if (idx % 5 === 0) return null; // 5-minute ticks have larger markers
            const theta = (idx / 60) * 2 * Math.PI - Math.PI / 2;
            const dotX = CLOCK_RADIUS + RING_RADIUS * Math.cos(theta) - 2;
            const dotY = CLOCK_RADIUS + RING_RADIUS * Math.sin(theta) - 2;
            const isCurrent = idx === currentMinNum;
            return (
              <View
                key={`tick-${idx}`}
                pointerEvents="none"
                style={[
                  styles.minuteDot,
                  { left: dotX, top: dotY },
                  isCurrent && styles.minuteDotActive,
                ]}
              />
            );
          })}

        {/* Center Clock Hand with Rotating Container */}
        <View
          pointerEvents="none"
          style={[
            styles.handPivotContainer,
            { transform: [{ rotate: `${handAngle}deg` }] },
          ]}
        >
          {/* Hand arm from center up to -RING_RADIUS */}
          <View style={styles.handArm} />
          {/* Hand tip indicator circle */}
          <View style={styles.handTipCircle}>
            {!isHourMode && currentMinNum % 5 !== 0 ? (
              <Text style={styles.handTipCustomMinText}>
                {String(minute).padStart(2, '0')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Center Pivot Pin */}
        <View pointerEvents="none" style={styles.centerPin} />
        <View pointerEvents="none" style={styles.centerPinInner} />

        {/* Numbers around the clock dial */}
        {isHourMode
          ? HOURS_LIST.map((hVal, idx) => {
              const theta = (idx / 12) * 2 * Math.PI - Math.PI / 2;
              const posX = CLOCK_RADIUS + RING_RADIUS * Math.cos(theta) - ITEM_SIZE / 2;
              const posY = CLOCK_RADIUS + RING_RADIUS * Math.sin(theta) - ITEM_SIZE / 2;
              const isSelected = hour === hVal;
              const isAllowed = isHourAllowed(hVal, meridiem, opHours);

              return (
                <View
                  key={`h-${hVal}`}
                  pointerEvents="none"
                  style={[
                    styles.numItem,
                    { left: posX, top: posY },
                    isSelected && isAllowed && styles.numItemSelected,
                    !isAllowed && styles.numItemDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.numItemText,
                      isSelected && isAllowed && styles.numItemTextSelected,
                      !isAllowed && styles.numItemTextDisabled,
                    ]}
                  >
                    {hVal}
                  </Text>
                  {!isAllowed && <View style={styles.disabledLockDot} />}
                </View>
              );
            })
          : MINUTES_PRIMARY.map((mVal, idx) => {
              const theta = (idx / 12) * 2 * Math.PI - Math.PI / 2;
              const posX = CLOCK_RADIUS + RING_RADIUS * Math.cos(theta) - ITEM_SIZE / 2;
              const posY = CLOCK_RADIUS + RING_RADIUS * Math.sin(theta) - ITEM_SIZE / 2;
              const isSelected = String(minute).padStart(2, '0') === mVal;

              return (
                <View
                  key={`m-${mVal}`}
                  pointerEvents="none"
                  style={[
                    styles.numItem,
                    { left: posX, top: posY },
                    isSelected && styles.numItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.numItemText,
                      isSelected && styles.numItemTextSelected,
                    ]}
                  >
                    {mVal}
                  </Text>
                </View>
              );
            })}
      </View>
    </View>
  );
}

export default function AnalogClockModal({
  visible,
  title = 'Select Time',
  initialTime,
  operatingHours,
  onConfirm,
  onClose,
}) {
  const opHours = useMemo(() => parseOperatingHours(operatingHours), [operatingHours]);

  const parsed = useMemo(() => {
    const p = parseClockString(initialTime);
    return clampTimeToOperatingHours(p.hour, p.minute, p.meridiem, opHours);
  }, [initialTime, opHours]);

  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [meridiem, setMeridiem] = useState(parsed.meridiem);
  const [mode, setMode] = useState('hour'); // 'hour' | 'minute'

  const amAllowed = useMemo(
    () => opHours.is24Hours || getValidHoursForMeridiem('AM', opHours).length > 0,
    [opHours]
  );
  const pmAllowed = useMemo(
    () => opHours.is24Hours || getValidHoursForMeridiem('PM', opHours).length > 0,
    [opHours]
  );

  // Reset when re-opened
  React.useEffect(() => {
    if (visible) {
      const p = parseClockString(initialTime);
      const clamped = clampTimeToOperatingHours(p.hour, p.minute, p.meridiem, opHours);
      setHour(clamped.hour);
      setMinute(clamped.minute);
      setMeridiem(clamped.meridiem);
      setMode('hour');
    }
  }, [visible, initialTime, opHours]);

  const handleSelectHour = (h) => {
    setHour(h);
    // Smooth auto-transition to minute selection
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

  const handleConfirm = () => {
    const clamped = clampTimeToOperatingHours(hour, minute, meridiem, opHours);
    const formatted = formatClockString(clamped.hour, clamped.minute, clamped.meridiem);
    const h24 = clockToHour24(clamped.hour, clamped.minute, clamped.meridiem);
    onConfirm?.({
      formatted,
      hour: clamped.hour,
      minute: clamped.minute,
      meridiem: clamped.meridiem,
      hour24: h24,
    });
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPress} onPress={onClose} />

        <View style={styles.clockCard}>
          {/* Header Row */}
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>
                {mode === 'hour' ? 'Tap or Drag Hour on Dial' : 'Tap or Drag Any Minute (0–59)'}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Zone Operating Hours Badge Banner */}
          <View style={styles.zoneHoursBanner}>
            <View style={styles.zoneHoursIconWrap}>
              <Ionicons name="time" size={12} color={BRAND_PURPLE} />
            </View>
            <Text style={styles.zoneHoursLabelText} numberOfLines={1}>
              {opHours.is24Hours ? '24/7 Operational Hub' : `Zone Hours: ${opHours.label}`}
            </Text>
            <View style={[styles.zoneHoursStatusDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.zoneHoursStatusText}>Open</Text>
          </View>

          {/* Digital Time & Mode Switcher Display */}
          <View style={styles.digitalHeaderRow}>
            <View style={styles.digitalDigitsRow}>
              {/* Hour Chip */}
              <Pressable
                onPress={() => setMode('hour')}
                style={[
                  styles.digitalBox,
                  mode === 'hour' && styles.digitalBoxActive,
                ]}
              >
                <Text
                  style={[
                    styles.digitalText,
                    mode === 'hour' && styles.digitalTextActive,
                  ]}
                >
                  {String(hour).padStart(2, '0')}
                </Text>
                <Text
                  style={[
                    styles.digitalSub,
                    mode === 'hour' && styles.digitalSubActive,
                  ]}
                >
                  HOUR
                </Text>
              </Pressable>

              <Text style={styles.digitalColon}>:</Text>

              {/* Minute Chip */}
              <Pressable
                onPress={() => setMode('minute')}
                style={[
                  styles.digitalBox,
                  mode === 'minute' && styles.digitalBoxActive,
                ]}
              >
                <Text
                  style={[
                    styles.digitalText,
                    mode === 'minute' && styles.digitalTextActive,
                  ]}
                >
                  {String(minute).padStart(2, '0')}
                </Text>
                <Text
                  style={[
                    styles.digitalSub,
                    mode === 'minute' && styles.digitalSubActive,
                  ]}
                >
                  MIN
                </Text>
              </Pressable>

              {/* 1-Minute Stepper Controls [-] and [+] */}
              <View style={styles.minuteStepperCol}>
                <Pressable
                  hitSlop={6}
                  onPress={() => adjustMinute(1)}
                  style={styles.stepBtn}
                >
                  <Ionicons name="chevron-up" size={14} color={BRAND_PURPLE} />
                </Pressable>
                <Pressable
                  hitSlop={6}
                  onPress={() => adjustMinute(-1)}
                  style={styles.stepBtn}
                >
                  <Ionicons name="chevron-down" size={14} color={BRAND_PURPLE} />
                </Pressable>
              </View>
            </View>

            {/* AM / PM Segment */}
            <View style={styles.meridiemSegment}>
              <Pressable
                onPress={() => amAllowed && handleSwitchMeridiem('AM')}
                disabled={!amAllowed}
                style={[
                  styles.meridiemBtn,
                  meridiem === 'AM' && styles.meridiemBtnActive,
                  !amAllowed && styles.meridiemBtnDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.meridiemBtnText,
                    meridiem === 'AM' && styles.meridiemBtnTextActive,
                    !amAllowed && styles.meridiemBtnTextDisabled,
                  ]}
                >
                  AM
                </Text>
              </Pressable>
              <Pressable
                onPress={() => pmAllowed && handleSwitchMeridiem('PM')}
                disabled={!pmAllowed}
                style={[
                  styles.meridiemBtn,
                  meridiem === 'PM' && styles.meridiemBtnActive,
                  !pmAllowed && styles.meridiemBtnDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.meridiemBtnText,
                    meridiem === 'PM' && styles.meridiemBtnTextActive,
                    !pmAllowed && styles.meridiemBtnTextDisabled,
                  ]}
                >
                  PM
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Analog Clock Dial (with 60-minute full drag/touch support) */}
          <AnalogClockDial
            mode={mode}
            hour={hour}
            minute={minute}
            meridiem={meridiem}
            operatingHours={operatingHours}
            onSelectHour={handleSelectHour}
            onSelectMinute={handleSelectMinute}
          />

          {/* Touch instructions badge */}
          <View style={styles.hintBadge}>
            <Ionicons name="finger-print-outline" size={13} color="#8A819C" />
            <Text style={styles.hintBadgeText}>
              {mode === 'hour' ? 'Tap an operational hour' : 'Tap/drag anywhere around dial for 00–59 min'}
            </Text>
          </View>

          {/* Footer Actions */}
          <View style={styles.cardActionsRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Set Time</Text>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 7, 32, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  clockCard: {
    width: Math.min(SCREEN_W - 32, 340),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A0B2E',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneHoursBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEF8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9E4F0',
  },
  zoneHoursIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  zoneHoursLabelText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#3B1270',
  },
  zoneHoursStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  zoneHoursStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  digitalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  digitalDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  digitalBox: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F3EEF8',
    alignItems: 'center',
    minWidth: 50,
  },
  digitalBoxActive: {
    backgroundColor: BRAND_PURPLE,
    shadowColor: BRAND_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  digitalText: {
    fontSize: 22,
    fontWeight: '800',
    color: BRAND_PURPLE,
    fontVariant: ['tabular-nums'],
  },
  digitalTextActive: {
    color: '#FFFFFF',
  },
  digitalSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#8A819C',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  digitalSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  digitalColon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8A819C',
    marginHorizontal: 4,
  },
  minuteStepperCol: {
    flexDirection: 'column',
    marginLeft: 6,
    gap: 3,
  },
  stepBtn: {
    width: 22,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#ECE7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meridiemSegment: {
    flexDirection: 'row',
    backgroundColor: '#ECE7F4',
    borderRadius: 10,
    padding: 3,
  },
  meridiemBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  meridiemBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  meridiemBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
  },
  meridiemBtnTextActive: {
    color: BRAND_PURPLE,
    fontWeight: '800',
  },
  meridiemBtnDisabled: {
    opacity: 0.3,
  },
  meridiemBtnTextDisabled: {
    color: '#9CA3AF',
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dialFace: {
    width: CLOCK_SIZE,
    height: CLOCK_SIZE,
    borderRadius: CLOCK_RADIUS,
    backgroundColor: '#F7F4FB',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    position: 'relative',
  },
  innerRingGuide: {
    position: 'absolute',
    left: CLOCK_RADIUS - RING_RADIUS,
    top: CLOCK_RADIUS - RING_RADIUS,
    width: RING_RADIUS * 2,
    height: RING_RADIUS * 2,
    borderRadius: RING_RADIUS,
    borderWidth: 1,
    borderColor: '#E9E4F0',
    borderStyle: 'dashed',
  },
  minuteDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  minuteDotActive: {
    backgroundColor: BRAND_PURPLE,
    width: 6,
    height: 6,
    borderRadius: 3,
    transform: [{ translateX: -1 }, { translateY: -1 }],
  },
  handPivotContainer: {
    position: 'absolute',
    left: CLOCK_RADIUS,
    top: CLOCK_RADIUS,
    width: 0,
    height: 0,
  },
  handArm: {
    position: 'absolute',
    left: -1.5,
    bottom: 0,
    width: 3,
    height: RING_RADIUS,
    backgroundColor: BRAND_PURPLE,
    borderRadius: 2,
  },
  handTipCircle: {
    position: 'absolute',
    left: -ITEM_SIZE / 2,
    top: -RING_RADIUS - ITEM_SIZE / 2,
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    backgroundColor: BRAND_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handTipCustomMinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerPin: {
    position: 'absolute',
    left: CLOCK_RADIUS - 6,
    top: CLOCK_RADIUS - 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BRAND_PURPLE,
  },
  centerPinInner: {
    position: 'absolute',
    left: CLOCK_RADIUS - 2,
    top: CLOCK_RADIUS - 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  numItem: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numItemSelected: {
    // Hand tip circle renders behind the text
  },
  numItemText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2E1065',
  },
  numItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  numItemDisabled: {
    opacity: 0.28,
  },
  numItemTextDisabled: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  disabledLockDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
    marginTop: 1,
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginVertical: 10,
  },
  hintBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A819C',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: BRAND_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
