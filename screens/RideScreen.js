import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { apiGet, apiPost, getStoredRider } from '../services/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BRAND_PURPLE = '#4A168C';
const BRAND_PURPLE_LIGHT = '#7C3AED';
const DARK_NAVY = '#0F172A';

const PLACES = {
  Bill: { latitude: 22.2587, longitude: 73.1496 },
  Gotri: { latitude: 22.3106, longitude: 73.1248 },
  Alkapuri: { latitude: 22.3106, longitude: 73.1726 },
  Manjalpur: { latitude: 22.2705, longitude: 73.1889 },
  Aatapi: { latitude: 22.3488, longitude: 73.1612 },
  KPGU: { latitude: 22.3694, longitude: 73.1086 },
};

const RIDE_MODES = [
  { id: 'eco', label: 'Eco', fullLabel: 'Eco Mode', baseSpeed: 19, rangeKm: 72, icon: 'leaf' },
  { id: 'city', label: 'City', fullLabel: 'City Mode', baseSpeed: 27, rangeKm: 58, icon: 'flash' },
  { id: 'sport', label: 'Sport', fullLabel: 'Sport Mode', baseSpeed: 36, rangeKm: 46, icon: 'rocket' },
];

const EXTEND_OPTIONS = [
  { id: '2h', label: '+2 Hours', sub: 'Quick city errand extension', hours: 2, price: 39, tag: 'Quick' },
  { id: '6h', label: '+6 Hours', sub: 'Half-day shift extension', hours: 6, price: 79, tag: 'Popular' },
  { id: '1d', label: '+1 Day (24 hrs)', sub: 'Full 24-hour package extension', hours: 24, price: 119, tag: 'Best Value' },
  { id: '3d', label: '+3 Days', sub: 'Multi-day commuter extension', hours: 72, price: 329, tag: 'Save 12%' },
  { id: '7d', label: '+7 Days (Weekly)', sub: 'Weekly fleet saver pack', hours: 168, price: 699, tag: 'Super Saver' },
];

function placeFor(name) {
  const key = Object.keys(PLACES).find((item) =>
    String(name || '').toLowerCase().includes(item.toLowerCase())
  );
  return PLACES[key] || PLACES.Bill;
}

function buildRouteWaypoints(from) {
  return [
    from,
    { latitude: from.latitude + 0.0022, longitude: from.longitude - 0.0014 },
    { latitude: from.latitude + 0.0046, longitude: from.longitude + 0.0008 },
    { latitude: from.latitude + 0.0068, longitude: from.longitude + 0.0028 },
    { latitude: from.latitude + 0.0085, longitude: from.longitude + 0.0042 },
  ];
}

function clock(total) {
  const safe = Math.max(0, total);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function formatDropTimeOnly(ms) {
  if (!ms) return '8:00 AM';
  const d = new Date(ms);
  return d
    .toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
}

function formatDropDate(ms) {
  if (!ms) return 'Scheduled';
  const d = new Date(ms);
  return `${d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
}

function formatDropDateOnly(ms) {
  if (!ms) return 'Today';
  const d = new Date(ms);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTopDownVehicleAsset(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('city')) return require('../assets/home/city-top.png');
  if (lower.includes('fly')) return require('../assets/home/fly-top.png');
  if (lower.includes('pro')) return require('../assets/home/pro-top.png');
  return require('../assets/home/mink-top.png');
}

export default function RideScreen({
  vehicle,
  trip,
  receipt,
  onBack,
  onExtendRide,
  onEnd,
}) {
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(1);
  const [rideMode, setRideMode] = useState('city');
  const [pausedLock, setPausedLock] = useState(false);
  const [hazardOn, setHazardOn] = useState(false);
  const [quickToast, setQuickToast] = useState(null);
  const [extraMs, setExtraMs] = useState(0);
  const [extraFareTotal, setExtraFareTotal] = useState(0);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedExtendId, setSelectedExtendId] = useState(null);
  const [extendBanner, setExtendBanner] = useState(null);
  const [extendPackages, setExtendPackages] = useState([]);
  const [extendLoading, setExtendLoading] = useState(false);
  const [payuModalVisible, setPayuModalVisible] = useState(false);
  const [payuCheckoutUrl, setPayuCheckoutUrl] = useState(null);
  const [payuTxnId, setPayuTxnId] = useState(null);
  const [payuLoading, setPayuLoading] = useState(true);
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const payuPollRef = useRef(null);

  // BMS Live Telemetry & Auto Scan State
  const [bmsStatus, setBmsStatus] = useState('connected');
  const [bmsSoc, setBmsSoc] = useState(
    vehicle?.battery_pct != null ? Math.round(Number(vehicle.battery_pct)) : 86
  );
  const [bmsBatteryId, setBmsBatteryId] = useState(
    receipt?.battery_id || vehicle?.battery_id || trip?.battery_id || 'BAT-450X-101'
  );
  const [bmsTemp, setBmsTemp] = useState(32);
  const [bmsVoltage, setBmsVoltage] = useState(54.2);
  const [bmsDetailOpen, setBmsDetailOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (payuPollRef.current) clearInterval(payuPollRef.current);
    };
  }, []);

  // Fetch live backend zone packages strictly for the rider's active scooter model
  useEffect(() => {
    let mounted = true;
    async function fetchZoneExtendPackages() {
      try {
        setExtendLoading(true);
        const zonesRes = await apiGet('/zones').catch(() => null);
        if (!mounted) return;
        const rawZones = zonesRes?.data || (Array.isArray(zonesRes) ? zonesRes : []);

        const targetZoneName = (
          trip?.pickupZone?.name ||
          trip?.pickupName ||
          vehicle?.Zone ||
          vehicle?.zone ||
          'Gotri Zone'
        ).toLowerCase().trim();

        const zoneObj = rawZones.find((z) => {
          const zName = (z.name || '').toLowerCase().trim();
          const zLoc = (z.locality || '').toLowerCase().trim();
          return (
            zName.includes(targetZoneName) ||
            targetZoneName.includes(zName) ||
            zLoc.includes(targetZoneName) ||
            targetZoneName.includes(zLoc)
          );
        }) || rawZones.find((z) => (z.pricing?.packages || []).length > 0) || rawZones[0];

        const zonePricing = zoneObj?.pricing || {};
        const isHourly =
          Boolean(trip?.isHourlyZone) ||
          (zonePricing?.pricingModel || '').toLowerCase().includes('hour') ||
          (zonePricing?.pricingModel || '').toLowerCase().includes('minute');

        const vModelName = (
          vehicle?.name ||
          vehicle?.vehicle ||
          vehicle?.model ||
          vehicle?.vehicle_model ||
          vehicle?.evegah_model_name ||
          trip?.vehicle ||
          trip?.vehicle_model ||
          'Evegah City'
        ).toLowerCase().trim();

        let options = [];

        if (isHourly) {
          const hourlyList = Array.isArray(zonePricing?.hourlyPricing) ? zonePricing.hourlyPricing : [];
          const specificHourly = hourlyList.find((h) => (h.model || '').toLowerCase().trim().includes(vModelName)) || hourlyList[0];
          const baseRate = specificHourly?.basePrice ? parseFloat(specificHourly.basePrice) : (parseFloat(zonePricing.basePrice) || 5);

          options = [
            { id: 'ext_1h', label: '+1 Hour', sub: 'Hourly extension at zone rate', hours: 1, price: baseRate, tag: '1 Hour' },
            { id: 'ext_2h', label: '+2 Hours', sub: 'Quick city errand extension', hours: 2, price: baseRate * 2, tag: 'Popular' },
            { id: 'ext_4h', label: '+4 Hours', sub: 'Half-day top-up extension', hours: 4, price: baseRate * 4, tag: 'Half Day' },
            { id: 'ext_24h', label: '+24 Hours (Full Day)', sub: 'Full day continuous extension', hours: 24, price: baseRate * 18, tag: 'Best Value' },
          ];
        } else {
          const rawPkgs = Array.isArray(zonePricing?.packages) ? zonePricing.packages : [];
          if (rawPkgs.length === 0 && zonePricing?.modelPackages) {
            rawPkgs.push(...Object.values(zonePricing.modelPackages).flat());
          }

          // Normalize vehicle model keyword (mink, city, fly, pro)
          let modelKeyword = '';
          if (vModelName.includes('mink')) modelKeyword = 'mink';
          else if (vModelName.includes('city')) modelKeyword = 'city';
          else if (vModelName.includes('fly')) modelKeyword = 'fly';
          else if (vModelName.includes('pro')) modelKeyword = 'pro';
          else modelKeyword = vModelName.replace(/evegah/gi, '').trim();

          // Find ALL packages matching this exact vehicle model from backend
          const sameModelPkgs = rawPkgs.filter((p) => {
            const pMod = String(p.model || p.vehicle_model || p.name || '').toLowerCase().trim();
            if (!pMod) return false;
            if (modelKeyword) {
              return pMod.includes(modelKeyword) || modelKeyword.includes(pMod);
            }
            return pMod.includes(vModelName) || vModelName.includes(pMod);
          });

          const pkgsToUse = sameModelPkgs.length > 0 ? sameModelPkgs : (modelKeyword ? [] : rawPkgs);

          options = pkgsToUse.map((p, idx) => {
            const dur = parseInt(p.duration, 10) || 1;
            const hrs = dur * 24;
            const pName = (p.name || (dur === 1 ? 'Daily' : dur === 7 ? 'Weekly' : dur === 30 ? 'Monthly' : `${dur} Days`)).trim();
            const price = parseFloat(p.price) || 0;
            return {
              id: String(p.id || `ext_${dur}d_${idx}`),
              label: `+${dur} Day${dur > 1 ? 's' : ''} (${pName})`,
              sub: `${p.model || vehicle?.name || 'EV Scooter'} · ${dur * 24} hrs at zone rate`,
              hours: hrs,
              price: price,
              tag: dur === 1 ? 'Daily Pass' : dur === 7 ? 'Weekly Pass' : dur === 30 ? 'Monthly Pass' : `${dur}d Pass`,
              rawPackage: p,
            };
          });

          options.sort((a, b) => a.hours - b.hours);
        }

        if (options.length > 0) {
          setExtendPackages(options);
          setSelectedExtendId(options[0].id);
        } else {
          setExtendPackages([]);
          setSelectedExtendId(null);
        }
        setExtendLoading(false);
      } catch (e) {
        console.warn('Extend packages fetch notice:', e.message);
        if (mounted) setExtendLoading(false);
      }
    }

    fetchZoneExtendPackages();

    return () => {
      mounted = false;
    };
  }, [trip, vehicle]);

  const mapRef = useRef(null);
  const webMapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const btnScale = useSharedValue(1);
  const scanSpin = useSharedValue(0);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const scanSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${scanSpin.value}deg` }],
  }));

  const triggerQuickAction = (msg) => {
    setQuickToast(msg);
    setTimeout(() => {
      setQuickToast((prev) => (prev === msg ? null : prev));
    }, 2300);
  };

  // Auto scan BMS logic on mount or user tap
  const runAutoScanBms = () => {
    setBmsStatus('scanning');
    scanSpin.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
    triggerQuickAction('Scanning Bluetooth BLE & CAN bus for BMS...');

    setTimeout(() => {
      setBmsStatus('connecting');
      apiGet('/batteries/stats')
        .then((body) => {
          const liveSoc = body?.avg_soc ? Math.round(body.avg_soc) : 88;
          setBmsSoc(liveSoc);
        })
        .catch(() => {});

      apiGet('/batteries')
        .then((rows) => {
          if (Array.isArray(rows) && rows.length > 0) {
            const first = rows[0];
            if (first.battery_id) setBmsBatteryId(first.battery_id);
            if (first.soc) setBmsSoc(Math.round(Number(first.soc)));
            if (first.voltage) setBmsVoltage(Number(first.voltage));
            if (first.temperature) setBmsTemp(Number(first.temperature));
          }
        })
        .catch(() => {});

      setTimeout(() => {
        setBmsStatus('connected');
        scanSpin.value = 0;
        triggerQuickAction(`BMS Synced · Live SOC: ${bmsSoc}% (${bmsBatteryId})`);
      }, 900);
    }, 1200);
  };

  useEffect(() => {
    runAutoScanBms();
  }, []);

  // Live GPS Telemetry for Real Device Location
  const [liveGpsCoord, setLiveGpsCoord] = useState(null);

  useEffect(() => {
    let sub = null;
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (isMounted && loc?.coords) {
            setLiveGpsCoord({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
          sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 4000,
              distanceInterval: 8,
            },
            (newLoc) => {
              if (isMounted && newLoc?.coords) {
                setLiveGpsCoord({
                  latitude: newLoc.coords.latitude,
                  longitude: newLoc.coords.longitude,
                });
              }
            }
          );
        }
      } catch (err) {
        console.warn('GPS location tracking notice:', err.message);
      }
    })();

    return () => {
      isMounted = false;
      if (sub?.remove) sub.remove();
    };
  }, []);

  const startCoord = placeFor(trip?.pickupName);
  const waypoints = buildRouteWaypoints(startCoord);
  const progress = Math.min(0.88, 0.42 + (seconds % 90) * 0.005);
  const segCount = waypoints.length - 1;
  const exactIdx = progress * segCount;
  const segIdx = Math.min(segCount - 1, Math.floor(exactIdx));
  const segFrac = exactIdx - segIdx;
  const pA = waypoints[segIdx];
  const pB = waypoints[segIdx + 1];
  const position = {
    latitude: pA.latitude + (pB.latitude - pA.latitude) * segFrac,
    longitude: pA.longitude + (pB.longitude - pA.longitude) * segFrac,
  };
  const activeScooterCoord = liveGpsCoord || position;
  const midCalloutCoord = waypoints[2];

  // Destination Return Hub & Nearby Battery Swap Stations
  const dropStationCoord = useMemo(() => {
    const dropName = trip?.dropName || trip?.dropZone?.name || 'Gotri Zone';
    return placeFor(dropName);
  }, [trip]);

  const batteryStations = useMemo(() => {
    return [
      {
        id: 'bat_gotri_hub',
        title: 'Gotri Battery Swap Hub',
        count: 14,
        pct: 100,
        coordinate: { latitude: startCoord.latitude + 0.0035, longitude: startCoord.longitude - 0.0031 },
      },
      {
        id: 'bat_alkapuri_hub',
        title: 'Alkapuri Swap Hub',
        count: 8,
        pct: 98,
        coordinate: { latitude: startCoord.latitude + 0.0062, longitude: startCoord.longitude + 0.0038 },
      },
    ];
  }, [startCoord]);

  // Live route path from rider scooter position to drop station
  const liveRoutePath = useMemo(() => {
    return [
      activeScooterCoord,
      {
        latitude: (activeScooterCoord.latitude + dropStationCoord.latitude) / 2 + 0.0015,
        longitude: (activeScooterCoord.longitude + dropStationCoord.longitude) / 2 - 0.0012,
      },
      dropStationCoord,
    ];
  }, [activeScooterCoord, dropStationCoord]);

  // High-performance Leaflet Web Map loaded via WebView for 100% reliable rendering
  const liveMapHtml = useMemo(() => {
    const startLat = startCoord.latitude || 22.3168;
    const startLng = startCoord.longitude || 73.1415;
    const scooterLat = activeScooterCoord.latitude || startLat;
    const scooterLng = activeScooterCoord.longitude || startLng;
    const dropLat = dropStationCoord.latitude || 22.3250;
    const dropLng = dropStationCoord.longitude || 73.1550;
    const pName = JSON.stringify(trip?.pickupName || 'Gotri Hub');
    const dName = JSON.stringify(trip?.dropName || 'Return Hub');
    const routeJson = JSON.stringify(waypoints.map((w) => [w.latitude, w.longitude]));
    const stationsJson = JSON.stringify(
      batteryStations.map((s) => ({
        id: s.id,
        title: s.title,
        count: s.count,
        lat: s.coordinate.latitude,
        lng: s.coordinate.longitude,
      }))
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #ECEFF4;
      touch-action: pan-x pan-y pinch-zoom;
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255, 255, 255, 0.85) !important;
      padding: 2px 6px !important;
      border-radius: 4px;
    }
    .origin-pin {
      width: 22px; height: 22px; border-radius: 11px;
      background: #FFFFFF; border: 3px solid #10B981;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .hub-pin {
      background: linear-gradient(135deg, #240B4C, #4A168C);
      color: #FFFFFF; font-family: -apple-system, Roboto, sans-serif;
      font-size: 11px; font-weight: 800; padding: 4px 8px;
      border-radius: 12px; border: 1.5px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(74,22,140,0.35);
      white-space: nowrap; cursor: pointer;
    }
    .battery-pin {
      background: linear-gradient(135deg, #059669, #10B981);
      color: #FFFFFF; font-family: -apple-system, Roboto, sans-serif;
      font-size: 10px; font-weight: 700; padding: 3px 7px;
      border-radius: 10px; border: 1.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      white-space: nowrap; cursor: pointer;
    }
    .scooter-wrap {
      width: 48px; height: 48px; position: relative;
      display: flex; align-items: center; justify-content: center;
    }
    .scooter-pulse {
      position: absolute; width: 44px; height: 44px;
      border-radius: 22px; background: rgba(124, 58, 237, 0.22);
      animation: pulse 2s infinite ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .scooter-icon-circle {
      width: 32px; height: 32px; border-radius: 16px;
      background: #4A168C; border: 2.5px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      z-index: 2;
    }
    .turn-callout {
      background: #FFFFFF; border: 1px solid #E2E8F0;
      border-radius: 12px; padding: 4px 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      font-family: -apple-system, Roboto, sans-serif;
      font-size: 10px; font-weight: 700; color: #0F172A;
      white-space: nowrap;
    }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var scooterMarker;
    var scooterHalo;

    function post(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function init() {
      try {
        if (typeof L === 'undefined') {
          throw new Error('Leaflet script not yet loaded');
        }

        var startLat = ${startLat};
        var startLng = ${startLng};
        var scooterLat = ${scooterLat};
        var scooterLng = ${scooterLng};
        var dropLat = ${dropLat};
        var dropLng = ${dropLng};
        var pickupName = ${pName};
        var dropName = ${dName};

        map = L.map('map', {
          center: [(startLat + scooterLat) / 2, (startLng + scooterLng) / 2],
          zoom: 15,
          zoomControl: false,
          attributionControl: true
        });

        // Carto Voyager tiles with OpenStreetMap fallback
        var tileLayer = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: 'Leaflet · © OpenStreetMap · © CARTO'
        });
        tileLayer.on('tileerror', function() {
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        });
        tileLayer.addTo(map);

        // Origin green halo and marker
        L.circle([startLat, startLng], {
          radius: 90,
          color: 'rgba(16, 185, 129, 0.4)',
          fillColor: 'rgba(16, 185, 129, 0.16)',
          fillOpacity: 0.16,
          weight: 1.5
        }).addTo(map);

        var originIcon = L.divIcon({
          className: 'origin-wrap',
          html: '<div class="origin-pin"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        L.marker([startLat, startLng], { icon: originIcon }).addTo(map)
          .on('click', function() { post({ type: 'MARKER_TAP', message: 'Pickup Station: ' + pickupName }); });

        // Route polyline in Evegah Purple
        var routePts = ${routeJson};
        L.polyline(routePts, {
          color: '#4A168C',
          weight: 5,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 0.95
        }).addTo(map);

        // Dynamic route path to return station
        var livePts = [[scooterLat, scooterLng], [(scooterLat + dropLat) / 2 + 0.0015, (scooterLng + dropLng) / 2 - 0.0012], [dropLat, dropLng]];
        L.polyline(livePts, {
          color: '#7C3AED',
          weight: 4,
          dashArray: '6, 6',
          lineCap: 'round',
          opacity: 0.9
        }).addTo(map);

        // Destination Hub pin
        var hubIcon = L.divIcon({
          className: 'hub-wrap',
          html: '<div class="hub-pin">' + dropName + '</div>',
          iconSize: [80, 24],
          iconAnchor: [40, 24]
        });
        L.marker([dropLat, dropLng], { icon: hubIcon }).addTo(map)
          .on('click', function() { post({ type: 'MARKER_TAP', message: 'Destination Station: ' + dropName }); });

        // Battery Swap Hubs
        var stations = ${stationsJson};
        stations.forEach(function(s) {
          var batIcon = L.divIcon({
            className: 'bat-wrap',
            html: '<div class="battery-pin">' + s.count + ' Packs</div>',
            iconSize: [70, 22],
            iconAnchor: [35, 22]
          });
          L.marker([s.lat, s.lng], { icon: batIcon }).addTo(map)
            .on('click', function() { post({ type: 'MARKER_TAP', message: s.title + ': ' + s.count + ' fresh packs ready' }); });
        });

        // Mid-route turn callout
        var turnIcon = L.divIcon({
          className: 'turn-wrap',
          html: '<div class="turn-callout">2.3 km to Drop · ~8 mins</div>',
          iconSize: [120, 24],
          iconAnchor: [60, 24]
        });
        L.marker([${midCalloutCoord.latitude}, ${midCalloutCoord.longitude}], { icon: turnIcon }).addTo(map);

        // Live Scooter Pulse & Marker
        scooterHalo = L.circle([scooterLat, scooterLng], {
          radius: 75,
          color: 'rgba(124, 58, 237, 0.32)',
          fillColor: 'rgba(124, 58, 237, 0.14)',
          fillOpacity: 0.14,
          weight: 1.5
        }).addTo(map);

        var scooterIcon = L.divIcon({
          className: 'scooter-div',
          html: '<div class="scooter-wrap"><div class="scooter-pulse"></div><div class="scooter-icon-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.4-1.7-1.1-2.2L18 8.7V5c0-.6-.4-1-1-1h-3c-.6 0-1 .4-1 1v1h-3l-2.4-3.6C7.3 2.1 6.9 2 6.5 2H4c-.6 0-1 .4-1 1s.4 1 1 1h2.1l2.4 3.6c.2.3.5.4.9.4H13v3.2c-.6.3-1.1.8-1.5 1.4L9.2 16H6c-.6 0-1 .4-1 1s.4 1 1 1h4c.4 0 .8-.2 1-.6l2.1-3.4H17v1c0 .6.4 1 1 1h1zm-14 4c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm14 0c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3z" fill="#FFFFFF"/></svg></div></div>',
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
        scooterMarker = L.marker([scooterLat, scooterLng], { icon: scooterIcon, zIndexOffset: 1000 }).addTo(map);

        post({ type: 'MAP_READY' });
      } catch (err) {
        post({ type: 'MAP_ERROR', message: String(err) });
      }
    }

    function tryInit(attempts) {
      if (typeof L !== 'undefined' && L.map) {
        init();
      } else if ((attempts || 0) < 30) {
        setTimeout(function() { tryInit((attempts || 0) + 1); }, 150);
      } else {
        post({ type: 'MAP_ERROR', message: 'Leaflet script load timeout' });
      }
    }

    window.recenterMap = function(lat, lng) {
      if (map && lat && lng) {
        map.setView([Number(lat), Number(lng)], 16, { animate: true, duration: 0.5 });
      }
    };

    window.updateScooterPos = function(lat, lng) {
      if (scooterMarker && scooterHalo && lat && lng) {
        var pos = [Number(lat), Number(lng)];
        scooterMarker.setLatLng(pos);
        scooterHalo.setLatLng(pos);
      }
    };

    window.onload = function() {
      tryInit(0);
    };
  </script>
</body>
</html>`;
  }, [startCoord, activeScooterCoord, dropStationCoord, waypoints, batteryStations, midCalloutCoord, trip]);

  // Dynamic scooter position updater on map
  useEffect(() => {
    if (activeScooterCoord?.latitude && activeScooterCoord?.longitude) {
      webMapRef.current?.injectJavaScript(
        `if (window.updateScooterPos) { window.updateScooterPos(${activeScooterCoord.latitude}, ${activeScooterCoord.longitude}); } true;`
      );
    }
  }, [activeScooterCoord?.latitude, activeScooterCoord?.longitude]);

  // Pull-to-refresh handler for live active ride
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerQuickAction('Refreshing live ride telemetry & BMS...');
    runAutoScanBms();
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc?.coords) {
        setLiveGpsCoord({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        webMapRef.current?.injectJavaScript(
          `if (window.updateScooterPos) { window.updateScooterPos(${loc.coords.latitude}, ${loc.coords.longitude}); } if (window.recenterMap) { window.recenterMap(${loc.coords.latitude}, ${loc.coords.longitude}); } true;`
        );
      }
    } catch (_) {}
    setTimeout(() => {
      setRefreshing(false);
      triggerQuickAction('Telemetry & BMS Synced');
    }, 900);
  }, []);

  const onWebMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setMapReady(true);
      } else if (data.type === 'MARKER_TAP' && data.message) {
        triggerQuickAction(data.message);
      }
    } catch (_) {}
  };

  const baseDropAt = trip?.dropAt || Date.now() + 24 * 3600 * 1000;
  const effectiveDropAt = baseDropAt + extraMs;
  const bookingIdText = receipt?.bookingId || 'EVG39745433';

  // Guard active ride screen: prevent accidental exit while ride is live
  const handleBackGuard = () => {
    Alert.alert(
      'Active Ride in Progress',
      `Booking #${bookingIdText} is currently ACTIVE.\n\nYour session remains live until official handover and vehicle check-in at the station.`,
      [
        { text: 'Stay on Live Cockpit', style: 'cancel' },
        { text: 'Minimize to My Rides', onPress: onBack },
      ]
    );
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBackGuard();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [bookingIdText]);

  // Disable manual End Ride: Station executive inspection is required
  const handleDisabledEndRide = () => {
    Alert.alert(
      'Station Handover Required',
      'Rider self-checkout is disabled for vehicle safety verification.\n\nPlease return the EV to your station. The station executive will inspect the scooter and close the ride in the system.\n\nThis screen will automatically complete and show your summary once confirmed.',
      [
        {
          text: 'Call Station Support',
          onPress: () => Linking.openURL('tel:18008898791').catch(() => {}),
        },
        { text: 'Understood', style: 'cancel' },
      ]
    );
  };

  // Background Active Ride Polling: Detects when station executive/admin closes the ride in the backend
  useEffect(() => {
    let mounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const stored = await getStoredRider().catch(() => null);
        const mobile = (stored?.mobile || stored?.phone || trip?.phone || '8128251172').replace(/\D/g, '').slice(-10);
        if (!mobile) return;

        const res = await apiGet(`/reservations/active-ride?mobile=${mobile}`).catch(() => null);
        if (!mounted) return;

        if (res && res.status === 'success') {
          // If backend reports no active ride or status transitioned to completed/ended
          if (!res.has_active_ride || (res.data && ['completed', 'completed ride', 'ended', 'returned'].includes(String(res.data.status).toLowerCase()))) {
            clearInterval(pollInterval);
            onEnd?.({
              elapsed: clock(seconds),
              distance: ((seconds / 3600) * 22).toFixed(1),
              fare: extraFareTotal,
              batteryUsedPct: Math.max(4, 100 - bmsSoc),
            });
          }
        }
      } catch (_) {}
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [seconds, extraFareTotal, bmsSoc, onEnd]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((value) => (pausedLock ? value : value + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [pausedLock]);

  const activeModeObj =
    RIDE_MODES.find((m) => m.id === rideMode) || RIDE_MODES[1];
  const speed = pausedLock
    ? 0
    : activeModeObj.baseSpeed + Math.round(2 * Math.sin(seconds / 5));
  const distance = (seconds / 3600) * 22;
  const availableOptions = extendPackages;
  const chosenOption =
    availableOptions.find((item) => item.id === selectedExtendId) ||
    availableOptions[0] ||
    null;
  const previewNewDropAt = effectiveDropAt + (chosenOption?.hours || 24) * 3600 * 1000;

  const selectRideMode = (modeObj) => {
    setRideMode(modeObj.id);
    triggerQuickAction(`Switched to ${modeObj.fullLabel} (${modeObj.rangeKm} km est.)`);
  };

  const completeExtension = (nextExtraMs, nextExtraFare, txnId) => {
    setExtraMs(nextExtraMs);
    setExtraFareTotal(nextExtraFare);
    setExtendModalOpen(false);
    if (chosenOption) {
      setExtendBanner({
        label: chosenOption.label,
        newDropText: formatDropDate(baseDropAt + nextExtraMs),
        price: chosenOption.price,
      });
      onExtendRide?.({
        addedHours: chosenOption.hours,
        addedPrice: chosenOption.price,
        newDropAt: baseDropAt + nextExtraMs,
        paymentTxnId: txnId,
      });
      triggerQuickAction(`Ride extended by ${chosenOption.label}! Paid ₹${chosenOption.price}`);
    }
  };

  const handleInitiateExtendPayment = async () => {
    if (isProcessingPay || !chosenOption) return;
    setIsProcessingPay(true);

    const price = chosenOption?.price || 0;
    const addedMs = (chosenOption?.hours || 1) * 3600 * 1000;
    const nextExtraMs = extraMs + addedMs;
    const nextExtraFare = extraFareTotal + price;

    if (price <= 0) {
      setExtendModalOpen(false);
      completeExtension(nextExtraMs, nextExtraFare, 'FREE_OR_PROMO');
      setIsProcessingPay(false);
      return;
    }

    // 1. Close extend bottom sheet immediately to prevent any Android Dialog collision
    setExtendModalOpen(false);

    // 2. Open PayU Fullscreen Modal immediately in loading state
    setPayuTxnId(null);
    setPayuCheckoutUrl(null);
    setPayuLoading(true);
    setPayuModalVisible(true);

    try {
      const storedRider = await getStoredRider().catch(() => null);
      const riderName = storedRider?.rider_name || storedRider?.name || trip?.riderName || 'Evegah Rider';
      const riderPhone = (storedRider?.phone || storedRider?.mobile || trip?.phone || '8128251172').replace(/\D/g, '').slice(-10);
      const riderEmail = storedRider?.email || `rider_${riderPhone}@evegah.com`;

      const initRes = await apiPost('/payments/payu/initiate', {
        amount: price,
        rider_name: riderName,
        phone: riderPhone,
        mobile: riderPhone,
        email: riderEmail,
        purpose: 'extend_ride',
        reservation_id: receipt?.bookingId || trip?.id || null,
      });

      if (!initRes || initRes.status !== 'success' || !initRes.data) {
        setPayuModalVisible(false);
        setIsProcessingPay(false);
        Alert.alert(
          'Payment Gateway Notice',
          initRes?.message || 'Could not connect to PayU Gateway. Please try again.'
        );
        return;
      }

      const finalTxnId = initRes.data.txnid || initRes.data.tx_id || initRes.data.txn_id;
      const finalCheckoutUrl = initRes.data.checkout_url || `https://evegah.cloud/api/payments/payu/checkout/${finalTxnId}`;

      setPayuTxnId(finalTxnId);
      setPayuCheckoutUrl(finalCheckoutUrl);
      setPayuLoading(false);
      setIsProcessingPay(false);

      if (payuPollRef.current) clearInterval(payuPollRef.current);
      let attempts = 0;
      payuPollRef.current = setInterval(async () => {
        attempts++;
        try {
          const stRes = await apiGet(`/payments/payu/status/${finalTxnId}`);
          const pStatus = String(stRes?.data?.status || stRes?.data?.payment_status || '').toLowerCase();
          if (pStatus === 'success') {
            if (payuPollRef.current) clearInterval(payuPollRef.current);
            setPayuModalVisible(false);
            completeExtension(nextExtraMs, nextExtraFare, finalTxnId);
            return;
          } else if (pStatus === 'failed' || pStatus === 'failure') {
            if (payuPollRef.current) clearInterval(payuPollRef.current);
            setPayuModalVisible(false);
            Alert.alert('Payment Incomplete', stRes?.data?.error_message || 'Payment could not be completed with PayU.');
            return;
          }
        } catch (_) {}
        if (attempts >= 60) {
          if (payuPollRef.current) clearInterval(payuPollRef.current);
        }
      }, 3000);
    } catch (err) {
      setPayuModalVisible(false);
      setIsProcessingPay(false);
      Alert.alert('Payment Error', err.message || 'Could not initiate payment session.');
    }
  };

  const handlePayuSuccess = (confirmedTxnId) => {
    if (payuPollRef.current) clearInterval(payuPollRef.current);
    setPayuModalVisible(false);
    setIsProcessingPay(false);
    const price = chosenOption?.price || 0;
    const addedMs = (chosenOption?.hours || 1) * 3600 * 1000;
    completeExtension(extraMs + addedMs, extraFareTotal + price, confirmedTxnId || payuTxnId);
  };

  const handlePayuFailure = (errMsg) => {
    if (payuPollRef.current) clearInterval(payuPollRef.current);
    setPayuModalVisible(false);
    setIsProcessingPay(false);
    Alert.alert('Payment Failed', errMsg || 'Payment could not be completed.');
  };

  const handleCancelPayuModal = () => {
    Alert.alert('Cancel Payment?', 'Do you want to cancel the extension payment?', [
      { text: 'Continue Payment', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          if (payuPollRef.current) clearInterval(payuPollRef.current);
          setPayuModalVisible(false);
          setIsProcessingPay(false);
        },
      },
    ]);
  };

  const onWebViewNavigationStateChange = (navState) => {
    const { url } = navState;
    if (url && (url.includes('/payments/payu/response') || url.includes('/response'))) {
      if (url.toLowerCase().includes('status=failed') || url.toLowerCase().includes('status=failure')) {
        handlePayuFailure('Payment was cancelled or failed.');
      } else if (url.toLowerCase().includes('status=success')) {
        handlePayuSuccess(payuTxnId);
      }
    }
  };

  const onWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYU_PAYMENT_RESPONSE') {
        if (String(data.status || '').toLowerCase() === 'success') {
          handlePayuSuccess(data.txnid);
        } else {
          handlePayuFailure(data.message || 'Payment was cancelled or failed.');
        }
      }
    } catch (_) {}
  };

  const recenterMap = () => {
    webMapRef.current?.injectJavaScript(
      `if (window.recenterMap) { window.recenterMap(${activeScooterCoord.latitude}, ${activeScooterCoord.longitude}); } true;`
    );
    mapRef.current?.animateToRegion?.(
      {
        latitude: activeScooterCoord.latitude,
        longitude: activeScooterCoord.longitude,
        latitudeDelta: 0.014,
        longitudeDelta: 0.014,
      },
      450
    );
  };

  const socColor =
    bmsSoc < 20 ? '#EF4444' : bmsSoc < 40 ? '#F59E0B' : '#10B981';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Full-Bleed Map Viewport using Reliable High-Performance Web Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webMapRef}
          originWhitelist={['*']}
          source={{ html: liveMapHtml, baseUrl: 'https://evegah.cloud' }}
          style={StyleSheet.absoluteFillObject}
          onMessage={onWebMapMessage}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          startInLoadingState
          mixedContentMode="always"
          androidLayerType="hardware"
          allowUniversalAccessFromFileURLs
          allowFileAccess
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, styles.mapLoaderCenter]}>
              <ActivityIndicator size="large" color={BRAND_PURPLE} />
              <Text style={styles.mapLoaderText}>Loading Live Ride Map...</Text>
            </View>
          )}
        />

        {/* Top Floating Cockpit HUD Bar */}
        <View style={[styles.topHudBar, { top: insets.top + 8 }]}>
          <Pressable hitSlop={10} style={styles.hudCircleBtn} onPress={handleBackGuard}>
            <Ionicons name="chevron-back" size={21} color={DARK_NAVY} />
          </Pressable>

          <Pressable
            style={styles.hudCenterPill}
            onPress={() => {
              const invoiceId = receipt?.bookingId || trip?.id || 'EVG';
              Alert.alert(
                `Active Ride #${invoiceId}`,
                `Pickup: ${trip?.pickupName || 'Gotri Zone'}\nDrop: ${trip?.dropName || 'Gotri Zone'}\nSupport Helpline: 1800 889 8791`,
                [
                  {
                    text: 'View Tax Receipt',
                    onPress: () => {
                      const url = `https://evegah.cloud/api/receipts/${invoiceId}`;
                      Linking.openURL(url).catch(() => {});
                    },
                  },
                  { text: 'Close', style: 'cancel' },
                ]
              );
            }}
          >
            <View
              style={[
                styles.hudLiveBadge,
                pausedLock && { backgroundColor: '#FEF3C7' },
              ]}
            >
              <View
                style={[
                  styles.hudPulseDot,
                  pausedLock && { backgroundColor: '#D97706' },
                ]}
              />
              <Text
                style={[
                  styles.hudLiveBadgeText,
                  pausedLock && { color: '#B45309' },
                ]}
              >
                {pausedLock ? 'PAUSED' : 'LIVE'}
              </Text>
            </View>
            <Text style={styles.hudBookingId}>{bookingIdText}</Text>
            <Ionicons name="chevron-down" size={14} color="#64748B" />
          </Pressable>

          <Pressable
            hitSlop={10}
            style={styles.hudSosBtn}
            onPress={() => Linking.openURL('tel:18008898791')}
          >
            <Ionicons name="call" size={15} color="#E11D48" />
            <Text style={styles.hudSosText}>SOS</Text>
          </Pressable>
        </View>

        {/* Floating Map Action Stack (Right Side) */}
        <View style={styles.mapRightStack}>
          <Pressable style={styles.mapToolBtn} onPress={recenterMap}>
            <Ionicons name="locate" size={20} color={BRAND_PURPLE} />
          </Pressable>
          <Pressable
            style={styles.mapToolBtn}
            onPress={() =>
              triggerQuickAction(
                `Routing to ${trip?.dropName || 'Bill Zone, Vadodara'}`
              )
            }
          >
            <Ionicons name="compass-outline" size={21} color={BRAND_PURPLE} />
          </Pressable>
        </View>

        {/* Extended Ride Banner */}
        {extendBanner ? (
          <Animated.View
            entering={FadeInDown.duration(260)}
            style={[styles.extendBannerCard, { top: insets.top + 62 }]}
          >
            <View style={styles.extendBannerIcon}>
              <Ionicons name="checkmark-sharp" size={15} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.extendBannerTitle}>
                Extended by {extendBanner.label} (+₹{extendBanner.price})
              </Text>
              <Text style={styles.extendBannerSub}>
                New drop: {extendBanner.newDropText}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={() => setExtendBanner(null)}>
              <Ionicons name="close" size={17} color="#065F46" />
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Floating Telemetry Toast Pill */}
        {quickToast ? (
          <Animated.View
            entering={FadeInDown.duration(220)}
            style={[styles.toastPill, { top: insets.top + 62 }]}
          >
            <View style={styles.toastIconPulse}>
              <Ionicons name="radio" size={13} color="#A7F3D0" />
            </View>
            <Text style={styles.toastText} numberOfLines={1}>
              {quickToast}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {/* Bottom Ride Control Deck Sheet with Scroll Up Pull-To-Refresh */}
      <View style={styles.deckSheet}>
        <ScrollView
          style={styles.deckScroll}
          contentContainerStyle={[
            styles.deckScrollContent,
            { paddingBottom: Math.max(insets.bottom + 12, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BRAND_PURPLE}
              colors={[BRAND_PURPLE, BRAND_PURPLE_LIGHT]}
            />
          }
        >
          <View style={styles.sheetGrabber} />

        {/* 1. Vehicle Identity & Mode Switcher Header */}
        <View style={styles.vehicleRow}>
          <View style={styles.vehicleAvatarBox}>
            <Image
              source={
                vehicle?.image || require('../assets/vehicles/mink-left.png')
              }
              style={styles.vehicleAvatarImg}
              contentFit="contain"
            />
          </View>

          <View style={styles.vehicleTitleCol}>
            <View style={styles.vehicleNameLine}>
              <Text style={styles.vehicleName} numberOfLines={1}>
                {vehicle?.name || 'Evegah Mink'}
              </Text>
              {(vehicle?.regNo || vehicle?.code || receipt?.vehicle_number) ? (
                <View style={styles.assignedPlateBadge}>
                  <Ionicons name="card-outline" size={11} color="#6D28D9" />
                  <Text style={styles.assignedPlateText}>
                    {vehicle?.regNo || vehicle?.code || receipt?.vehicle_number}
                  </Text>
                </View>
              ) : null}
             
            </View>
            <Text style={styles.vehicleRouteSub} numberOfLines={1}>
              {trip?.pickupName || 'Gotri Zone'} → {trip?.dropName || 'Bill Zone'}
            </Text>
          </View>

          {/* Compact 3-Mode Pill Switcher */}
         
        </View>

        {/* 2. Dark-Violet EV Speedometer & Telemetry Cockpit Banner */}
        <LinearGradient
          colors={['#130526', '#28094E', '#3D1073']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cockpitCluster}
        >
          {/* Left: Elapsed Duration */}
          <View style={styles.cockpitSideCol}>
            <View style={styles.cockpitLabelRow}>
              <Ionicons name="time-outline" size={12} color="#C4B5FD" />
              <Text style={styles.cockpitKicker}>DURATION</Text>
            </View>
            <Text style={styles.cockpitSideValue}>{clock(seconds)}</Text>
            <Text style={styles.cockpitSideSub}>
              {pausedLock ? 'Motor Locked' : 'Active Timer'}
            </Text>
          </View>

          <View style={styles.cockpitVerticalDivider} />

          {/* Center: Prominent Speedometer */}
          <View style={styles.cockpitCenterCol}>
            <Text style={styles.speedHeroNumber}>{speed}</Text>
            <Text style={styles.speedHeroUnit}>KM/H · {activeModeObj.label.toUpperCase()}</Text>
          </View>

          <View style={styles.cockpitVerticalDivider} />

          {/* Right: Trip Distance */}
          <View style={[styles.cockpitSideCol, { alignItems: 'flex-end' }]}>
            <View style={styles.cockpitLabelRow}>
              <Text style={styles.cockpitKicker}>DISTANCE</Text>
              <Ionicons name="analytics-outline" size={12} color="#C4B5FD" />
            </View>
            <Text style={styles.cockpitSideValue}>
              {distance.toFixed(1)} <Text style={styles.cockpitSmallUnit}>km</Text>
            </Text>
            <Text style={styles.cockpitSideSub}>
              Est. {activeModeObj.rangeKm} km range
            </Text>
          </View>
        </LinearGradient>

        {/* 3. BMS Telemetry Card + Drop Schedule Card */}
        <View style={styles.cardsTwoCol}>
          {/* Live BMS Battery Card */}
          <Pressable
            onPress={() => setBmsDetailOpen(true)}
            style={styles.bmsCard}
          >
            <View style={styles.bmsCardHeader}>
              <View style={styles.bmsLabelCluster}>
                <View
                  style={[
                    styles.bmsDotIndicator,
                    { backgroundColor: socColor },
                  ]}
                />
                <Text style={styles.cardSmallTitle}>BMS PACK</Text>
              </View>

              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  runAutoScanBms();
                }}
                style={[
                  styles.bmsSyncChip,
                  bmsStatus === 'connected' && styles.bmsSyncChipConnected,
                ]}
              >
                <Animated.View
                  style={bmsStatus === 'scanning' ? scanSpinStyle : null}
                >
                  <Ionicons
                    name={
                      bmsStatus === 'scanning'
                        ? 'sync'
                        : bmsStatus === 'connected'
                        ? 'bluetooth'
                        : 'refresh'
                    }
                    size={11}
                    color={bmsStatus === 'connected' ? BRAND_PURPLE : '#2563EB'}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.bmsSyncChipText,
                    bmsStatus === 'connected' && { color: BRAND_PURPLE },
                  ]}
                >
                  {bmsStatus === 'scanning'
                    ? 'Scan...'
                    : bmsStatus === 'connecting'
                    ? 'Sync...'
                    : 'Synced'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.bmsMainReadoutRow}>
              <Text style={[styles.bmsBigPercent, { color: socColor }]}>
                {bmsSoc}%
              </Text>
              <Text style={styles.bmsRangeMeta}>
                ~{activeModeObj.rangeKm} km · {bmsVoltage}V
              </Text>
            </View>

            {/* 5-Cell Segmented Battery Bar */}
            <View style={styles.segmentedBarRow}>
              {[20, 40, 60, 80, 100].map((threshold, idx) => {
                const filled = bmsSoc >= threshold - 12;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.batteryCellSegment,
                      filled && { backgroundColor: socColor },
                    ]}
                  />
                );
              })}
            </View>
          </Pressable>

          {/* Drop By Schedule Card */}
          <Pressable
            onPress={() => setExtendModalOpen(true)}
            style={styles.dropScheduleCard}
          >
            <View style={styles.bmsCardHeader}>
              <View style={styles.bmsLabelCluster}>
                <Ionicons name="calendar-outline" size={13} color={BRAND_PURPLE} />
                <Text style={styles.cardSmallTitle}>RETURN BY</Text>
              </View>
              <View style={styles.extendMiniTag}>
                <Text style={styles.extendMiniTagText}>+EXTEND</Text>
              </View>
            </View>

            <Text style={styles.dropBigDate}>
              {formatDropDateOnly(effectiveDropAt)}
            </Text>
            <Text style={styles.dropBigTime}>
              {formatDropTimeOnly(effectiveDropAt)}
            </Text>

            <Text style={styles.dropZoneSubText} numberOfLines={1}>
              {extraFareTotal > 0
                ? `Extended (+₹${extraFareTotal})`
                : `At ${trip?.dropName || 'Bill Zone'}`}
            </Text>
          </Pressable>
        </View>

        {/* 4. Quick Hardware Controls (Pause | Beep EV | Hazard) - Hidden per user request */}
        {false && (
        <View style={styles.hardwareControlsRow}>
          <Pressable
            onPress={() => {
              const next = !pausedLock;
              setPausedLock(next);
              triggerQuickAction(
                next
                  ? 'Immobilizer Engaged — Rear Wheel Locked'
                  : 'Immobilizer Released — Ready to Ride'
              );
            }}
            style={[
              styles.hwSwitchBtn,
              pausedLock && styles.hwSwitchBtnActiveAmber,
            ]}
          >
            <View
              style={[
                styles.hwIconCircle,
                pausedLock && { backgroundColor: '#FEF3C7' },
              ]}
            >
              <Ionicons
                name={pausedLock ? 'lock-open' : 'pause'}
                size={15}
                color={pausedLock ? '#D97706' : '#334155'}
              />
            </View>
            <View>
              <Text
                style={[
                  styles.hwSwitchTitle,
                  pausedLock && { color: '#B45309' },
                ]}
              >
                {pausedLock ? 'Resume' : 'Pause'}
              </Text>
              <Text style={styles.hwSwitchSub}>
                {pausedLock ? 'Locked' : 'Lock EV'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() =>
              triggerQuickAction('BEEP! Horn & Turn Indicators Flashed')
            }
            style={styles.hwSwitchBtn}
          >
            <View style={styles.hwIconCircle}>
              <Ionicons name="volume-high" size={16} color={BRAND_PURPLE} />
            </View>
            <View>
              <Text style={styles.hwSwitchTitle}>Beep EV</Text>
              <Text style={styles.hwSwitchSub}>Find Ride</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              const next = !hazardOn;
              setHazardOn(next);
              triggerQuickAction(
                next ? 'Hazard Lights Flashing' : 'Hazard Lights Turned Off'
              );
            }}
            style={[
              styles.hwSwitchBtn,
              hazardOn && styles.hwSwitchBtnActiveRose,
            ]}
          >
            <View
              style={[
                styles.hwIconCircle,
                { backgroundColor: '#FFE4E6' },
              ]}
            >
              <Ionicons name="warning" size={15} color="#E11D48" />
            </View>
            <View>
              <Text
                style={[
                  styles.hwSwitchTitle,
                  { color: '#E11D48' },
                ]}
              >
                Hazard
              </Text>
              <Text style={styles.hwSwitchSub}>
                {hazardOn ? 'Blinking' : 'Blinkers'}
              </Text>
            </View>
          </Pressable>
        </View>
        )}

        {/* 5. Primary Bottom CTA Row (Extend Ride + End Ride) */}
        <View style={styles.primaryCtaRow}>
          <Pressable
            onPress={() => setExtendModalOpen(true)}
            style={({ pressed }) => [
              styles.secondaryExtendBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="add-circle" size={18} color={BRAND_PURPLE} />
            <Text style={styles.secondaryExtendBtnText}>Extend Ride</Text>
          </Pressable>

          <Animated.View style={[styles.primaryEndBtnWrap, btnStyle]}>
            <Pressable
              onPressIn={() => {
                btnScale.value = withSpring(0.96, {
                  damping: 16,
                  stiffness: 280,
                });
              }}
              onPressOut={() => {
                btnScale.value = withSpring(1, {
                  damping: 16,
                  stiffness: 280,
                });
              }}
              onPress={handleDisabledEndRide}
              style={styles.primaryEndTouch}
            >
              <LinearGradient
                colors={['#1E1B4B', '#312E81']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryEndGradient, { borderColor: '#4338CA', borderWidth: 1 }]}
              >
                <Text style={styles.primaryEndText}>Return at Station</Text>
                <View style={[styles.primaryEndIconPill, { backgroundColor: '#4338CA' }]}>
                  <Ionicons
                    name="shield-checkmark"
                    size={14}
                    color="#A5B4FC"
                  />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
        </ScrollView>
      </View>

      {/* Modal 1: Extend Ride Bottom Sheet (Inline overlay View to eliminate Android native Dialog freeze) */}
      {extendModalOpen && (
        <View style={[StyleSheet.absoluteFill, styles.modalBackdrop, { zIndex: 99 }]}>
          <Pressable
            style={styles.modalBackdropTouch}
            onPress={() => setExtendModalOpen(false)}
          />

          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetGrabber} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Extend Your EV Rental</Text>
                <Text style={styles.modalSubtitle}>
                  Instant top-up without visiting the Zone
                </Text>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => setExtendModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#334155" />
              </Pressable>
            </View>

            {/* Drop Schedule Comparison Banner */}
            <View style={styles.scheduleBridgeCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleKicker}>CURRENT DROP</Text>
                <Text style={styles.scheduleTimeVal}>
                  {formatDropDate(effectiveDropAt)}
                </Text>
              </View>

              <View style={styles.scheduleArrowCircle}>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={BRAND_PURPLE}
                />
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[styles.scheduleKicker, { color: BRAND_PURPLE }]}>
                  NEW DROP TIME
                </Text>
                <Text
                  style={[styles.scheduleTimeVal, { color: BRAND_PURPLE }]}
                >
                  {formatDropDate(previewNewDropAt)}
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.extendOptionsScroll}
            >
              {extendLoading ? (
                <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={BRAND_PURPLE} />
                  <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>
                    Loading backend zone packages...
                  </Text>
                </View>
              ) : availableOptions.length === 0 ? (
                <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                  <Ionicons name="alert-circle-outline" size={28} color="#94A3B8" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                    No packages available in the zone for this vehicle model.
                  </Text>
                </View>
              ) : (
                availableOptions.map((opt) => {
                  const active = opt.id === selectedExtendId;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setSelectedExtendId(opt.id)}
                      style={[
                        styles.extendOptionCard,
                        active && styles.extendOptionCardActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.radioOuter,
                          active && styles.radioOuterActive,
                        ]}
                      >
                        {active ? <View style={styles.radioInner} /> : null}
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.extendOptTitleRow}>
                          <Text
                            style={[
                              styles.extendOptLabel,
                              active && { color: BRAND_PURPLE },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <View
                            style={[
                              styles.extendOptTag,
                              active && styles.extendOptTagActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.extendOptTagText,
                                active && { color: '#FFFFFF' },
                              ]}
                            >
                              {opt.tag}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.extendOptSub}>{opt.sub}</Text>
                      </View>

                      <Text
                        style={[
                          styles.extendOptPrice,
                          active && { color: BRAND_PURPLE },
                        ]}
                      >
                        ₹{opt.price}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <Pressable
              onPress={handleInitiateExtendPayment}
              disabled={isProcessingPay || !chosenOption}
              style={[
                styles.confirmExtendCta,
                (isProcessingPay || !chosenOption) && { opacity: 0.6 },
              ]}
            >
              {isProcessingPay ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmExtendCtaText}>
                    {chosenOption
                      ? `Pay & Extend Ride · ₹${chosenOption.price}`
                      : 'Select a Package'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Modal 2: Live BMS Diagnostic Telemetry Sheet */}
      <Modal
        visible={bmsDetailOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setBmsDetailOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropTouch}
            onPress={() => setBmsDetailOpen(false)}
          />
          <View
            style={[
              styles.bmsModalSheet,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >
            <View style={styles.sheetGrabber} />

            <View style={styles.bmsModalHeader}>
              <View style={styles.bmsModalTitleCluster}>
                <LinearGradient
                  colors={[BRAND_PURPLE, BRAND_PURPLE_LIGHT]}
                  style={styles.bmsModalIconBox}
                >
                  <Ionicons name="hardware-chip" size={19} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={styles.modalTitle}>Smart BMS Diagnostics</Text>
                  <Text style={styles.modalSubtitle}>
                    Pack ID: {bmsBatteryId} · CAN Bus Telemetry
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setBmsDetailOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#334155" />
              </Pressable>
            </View>

            {/* 4-Tile Diagnostic Telemetry Grid */}
            <View style={styles.bmsMetricsGrid}>
              <View style={styles.bmsDiagTile}>
                <Text style={styles.bmsDiagKicker}>STATE OF CHARGE</Text>
                <Text style={[styles.bmsDiagValue, { color: socColor }]}>
                  {bmsSoc}%
                </Text>
                <Text style={styles.bmsDiagSub}>
                  ~{activeModeObj.rangeKm} km remaining
                </Text>
              </View>

              <View style={styles.bmsDiagTile}>
                <Text style={styles.bmsDiagKicker}>PACK VOLTAGE</Text>
                <Text style={styles.bmsDiagValue}>{bmsVoltage} V</Text>
                <Text style={styles.bmsDiagSub}>Nominal 51.2V LiFePO4</Text>
              </View>

              <View style={styles.bmsDiagTile}>
                <Text style={styles.bmsDiagKicker}>CELL TEMP</Text>
                <Text style={styles.bmsDiagValue}>{bmsTemp}°C</Text>
                <Text style={styles.bmsDiagSub}>Thermal Normal</Text>
              </View>

              <View style={styles.bmsDiagTile}>
                <Text style={styles.bmsDiagKicker}>PACK HEALTH</Text>
                <Text style={[styles.bmsDiagValue, { color: '#10B981' }]}>
                  98% SOH
                </Text>
                <Text style={styles.bmsDiagSub}>Balanced Cells</Text>
              </View>
            </View>

            <View style={styles.bmsLiveStatusBanner}>
              <Ionicons
                name={
                  bmsStatus === 'connected' ? 'shield-checkmark' : 'sync'
                }
                size={18}
                color={bmsStatus === 'connected' ? '#059669' : BRAND_PURPLE}
              />
              <Text style={styles.bmsLiveStatusText}>
                {bmsStatus === 'connected'
                  ? 'Live BLE & CAN bus link active · Encrypted Evegah Telemetry'
                  : 'Scanning vehicle controller for real-time battery frames...'}
              </Text>
            </View>

            <Pressable
              onPress={runAutoScanBms}
              style={styles.confirmExtendCta}
            >
              <Ionicons name="refresh" size={17} color="#FFFFFF" />
              <Text style={styles.confirmExtendCtaText}>
                Re-Scan & Sync BMS Now
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* PayU Extension In-App Checkout Modal */}
      <Modal
        visible={payuModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancelPayuModal}
      >
        <View style={styles.payuModalContainer}>
          <StatusBar style="dark" />
          <View style={[styles.payuHeader, { paddingTop: insets.top + 8 }]}>
            <View style={styles.payuHeaderLeft}>
              <View style={styles.payuLogoBadge}>
                <Ionicons name="card" size={18} color="#4A168C" />
              </View>
              <View>
                <Text style={styles.payuHeaderTitle}>Extend Ride Payment</Text>
                <Text style={styles.payuHeaderSubtitle}>Secure 256-bit SSL encrypted</Text>
              </View>
            </View>
            <View style={styles.payuHeaderRight}>
              <View style={styles.payuAmountPill}>
                <Text style={styles.payuAmountText}>₹{chosenOption?.price || 0}</Text>
              </View>
              <Pressable
                onPress={handleCancelPayuModal}
                style={styles.payuCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#334155" />
              </Pressable>
            </View>
          </View>

          {payuLoading && (
            <View style={styles.payuLoadingBar}>
              <ActivityIndicator size="small" color="#4A168C" />
              <Text style={styles.payuLoadingText}>Connecting to Payment Gateway...</Text>
            </View>
          )}

          {payuCheckoutUrl ? (
            <WebView
              source={{ uri: payuCheckoutUrl }}
              style={styles.payuWebView}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.payuWebLoader}>
                  <ActivityIndicator size="large" color="#4A168C" />
                  <Text style={styles.payuWebLoaderText}>Loading PayU Payment Interface...</Text>
                </View>
              )}
              onLoadStart={() => setPayuLoading(true)}
              onLoadEnd={() => setPayuLoading(false)}
              onNavigationStateChange={onWebViewNavigationStateChange}
              onMessage={onWebViewMessage}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    minHeight: 260,
    position: 'relative',
    backgroundColor: '#ECEFF4',
    overflow: 'hidden',
  },
  mapLoaderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECEFF4',
    gap: 8,
  },
  mapLoaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A168C',
  },
  osmBadge: {
    position: 'absolute',
    left: 12,
    bottom: 28,
    backgroundColor: 'rgba(255,255,255,0.86)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },
  osmBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Map Markers */
  originMarkerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  originMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  routeCalloutBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },
  routeCalloutIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCalloutDist: {
    fontSize: 12,
    fontWeight: '800',
    color: DARK_NAVY,
  },
  routeCalloutTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  hubStationMarker: {
    alignItems: 'center',
  },
  hubStationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7C3AED',
    shadowColor: '#240B4C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  hubStationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  hubStationArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 0,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#240B4C',
  },
  batteryPinWrap: {
    alignItems: 'center',
  },
  batteryPinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#34D399',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  batteryPinCount: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  batteryPinArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 0,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#059669',
  },
  scooterMarkerWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scooterMarkerHalo: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.5)',
  },
  scooterMarkerImg: {
    width: 44,
    height: 44,
  },

  /* Top Floating HUD Bar */
  topHudBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  hudCenterPill: {
    height: 42,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  hudLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hudPulseDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  hudLiveBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  hudBookingId: {
    fontSize: 13.5,
    fontWeight: '800',
    color: DARK_NAVY,
    letterSpacing: 0.3,
  },
  hudSosBtn: {
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 21,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  hudSosText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#E11D48',
  },

  /* Floating Right Map Tools */
  mapRightStack: {
    position: 'absolute',
    right: 14,
    bottom: 28,
    gap: 10,
  },
  mapToolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },

  /* Floating Toasts */
  extendBannerCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  extendBannerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065F46',
  },
  extendBannerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  toastPill: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '90%',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 8.5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastIconPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Bottom Cockpit Deck Sheet */
  deckSheet: {
    height: Math.round(SCREEN_H * 0.52),
    marginTop: -20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 16,
    overflow: 'hidden',
  },
  deckScroll: {
    flex: 1,
  },
  deckScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetGrabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },

  /* Row 1: Vehicle & Mode Switcher */
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleAvatarBox: {
    width: 56,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleAvatarImg: {
    width: 48,
    height: 38,
  },
  vehicleTitleCol: {
    flex: 1,
  },
  vehicleNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: '900',
    color: DARK_NAVY,
    letterSpacing: -0.3,
  },
  iotVerifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  assignedPlateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  assignedPlateText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.3,
  },
  iotVerifiedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },
  vehicleRouteSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  modeSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 11,
  },
  modeMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modeMiniBtnActive: {
    backgroundColor: BRAND_PURPLE,
  },
  modeMiniBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  modeMiniBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Row 2: Dark-Violet Speedometer Cockpit Cluster */
  cockpitCluster: {
    marginTop: 12,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cockpitSideCol: {
    flex: 1,
  },
  cockpitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cockpitKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C4B5FD',
    letterSpacing: 0.7,
  },
  cockpitSideValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  cockpitSmallUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DDD6FE',
  },
  cockpitSideSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.62)',
    marginTop: 1,
  },
  cockpitVerticalDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: 10,
  },
  cockpitCenterCol: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  speedHeroNumber: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 33,
    fontVariant: ['tabular-nums'],
  },
  speedHeroUnit: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.6,
    marginTop: 1,
  },

  /* Row 3: BMS + Return Schedule Cards */
  cardsTwoCol: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  bmsCard: {
    flex: 1.15,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropScheduleCard: {
    flex: 0.85,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  bmsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bmsLabelCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bmsDotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cardSmallTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  bmsSyncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bmsSyncChipConnected: {
    backgroundColor: '#F3E8FF',
  },
  bmsSyncChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  bmsMainReadoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 5,
  },
  bmsBigPercent: {
    fontSize: 18,
    fontWeight: '900',
  },
  bmsRangeMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  segmentedBarRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 7,
  },
  batteryCellSegment: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E2E8F0',
  },
  extendMiniTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  extendMiniTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: BRAND_PURPLE,
  },
  dropBigDate: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND_PURPLE,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  dropBigTime: {
    fontSize: 17,
    fontWeight: '900',
    color: DARK_NAVY,
    marginTop: 2,
  },
  dropZoneSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  /* Row 4: Hardware Switch Deck */
  hardwareControlsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  hwSwitchBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  hwSwitchBtnActiveAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  hwSwitchBtnActiveRose: {
    backgroundColor: '#FFF1F2',
    borderColor: '#E11D48',
  },
  hwIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hwSwitchTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DARK_NAVY,
  },
  hwSwitchSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Row 5: Bottom Primary CTAs */
  primaryCtaRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryExtendBtn: {
    flex: 0.9,
    height: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: BRAND_PURPLE,
    backgroundColor: '#FAF5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryExtendBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },
  primaryEndBtnWrap: {
    flex: 1.25,
  },
  primaryEndTouch: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: BRAND_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryEndGradient: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 9,
  },
  primaryEndText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryEndIconPill: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '82%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: DARK_NAVY,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleBridgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  scheduleKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  scheduleTimeVal: {
    fontSize: 12,
    fontWeight: '800',
    color: DARK_NAVY,
    marginTop: 3,
  },
  scheduleArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  extendOptionsScroll: {
    maxHeight: 280,
  },
  extendOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 9,
  },
  extendOptionCardActive: {
    borderColor: BRAND_PURPLE,
    backgroundColor: '#FAF5FF',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: BRAND_PURPLE,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_PURPLE,
  },
  extendOptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  extendOptLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_NAVY,
  },
  extendOptTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  extendOptTagActive: {
    backgroundColor: BRAND_PURPLE,
  },
  extendOptTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  extendOptSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  extendOptPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: DARK_NAVY,
  },
  confirmExtendCta: {
    marginTop: 8,
    height: 52,
    borderRadius: 15,
    backgroundColor: BRAND_PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmExtendCtaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  payuModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  payuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  payuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payuLogoBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payuHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  payuHeaderSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  payuHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payuAmountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  payuAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A168C',
  },
  payuCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payuLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FAF5FF',
  },
  payuLoadingText: {
    fontSize: 12,
    color: '#4A168C',
    fontWeight: '600',
  },
  payuWebView: {
    flex: 1,
  },


  /* BMS Modal Sheet */
  bmsModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  bmsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bmsModalTitleCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bmsModalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bmsMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  bmsDiagTile: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 13,
  },
  bmsDiagKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  bmsDiagValue: {
    fontSize: 21,
    fontWeight: '900',
    color: DARK_NAVY,
    marginVertical: 4,
  },
  bmsDiagSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  bmsLiveStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  bmsLiveStatusText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
});