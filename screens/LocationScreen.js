import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { cardEnter } from '../utils/cardEnter';
import { apiGet } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const PURPLE = '#4A168C';
const MAP = require('../assets/home/location-map.jpg');
const MAP_HEIGHT = Math.round(SCREEN_W * 0.72);

export const EVEGAH_ZONES = [
  {
    id: 'gotri',
    name: 'Gotri Zone',
    shortName: 'Gotri',
    city: 'Vadodara',
    fullLabel: 'Gotri Zone, Vadodara',
    address: 'Office 10, Royal Nandish, New Alkapuri',
    hours: '10:00 – 22:00',
    phone: '+91 81282 5117',
    distance: '3.2 km',
    lat: 22.3168,
    lng: 73.1415,
    tint: '#E8F4FC',
    icon: '#2B7BB9',
  },
  {
    id: 'manjalpur',
    name: 'Manjalpur Zone',
    shortName: 'Manjalpur',
    city: 'Vadodara',
    fullLabel: 'Manjalpur Zone, Vadodara',
    address: 'Office No. 11, Vidya Dham Society, Manjalpur',
    hours: '10:00 – 22:00',
    phone: '+91 89809 66677',
    distance: '5.8 km',
    lat: 22.2775,
    lng: 73.1920,
    tint: '#E7F6EC',
    icon: '#1F8A4C',
  },
  {
    id: 'amitnagar',
    name: 'Amitnagar Zone',
    shortName: 'Amitnagar',
    city: 'Vadodara',
    fullLabel: 'Amitnagar Zone, Vadodara',
    address: 'Amitnagar, Vadodara, Gujarat',
    hours: '10:00 – 22:00',
    phone: '+91 89809 66376',
    distance: '4.1 km',
    lat: 22.3271,
    lng: 73.2173,
    tint: '#F3EEF8',
    icon: PURPLE,
  },
  {
    id: 'kpgu',
    name: 'KPGU Zone',
    shortName: 'KPGU',
    city: 'Vadodara',
    fullLabel: 'KPGU Zone, Vadodara',
    address: 'KPGU Campus, Manjalpur, Vadodara',
    hours: '10:00 – 22:00',
    phone: '+91 98765 43210',
    distance: '7.4 km',
    lat: 22.2510,
    lng: 73.2140,
    tint: '#F3EEF8',
    icon: PURPLE,
  },
  {
    id: 'aatapi',
    name: 'Aatapi Zone',
    shortName: 'Aatapi',
    city: 'Vadodara',
    fullLabel: 'Aatapi Zone, Vadodara',
    address: 'Evegah Aatapi Wonderland, Ajwa Rd',
    hours: '09:00 – 21:00',
    phone: '+91 89809 66098',
    distance: '18.6 km',
    lat: 22.3615,
    lng: 73.3524,
    tint: '#FFF4E8',
    icon: '#E07A1F',
  },
  {
    id: 'daman',
    name: 'Moti Daman Zone',
    shortName: 'Moti Daman',
    city: 'Daman',
    fullLabel: 'Moti Daman Zone, Daman',
    address: 'Moti Daman, Daman, Dadra Nagar & Haveli',
    hours: '08:00 – 20:00',
    phone: '+91 98765 43210',
    distance: '210 km',
    lat: 20.4075,
    lng: 72.8335,
    tint: '#E7F6EC',
    icon: '#1F8A4C',
  },
];

const ZONES = EVEGAH_ZONES;

function PressScale({ style, children, scaleTo = 0.975, entering, onPress }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(scaleTo, { duration: 160, easing: Easing.out(Easing.cubic) });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      }}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );

  if (entering) {
    return <Animated.View entering={entering}>{content}</Animated.View>;
  }
  return content;
}

function RadarScan({ size }) {
  const spin = useSharedValue(0);
  const beat = useSharedValue(1);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    beat.value = withRepeat(
      withTiming(1.16, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [beat, spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const beatStyle = useAnimatedStyle(() => ({
    transform: [{ scale: beat.value }],
  }));

  return (
    <View style={[styles.radar, { width: size, height: size }]}>
      <View style={[styles.radarRing, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          style={[
            styles.radarClip,
            { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 },
          ]}
        >
          {[0.33, 0.58, 0.84].map((scale) => (
            <View
              key={scale}
              style={[
                styles.ring,
                {
                  width: (size - 4) * scale,
                  height: (size - 4) * scale,
                  borderRadius: ((size - 4) * scale) / 2,
                },
              ]}
            />
          ))}
          <Animated.View style={[{ width: size - 4, height: size - 4 }, spinStyle]}>
            <LinearGradient
              colors={['rgba(122,63,240,0.78)', 'rgba(122,63,240,0.24)', 'rgba(122,63,240,0)']}
              locations={[0, 0.42, 1]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: (size - 4) / 2,
                height: (size - 4) / 2,
              }}
            />
          </Animated.View>
        </View>
      </View>
      <Animated.View style={[styles.dotWrap, beatStyle]}>
        <View style={styles.dot} />
      </Animated.View>
    </View>
  );
}

function MapRadar({ width, height, topInset, zones = [], onPinSelect }) {
  const sheetOverlap = 28;
  const visibleTop = topInset + 8;
  const visibleBottom = height - sheetOverlap - 8;
  const visibleH = Math.max(visibleBottom - visibleTop, 120);
  const size = Math.min(width * 0.74, visibleH);
  const cx = width / 2;
  const cy = visibleTop + visibleH / 2;

  const pinPositions = [
    { x: 0.22, y: 0.32, tint: '#F3EEF8', icon: PURPLE },
    { x: 0.74, y: 0.30, tint: '#E7F6EC', icon: '#1F8A4C' },
    { x: 0.20, y: 0.68, tint: '#E8F4FC', icon: '#2B7BB9' },
    { x: 0.78, y: 0.66, tint: '#FFF4E8', icon: '#E07A1F' },
    { x: 0.50, y: 0.48, tint: '#F3EEF8', icon: PURPLE },
    { x: 0.62, y: 0.22, tint: '#E7F6EC', icon: '#1F8A4C' },
  ];

  const displayZones = zones.slice(0, 6);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[styles.radarSlot, { left: cx - size / 2, top: cy - size / 2 }]}>
        <RadarScan size={size} />
      </View>
      {displayZones.map((zone, index) => {
        const layout = pinPositions[index % pinPositions.length];
        return (
          <Animated.View
            key={`${zone.id || zone.name}-${index}`}
            entering={ZoomIn.delay(180 + index * 90).duration(420)}
            style={[styles.pin, { left: layout.x * width - 46, top: layout.y * height - 24 }]}
          >
            <PressScale
              style={styles.pinPress}
              scaleTo={0.92}
              onPress={() => onPinSelect?.(zone)}
            >
              <View style={styles.pinBubble}>
                <View style={[styles.pinIcon, { backgroundColor: zone.tint || layout.tint }]}>
                  <Ionicons name="storefront" size={15} color={zone.icon || layout.icon} />
                </View>
              </View>
              <View style={styles.pinPill}>
                <Text style={styles.pinText} numberOfLines={1}>
                  {zone.shortName} · {zone.distance}
                </Text>
              </View>
            </PressScale>
          </Animated.View>
        );
      })}
    </View>
  );
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getZoneCenterAndPoints(z) {
  let pts = [];
  try {
    if (typeof z.points === 'string') {
      pts = JSON.parse(z.points);
    } else if (Array.isArray(z.points)) {
      pts = z.points;
    }
  } catch (_) {}

  let lat = Number(z.lat);
  let lng = Number(z.lng);

  if ((!lat || !lng) && pts.length > 0) {
    const validPts = pts.filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number');
    if (validPts.length > 0) {
      lat = validPts.reduce((acc, p) => acc + p.lat, 0) / validPts.length;
      lng = validPts.reduce((acc, p) => acc + p.lng, 0) / validPts.length;
    }
  }

  return { lat, lng, pts };
}

function getShortestDistanceKm(userLoc, zoneCenter, zonePoints) {
  if (!userLoc || !userLoc.lat || !userLoc.lng) return null;
  const distances = [];
  if (zoneCenter && zoneCenter.lat && zoneCenter.lng) {
    distances.push(calculateHaversineKm(userLoc.lat, userLoc.lng, zoneCenter.lat, zoneCenter.lng));
  }
  if (Array.isArray(zonePoints)) {
    zonePoints.forEach((p) => {
      if (p && p.lat && p.lng) {
        distances.push(calculateHaversineKm(userLoc.lat, userLoc.lng, Number(p.lat), Number(p.lng)));
      }
    });
  }
  if (distances.length === 0) return null;
  return Math.min(...distances);
}

function processZones(data, currentLoc, vehiclesList = []) {
  return data
    .filter((z) => {
      const t = (z.type || '').toLowerCase();
      const n = (z.name || '').toLowerCase();
      return !t.includes('service') && !t.includes('maintenance') && !n.includes('service center');
    })
    .map((z, idx) => {
      const fallback = EVEGAH_ZONES[idx % EVEGAH_ZONES.length];
      const { lat, lng, pts } = getZoneCenterAndPoints(z);
      const targetCenter = { lat: lat || fallback.lat, lng: lng || fallback.lng };
      const shortestDist = getShortestDistanceKm(currentLoc, targetCenter, pts);
      const distanceLabel =
        shortestDist !== null
          ? shortestDist < 1
            ? `${Math.round(shortestDist * 1000)} m`
            : `${shortestDist.toFixed(1)} km`
          : fallback.distance;

      const cityName = z.city ? String(z.city).trim() : fallback.city;
      const zoneNameClean = (z.name || fallback.name || '').toLowerCase().trim();
      const zoneLocClean = (z.locality || '').toLowerCase().trim();

      const realBikeCount = Array.isArray(vehiclesList) && vehiclesList.length > 0
        ? vehiclesList.filter((v) => {
            const vZone = (v.zone || '').toLowerCase().trim();
            return (
              vZone &&
              (vZone.includes(zoneNameClean) ||
                zoneNameClean.includes(vZone) ||
                (zoneLocClean && vZone.includes(zoneLocClean)))
            );
          }).length
        : z.available_vehicles !== undefined
        ? z.available_vehicles
        : (z.bike_count || 0);

      return {
        id: String(z.code || z.id || fallback.id).toLowerCase(),
        name: z.name || fallback.name,
        shortName: z.locality || z.name?.replace(/ Zone.*$/i, '') || fallback.shortName,
        city: cityName,
        fullLabel: `${z.name || fallback.name}, ${cityName}`,
        address: z.address || fallback.address,
        hours: z.is_24_hours
          ? '24 Hours Open'
          : z.open_time
          ? `${z.open_time} – ${z.close_time}`
          : fallback.hours,
        phone: z.phone || fallback.phone,
        distance: distanceLabel,
        distanceKm: shortestDist !== null ? shortestDist : 999,
        lat: targetCenter.lat,
        lng: targetCenter.lng,
        map_link: z.map_link || '',
        bikeCount: realBikeCount,
        tint: fallback.tint,
        icon: fallback.icon,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export default function LocationScreen({ onBack, onSelectZone, selectedZone }) {
  const insets = useSafeAreaInsets();
  const mapH = MAP_HEIGHT + insets.top;
  const [zonesList, setZonesList] = useState(ZONES);
  const [userLocation, setUserLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('Detecting current GPS location...');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All');

  const availableCities = useMemo(() => {
    const raw = zonesList.map((z) => (z.city ? String(z.city).trim() : '')).filter(Boolean);
    const unique = Array.from(new Set(raw));
    unique.sort((a, b) => {
      if (a.toLowerCase() === 'vadodara') return -1;
      if (b.toLowerCase() === 'vadodara') return 1;
      return a.localeCompare(b);
    });
    return ['All', ...unique];
  }, [zonesList]);

  const filteredZones = useMemo(() => {
    if (selectedCity === 'All') return zonesList;
    return zonesList.filter(
      (z) => String(z.city || '').toLowerCase().trim() === selectedCity.toLowerCase().trim()
    );
  }, [zonesList, selectedCity]);

  const nearestZone = useMemo(() => {
    if (!zonesList || zonesList.length === 0) return null;
    return zonesList[0];
  }, [zonesList]);

  // Accurate GPS acquisition and reverse geocoding
  const getPreciseLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentAddress('GPS permission not granted');
        setIsLocating(false);
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (pos?.coords) {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);

        try {
          const rev = await Location.reverseGeocodeAsync({
            latitude: coords.lat,
            longitude: coords.lng,
          });
          if (rev && rev.length > 0) {
            const item = rev[0];
            const parts = [
              item.name || item.street,
              item.subregion || item.district,
              item.city,
            ].filter(Boolean);
            const clean = Array.from(new Set(parts)).join(', ');
            setCurrentAddress(clean || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
          } else {
            setCurrentAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
          }
        } catch (_) {
          setCurrentAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        }
        setIsLocating(false);
        return coords;
      }
    } catch (err) {
      console.warn('GPS location fetch error:', err.message);
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (pos?.coords) {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserLocation(coords);
              try {
                const rev = await Location.reverseGeocodeAsync({
                  latitude: coords.lat,
                  longitude: coords.lng,
                });
                if (rev && rev.length > 0) {
                  const parts = [rev[0].name || rev[0].street, rev[0].subregion || rev[0].district, rev[0].city].filter(Boolean);
                  setCurrentAddress(Array.from(new Set(parts)).join(', '));
                } else {
                  setCurrentAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
                }
              } catch (_) {
                setCurrentAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
              }
            }
          },
          () => {
            setCurrentAddress('Current location unavailable');
          }
        );
      } else {
        setCurrentAddress('Current location unavailable');
      }
    }
    setIsLocating(false);
    return null;
  };

  useEffect(() => {
    getPreciseLocation();
  }, []);

  // Fetch real backend zones and sort by distance
  useEffect(() => {
    let mounted = true;

    async function loadZones() {
      try {
        const [zonesRes, vehiclesRes] = await Promise.all([
          apiGet('/zones', { forceRefresh: true }).catch(() => null),
          apiGet('/vehicles?status=Available', { forceRefresh: true }).catch(() => null),
        ]);
        let list = zonesRes?.data || (Array.isArray(zonesRes) ? zonesRes : []);
        const vehiclesList = vehiclesRes?.data || (Array.isArray(vehiclesRes) ? vehiclesRes : []);

        if (!list || list.length === 0) {
          const fallbackRes = await apiGet('/v1/getzoneDetailWithBikeCountList', { forceRefresh: true }).catch(() => null);
          list = fallbackRes?.data || (Array.isArray(fallbackRes) ? fallbackRes : []);
        }
        if (mounted && Array.isArray(list) && list.length > 0) {
          setZonesList(processZones(list, userLocation, vehiclesList));
        }
      } catch (err) {
        console.warn('Zones live fetch notice:', err.message);
      }
    }

    loadZones();
    return () => {
      mounted = false;
    };
  }, [userLocation]);

  const handleChooseZone = (zoneObj) => {
    if (onSelectZone) {
      onSelectZone({
        id: zoneObj.id || 'gotri',
        name: zoneObj.fullLabel || zoneObj.name || 'Gotri Zone, Vadodara',
        shortName: zoneObj.shortName || zoneObj.name?.replace(' Zone', '') || 'Gotri',
        address: zoneObj.address || '',
        city: zoneObj.city || 'Vadodara',
        lat: zoneObj.lat,
        lng: zoneObj.lng,
        pricing: zoneObj.pricing || {},
      });
    } else {
      onBack?.();
    }
  };

  const handleUseCurrentLocation = async () => {
    let loc = userLocation;
    if (!loc) {
      loc = await getPreciseLocation();
    }
    if (zonesList && zonesList.length > 0) {
      const sorted = [...zonesList].sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
      handleChooseZone(sorted[0]);
    }
  };

  const handleOpenDirection = (zone) => {
    if (zone.map_link && zone.map_link.trim().length > 0) {
      Linking.openURL(zone.map_link.trim()).catch(() => {
        const dest = zone.lat && zone.lng ? `${zone.lat},${zone.lng}` : encodeURIComponent(`${zone.name} ${zone.city || ''}`);
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
      });
    } else if (zone.lat && zone.lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}`);
    } else {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(zone.name + ' ' + (zone.city || ''))}`,
      );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.mapWrap, { height: mapH }]}>
        <Image source={MAP} style={styles.map} contentFit="cover" contentPosition="center" />
        <MapRadar
          width={SCREEN_W}
          height={mapH}
          topInset={insets.top}
          zones={zonesList}
          onPinSelect={handleChooseZone}
        />
      </View>

      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={[styles.back, { top: insets.top + 10 }]}
      >
        <Ionicons name="chevron-back" size={22} color="#1C1C1C" />
      </Pressable>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Real Live Rider Current Location Card */}
        <Animated.View entering={cardEnter(0)} style={styles.currentCard}>
          <View style={styles.currentIcon}>
            <Ionicons name="locate" size={20} color={PURPLE} />
          </View>
          <View style={styles.currentCopy}>
            <Text style={styles.currentTitle}>Current Location</Text>
            <Text style={styles.currentAddress} numberOfLines={1}>
              {isLocating ? 'Detecting current GPS location...' : currentAddress}
            </Text>
          </View>
          <Pressable
            onPress={handleUseCurrentLocation}
            hitSlop={8}
            style={styles.useCurrent}
          >
            <Ionicons name="paper-plane-outline" size={14} color={PURPLE} />
            <Text style={styles.useCurrentText}>Use Current</Text>
          </Pressable>
        </Animated.View>

        {/* Auto-Selected Nearest Available Zone Banner */}
        {nearestZone && (
          <Pressable
            style={styles.nearestDetectedBanner}
            onPress={() => handleChooseZone(nearestZone)}
          >
            <View style={styles.nearestIconBox}>
              <Ionicons name="sparkles" size={15} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nearestTitleRow}>
                <Text style={styles.nearestKicker}>NEAREST AVAILABLE ZONE</Text>
                <View style={styles.autoSelectPill}>
                  <Text style={styles.autoSelectText}>Auto-Selected</Text>
                </View>
              </View>
              <Text style={styles.nearestZoneTitle} numberOfLines={1}>
                {nearestZone.name} · {nearestZone.distance} away
              </Text>
              <Text style={styles.nearestSubAddress} numberOfLines={1}>
                {nearestZone.address} ({nearestZone.city || 'Vadodara'})
              </Text>
            </View>
            <View style={styles.nearestPickArrow}>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        )}

        {/* City Filter Tabs */}
        <View style={styles.cityPillWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityPillScroll}>
            {availableCities.map((city) => (
              <Pressable
                key={city}
                onPress={() => setSelectedCity(city)}
                style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
              >
                <Ionicons
                  name={city === 'All' ? 'globe-outline' : 'business-outline'}
                  size={12}
                  color={selectedCity === city ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>
                  {city}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Nearest Zones Section Header */}
        <View style={styles.sectionHead}>
          <Ionicons name="navigate" size={14} color={PURPLE} />
          <View>
            <Text style={styles.sectionTitle}>
              {selectedCity === 'All' ? 'Nearest Zones' : `${selectedCity} Zones`}
            </Text>
            <Text style={styles.sectionSub}>
              {filteredZones.length} {filteredZones.length === 1 ? 'hub' : 'hubs'} available
            </Text>
          </View>
        </View>

        {/* Clean Zone List */}
        {filteredZones.map((zone, index) => {
          const isNearest = index === 0 && selectedCity === 'All';
          return (
          <PressScale
            key={zone.id || `${zone.name}-${index}`}
            entering={cardEnter(index + 1)}
            style={styles.zoneCard}
            onPress={() => handleChooseZone(zone)}
          >
            <View style={styles.zoneTop}>
              <View style={[styles.zoneMark, { backgroundColor: zone.tint || '#F3EEF8' }]}>
                <Ionicons name="storefront" size={22} color={zone.icon || PURPLE} />
              </View>
              <View style={styles.zoneMain}>
                <View style={styles.zoneTitleRow}>
                  <Text style={styles.zoneName} numberOfLines={1}>
                    {zone.name}
                  </Text>
                  {isNearest && (
                    <View style={styles.nearestMiniTag}>
                      <Ionicons name="sparkles" size={10} color="#059669" />
                      <Text style={styles.nearestMiniTagText}>Nearest</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.livePill,
                      zone.bikeCount > 0
                        ? { backgroundColor: '#F3EEF8' }
                        : { backgroundColor: '#FEE2E2' },
                    ]}
                  >
                    <View
                      style={[
                        styles.liveDot,
                        zone.bikeCount > 0
                          ? { backgroundColor: '#4A168C' }
                          : { backgroundColor: '#DC2626' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.liveText,
                        zone.bikeCount > 0
                          ? { color: '#4A168C', fontWeight: '700' }
                          : { color: '#DC2626', fontWeight: '700' },
                      ]}
                    >
                      {zone.bikeCount > 0
                        ? `${zone.bikeCount} ${zone.bikeCount === 1 ? 'EV Available' : 'Available'}`
                        : '0 Available'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.zoneAddress} numberOfLines={1}>
                  {zone.address} {zone.city ? `· ${zone.city}` : ''}
                </Text>
              </View>
              <View style={styles.distanceWrap}>
                <Text style={styles.distanceValue}>{zone.distance}</Text>
                <Text style={styles.distanceAway}>away</Text>
              </View>
            </View>

            <View style={styles.zoneFoot}>
              <View style={styles.metaCol}>
                {zone.hours ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color="#8A8A8A" />
                    <Text style={styles.metaText}>{zone.hours}</Text>
                  </View>
                ) : null}
                {zone.phone ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={13} color="#8A8A8A" />
                    <Text style={styles.metaText}>{zone.phone}</Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                style={styles.direction}
                onPress={() => handleOpenDirection(zone)}
              >
                <Ionicons name="navigate-outline" size={14} color={PURPLE} />
                <Text style={styles.directionText}>Direction</Text>
              </Pressable>
            </View>
          </PressScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F7F8',
  },
  mapWrap: {
    width: '100%',
    backgroundColor: '#E7EEF2',
    overflow: 'hidden',
  },
  radarSlot: {
    position: 'absolute',
  },
  radar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(122, 63, 240, 0.95)',
    backgroundColor: 'transparent',
  },
  radarClip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(122, 63, 240, 0.16)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(122, 63, 240, 0.75)',
  },
  dotWrap: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(122, 63, 240, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#7A3FF0',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  pin: {
    position: 'absolute',
    width: 92,
    alignItems: 'center',
  },
  pinPress: {
    alignItems: 'center',
  },
  pinBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
  },
  pinIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPill: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: 96,
  },
  pinText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  back: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: '#F7F7F8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  currentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3EEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCopy: {
    flex: 1,
  },
  currentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  currentAddress: {
    marginTop: 2,
    fontSize: 12,
    color: '#6E6E6E',
  },
  useCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EEF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  useCurrentText: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE,
  },

  /* Auto-Selected Nearest Zone Banner */
  nearestDetectedBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  nearestIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nearestKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.6,
  },
  autoSelectPill: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  autoSelectText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#6EE7B7',
  },
  nearestZoneTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  nearestSubAddress: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  nearestPickArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* City Filter Tabs */
  cityPillWrap: {
    marginTop: 14,
    marginBottom: 4,
  },
  cityPillScroll: {
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cityChipTextActive: {
    color: '#FFFFFF',
  },
  nearestMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  nearestMiniTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },

  sectionHead: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  sectionSub: {
    marginTop: 1,
    fontSize: 12,
    color: '#8A8A8A',
  },
  zoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  zoneTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  zoneMark: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneMain: {
    flex: 1,
    paddingTop: 2,
  },
  zoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoneName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F6EC',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1F8A4C',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F8A4C',
  },
  zoneAddress: {
    marginTop: 4,
    fontSize: 12,
    color: '#6E6E6E',
  },
  distanceWrap: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  distanceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: PURPLE,
  },
  distanceAway: {
    marginTop: 1,
    fontSize: 11,
    color: '#8A8A8A',
  },
  zoneFoot: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  metaCol: {
    gap: 4,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6E6E6E',
  },
  direction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EEF8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE,
  },
});
