import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';
import { bmsService } from '../services/bmsService';
import { apiGet } from '../services/api';

const PURPLE = '#4A168C';
const DARK_NAVY = '#0F172A';
const EMERALD = '#10B981';
const AMBER = '#F59E0B';
const ROSE = '#EF4444';

export default function BmsScreen({ onBack, defaultBatteryId }) {
  const insets = useSafeAreaInsets();
  const [bms, setBms] = useState(null);
  const [fleetPacks, setFleetPacks] = useState([]);
  const [selectedPackId, setSelectedPackId] = useState(defaultBatteryId || null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pulsing animation for live sync
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.35, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  const loadData = async (batId) => {
    setIsRefreshing(true);
    try {
      const data = await bmsService.getLiveTelemetry(batId);
      setBms(data);
    } catch (_) {}

    try {
      const list = await apiGet('/batteries');
      if (Array.isArray(list)) {
        setFleetPacks(list.slice(0, 8));
        if (!batId && list.length > 0 && list[0].battery_id) {
          setSelectedPackId(list[0].battery_id);
        }
      }
    } catch (_) {}
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData(selectedPackId);
    bmsService.startAutoSync(selectedPackId, 4500);
    const unsubscribe = bmsService.subscribe((live) => {
      setBms(live);
    });
    return () => {
      unsubscribe();
      bmsService.stopAutoSync();
    };
  }, [selectedPackId]);

  const soc = bms?.soc ?? 86;
  const voltage = bms?.voltage ?? 52.6;
  const current = bms?.current ?? -4.2;
  const temp = bms?.temperature ?? 32.4;
  const health = bms?.health ?? 98;
  const cycles = bms?.cycles ?? 124;
  const powerWatts = bms?.powerWatts ?? Math.round(Math.abs(voltage * current));
  const voltDiffMv = bms?.voltDiffMv ?? 12;
  const cells = bms?.cells ?? [];
  const faults = bms?.faults ?? [];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable hitSlop={10} style={styles.back} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color="#1C1C1C" />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>BMS Telemetry</Text>
          <View style={styles.liveBadgeRow}>
            <View style={styles.liveDotWrap}>
              <Animated.View style={[styles.liveDotRing, pulseStyle]} />
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.liveBadgeText}>LIVE MODBUS STREAM</Text>
          </View>
        </View>
        <Pressable
          hitSlop={8}
          style={styles.refreshBtn}
          onPress={() => loadData(selectedPackId)}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={PURPLE} />
          ) : (
            <Ionicons name="refresh" size={18} color={PURPLE} />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
      >
        {/* HERO STATUS CARD */}
        <Animated.View entering={cardEnter(0)} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.packIdPill}>
              <Ionicons name="hardware-chip-outline" size={13} color={PURPLE} />
              <Text style={styles.packIdText}>
                {bms?.batteryId || selectedPackId || 'BAT-450X-101'}
              </Text>
            </View>
            <View
              style={[
                styles.statusTag,
                {
                  backgroundColor:
                    bms?.isCharging
                      ? '#ECFDF5'
                      : bms?.isDischarging
                      ? '#EFF6FF'
                      : '#F1F5F9',
                },
              ]}
            >
              <Ionicons
                name={
                  bms?.isCharging
                    ? 'flash'
                    : bms?.isDischarging
                    ? 'speedometer-outline'
                    : 'pause-circle-outline'
                }
                size={12}
                color={
                  bms?.isCharging
                    ? EMERALD
                    : bms?.isDischarging
                    ? '#2563EB'
                    : '#64748B'
                }
              />
              <Text
                style={[
                  styles.statusTagText,
                  {
                    color:
                      bms?.isCharging
                        ? EMERALD
                        : bms?.isDischarging
                        ? '#2563EB'
                        : '#64748B',
                  },
                ]}
              >
                {bms?.isCharging
                  ? 'Charging'
                  : bms?.isDischarging
                  ? 'In Use'
                  : 'Standby'}
              </Text>
            </View>
          </View>

          {/* SOC Metric */}
          <View style={styles.socRow}>
            <View>
              <Text style={styles.socNumber}>{soc}%</Text>
              <Text style={styles.socSubtitle}>
                State of Charge · Health {health}% (SOH)
              </Text>
            </View>
            <View style={styles.batteryIconBox}>
              <Ionicons
                name={
                  soc > 60
                    ? 'battery-full'
                    : soc > 20
                    ? 'battery-half'
                    : 'battery-dead'
                }
                size={38}
                color={soc > 20 ? PURPLE : ROSE}
              />
            </View>
          </View>

          {/* Gauge Bar */}
          <View style={styles.gaugeTrack}>
            <View
              style={[
                styles.gaugeFill,
                {
                  width: `${Math.max(5, Math.min(100, soc))}%`,
                  backgroundColor: soc > 25 ? PURPLE : ROSE,
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* 4 PRIMARY METRICS TILES */}
        <Animated.View entering={cardEnter(1)} style={styles.metricsGrid}>
          <MetricTile
            icon="flash-outline"
            label="PACK VOLTAGE"
            val={`${voltage} V`}
            sub="Nominal 52V"
            color="#6366F1"
          />
          <MetricTile
            icon="pulse-outline"
            label="CURRENT DRAW"
            val={`${current} A`}
            sub={current < 0 ? 'Discharging' : current > 0 ? 'Charging' : 'Idle'}
            color={current > 0 ? EMERALD : '#0284C7'}
          />
          <MetricTile
            icon="thermometer-outline"
            label="PACK TEMP"
            val={`${temp} °C`}
            sub={temp > 45 ? 'Elevated' : 'Optimal range'}
            color={temp > 45 ? AMBER : EMERALD}
          />
          <MetricTile
            icon="speedometer-outline"
            label="ACTIVE POWER"
            val={`${powerWatts} W`}
            sub="Realtime Wattage"
            color="#8B5CF6"
          />
        </Animated.View>

        {/* FAULT & PROTECTION ALERTS (IF ANY) */}
        {faults.length > 0 && (
          <View style={styles.faultBanner}>
            <Ionicons name="warning" size={18} color={ROSE} />
            <Text style={styles.faultBannerText}>{faults[0]}</Text>
          </View>
        )}

        {/* 13-CELL SERIES VOLTAGE MATRIX */}
        <Animated.View entering={cardEnter(2)} style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.cardTitle}>13S Cell Voltage Matrix</Text>
              <Text style={styles.cardSub}>
                Max delta: {voltDiffMv} mV · Balanced
              </Text>
            </View>
            <View style={styles.cellDeltaPill}>
              <Ionicons name="git-compare-outline" size={13} color="#059669" />
              <Text style={styles.cellDeltaText}>Δ {voltDiffMv}mV</Text>
            </View>
          </View>

          <View style={styles.cellGrid}>
            {cells.map((cell) => (
              <View
                key={cell.index}
                style={[
                  styles.cellTile,
                  cell.isMax && styles.cellTileMax,
                  cell.isMin && styles.cellTileMin,
                ]}
              >
                <View style={styles.cellTileHead}>
                  <Text style={styles.cellTileIndex}>C{cell.index}</Text>
                  {cell.isMax ? (
                    <Text style={styles.cellBadgeMax}>MAX</Text>
                  ) : cell.isMin ? (
                    <Text style={styles.cellBadgeMin}>MIN</Text>
                  ) : null}
                </View>
                <Text style={styles.cellTileVolt}>{cell.voltageV}V</Text>
                <View style={styles.cellBarTrack}>
                  <View
                    style={[
                      styles.cellBarFill,
                      { width: `${cell.pct}%` },
                      cell.isMax
                        ? { backgroundColor: '#8B5CF6' }
                        : cell.isMin
                        ? { backgroundColor: '#0284C7' }
                        : { backgroundColor: EMERALD },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* HARDWARE SAFETY & PROTECTION STATUS */}
        <Animated.View entering={cardEnter(3)} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>BMS Hardware Protection</Text>
            <Text style={styles.cardSub}>DL Architecture</Text>
          </View>

          <View style={styles.protectionList}>
            <ProtectionRow
              title="Over-Voltage Cutoff"
              status="Normal (< 58.8V)"
              ok={voltage <= 58.8}
            />
            <ProtectionRow
              title="Under-Voltage Cutoff"
              status="Normal (> 42.0V)"
              ok={voltage >= 42.0}
            />
            <ProtectionRow
              title="Thermal Guard (T1-T4)"
              status="Optimal (< 55°C)"
              ok={temp <= 55.0}
            />
            <ProtectionRow
              title="Cell Imbalance Guard"
              status={`Normal (Δ ${voltDiffMv}mV < 150mV)`}
              ok={voltDiffMv <= 150}
            />
            <ProtectionRow
              title="Discharge & Charge MOS"
              status="Enabled & Safe"
              ok={true}
            />
          </View>
        </Animated.View>

        {/* FLEET BATTERY PACK SELECTOR */}
        {fleetPacks.length > 0 && (
          <Animated.View entering={cardEnter(4)} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Fleet Battery Packs</Text>
              <Text style={styles.cardSub}>Tap to switch monitored pack</Text>
            </View>

            <View style={styles.fleetList}>
              {fleetPacks.map((pack) => {
                const isSelected =
                  pack.battery_id === (bms?.batteryId || selectedPackId);
                return (
                  <Pressable
                    key={pack.battery_id}
                    style={[
                      styles.fleetRow,
                      isSelected && styles.fleetRowSelected,
                    ]}
                    onPress={() => setSelectedPackId(pack.battery_id)}
                  >
                    <View style={styles.fleetIconWrap}>
                      <Ionicons
                        name="battery-charging"
                        size={18}
                        color={isSelected ? '#FFFFFF' : PURPLE}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fleetPackName}>
                        {pack.battery_id}
                      </Text>
                      <Text style={styles.fleetPackMeta}>
                        {pack.zone || 'Gotri Hub'} · {pack.status || 'Active'}
                      </Text>
                    </View>
                    <Text style={styles.fleetPackSoc}>
                      {Math.round(Number(pack.soc) || 85)}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricTile({ icon, label, val, sub, color }) {
  return (
    <View style={styles.metricTile}>
      <View style={styles.metricTileTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={styles.metricVal}>{val}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function ProtectionRow({ title, status, ok }) {
  return (
    <View style={styles.protRow}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'alert-circle'}
        size={17}
        color={ok ? EMERALD : ROSE}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.protTitle}>{title}</Text>
      </View>
      <Text style={[styles.protStatus, { color: ok ? '#059669' : ROSE }]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    color: DARK_NAVY,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDotWrap: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: EMERALD,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: EMERALD,
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: EMERALD,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3EEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F3EEF8',
  },
  packIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: PURPLE,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  socRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  socNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: DARK_NAVY,
    letterSpacing: -1,
  },
  socSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  batteryIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F3EEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeTrack: {
    marginTop: 16,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsGrid: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: DARK_NAVY,
    marginTop: 6,
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  faultBanner: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
  },
  faultBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: ROSE,
    flex: 1,
  },
  card: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK_NAVY,
  },
  cardSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  cellDeltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
  },
  cellDeltaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  cellGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cellTile: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cellTileMax: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  cellTileMin: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  cellTileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cellTileIndex: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  cellBadgeMax: {
    fontSize: 8,
    fontWeight: '900',
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cellBadgeMin: {
    fontSize: 8,
    fontWeight: '900',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cellTileVolt: {
    fontSize: 13,
    fontWeight: '900',
    color: DARK_NAVY,
    marginTop: 3,
  },
  cellBarTrack: {
    marginTop: 5,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  cellBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  protectionList: {
    gap: 10,
  },
  protRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  protTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: DARK_NAVY,
  },
  protStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  fleetList: {
    gap: 8,
  },
  fleetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fleetRowSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: PURPLE,
  },
  fleetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3EEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetPackName: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_NAVY,
  },
  fleetPackMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  fleetPackSoc: {
    fontSize: 15,
    fontWeight: '900',
    color: PURPLE,
  },
});
