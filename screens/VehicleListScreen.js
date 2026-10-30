import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';
import { apiGet, resolveMediaUrl } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const PURPLE = '#300D4F';
const ACCENT_PURPLE = '#6300B5';
const CHIP_BG = '#F4ECFF';
const CHIP_BORDER = '#8E5CE6';

const LOCAL_FALLBACK_IMAGES = {
  'evegah mink': require('../assets/home/vehicle-mink.png'),
  'evegah city': require('../assets/home/vehicle-city.png'),
  'evegah fly': require('../assets/home/vehicle-fly.png'),
  'evegah pro': require('../assets/home/vehicle-pro.png'),
};

const DEFAULT_MODELS = [
  {
    id: 'mink',
    name: 'Evegah Mink',
    tag: 'E-Scooter',
    edition: 'Smart Li-Ion Edition',
    line: 'Smooth city miles',
    km: '70-90 km',
    rangeNum: 80,
    fuel: 'Electric',
    transmission: 'Automatic',
    rto: 'GJ06',
    Zone: 'Zone · Gotri Zone, Vadodara',
    range: '70-90 km',
    speed: '30 km/h',
    speedNum: 30,
    deposit: 0,
    tint: '#F6F1FC',
    image: require('../assets/home/vehicle-mink.png'),
  },
  {
    id: 'city',
    name: 'Evegah City',
    tag: 'E-Scooter',
    edition: 'Revotron Urban Commuter XM',
    line: 'Quiet across town',
    km: '80-90 km',
    rangeNum: 85,
    fuel: 'Electric',
    transmission: 'Automatic',
    rto: 'GJ06',
    Zone: 'Zone · Gotri Zone, Vadodara',
    range: '80-90 km',
    speed: '45 km/h',
    speedNum: 45,
    deposit: 0,
    tint: '#F3FBF6',
    image: require('../assets/home/vehicle-city.png'),
  },
  {
    id: 'fly',
    name: 'Evegah Fly',
    tag: 'E-Scooter',
    edition: 'Lite Everyday City Edition',
    line: 'Light for every day',
    km: '40-60 km',
    rangeNum: 50,
    fuel: 'Electric',
    transmission: 'Automatic',
    rto: 'GJ06',
    Zone: 'Zone · Gotri Zone, Vadodara',
    range: '40-60 km',
    speed: '25 km/h',
    speedNum: 25,
    deposit: 0,
    tint: '#EEF3FF',
    image: require('../assets/home/vehicle-fly.png'),
  },
  {
    id: 'pro',
    name: 'Evegah Pro',
    tag: 'E-Scooter',
    edition: 'Sharp Dual-Battery Long Range',
    line: 'Built for longer rides',
    km: '110-130 km',
    rangeNum: 120,
    fuel: 'Electric',
    transmission: 'Automatic',
    rto: 'GJ06',
    Zone: 'Zone · Gotri Zone, Vadodara',
    range: '110-130 km',
    speed: '75 km/h',
    speedNum: 75,
    deposit: 0,
    tint: '#FFF6F2',
    image: require('../assets/home/vehicle-pro.png'),
  },
];

export default function VehicleListScreen({
  onBack,
  onOpenLocation,
  onSelectVehicle,
  trip,
  selectedZone,
}) {
  const insets = useSafeAreaInsets();
  const [savedIds, setSavedIds] = useState({});
  const [vehiclesList, setVehiclesList] = useState([]);
  const [distinctModelNames, setDistinctModelNames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real Filter States
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'price_asc' | 'price_desc' | 'speed' | 'range'
  const [priceRange, setPriceRange] = useState('all'); // 'all' | 'under200' | '200_300' | 'above300'
  const [selectedModel, setSelectedModel] = useState('all');
  const [savedFilter, setSavedFilter] = useState(false);

  // Modals for real interactive filters
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);

  const zoneLabel = trip?.pickupName || selectedZone?.shortName || selectedZone?.name || 'Gotri Zone';

  const bannerFloat = useSharedValue(0);
  const bannerZoom = useSharedValue(1);
  const bannerShimmer = useSharedValue(-SCREEN_W);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    bannerFloat.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(4, { duration: 1500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    bannerZoom.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    bannerShimmer.value = withRepeat(
      withSequence(
        withTiming(SCREEN_W * 1.3, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-SCREEN_W, { duration: 0 })
      ),
      -1,
      false
    );
    badgePulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.97, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const bannerBgAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bannerZoom.value }],
  }));

  const bannerArtAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bannerFloat.value },
      { rotate: `${bannerFloat.value * 0.45}deg` },
    ],
  }));

  const bannerBadgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  const bannerShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bannerShimmer.value }, { rotate: '-20deg' }],
  }));

  const [zonePackagesList, setZonePackagesList] = useState([]);
  const [zoneAvailableVehicles, setZoneAvailableVehicles] = useState([]);
  const [rawBackendModels, setRawBackendModels] = useState([]);
  const [activeZoneData, setActiveZoneData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isHourlyZone, setIsHourlyZone] = useState(false);
  const [hourlySummary, setHourlySummary] = useState('');

  // Connect Vehicle List with Backend API (Selected Zone & Zone Pricing)
  const fetchZoneVehicles = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const [modelsRes, zonesRes, vehiclesRes] = await Promise.all([
        apiGet('/vehicles/models').catch(() => null),
        apiGet('/zones').catch(() => null),
        apiGet('/vehicles?status=Available').catch(() => null),
      ]);

      const rawModels = modelsRes?.data || (Array.isArray(modelsRes) ? modelsRes : []);
      const rawZones = zonesRes?.data || (Array.isArray(zonesRes) ? zonesRes : []);
      let rawVehicles = vehiclesRes?.data || (Array.isArray(vehiclesRes) ? vehiclesRes : []);

      // Also fetch all vehicles if status=Available returned empty (to handle Online status)
      if (rawVehicles.length === 0) {
        const allVehiclesRes = await apiGet('/vehicles').catch(() => null);
        const allVehicles = allVehiclesRes?.data || (Array.isArray(allVehiclesRes) ? allVehiclesRes : []);
        rawVehicles = allVehicles.filter(
          (v) => !v.status || v.status.toLowerCase() === 'online' || v.status.toLowerCase() === 'available'
        );
      }

      // Find active zone data
      const currentZoneName = (
        selectedZone?.name ||
        selectedZone?.shortName ||
        trip?.pickupName ||
        'Gotri Zone'
      ).toLowerCase().trim();

      const zoneObj = rawZones.find((z) => {
        const zName = (z.name || '').toLowerCase().trim();
        const zLoc = (z.locality || '').toLowerCase().trim();
        return (
          zName.includes(currentZoneName) ||
          currentZoneName.includes(zName) ||
          zLoc.includes(currentZoneName) ||
          currentZoneName.includes(zLoc)
        );
      }) || selectedZone || rawZones[0];

      setActiveZoneData(zoneObj);

      const zonePricing = zoneObj?.pricing || {};
      const hourlyPricing = Array.isArray(zonePricing?.hourlyPricing) ? zonePricing.hourlyPricing : [];
      const hasHourly =
        hourlyPricing.length > 0 ||
        (zonePricing?.basePrice !== undefined && zonePricing?.basePrice !== null && Number(zonePricing.basePrice) > 0);
      const isHourly =
        Boolean(trip?.isHourlyZone) ||
        (zonePricing?.pricingModel || '').toLowerCase().includes('hour') ||
        (zonePricing?.pricingModel || '').toLowerCase().includes('minute') ||
        (hasHourly && (!Array.isArray(zonePricing?.packages) || zonePricing.packages.length === 0));

      setIsHourlyZone(isHourly);

      if (isHourly) {
        const firstHourly = hourlyPricing[0] || {};
        const baseRate = firstHourly.basePrice ? parseFloat(firstHourly.basePrice) : (zonePricing?.basePrice || 5);
        const extraRate = firstHourly.extraPrice ? parseFloat(firstHourly.extraPrice) : (zonePricing?.extraPrice || 10);
        const rule = firstHourly.roundingRule || 'Per 15 Minutes';
        setHourlySummary(`₹${baseRate}/hr Base • ₹${extraRate} ${rule}`);
      }

      // Extract zone packages
      let allZonePackages = [];
      if (!isHourly) {
        if (Array.isArray(zonePricing?.packages) && zonePricing.packages.length > 0) {
          allZonePackages = zonePricing.packages.map((p, idx) => ({
            id: String(p.id || `pkg_${idx}`),
            name: (p.name || 'Daily').trim(),
            model: (p.model || '').trim(),
            price: parseFloat(p.price) || 0,
            deposit: p.deposit !== undefined ? parseFloat(p.deposit) : 0,
            duration: parseInt(p.duration, 10) || 1,
          }));
        } else if (zonePricing?.modelPackages && typeof zonePricing.modelPackages === 'object') {
          Object.entries(zonePricing.modelPackages).forEach(([mName, pkgs]) => {
            if (Array.isArray(pkgs)) {
              pkgs.forEach((p, idx) => {
                allZonePackages.push({
                  id: String(p.id || `${mName}_pkg_${idx}`),
                  name: (p.name || 'Daily').trim(),
                  model: mName.trim(),
                  price: parseFloat(p.price) || 0,
                  deposit: p.deposit !== undefined ? parseFloat(p.deposit) : 0,
                  duration: parseInt(p.duration, 10) || 1,
                });
              });
            }
          });
        }
      }

      setZonePackagesList(allZonePackages);

      // Extract vehicles assigned to this zone
      const matchedVehicles = rawVehicles.filter((v) => {
        if (!v.zone) return false;
        const vZone = v.zone.toLowerCase().trim();
        return (
          vZone.includes(currentZoneName) ||
          currentZoneName.includes(vZone) ||
          (zoneObj?.name && vZone.includes(zoneObj.name.toLowerCase().trim())) ||
          (zoneObj?.locality && vZone.includes(zoneObj.locality.toLowerCase().trim()))
        );
      });

      setZoneAvailableVehicles(matchedVehicles);
      setRawBackendModels(rawModels);
    } catch (err) {
      console.warn('Vehicle list dynamic fetch notice:', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedZone, trip]);

  useEffect(() => {
    fetchZoneVehicles(false);
  }, [fetchZoneVehicles]);

  const onRefresh = useCallback(() => {
    fetchZoneVehicles(true);
  }, [fetchZoneVehicles]);

  // Derive filtered vehicles strictly according to selected package & backend pricing
  useEffect(() => {
    if (isLoading) return;

    if (zoneAvailableVehicles.length === 0) {
      setVehiclesList([]);
      setDistinctModelNames([]);
      return;
    }

    const availableModelNames = Array.from(
      new Set(
        zoneAvailableVehicles
          .map((v) =>
            (v.evegah_model_name || v.vehicle_model || v.name || '').trim().toLowerCase()
          )
          .filter(Boolean)
      )
    );

    const modelsPool = rawBackendModels.length > 0 ? rawBackendModels : DEFAULT_MODELS;

    if (isHourlyZone) {
      // Hourly zone: match vehicles that have hourly pricing defined in the zone
      const zonePricing = activeZoneData?.pricing || {};
      const hourlyList = Array.isArray(zonePricing?.hourlyPricing) ? zonePricing.hourlyPricing : [];
      const baseRate = hourlyList[0]?.basePrice ? parseFloat(hourlyList[0].basePrice) : (zonePricing?.basePrice || 5);
      const extraRate = hourlyList[0]?.extraPrice ? parseFloat(hourlyList[0].extraPrice) : (zonePricing?.extraPrice || 10);
      const rule = hourlyList[0]?.roundingRule || 'Per 15 Minutes';

      const modelsToRender = modelsPool.filter((m) => {
        const mName = (m.name || m.evegah_model_name || '').toLowerCase().trim();
        const matchesHourly =
          hourlyList.length === 0 ||
          hourlyList.some((h) => (h.model || '').toLowerCase().trim().includes(mName) || mName.includes((h.model || '').toLowerCase().trim()));
        const hasAvail = availableModelNames.some((avail) => avail.includes(mName) || mName.includes(avail));
        return matchesHourly && hasAvail;
      });

      const mapped = modelsToRender.map((m, index) => {
        const mName = m.name || m.evegah_model_name || `Model ${index + 1}`;
        const mKey = mName.toLowerCase();
        const specificHourly = hourlyList.find((h) => (h.model || '').toLowerCase().trim() === mKey) || hourlyList[0];
        const mBase = specificHourly?.basePrice ? parseFloat(specificHourly.basePrice) : baseRate;
        const mExtra = specificHourly?.extraPrice ? parseFloat(specificHourly.extraPrice) : extraRate;
        const mRule = specificHourly?.roundingRule || rule;
        const depositAmount = specificHourly?.deposit !== undefined ? parseFloat(specificHourly.deposit) : 0;

        let resolvedImg = null;
        if (m.main_image || m.vehicle_image) {
          const remoteUrl = resolveMediaUrl(m.main_image || m.vehicle_image);
          if (remoteUrl) resolvedImg = { uri: remoteUrl };
        }
        if (!resolvedImg) {
          resolvedImg = LOCAL_FALLBACK_IMAGES[mKey] || LOCAL_FALLBACK_IMAGES['evegah mink'];
        }

        const speedVal = m.top_speed || m.topSpeed || `${30 + index * 15} km/h`;
        const rangeVal = m.range || `${70 + index * 15}-${90 + index * 15} km`;

        return {
          id: String(m.id || m.code || `model-${index}`),
          modelId: m.id,
          name: mName,
          tag: m.category || 'E-Scooter',
          edition: m.tagline || m.edition || 'Smart Li-Ion Edition',
          line: m.description || 'Smooth city miles',
          price: `₹${mBase}/hr`,
          priceNum: mBase,
          packagePrice: mBase,
          packageDuration: 0,
          packageName: 'Hourly / Minute Rental',
          emi: `+₹${mExtra} ${mRule}`,
          km: rangeVal,
          range: rangeVal,
          rangeNum: parseInt(rangeVal) || 75,
          fuel: 'Electric',
          transmission: 'Automatic',
          rto: 'GJ06',
          Zone: `Zone · ${activeZoneData?.name || zoneLabel}`,
          speed: typeof speedVal === 'number' ? `${speedVal} km/h` : speedVal,
          speedNum: parseInt(speedVal) || 40,
          deposit: depositAmount,
          image: resolvedImg,
          rawModel: m,
          isHourly: true,
        };
      });

      setVehiclesList(mapped);
      setDistinctModelNames(Array.from(new Set(mapped.map((v) => v.name))));
      return;
    }

    // Direct model listing for all available models in zone (no rental package selector)
    const modelsToRender = modelsPool.filter((m) => {
      const mName = (m.name || m.evegah_model_name || '').toLowerCase().trim();
      return availableModelNames.some((avail) => avail.includes(mName) || mName.includes(avail));
    });

    const mapped = modelsToRender.map((m, index) => {
      const mName = m.name || m.evegah_model_name || `Model ${index + 1}`;
      const mKey = mName.toLowerCase();

      // Find packages matching this specific model or generic zone packages
      const modelPkgs = zonePackagesList.filter((p) => {
        if (!p.model) return true;
        const pMod = p.model.toLowerCase().trim();
        return pMod.includes(mKey) || mKey.includes(pMod);
      });

      // Match daily package first, then any available package, or fallback
      const matchingPkg =
        modelPkgs.find((p) => p.duration === 1 || p.name.toLowerCase().includes('daily')) ||
        modelPkgs[0] || {
          id: `pkg_default_${index}`,
          name: 'Daily Rental',
          price: m.daily_rate || m.price || 249,
          duration: 1,
          deposit: m.deposit !== undefined ? m.deposit : 0,
        };

      const pkgPrice = parseFloat(matchingPkg.price) || 0;
      const pkgDur = matchingPkg.duration || 1;
      const depositAmount = matchingPkg.deposit !== undefined ? parseFloat(matchingPkg.deposit) : 0;
      const isDaily = pkgDur === 1 || matchingPkg.name.toLowerCase().includes('daily');
      const isWeekly = pkgDur === 7 || matchingPkg.name.toLowerCase().includes('weekly');
      const isMonthly = pkgDur === 30 || matchingPkg.name.toLowerCase().includes('monthly');

      let priceStr = '';
      let emiRate = '';

      if (isDaily) {
        priceStr = `₹${pkgPrice}/day`;
        emiRate = '';
      } else if (isWeekly) {
        priceStr = `₹${pkgPrice}/week`;
        const dailyVal = pkgPrice / 7;
        const dailyFormatted = pkgPrice % 7 === 0 ? dailyVal : dailyVal.toFixed(2);
        emiRate = `₹${dailyFormatted}/day`;
      } else if (isMonthly) {
        priceStr = `₹${pkgPrice}/month`;
        const dailyVal = pkgPrice / 30;
        const dailyFormatted = pkgPrice % 30 === 0 ? dailyVal : dailyVal.toFixed(2);
        emiRate = `₹${dailyFormatted}/day`;
      } else {
        priceStr = `₹${pkgPrice}/${pkgDur} days`;
        emiRate = `₹${(pkgPrice / pkgDur).toFixed(2)}/day`;
      }

      let resolvedImg = null;
      if (m.main_image || m.vehicle_image) {
        const remoteUrl = resolveMediaUrl(m.main_image || m.vehicle_image);
        if (remoteUrl) resolvedImg = { uri: remoteUrl };
      }
      if (!resolvedImg) {
        resolvedImg = LOCAL_FALLBACK_IMAGES[mKey] || LOCAL_FALLBACK_IMAGES['evegah mink'];
      }

      const speedVal = m.top_speed || m.topSpeed || `${30 + index * 15} km/h`;
      const rangeVal = m.range || `${70 + index * 15}-${90 + index * 15} km`;

      return {
        id: String(m.id || m.code || `model-${index}`),
        modelId: m.id,
        name: mName,
        tag: m.category || 'E-Scooter',
        edition: m.tagline || m.edition || 'Smart Li-Ion Edition',
        line: m.description || 'Smooth city miles',
        price: priceStr,
        priceNum: pkgPrice,
        packagePrice: pkgPrice,
        packageDuration: pkgDur,
        packageName: matchingPkg.name,
        emi: emiRate,
        km: rangeVal,
        range: rangeVal,
        rangeNum: parseInt(rangeVal) || 75,
        fuel: 'Electric',
        transmission: 'Automatic',
        rto: 'GJ06',
        Zone: `Zone · ${activeZoneData?.name || zoneLabel}`,
        speed: typeof speedVal === 'number' ? `${speedVal} km/h` : speedVal,
        speedNum: parseInt(speedVal) || 40,
        deposit: depositAmount,
        image: resolvedImg,
        rawModel: m,
        selectedPackage: matchingPkg,
      };
    });

    setVehiclesList(mapped);
    setDistinctModelNames(Array.from(new Set(mapped.map((v) => v.name))));
  }, [
    zonePackagesList,
    zoneAvailableVehicles,
    rawBackendModels,
    isHourlyZone,
    activeZoneData,
    isLoading,
  ]);

  // Real Filtered & Sorted Vehicles
  const filteredVehicles = useMemo(() => {
    let list = [...vehiclesList];

    // 1. Model Filter
    if (selectedModel !== 'all') {
      list = list.filter((v) => v.name.toLowerCase() === selectedModel.toLowerCase());
    }

    // 2. Price Range Filter
    if (priceRange === 'under200') {
      list = list.filter((v) => v.priceNum < 200);
    } else if (priceRange === '200_300') {
      list = list.filter((v) => v.priceNum >= 200 && v.priceNum <= 300);
    } else if (priceRange === 'above300') {
      list = list.filter((v) => v.priceNum > 300);
    }

    // 3. Saved Filter
    if (savedFilter) {
      list = list.filter((v) => !!savedIds[v.id]);
    }

    // 4. Sorting
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.priceNum - b.priceNum);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.priceNum - a.priceNum);
    } else if (sortBy === 'speed') {
      list.sort((a, b) => b.speedNum - a.speedNum);
    } else if (sortBy === 'range') {
      list.sort((a, b) => b.rangeNum - a.rangeNum);
    }

    return list;
  }, [vehiclesList, selectedModel, priceRange, savedFilter, savedIds, sortBy]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (sortBy !== 'recommended') count++;
    if (priceRange !== 'all') count++;
    if (selectedModel !== 'all') count++;
    if (savedFilter) count++;
    return count;
  }, [sortBy, priceRange, selectedModel, savedFilter]);

  const toggleSave = (id) => {
    setSavedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'price_asc':
        return 'Price: Low to High';
      case 'price_desc':
        return 'Price: High to Low';
      case 'speed':
        return 'Top Speed';
      case 'range':
        return 'Longest Range';
      default:
        return 'Sort';
    }
  };

  const getPriceRangeLabel = () => {
    switch (priceRange) {
      case 'under200':
        return 'Under ₹200/d';
      case '200_300':
        return '₹200 - ₹300/d';
      case 'above300':
        return 'Above ₹300/d';
      default:
        return 'Price Range';
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topLeft}>
          <Pressable hitSlop={8} onPress={onBack} style={styles.menuBtn}>
            <Ionicons name="arrow-back" size={22} color={PURPLE} />
          </Pressable>
          <View style={styles.brandWrap}>
            <Text style={styles.brandTitle}>EVegah</Text>
          </View>
        </View>

        <View style={styles.topRight}>
          <Pressable style={styles.cityPill} onPress={onOpenLocation}>
            <Text style={styles.cityPillText}>{zoneLabel}</Text>
            <Ionicons name="caret-down" size={12} color={PURPLE} />
          </Pressable>
          <Pressable
            style={styles.circleIcon}
            onPress={() => setModelModalOpen(true)}
          >
            <Ionicons name="search-outline" size={18} color={PURPLE} />
          </Pressable>
          <Pressable
            style={[styles.circleIcon, savedFilter && { backgroundColor: '#FCE7F3' }]}
            onPress={() => setSavedFilter((v) => !v)}
          >
            <Ionicons
              name={savedFilter ? 'heart' : 'heart-outline'}
              size={18}
              color={savedFilter ? '#E0245E' : PURPLE}
            />
          </Pressable>
        </View>
      </View>

      {/* Fixed Header Elements: Banner and Zone Filters (Do not scroll down on refresh) */}
      <View style={styles.fixedHeaderArea}>
        {/* Animated Navratri Header Banner */}
        <View style={styles.bannerWrap}>
          <Animated.View style={[StyleSheet.absoluteFillObject, bannerBgAnimStyle]}>
            <Image
              source={require('../assets/home/ride-more-slide.png')}
              style={styles.bannerBg}
              contentFit="cover"
            />
          </Animated.View>
          <LinearGradient
            colors={['rgba(180, 48, 24, 0.35)', 'rgba(255, 180, 90, 0.1)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 90,
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
              },
              bannerShimmerStyle,
            ]}
          />
          <Animated.View style={[styles.bannerLeftBadge, bannerBadgeAnimStyle]}>
            <Ionicons name="sparkles" size={14} color="#FFD24C" />
            <Text style={styles.bannerHello}>HELLO,</Text>
            <Text style={styles.bannerNavratri}>NAVRATRI</Text>
          </Animated.View>
          <Animated.View style={[styles.bannerRightArt, bannerArtAnimStyle]}>
            <Image
              source={require('../assets/home/garba.png')}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
            />
          </Animated.View>
        </View>

        {/* Real Interactive Filter Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* Active Filters Master Reset / Indicator */}
          <Pressable
            style={[styles.filterChip, activeFiltersCount > 0 && styles.filterChipActive]}
            onPress={() => {
              if (activeFiltersCount > 0) {
                setSortBy('recommended');
                setPriceRange('all');
                setSelectedModel('all');
                setSavedFilter(false);
              } else {
                setPriceModalOpen(true);
              }
            }}
          >
            <Ionicons
              name={activeFiltersCount > 0 ? 'close-circle' : 'filter'}
              size={14}
              color={activeFiltersCount > 0 ? '#FFFFFF' : PURPLE}
            />
            <Text
              style={[
                styles.filterChipText,
                activeFiltersCount > 0 && styles.filterChipTextActive,
              ]}
            >
              {activeFiltersCount > 0 ? 'Reset' : 'Filter'}
            </Text>
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          </Pressable>

          {/* Sort Filter Chip */}
          <Pressable
            style={[styles.filterChip, sortBy !== 'recommended' && styles.filterChipActive]}
            onPress={() => setSortModalOpen(true)}
          >
            <Ionicons
              name="swap-vertical"
              size={14}
              color={sortBy !== 'recommended' ? '#FFFFFF' : PURPLE}
            />
            <Text
              style={[
                styles.filterChipText,
                sortBy !== 'recommended' && styles.filterChipTextActive,
              ]}
            >
              {getSortLabel()}
            </Text>
            <Ionicons
              name="caret-down"
              size={11}
              color={sortBy !== 'recommended' ? '#FFFFFF' : PURPLE}
            />
          </Pressable>

          {/* Price Range Filter Chip */}
          <Pressable
            style={[styles.filterChip, priceRange !== 'all' && styles.filterChipActive]}
            onPress={() => setPriceModalOpen(true)}
          >
            <Text
              style={[
                styles.filterChipText,
                priceRange !== 'all' && styles.filterChipTextActive,
              ]}
            >
              {getPriceRangeLabel()}
            </Text>
            <Ionicons
              name="caret-down"
              size={11}
              color={priceRange !== 'all' ? '#FFFFFF' : PURPLE}
            />
          </Pressable>

          {/* Make + Models Filter Chip */}
          <Pressable
            style={[styles.filterChip, selectedModel !== 'all' && styles.filterChipActive]}
            onPress={() => setModelModalOpen(true)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedModel !== 'all' && styles.filterChipTextActive,
              ]}
            >
              {selectedModel === 'all' ? 'Make + Models' : selectedModel}
            </Text>
            <Ionicons
              name="caret-down"
              size={11}
              color={selectedModel !== 'all' ? '#FFFFFF' : PURPLE}
            />
          </Pressable>
        </ScrollView>

        {/* Sub-Filter Pill Bar: Quick Price & Model Pills (without Save Filters button) */}
        {(priceRange !== 'all' || selectedModel !== 'all') ? (
          <View style={styles.subFilterRow}>
            {priceRange !== 'all' ? (
              <Pressable
                style={[styles.filterChip, styles.filterChipActive]}
                onPress={() => setPriceRange('all')}
              >
                <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
                  {getPriceRangeLabel()}
                </Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            ) : null}

            {selectedModel !== 'all' ? (
              <Pressable
                style={[styles.filterChip, styles.filterChipActive]}
                onPress={() => setSelectedModel('all')}
              >
                <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
                  {selectedModel}
                </Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.vehicleListScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PURPLE]}
            tintColor={PURPLE}
          />
        }
      >
        {/* Dynamic Results Heading */}
        <Text style={styles.resultsHeading}>
          <Text style={styles.resultsCount}>{filteredVehicles.length}</Text> EV{' '}
          {filteredVehicles.length === 1 ? 'Model' : 'Models'} available in {zoneLabel}
        </Text>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={PURPLE} />
            <Text style={styles.loadingText}>Checking live EV availability in {zoneLabel}...</Text>
          </View>
        ) : null}

        {/* Vehicle Cards: shows model name as per backend (without fixed 2026) */}
        {filteredVehicles.map((item, index) => {
          const isSaved = !!savedIds[item.id];
          return (
            <Animated.View key={item.id} entering={cardEnter(index)} style={styles.cardWrap}>
              <Pressable
                style={styles.card}
                onPress={() => onSelectVehicle?.(item)}
              >
                <View style={styles.cardImageStage}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F3F2F7', '#EAE8F2']}
                    locations={[0, 0.62, 1]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.stageFloor} />
                  <Image source={item.image} style={styles.cardVehicleImg} contentFit="contain" />
                  <Pressable
                    hitSlop={10}
                    style={styles.cardHeart}
                    onPress={() => toggleSave(item.id)}
                  >
                    <Ionicons
                      name={isSaved ? 'heart' : 'heart-outline'}
                      size={24}
                      color={isSaved ? '#E0245E' : PURPLE}
                    />
                  </Pressable>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    {/* Shows vehicle models name as per backend without fixed 2026 */}
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.cardPrice}>{item.price}</Text>
                  </View>

                  <View style={styles.cardSubRow}>
                    <Text style={styles.cardEdition} numberOfLines={1}>
                      {item.edition}
                    </Text>
                    {item.emi ? (
                      <View style={styles.emiWrap}>
                        <Text style={styles.cardEmi}>{item.emi}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.pillsRow}>
                    {[item.km, item.fuel, item.transmission, item.rto].map((pill) => (
                      <View key={pill} style={styles.specPill}>
                        <Text style={styles.specPillText}>{pill}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.ZoneRow}>
                    <View style={styles.ZoneDiamond}>
                      <Text style={styles.ZoneDiamondText}>e</Text>
                    </View>
                    <Text style={styles.ZoneText} numberOfLines={1}>
                      {item.Zone}
                    </Text>
                  </View>

                  <View style={styles.assuredBadge}>
                    <View style={[styles.ZoneDiamond, styles.assuredDiamond]}>
                      <Text style={[styles.ZoneDiamondText, styles.assuredDiamondText]}>e</Text>
                    </View>
                    <Text style={styles.assuredText}>Assured</Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {filteredVehicles.length === 0 && (
          <View style={styles.noVehiclesWrap}>
            <Image
              source={require('../assets/vehicles/novehicle.png')}
              style={styles.noVehiclesImg}
              contentFit="contain"
            />
            <Text style={styles.noVehiclesTitle}>
              {vehiclesList.length === 0
                ? `No EVs Available in ${zoneLabel}`
                : 'No vehicles match selected filter'}
            </Text>
            <Text style={styles.noVehiclesSub}>
              {vehiclesList.length === 0
                ? 'All electric scooters at this hub are currently on rent or charging. Please choose another nearby hub to start your booking.'
                : 'Try selecting all models or reset your price filter.'}
            </Text>
            <Pressable
              style={styles.resetFilterBtn}
              onPress={() => {
                if (vehiclesList.length === 0) {
                  onOpenLocation?.();
                } else {
                  setSortBy('recommended');
                  setPriceRange('all');
                  setSelectedModel('all');
                  setSavedFilter(false);
                }
              }}
            >
              <Text style={styles.resetFilterBtnText}>
                {vehiclesList.length === 0 ? 'Choose Another Zone' : 'Reset All Filters'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Floating Call Action Button */}
      <Pressable
        onPress={() => Linking.openURL('tel:18008898791')}
        style={[styles.callFab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
      >
        <Ionicons name="call" size={24} color="#FFFFFF" />
      </Pressable>

      {/* ── Sort Filter Modal ── */}
      <Modal
        visible={sortModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSortModalOpen(false)}
        >
          <View style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Sort Vehicles</Text>
              <Pressable hitSlop={8} onPress={() => setSortModalOpen(false)}>
                <Ionicons name="close" size={20} color="#1E293B" />
              </Pressable>
            </View>

            {[
              { id: 'recommended', label: 'Recommended' },
              { id: 'price_asc', label: 'Price: Low to High' },
              { id: 'price_desc', label: 'Price: High to Low' },
              { id: 'speed', label: 'Top Speed' },
              { id: 'range', label: 'Longest Range' },
            ].map((opt) => {
              const selected = sortBy === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                  onPress={() => {
                    setSortBy(opt.id);
                    setSortModalOpen(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}>
                    {opt.label}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={PURPLE} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── Price Range Filter Modal ── */}
      <Modal
        visible={priceModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPriceModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPriceModalOpen(false)}
        >
          <View style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Price Range (Per Day)</Text>
              <Pressable hitSlop={8} onPress={() => setPriceModalOpen(false)}>
                <Ionicons name="close" size={20} color="#1E293B" />
              </Pressable>
            </View>

            {[
              { id: 'all', label: 'All Prices' },
              { id: 'under200', label: 'Under ₹200 / day' },
              { id: '200_300', label: '₹200 – ₹300 / day' },
              { id: 'above300', label: 'Above ₹300 / day' },
            ].map((opt) => {
              const selected = priceRange === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                  onPress={() => {
                    setPriceRange(opt.id);
                    setPriceModalOpen(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}>
                    {opt.label}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={PURPLE} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── Make + Models Filter Modal ── */}
      <Modal
        visible={modelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModelModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModelModalOpen(false)}
        >
          <View style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Select Vehicle Model</Text>
              <Pressable hitSlop={8} onPress={() => setModelModalOpen(false)}>
                <Ionicons name="close" size={20} color="#1E293B" />
              </Pressable>
            </View>

            {['all', ...distinctModelNames].map((modelName) => {
              const selected = selectedModel === modelName;
              return (
                <Pressable
                  key={modelName}
                  style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                  onPress={() => {
                    setSelectedModel(modelName);
                    setModelModalOpen(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}>
                    {modelName === 'all' ? 'All Models' : modelName}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={PURPLE} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandDiamond: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E5254B',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDiamondText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    transform: [{ rotate: '-45deg' }],
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '800',
    fontStyle: 'italic',
    color: PURPLE,
    letterSpacing: -0.4,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F4F8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cityPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: PURPLE,
  },
  circleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerWrap: {
    width: SCREEN_W,
    height: 118,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#D95B38',
  },
  bannerBg: {
    width: '100%',
    height: '100%',
  },
  bannerLeftBadge: {
    position: 'absolute',
    left: 24,
    top: 22,
    alignItems: 'center',
  },
  bannerHello: {
    marginTop: 2,
    fontSize: 19,
    fontWeight: '900',
    color: '#B6292B',
    backgroundColor: '#FFF0D6',
    paddingHorizontal: 8,
    borderRadius: 4,
    letterSpacing: 0.4,
  },
  bannerNavratri: {
    marginTop: -2,
    fontSize: 22,
    fontWeight: '900',
    color: '#B6292B',
    backgroundColor: '#FFF0D6',
    paddingHorizontal: 10,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  bannerRightArt: {
    position: 'absolute',
    right: 28,
    bottom: -4,
    width: 142,
    height: 120,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E0EA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: CHIP_BG,
    borderColor: CHIP_BORDER,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE,
  },
  filterChipTextActive: {
    fontWeight: '700',
  },
  filterCountBadge: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#3C0E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  fixedHeaderArea: {
    backgroundColor: '#FAFAFC',
  },
  vehicleListScroll: {
    flex: 1,
  },
  subFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    gap: 8,
  },
  resultsHeading: {
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: PURPLE,
  },
  resultsCount: {
    fontWeight: '800',
  },
  cardWrap: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    overflow: 'hidden',
    shadowColor: '#1E0D36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  cardImageStage: {
    height: 158,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  stageFloor: {
    position: 'absolute',
    left: -20,
    right: -20,
    bottom: -28,
    height: 76,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-4deg' }],
  },
  cardVehicleImg: {
    width: 215,
    height: 138,
    marginTop: 6,
  },
  cardHeart: {
    position: 'absolute',
    top: 14,
    right: 16,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: PURPLE,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: PURPLE,
  },
  cardSubRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardEdition: {
    flex: 1,
    fontSize: 13,
    color: '#6C6676',
  },
  emiWrap: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B59640',
    paddingBottom: 1,
  },
  cardEmi: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B59640',
  },
  pillsRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specPill: {
    backgroundColor: '#F6F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  specPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: PURPLE,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1EFF6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  ZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 8,
  },
  ZoneDiamond: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.2,
    borderColor: '#8B8596',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ZoneDiamondText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8B8596',
    transform: [{ rotate: '-45deg' }],
  },
  ZoneText: {
    fontSize: 12,
    color: '#7D7788',
    fontWeight: '500',
  },
  assuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  assuredDiamond: {
    borderColor: ACCENT_PURPLE,
  },
  assuredDiamondText: {
    color: ACCENT_PURPLE,
  },
  assuredText: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE,
  },
  callFab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#300D4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveFilterPillActive: {
    backgroundColor: '#D94E43',
    borderColor: '#D94E43',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  noVehiclesWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  noVehiclesImg: {
    width: 200,
    height: 130,
    marginBottom: 8,
  },
  noVehiclesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  noVehiclesSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 6,
  },
  resetFilterBtn: {
    backgroundColor: PURPLE,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  resetFilterBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  filterModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFF6',
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: PURPLE,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  filterOptionRowActive: {
    backgroundColor: '#F3EEF8',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  filterOptionTextActive: {
    color: PURPLE,
    fontWeight: '800',
  },
});
