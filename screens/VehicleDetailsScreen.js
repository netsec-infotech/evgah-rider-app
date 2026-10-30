import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';
import { apiGet, resolveMediaUrl } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const PRIMARY_BLUE = '#3729E8';
const FLEXI_PURPLE = '#4A168C';
const STORY_VIDEO = require('../assets/home/vid1.mp4');
const GOOGLE_MAPS_KEY = 'AIzaSyC_Pn12n9hRH5jQdxU7hQUOPDy820ehjwo';

function haversineDistKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  return Math.max(1, parseFloat((straightKm * 1.25).toFixed(1)));
}

async function fetchGoogleDistanceKm(originLat, originLng, destLat, destLng) {
  if (!originLat || !originLng || !destLat || !destLng) return 1;
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json?.status === 'OK' && json?.rows?.[0]?.elements?.[0]?.distance?.value) {
      const meters = json.rows[0].elements[0].distance.value;
      return Math.max(1, parseFloat((meters / 1000).toFixed(1)));
    }
  } catch (_) {}
  return haversineDistKm(originLat, originLng, destLat, destLng);
}

const PRIME_LOCATIONS = [
  {
    id: 'bdq-airport',
    icon: 'airplane-outline',
    title: 'Vadodara Airport (BDQ)',
    subtitle: "A key link for Gujarat's cultural and industrial Zone.",
    address: 'Vadodara Airport (BDQ), Civil Aerodrome, Harni Rd, Vadodara, Gujarat 390022',
  },
  {
    id: 'gotri-Zone',
    icon: 'flash-outline',
    title: 'Gotri EV Super Zone',
    subtitle: '24/7 Fast Charging & Express EV Pickup Point.',
    address: 'Gotri EV Super Zone, New Alkapuri, Laxmipura, Vadodara, Gujarat 390021',
  },
];

const INITIAL_SAVED_ADDRESSES = [
  {
    id: 'addr-1',
    tag: 'HOME',
    address:
      'Shirshak Plasto Packaging Pvt Ltd, Bhayli Rd, Bhaili, Vadodara, Gujarat 391410, India',
  },
  {
    id: 'addr-2',
    tag: 'HOME',
    address: '746R+56R, Vadodara, Gujarat 391410, India',
  },
  {
    id: 'addr-3',
    tag: 'HOME',
    address: 'Auro Prime C, Vadodara, Gujarat 391410, India',
  },
];

const MAP_LANDMARKS = [
  {
    id: 'lm-1',
    name: 'Mahantam health\ncare center',
    sub: '',
    color: '#EF4444',
    icon: 'medkit',
    top: '20%',
    left: '14%',
    address: 'Mahantam Health Care Center, Bhayli, Vadodara, Gujarat 391410, India',
  },
  {
    id: 'lm-2',
    name: 'Auro Prime',
    sub: 'Residential',
    color: '#3B82F6',
    icon: 'bag-handle',
    top: '29%',
    right: '14%',
    address: 'Auro Prime C, Bhayli Rd, Vadodara, Gujarat 391410, India',
  },
  {
    id: 'lm-3',
    name: 'Param Bliss',
    sub: '',
    color: '#3B82F6',
    icon: 'bag-handle',
    top: '39%',
    right: '8%',
    address: 'Param Bliss, New Alkapuri, Bhayli, Vadodara, Gujarat 391410, India',
  },
  {
    id: 'lm-4',
    name: 'Meadows Skylark',
    sub: '',
    color: '#F59E0B',
    icon: 'business',
    top: '44%',
    left: '6%',
    address: 'Meadows Skylark, Bhayli, Vadodara, Gujarat 391410, India',
  },
  {
    id: 'lm-5',
    name: 'Pure Water Suppliers',
    sub: '',
    color: '#3B82F6',
    icon: 'bag-handle',
    bottom: '28%',
    left: '14%',
    address: '746R+56R, Pure Water Suppliers, Vadodara, Gujarat 391410, India',
  },
  {
    id: 'lm-6',
    name: 'Cleaning Expert',
    sub: '',
    color: '#3B82F6',
    icon: 'bag-handle',
    bottom: '19%',
    left: '18%',
    address: 'Cleaning Expert, Bhayli Main Rd, Vadodara, Gujarat 391410, India',
  },
];

const SEARCH_RECENT_LOCATIONS = [
  {
    id: 'recent-1',
    title: 'Bill',
    address: 'Bill, Vadodara, Gujarat 391410, India',
    locality: 'Vadodara',
  },
];

const SEARCH_SUGGESTED_LOCATIONS = [
  {
    id: 'sugg-1',
    title: 'Anand',
    address: 'Anand, Gujarat, India',
    locality: 'Anand',
  },
  {
    id: 'sugg-2',
    title: 'Vadodara Railway Station',
    address:
      'Vadodara Railway Station-Gate1, Old Chhani Road, M S University Campus, Pratapgunj, Vadodara 390002, India',
    locality: 'Vadodara',
  },
  {
    id: 'sugg-3',
    title: 'Vadodara Airport',
    address:
      'Civil Aerodrome, 86J9+JHQ, Harni Rd, Harni, Vadodara, Gujarat 390022, India',
    locality: 'Vadodara',
  },
  {
    id: 'sugg-4',
    title: 'Vadodara Bus Station',
    address:
      '857J+4W4, GSRTC ST Depot, Maharaja Sayajirao University, Pratapgunj, Vadodara 390020, India',
    locality: 'Vadodara',
  },
  {
    id: 'sugg-5',
    title: 'Vadodara',
    address: 'Vadodara, Gujarat, India',
    locality: 'Vadodara',
  },
];

const EXTRA = {
  'Evegah Fly': {
    price: '₹149/day',
    monthly: '₹999/month',
    
    variant: 'LITE 1.2 LI-ION PEDAL-ASSIST',
    battery: '1.2 kWh',
    motor: '1000 W',
    charge: '4–5 hours',
    load: '150 kg',
    wheels: '12 inch',
    topImage: require('../assets/home/fly-top.png'),
    diagram: {
      flLabel: 'Front tyre life',
      flValue: '30k km',
      frLabel: 'Front carrier',
      frValue: '15 kg basket',
      rlLabel: 'Drive mode',
      rlValue: 'Pedal + EV',
      rrLabel: 'Rear tyre life',
      rrValue: '28k km',
      bottomLabel: 'Rear luggage rack & motor',
      bottomValue: '1000 W • Heavy duty',
    },
    popularFeatures: [
      { key: 'basket', label: 'Front Utility Basket', image: require('../assets/home/fly-top.png'), scale: 1.15, rotate: '0deg' },
      { key: 'pedals', label: 'Dual Pedal + Throttle', image: require('../assets/home/vehicle-fly.png'), scale: 1.18, rotate: '-2deg' },
      { key: 'rack', label: 'Rear Carrier Rack', image: require('../assets/home/vehicle-fly.png'), scale: 1.24, rotate: '3deg' },
    ],
    features: [
      { key: 'basket', label: 'Heavy-Duty Front\nWire Basket', icon: 'basket-outline' },
      { key: 'pedal', label: 'Pedal Assist +\nThumb Throttle', icon: 'bicycle-outline' },
      { key: 'saddle', label: 'Ergonomic Comfort\nSaddle Seat', icon: 'happy-outline' },
      { key: 'rack', label: 'Rear Steel\nCarrier Rack', icon: 'cube-outline' },
      { key: 'bell', label: 'Mechanical Bell\n& Horn', icon: 'notifications-outline' },
      { key: 'brakes', label: 'Dual Drum & Disc\nBraking', icon: 'shield-checkmark-outline' },
      { key: 'frame', label: 'Step-Through\nAlloy Frame', icon: 'construct-outline' },
      { key: 'battery', label: ' Swappable 1.2 kWh\nLi-Ion Pack', icon: 'battery-charging-outline' },
    ],
  },
  'Evegah Mink': {
    price: '₹199/day',
    monthly: '₹1,299/month',
   
    variant: 'SHARP 3.2 DCT ELECTRIC',
    battery: '3.2 kWh',
    motor: '3000 W',
    charge: '4–5 hours',
    load: '200 kg',
    wheels: '12 inch',
    topImage: require('../assets/home/mink-top.png'),
    diagram: {
      flLabel: 'Front tyre life',
      flValue: '35k km',
      frLabel: 'Headlamp unit',
      frValue: 'Halo Ring LED',
      rlLabel: 'Suspension',
      rlValue: 'Dual Hydraulic',
      rrLabel: 'Rear tyre life',
      rrValue: '32k km',
      bottomLabel: 'Zone motor & battery health',
      bottomValue: '3000 W • 98% SoH',
    },
    popularFeatures: [
      { key: 'halo', label: 'Halo Ring LED Lamp', image: require('../assets/home/mink-top.png'), scale: 1.15, rotate: '0deg' },
      { key: 'deck', label: 'Wide Flat Footboard', image: require('../assets/home/vehicle-mink.png'), scale: 1.2, rotate: '-3deg' },
      { key: 'shocks', label: 'Dual Coil Suspension', image: require('../assets/home/vehicle-mink.png'), scale: 1.25, rotate: '3deg' },
    ],
    features: [
      { key: 'halo', label: 'Halo Ring LED\nProjector Lamp', icon: 'sunny-outline' },
      { key: 'console', label: 'Smart Digital\nLCD Console', icon: 'speedometer-outline' },
      { key: 'deck', label: 'Wide Anti-Slip\nUtility Deck', icon: 'apps-outline' },
      { key: 'seat', label: 'Ergonomic Dual\nCushion Seat', icon: 'layers-outline' },
      { key: 'shocks', label: 'Dual Rear Coil\nSuspension', icon: 'options-outline' },
      { key: 'brakes', label: 'Front & Rear\nDisc Brakes', icon: 'shield-checkmark-outline' },
      { key: 'bluetooth', label: 'Bluetooth App\nSmart Unlock', icon: 'bluetooth-outline' },
      { key: 'usb', label: 'Fast USB Type-C\nCharging Port', icon: 'battery-charging-outline' },
    ],
  },
  'Evegah City': {
    price: '₹229/day',
    monthly: '₹1,499/month',
    
    variant: 'URBAN 2.5 SMART AUTOMATIC',
    battery: '2.3 kWh',
    motor: '2500 W',
    charge: '4–5 hours',
    load: '150 kg',
    wheels: '12 inch',
    topImage: require('../assets/home/city-top.png'),
    diagram: {
      flLabel: 'Front tyre life',
      flValue: '36k km',
      frLabel: 'Dual headlamps',
      frValue: 'Matrix V-LED',
      rlLabel: 'Comfort seat',
      rlValue: 'Contoured Foam',
      rrLabel: 'Rear tyre life',
      rrValue: '34k km',
      bottomLabel: 'Zone motor & range health',
      bottomValue: '2500 W • 90 km',
    },
    popularFeatures: [
      { key: 'vled', label: 'Dual Matrix V-LED', image: require('../assets/home/city-top.png'), scale: 1.15, rotate: '0deg' },
      { key: 'mirrors', label: 'Wide-Angle Mirrors', image: require('../assets/home/vehicle-city.png'), scale: 1.2, rotate: '-2deg' },
      { key: 'seat', label: 'Contoured Plush Seat', image: require('../assets/home/vehicle-city.png'), scale: 1.24, rotate: '3deg' },
    ],
    features: [
      { key: 'vled', label: 'Dual Matrix V-LED\nHeadlamps', icon: 'flashlight-outline' },
      { key: 'drl', label: 'Aero Handlebar\nLED DRLs', icon: 'sunny-outline' },
      { key: 'mirrors', label: 'Twin Wide-Angle\nSide Mirrors', icon: 'eye-outline' },
      { key: 'seat', label: 'Contoured Memory\nFoam Seat', icon: 'layers-outline' },
      { key: 'storage', label: '22L Under-Seat\nHelmet Boot', icon: 'briefcase-outline' },
      { key: 'brakes', label: 'Combined CBS\nDisc Brakes', icon: 'shield-checkmark-outline' },
      { key: 'keyless', label: 'Remote Keyless\nCentral Lock', icon: 'key-outline' },
      { key: 'usb', label: 'Fast USB Phone\nCharger', icon: 'battery-charging-outline' },
    ],
  },
  'Evegah Pro': {
    price: '₹279/day',
    monthly: '₹1,799/month',
   
    variant: 'PRO 2.5 DUAL-BATTERY MAX',
    battery: '2.5 kWh',
    motor: '2500 W',
    charge: '4–5 hours',
    load: '150 kg',
    wheels: '12 inch',
    topImage: require('../assets/home/pro-top.png'),
    diagram: {
      flLabel: 'Front tyre life',
      flValue: '28k km',
      frLabel: 'Folding stem',
      frValue: 'Quick-Lock Alloy',
      rlLabel: 'Standing deck',
      rlValue: 'Silicone Grip',
      rrLabel: 'Rear tyre life',
      rrValue: '26k km',
      bottomLabel: 'Rear disc & motor life',
      bottomValue: '2500 W • E-ABS',
    },
    popularFeatures: [
      { key: 'fold', label: 'Quick-Fold Alloy Stem', image: require('../assets/home/pro-top.png'), scale: 1.15, rotate: '0deg' },
      { key: 'deck', label: 'Silicone Grip Deck', image: require('../assets/home/vehicle-pro.png'), scale: 1.2, rotate: '-3deg' },
      { key: 'disc', label: 'E-ABS Rear Disc Brake', image: require('../assets/home/vehicle-pro.png'), scale: 1.24, rotate: '3deg' },
    ],
    features: [
      { key: 'stem', label: 'Foldable Aerospace\nAlloy Stem', icon: 'resize-outline' },
      { key: 'deck', label: 'Textured Silicone\nStanding Deck', icon: 'footsteps-outline' },
      { key: 'throttle', label: 'Precision Thumb\nThrottle Control', icon: 'speedometer-outline' },
      { key: 'brakes', label: 'E-ABS + Rear\nVentilated Disc', icon: 'shield-checkmark-outline' },
      { key: 'stand', label: 'Spring-Loaded\nSide Kickstand', icon: 'construct-outline' },
      { key: 'tail', label: 'High-Mount LED\nStop Reflector', icon: 'sunny-outline' },
      { key: 'cruise', label: 'Smart Cruise\nControl Mode', icon: 'navigate-outline' },
      { key: 'water', label: 'IP67 Waterproof\nBattery Deck', icon: 'water-outline' },
    ],
  },
};

const GALLERY_TABS = [
  { key: 'Exterior', label: 'Exterior', scale: 1, rotate: '0deg' },
  { key: 'Interior', label: 'Interior', scale: 1.25, rotate: '-4deg' },
  { key: 'Tyres', label: 'Tyres', scale: 1.45, rotate: '6deg' },
  { key: 'Features', label: 'Features', scale: 1.2, rotate: '3deg' },
  { key: 'Highlights', label: 'Highlights', scale: 1.05, rotate: '0deg', badge: true },
];

const SECTION_TABS = [
  { key: 'promise', label: 'Evegah promise' },
  { key: 'variant', label: 'Gallery' },
  { key: 'condition', label: 'Vehicle condition' },
  { key: 'features', label: 'Features' },
  { key: 'more', label: 'More rides' },
];

const BENTO_CATEGORIES = ['Exterior', 'Interior', 'Features', 'Tyres'];

const BENTO_VIEWS = {
  Exterior: {
    top: { label: 'Right Front Diagonal', scale: 1.04, rotate: '0deg' },
    bottomLeftTop: { label: 'Front', scale: 1.18, rotate: '-3deg' },
    bottomLeftBottom: { label: 'Right Side View', scale: 0.96, rotate: '2deg' },
    bottomRight: { label: 'Right Back Diagonal', scale: 1.26, rotate: '5deg' },
  },
  Interior: {
    top: { label: 'Top-Down Cockpit View', scale: 1.05, rotate: '0deg', useTop: true },
    bottomLeftTop: { label: 'Handlebar Controls', scale: 1.4, rotate: '4deg' },
    bottomLeftBottom: { label: 'Ergonomic Seat', scale: 1.15, rotate: '-4deg' },
    bottomRight: { label: 'Deck & Storage', scale: 1.28, rotate: '3deg' },
  },
  Features: {
    top: { label: 'Smart LED Headlamp', scale: 1.25, rotate: '2deg' },
    bottomLeftTop: { label: 'Keyless Start', scale: 1.35, rotate: '-3deg' },
    bottomLeftBottom: { label: 'USB Fast Charger', scale: 1.2, rotate: '0deg' },
    bottomRight: { label: 'Regenerative Braking', scale: 1.3, rotate: '-5deg' },
  },
  Tyres: {
    top: { label: 'Front Tubeless Tyre', scale: 1.48, rotate: '8deg' },
    bottomLeftTop: { label: 'Front Alloy Rim', scale: 1.4, rotate: '-6deg' },
    bottomLeftBottom: { label: 'Rear Tubeless Tyre', scale: 1.5, rotate: '4deg' },
    bottomRight: { label: 'Dual Disc Caliper', scale: 1.44, rotate: '-4deg' },
  },
};

const QUESTIONS = [
  {
    q: 'What do I need to reserve this ride?',
    a: 'A valid driving licence and completed Aadhaar KYC in the Evegah app.',
  },
  {
    q: 'How does charging work?',
    a: 'Plug into any standard 15A socket or swap at the nearest Evegah charging Zone.',
  },
  {
    q: 'Is a helmet and insurance included?',
    a: 'Yes. Comprehensive ride cover and a sanitized helmet are included with every booking.',
  },
];

function VehicleStoryModal({ videoSource, onClose }) {
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(false);
  const src = videoSource || STORY_VIDEO;
  const player = useVideoPlayer(src, (instance) => {
    instance.loop = true;
    instance.muted = false;
    instance.play();
  });

  return (
    <View style={styles.storyModalRoot}>
      <StatusBar style="light" />
      <View style={[styles.storyModalStage, { marginTop: insets.top + 12, marginBottom: Math.max(insets.bottom, 16) }]}>
        <VideoView
          player={player}
          style={styles.storyModalVideo}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
        <View style={styles.storyModalControls}>
          <Pressable
            style={styles.storyModalBtn}
            onPress={() => {
              const next = !muted;
              setMuted(next);
              player.muted = next;
            }}
          >
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.storyModalBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function VehicleDetailsScreen({ vehicle, trip, selectedZone, onBack, onBook }) {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [activeSectionTab, setActiveSectionTab] = useState('promise');
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [bentoTab, setBentoTab] = useState('Exterior');
  const [featureSpecMode, setFeatureSpecMode] = useState('Features');
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [askExpanded, setAskExpanded] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  // Selected Zone Hub coordinates
  const zoneCoords = useMemo(() => {
    const lat = selectedZone?.lat || selectedZone?.center?.lat || (trip?.pickupZoneObj?.lat) || 22.3168;
    const lng = selectedZone?.lng || selectedZone?.center?.lng || (trip?.pickupZoneObj?.lng) || 73.1415;
    const name = selectedZone?.name || trip?.pickupName || 'Gotri Zone';
    return { lat: Number(lat), lng: Number(lng), name };
  }, [selectedZone, trip]);

  // Flexi Vehicle Pickup & Drop State
  const [flexiEnabled, setFlexiEnabled] = useState(Boolean(vehicle?.flexiEnabled));
  const [sameFlexiLocation, setSameFlexiLocation] = useState(false);
  const [flexiPickupAddress, setFlexiPickupAddress] = useState(
    vehicle?.flexiPickupAddress || ''
  );
  const [flexiDropAddress, setFlexiDropAddress] = useState(
    vehicle?.flexiDropAddress || ''
  );
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [pickupKm, setPickupKm] = useState(0);
  const [dropKm, setDropKm] = useState(0);
  const [pickupDeliveryCharge, setPickupDeliveryCharge] = useState(0);
  const [dropDeliveryCharge, setDropDeliveryCharge] = useState(0);

  const [addressTarget, setAddressTarget] = useState('pickup'); // 'pickup' | 'drop'
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [searchAddressPopupOpen, setSearchAddressPopupOpen] = useState(false);
  const [searchAddressQuery, setSearchAddressQuery] = useState('');
  const [addAddressSheetOpen, setAddAddressSheetOpen] = useState(false);
  const [addressCategoryTag, setAddressCategoryTag] = useState('HOME'); // 'HOME' | 'WORK' | 'OTHERS'
  const [localityDraft, setLocalityDraft] = useState('vadodara');
  const [completeAddressDraft, setCompleteAddressDraft] = useState(
    '746R+56R, Vadodara, Gujarat 391410, India'
  );
  const [savedAddresses, setSavedAddresses] = useState(INITIAL_SAVED_ADDRESSES);
  const [mapAddressDraft, setMapAddressDraft] = useState(
    '746R+56R, Vadodara, Gujarat 391410, India'
  );
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [thingsKeepInMindOpen, setThingsKeepInMindOpen] = useState(false);

  // Gallery image preview modal state
  const [previewImage, setPreviewImage] = useState(null);

  // Real Google Map states & methods
  const webMapRef = useRef(null);
  const webMapReady = useRef(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: 22.3168,
    longitude: 73.1415,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  });
  const [userMapCoords, setUserMapCoords] = useState(null);

  // Live distance from zone to currently pinned map location
  const liveDistanceKm = useMemo(() => {
    return haversineDistKm(zoneCoords.lat, zoneCoords.lng, mapRegion.latitude, mapRegion.longitude);
  }, [zoneCoords, mapRegion.latitude, mapRegion.longitude]);

  // Google Maps HTML template loaded in WebView
  const googleMapHtml = useMemo(() => {
    const lat = 22.3168;
    const lng = 73.1415;
    const hubLat = zoneCoords.lat || 22.3168;
    const hubLng = zoneCoords.lng || 73.1415;
    const hubName = (zoneCoords.name || 'Vadodara').replace(/Zone/i, '').trim();

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #E5E3DF;
      touch-action: pan-x pan-y pinch-zoom;
    }
    #map {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
  </style>
  <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var hubMarker;

    function initMap() {
      try {
        var startCenter = { lat: ${lat}, lng: ${lng} };
        map = new google.maps.Map(document.getElementById('map'), {
          center: startCenter,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false
        });

        hubMarker = new google.maps.Marker({
          position: { lat: ${hubLat}, lng: ${hubLng} },
          map: map,
          title: "${hubName} Hub",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#4A168C",
            fillOpacity: 1,
            strokeWeight: 2.5,
            strokeColor: "#FFFFFF"
          }
        });

        google.maps.event.addListener(map, 'idle', function() {
          var c = map.getCenter();
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MAP_IDLE',
              latitude: c.lat(),
              longitude: c.lng()
            }));
          }
        });

        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      } catch (err) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_ERROR', message: String(err) }));
        }
      }
    }

    window.panToLocation = function(lat, lng) {
      if (map && map.panTo) {
        map.panTo({ lat: Number(lat), lng: Number(lng) });
      }
    };

    window.onload = initMap;
  </script>
</body>
</html>`;
  }, [zoneCoords.lat, zoneCoords.lng, zoneCoords.name]);

  const handleWebMapMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        webMapReady.current = true;
        setMapLoading(false);
        if (mapRegion.latitude && mapRegion.longitude) {
          webMapRef.current?.injectJavaScript(`window.panToLocation(${mapRegion.latitude}, ${mapRegion.longitude}); true;`);
        }
      } else if (data.type === 'MAP_IDLE') {
        const { latitude, longitude } = data;
        setMapRegion((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        try {
          const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_KEY}`;
          const res = await fetch(geoUrl);
          const json = await res.json();
          if (json?.status === 'OK' && json?.results?.[0]?.formatted_address) {
            setMapAddressDraft(json.results[0].formatted_address);
            return;
          }
        } catch (_) {}

        try {
          const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (rev && rev[0]) {
            const item = rev[0];
            const parts = [item.name || item.street, item.subregion || item.district, item.city].filter(Boolean);
            if (parts.length > 0) setMapAddressDraft(parts.join(', '));
          }
        } catch (_) {}
      }
    } catch (_) {}
  };

  // Google Places live autocomplete states
  const [googlePlacesPredictions, setGooglePlacesPredictions] = useState([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  useEffect(() => {
    let active = true;
    const query = searchAddressQuery.trim();
    if (query.length < 2) {
      setGooglePlacesPredictions([]);
      setIsSearchingPlaces(false);
      return;
    }
    setIsSearchingPlaces(true);
    const timeout = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:in&key=${GOOGLE_MAPS_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (active && data?.predictions) {
          setGooglePlacesPredictions(data.predictions);
        }
      } catch (err) {
        console.warn('Google Places Autocomplete error:', err);
      } finally {
        if (active) setIsSearchingPlaces(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchAddressQuery]);

  const selectGooglePlace = async (placeId, description) => {
    try {
      Keyboard.dismiss();
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json?.result?.geometry?.location) {
        const { lat, lng } = json.result.geometry.location;
        const newCoords = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        };
        setMapRegion(newCoords);
        webMapRef.current?.injectJavaScript(`window.panToLocation(${newCoords.latitude}, ${newCoords.longitude}); true;`);
        const fullAddr = json.result.formatted_address || description;
        setMapAddressDraft(fullAddr);
        setCompleteAddressDraft(fullAddr);
        setLocalityDraft(json.result.name || 'vadodara');
      } else {
        setMapAddressDraft(description);
        setCompleteAddressDraft(description);
      }
    } catch (_) {
      setMapAddressDraft(description);
      setCompleteAddressDraft(description);
    }
    setSearchAddressPopupOpen(false);
  };

  const getMapUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (pos?.coords) {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        };
        setUserMapCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setMapRegion(coords);
        webMapRef.current?.injectJavaScript(`window.panToLocation(${coords.latitude}, ${coords.longitude}); true;`);

        try {
          const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=${GOOGLE_MAPS_KEY}`;
          const res = await fetch(geoUrl);
          const json = await res.json();
          if (json?.status === 'OK' && json?.results?.[0]?.formatted_address) {
            setMapAddressDraft(json.results[0].formatted_address);
          } else {
            const rev = await Location.reverseGeocodeAsync({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            if (rev && rev[0]) {
              const item = rev[0];
              const parts = [item.name || item.street, item.subregion || item.district, item.city, item.postalCode].filter(Boolean);
              const addr = parts.join(', ');
              if (addr) setMapAddressDraft(addr);
            }
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Map user location error:', e);
    }
  };

  useEffect(() => {
    if (mapPickerOpen) {
      getMapUserLocation();
    }
  }, [mapPickerOpen]);

  const filteredRecent = SEARCH_RECENT_LOCATIONS.filter(
    (item) =>
      !searchAddressQuery ||
      item.title.toLowerCase().includes(searchAddressQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchAddressQuery.toLowerCase())
  );

  const filteredSuggested = SEARCH_SUGGESTED_LOCATIONS.filter(
    (item) =>
      !searchAddressQuery ||
      item.title.toLowerCase().includes(searchAddressQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchAddressQuery.toLowerCase())
  );

  const openAddressPicker = (target) => {
    setAddressTarget(target);
    setAddressSheetOpen(true);
  };

  const applySelectedAddress = async (addrString, coords) => {
    const locCoords = coords || { latitude: mapRegion.latitude, longitude: mapRegion.longitude };
    const km = await fetchGoogleDistanceKm(zoneCoords.lat, zoneCoords.lng, locCoords.latitude, locCoords.longitude);
    const charge = Math.round(km * 30);

    if (addressTarget === 'pickup') {
      setFlexiPickupAddress(addrString);
      setPickupCoords(locCoords);
      setPickupKm(km);
      setPickupDeliveryCharge(charge);
      if (sameFlexiLocation) {
        setFlexiDropAddress(addrString);
        setDropCoords(locCoords);
        setDropKm(km);
        setDropDeliveryCharge(charge);
      }
      setAddressSheetOpen(false);
    } else {
      setFlexiDropAddress(addrString);
      setDropCoords(locCoords);
      setDropKm(km);
      setDropDeliveryCharge(charge);
      setAddressSheetOpen(false);
    }
  };

  // Sync same drop location if checkbox is toggled
  useEffect(() => {
    if (sameFlexiLocation && flexiPickupAddress) {
      setFlexiDropAddress(flexiPickupAddress);
      setDropCoords(pickupCoords);
      setDropKm(pickupKm);
      setDropDeliveryCharge(pickupDeliveryCharge);
    }
  }, [sameFlexiLocation, flexiPickupAddress, pickupCoords, pickupKm, pickupDeliveryCharge]);

  const totalDeliveryCharge = sameFlexiLocation
    ? pickupDeliveryCharge * 2
    : pickupDeliveryCharge + (flexiDropAddress ? dropDeliveryCharge : 0);
  const totalDeliveryKm = sameFlexiLocation
    ? pickupKm * 2
    : pickupKm + (flexiDropAddress ? dropKm : 0);

  const handleConfirmMapPin = () => {
    const cleanAddr =
      mapAddressDraft.trim() || '746R+56R, Vadodara, Gujarat 391410, India';
    const currentCoords = { latitude: mapRegion.latitude, longitude: mapRegion.longitude };
    if (editingAddressId) {
      setSavedAddresses((prev) =>
        prev.map((item) =>
          item.id === editingAddressId ? { ...item, address: cleanAddr, coords: currentCoords } : item
        )
      );
      setEditingAddressId(null);
    } else if (!savedAddresses.some((item) => item.address === cleanAddr)) {
      setSavedAddresses((prev) => [
        { id: `addr-${Date.now()}`, tag: 'HOME', address: cleanAddr, coords: currentCoords },
        ...prev,
      ]);
    }
    setMapPickerOpen(false);
    applySelectedAddress(cleanAddr, currentCoords);
  };

  const handleProceedBook = () => {
    if (flexiEnabled) {
      if (!flexiPickupAddress) {
        openAddressPicker('pickup');
        return;
      }
      const effectiveDrop = sameFlexiLocation
        ? flexiPickupAddress
        : flexiDropAddress;
      if (!effectiveDrop) {
        openAddressPicker('drop');
        return;
      }
      const effDropKm = sameFlexiLocation ? pickupKm : (dropKm || pickupKm);
      const effDropCharge = sameFlexiLocation ? pickupDeliveryCharge : (dropDeliveryCharge || pickupDeliveryCharge);
      const totalCharge = pickupDeliveryCharge + effDropCharge;
      const totalKm = pickupKm + effDropKm;

      onBook?.({
        flexiEnabled: true,
        flexiPickupAddress,
        flexiDropAddress: effectiveDrop,
        pickupKm,
        dropKm: effDropKm,
        totalDeliveryKm: totalKm,
        pickupDeliveryCharge,
        dropDeliveryCharge: effDropCharge,
        totalDeliveryCharge: totalCharge,
      });
      return;
    }
    onBook?.({
      flexiEnabled: false,
      flexiPickupAddress: '',
      flexiDropAddress: '',
      totalDeliveryCharge: 0,
      totalDeliveryKm: 0,
    });
  };

  const mainScrollRef = useRef(null);
  const galleryRef = useRef(null);
  const sectionOffsets = useRef({
    promise: 0,
    variant: 480,
    condition: 1080,
    features: 1780,
    more: 2380,
  });

  const vehicleName = vehicle?.name || 'Evegah Mink';
  const vehicleImage = vehicle?.image || require('../assets/home/vehicle-mink.png');
  const [modelDetails, setModelDetails] = useState(null);

  // Fetch live specifications & features from backend vehicle models API
  useEffect(() => {
    let mounted = true;
    apiGet('/vehicles/models')
      .then((res) => {
        if (!mounted) return;
        const models = res?.data || (Array.isArray(res) ? res : []);
        const matched = models.find(
          (m) =>
            (vehicle?.modelId && m.id === vehicle.modelId) ||
            String(m.name || '').toLowerCase() === String(vehicleName).toLowerCase() ||
            String(vehicleName).toLowerCase().includes(String(m.name || '').toLowerCase())
        );
        if (matched) {
          setModelDetails(matched);
        }
      })
      .catch((err) => console.warn('Vehicle details model fetch notice:', err.message));

    return () => {
      mounted = false;
    };
  }, [vehicleName, vehicle?.modelId]);

  const extraFallback = EXTRA[vehicleName] || EXTRA['Evegah Mink'];
  const effectiveBattery = vehicle?.battery || vehicle?.battery_capacity || modelDetails?.battery_capacity || extraFallback.battery;
  const effectiveMotor = vehicle?.motor || vehicle?.motor_power || modelDetails?.motor_power || extraFallback.motor;
  const effectiveCharge = vehicle?.charge || vehicle?.charging_time || modelDetails?.charging_time || extraFallback.charge;
  const effectiveLoad = vehicle?.load || vehicle?.load_capacity || modelDetails?.load_capacity || extraFallback.load;
  const effectiveWheels = vehicle?.wheels || vehicle?.wheel_size || modelDetails?.wheel_size || extraFallback.wheels;
  let baseDaily =
    vehicle?.dailyRate ||
    vehicle?.priceNum ||
    (parseFloat(String(vehicle?.price || '').replace(/\D/g, '')) || 0);
  let baseMonthly =
    vehicle?.monthlyRate ||
    (modelDetails?.monthly_rate ? parseFloat(modelDetails.monthly_rate) : null);

  const effectivePrice =
    vehicle?.price || (baseDaily ? `₹${Math.round(baseDaily).toLocaleString('en-IN')}/day` : '');
  const effectiveMonthly =
    vehicle?.emi !== undefined
      ? vehicle.emi
      : baseMonthly
      ? `₹${Math.round(baseMonthly).toLocaleString('en-IN')}/month`
      : '';
  const effectiveVariant = vehicle?.edition || vehicle?.tagline || modelDetails?.tagline || extraFallback.variant;
  const effectiveDescription = vehicle?.description || modelDetails?.description;
  const effectiveBrakes = vehicle?.brakes || modelDetails?.brakes || 'Combined CBS Disc Brakes';
  const effectiveWarranty = vehicle?.warranty || modelDetails?.warranty || '1 Year Warranty';
  const effectiveWater = vehicle?.water_resistance || modelDetails?.water_resistance || 'IP67 Certified';

  const extra = {
    ...extraFallback,
    battery: effectiveBattery,
    motor: effectiveMotor,
    charge: effectiveCharge,
    load: effectiveLoad,
    wheels: effectiveWheels,
    price: effectivePrice,
    monthly: effectiveMonthly,
    variant: effectiveVariant,
  };

  const specGridItems = [
    { key: 'motor', label: `Motor Power\n${effectiveMotor}`, icon: 'speedometer-outline' },
    { key: 'battery', label: `Battery Pack\n${effectiveBattery}`, icon: 'battery-full-outline' },
    { key: 'charge', label: `Charge Time\n${effectiveCharge}`, icon: 'flash-outline' },
    { key: 'wheels', label: `Wheel Size\n${effectiveWheels}`, icon: 'disc-outline' },
    { key: 'load', label: `Load Capacity\n${effectiveLoad}`, icon: 'barbell-outline' },
    { key: 'brakes', label: `Brakes\n${effectiveBrakes}`, icon: 'shield-checkmark-outline' },
    { key: 'warranty', label: `Warranty\n${effectiveWarranty}`, icon: 'ribbon-outline' },
    { key: 'water', label: `Water Rating\n${effectiveWater}`, icon: 'water-outline' },
  ];

  // Backend uploaded media resolution
  const resolvedBackendImages = [];
  if (modelDetails?.main_image || vehicle?.image_url) {
    const mainImgUrl = resolveMediaUrl(modelDetails?.main_image || vehicle?.image_url);
    if (mainImgUrl) resolvedBackendImages.push(mainImgUrl);
  }
  const rawGallery = modelDetails?.gallery_images || vehicle?.gallery_images;
  if (Array.isArray(rawGallery)) {
    rawGallery.forEach((img) => {
      const resolved = resolveMediaUrl(img);
      if (resolved && !resolvedBackendImages.includes(resolved)) {
        resolvedBackendImages.push(resolved);
      }
    });
  }

  const effectiveMediaList = resolvedBackendImages.length > 0
    ? resolvedBackendImages.map((uri) => ({ uri }))
    : [vehicleImage];

  const galleryItems = effectiveMediaList.map((src, idx) => {
    const tabFallback = GALLERY_TABS[idx % GALLERY_TABS.length];
    return {
      key: `gallery-item-${idx}`,
      label: tabFallback ? tabFallback.label : `View ${idx + 1}`,
      source: src,
      scale: 1,
      rotate: '0deg',
      badge: idx === 0,
    };
  });

  const resolvedVideoUrl = resolveMediaUrl(modelDetails?.video_url || vehicle?.video_url);
  const videoSource = resolvedVideoUrl ? { uri: resolvedVideoUrl } : STORY_VIDEO;

  const selectCategory = (idx) => {
    setActiveTab(idx);
    galleryRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
  };

  const handleSectionTabPress = (key) => {
    setActiveSectionTab(key);
    const targetY = sectionOffsets.current[key] ?? 0;
    mainScrollRef.current?.scrollTo({ y: Math.max(0, targetY - 56), animated: true });
  };

  const handleMainScroll = (event) => {
    const y = event?.nativeEvent?.contentOffset?.y ?? 0;
    setScrolledPastHero(y > 240);

    const offsets = sectionOffsets.current;
    if (y + 120 >= offsets.more) {
      setActiveSectionTab('more');
    } else if (y + 120 >= offsets.features) {
      setActiveSectionTab('features');
    } else if (y + 120 >= offsets.condition) {
      setActiveSectionTab('condition');
    } else if (y + 120 >= offsets.variant) {
      setActiveSectionTab('variant');
    } else {
      setActiveSectionTab('promise');
    }
  };

  const bentoConfig = BENTO_VIEWS[bentoTab] || BENTO_VIEWS.Exterior;

  // Map features dynamically from the backend vehicle models API
  const activeFeatures = modelDetails?.features || vehicle?.backendFeatures;
  const dynamicFeatures = Array.isArray(activeFeatures) && activeFeatures.length > 0
    ? activeFeatures.map((f, i) => {
        let iconName = 'checkmark-circle-outline';
        const rawIcon = String(f.icon || '').toLowerCase();
        if (rawIcon.includes('eco') || rawIcon.includes('leaf')) iconName = 'leaf-outline';
        else if (rawIcon.includes('rupee') || rawIcon.includes('cash') || rawIcon.includes('cost')) iconName = 'cash-outline';
        else if (rawIcon.includes('bolt') || rawIcon.includes('charge') || rawIcon.includes('flash')) iconName = 'flash-outline';
        else if (rawIcon.includes('display') || rawIcon.includes('speed') || rawIcon.includes('meter')) iconName = 'speedometer-outline';
        else if (rawIcon.includes('seat')) iconName = 'layers-outline';
        else if (rawIcon.includes('light')) iconName = 'sunny-outline';
        else if (rawIcon.includes('tyre') || rawIcon.includes('wheel')) iconName = 'disc-outline';
        else if (rawIcon.includes('shield') || rawIcon.includes('protect')) iconName = 'shield-checkmark-outline';
        else if (rawIcon.includes('battery')) iconName = 'battery-charging-outline';
        else if (rawIcon.includes('bluetooth')) iconName = 'bluetooth-outline';

        return {
          key: `bf-${i}`,
          label: `${f.title}\n${f.subtitle || ''}`.trim(),
          icon: iconName,
        };
      })
    : null;

  const featureList = dynamicFeatures || extra.features || EXTRA['Evegah Mink'].features;
  const visibleFeatures = showAllFeatures ? featureList : featureList.slice(0, 6);
  const diagram = extra.diagram || EXTRA['Evegah Mink'].diagram;
  const popularList = extra.popularFeatures || EXTRA['Evegah Mink'].popularFeatures;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.topHeaderContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarRow}>
          <Pressable hitSlop={8} style={styles.roundBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#1C1C1C" />
          </Pressable>

          {scrolledPastHero ? (
            <View style={styles.compactHeaderTitleWrap}>
              <Text style={styles.compactHeaderTitle} numberOfLines={1}>
                {vehicleName}
              </Text>
              <Text style={styles.compactHeaderPrice}>{extra.price}</Text>
            </View>
          ) : (
            <View style={styles.ownedStockPill}>
              <Text style={styles.ownedStockBrand}>Evegah</Text>
              <View style={styles.ownedStockDot}>
                <View style={styles.ownedStockHalf} />
              </View>
              <Text style={styles.ownedStockText}>wned stock</Text>
            </View>
          )}

          <Pressable
            hitSlop={8}
            style={styles.roundBtn}
            onPress={() => {
              Share.share({
                message: `Check out the  ${vehicleName} (${extra.price}) on Evegah!`,
              }).catch(() => {});
            }}
          >
            <Ionicons name="arrow-redo-outline" size={20} color="#1C1C1C" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionNavRow}
        >
          {SECTION_TABS.map((tab) => {
            const active = activeSectionTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleSectionTabPress(tab.key)}
                style={styles.sectionNavBtn}
              >
                <Text style={[styles.sectionNavText, active && styles.sectionNavTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.sectionNavIndicator, active && styles.sectionNavIndicatorActive]} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleMainScroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <View
          onLayout={(e) => {
            sectionOffsets.current.promise = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.heroWrap}>
            <View style={styles.heroPedestal} />

            <ScrollView
              ref={galleryRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
                const page = Math.round(offsetX / SCREEN_W);
                setActiveTab(Math.max(0, Math.min(galleryItems.length - 1, page)));
              }}
            >
              {galleryItems.map((item) => (
                <View key={item.key} style={styles.heroSlide}>
                  <Animated.View entering={FadeIn.duration(480)}>
                    <Image
                      source={item.source}
                      style={[
                        styles.heroImage,
                        { transform: [{ scale: item.scale }, { rotate: item.rotate }] },
                      ]}
                      contentFit="contain"
                    />
                  </Animated.View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.heroMetaRow}>
              <View style={styles.sellsFastPill}>
                <Text style={styles.sellsFastText}>Usually books in 3 mins</Text>
              </View>

              <View style={styles.dotsRow}>
                {galleryItems.map((item, idx) => (
                  <View
                    key={item.key}
                    style={[styles.dot, idx === activeTab && styles.dotActive]}
                  />
                ))}
              </View>

              <Pressable style={styles.storyRingBtn} onPress={() => setStoryOpen(true)}>
                <View style={styles.storyThumbInner}>
                  <Image
                    source={effectiveMediaList[0] || require('../assets/home/slider2_front.png')}
                    style={styles.storyThumbImg}
                    contentFit="cover"
                  />
                  <View style={styles.storyPlayOverlay}>
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                  </View>
                </View>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {galleryItems.map((item, idx) => {
                const active = idx === activeTab;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => selectCategory(idx)}
                    style={[styles.thumbCard, active && styles.thumbCardActive]}
                  >
                    <View style={styles.thumbImgBox}>
                      <Image
                        source={item.source}
                        style={[
                          styles.thumbImg,
                          { transform: [{ scale: item.scale }, { rotate: item.rotate }] },
                        ]}
                        contentFit="contain"
                      />
                      {item.badge ? (
                        <View style={styles.thumbStarBadge}>
                          <Ionicons name="star" size={11} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.thumbLabel, active && styles.thumbLabelActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Animated.View entering={cardEnter(0)} style={styles.mainSheet}>
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Text style={styles.vehicleHeading}> {vehicleName.toUpperCase()}</Text>
                <Text style={styles.vehicleVariant}>{extra.variant}</Text>
              </View>
              <Pressable
                hitSlop={10}
                style={styles.wishlistBtn}
                onPress={() => setSaved((v) => !v)}
              >
                <Ionicons
                  name={saved ? 'heart' : 'heart-outline'}
                  size={24}
                  color={saved ? '#E11D48' : '#11141C'}
                />
              </Pressable>
            </View>

            <View style={styles.breadcrumbsRow}>
              <Text style={styles.breadcrumbItem}>{vehicle?.range || '70-90 km'}</Text>
              <Text style={styles.breadcrumbSep}>|</Text>
              <Text style={styles.breadcrumbItem}>Electric</Text>
              <Text style={styles.breadcrumbSep}>|</Text>
              <Text style={styles.breadcrumbItem}>Automatic</Text>
              <Text style={styles.breadcrumbSep}>|</Text>
              <Text style={styles.breadcrumbItem}>GJ06</Text>
            </View>

            <View style={styles.dashedDivider} />

           

            <View style={styles.priceMainRow}>
              <Text style={styles.priceMainText}>{extra.price}</Text>
              <View style={styles.allInclusiveWrap}>
                <Text style={styles.allInclusiveText}>(all inclusive)</Text>
                <Ionicons name="information-circle-outline" size={15} color={PRIMARY_BLUE} />
              </View>
            </View>

            {extra.monthly ? (
              <View style={styles.emiRow}>
                <View style={styles.emiUnderline}>
                  <Text style={styles.emiPriceText}>{extra.monthly}</Text>
                </View>
                <Text style={styles.breadcrumbSep}>|</Text>
                <Text style={styles.emiSubText}>{`${extra.price} • ${extra.monthly}`}</Text>
              </View>
            ) : null}

             {/* Flexi EV Delivery & Pickup Card (Matches Screenshot 1) */}
            <View style={styles.flexiSectionWrap}>
              {/* Top Dark Tab Ribbon */}
              <View style={styles.flexiTopTabRibbon}>
                <Text style={styles.flexiTopTabText}>Flexi Drop & Pickup</Text>
              </View>

              <View
                style={[
                  styles.flexiMainCard,
                  flexiEnabled && styles.flexiMainCardActive,
                ]}
              >
                {/* Grey Header Area with Toggle + 3D Vector Illustration */}
                <View style={styles.flexiHeaderGrey}>
                  <View style={styles.flexiHeaderLeft}>
                    <Text style={styles.flexiRateText}>
                      Additional ₹30/KM
                    </Text>

                    <View style={styles.flexiSwitchRow}>
                      <Pressable
                        onPress={() => {
                          const next = !flexiEnabled;
                          setFlexiEnabled(next);
                          if (next && !flexiPickupAddress) {
                            openAddressPicker('pickup');
                          }
                        }}
                        style={[
                          styles.flexiSwitchTrack,
                          flexiEnabled && styles.flexiSwitchTrackOn,
                        ]}
                      >
                        <View
                          style={[
                            styles.flexiSwitchThumb,
                            flexiEnabled && styles.flexiSwitchThumbOn,
                          ]}
                        />
                      </Pressable>
                      <Text style={styles.flexiToggleStatusText}>
                        {flexiEnabled
                          ? 'Flexi Pickup & Drop Selected'
                          : 'Flexi Pickup & Drop'}
                      </Text>
                    </View>
                  </View>

                  {/* 3D Isometric House & EV Delivery Vector Asset */}
                  <View style={styles.flexiHouseArtWrap}>
                    <Image
                      source={require('../assets/vehicle-detail/vd-vector.png')}
                      style={styles.flexiVectorImage}
                      contentFit="contain"
                    />
                  </View>
                </View>

                {/* White Body: Pickup & Drop Address Selection Rows */}
                <View style={styles.flexiWhiteBody}>
                  {/* Pickup / Delivery Address Row */}
                  <Pressable
                    onPress={() => {
                      if (!flexiEnabled) setFlexiEnabled(true);
                      openAddressPicker('pickup');
                    }}
                    style={styles.flexiAddressRow}
                  >
                    <View style={styles.flexiAddressCopy}>
                      <Text style={styles.flexiAddressKicker}>
                        {flexiEnabled
                          ? 'Pickup / Delivery Location *'
                          : 'Deliver & Pickup the EV from'}
                      </Text>
                      {flexiPickupAddress ? (
                        <Text
                          style={styles.flexiSelectedAddressText}
                          numberOfLines={2}
                        >
                          {flexiPickupAddress}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.flexiAddAddressBtn}>
                      <Text style={styles.flexiAddAddressText}>
                        {flexiPickupAddress ? 'Change' : 'Add address'}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color={FLEXI_PURPLE}
                      />
                    </View>
                  </Pressable>

                  {/* Checkbox: Same delivery and pickup location */}
                  <Pressable
                    onPress={() => {
                      const nextSame = !sameFlexiLocation;
                      setSameFlexiLocation(nextSame);
                      if (nextSame && flexiPickupAddress) {
                        setFlexiDropAddress(flexiPickupAddress);
                      }
                    }}
                    style={styles.flexiSameLocRow}
                  >
                    <View
                      style={[
                        styles.flexiCheckbox,
                        sameFlexiLocation && styles.flexiCheckboxOn,
                      ]}
                    >
                      {sameFlexiLocation ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text style={styles.flexiSameLocText}>
                      Same Drop and Pickup location
                    </Text>
                  </Pressable>

                  {/* Drop / Return Location Row (Always shown when Flexi is selected or when Same Location is unchecked so rider can add BOTH Pickup and Drop) */}
                  {!sameFlexiLocation ? (
                    <Pressable
                      onPress={() => {
                        if (!flexiEnabled) setFlexiEnabled(true);
                        openAddressPicker('drop');
                      }}
                      style={[styles.flexiAddressRow, styles.flexiDropAddressRow]}
                    >
                      <View style={styles.flexiAddressCopy}>
                        <Text style={styles.flexiAddressKicker}>
                          Drop / Return Location *
                        </Text>
                        {flexiDropAddress ? (
                          <Text
                            style={styles.flexiSelectedAddressText}
                            numberOfLines={2}
                          >
                            {flexiDropAddress}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.flexiAddAddressBtn}>
                        <Text style={styles.flexiAddAddressText}>
                          {flexiDropAddress ? 'Change' : 'Add drop address'}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={15}
                          color={FLEXI_PURPLE}
                        />
                      </View>
                    </Pressable>
                  ) : null}

                  {/* Real-time Distance & Delivery Fee Card */}
                  {flexiEnabled && (pickupKm > 0 || dropKm > 0) ? (
                    <View style={styles.flexiDistanceBreakdownCard}>
                      <View style={styles.flexiDistHeaderRow}>
                        <Ionicons name="speedometer-outline" size={16} color={FLEXI_PURPLE} />
                        <Text style={styles.flexiDistHeaderTitle}>
                          Doorstep Distance from {zoneCoords.name.replace(/Zone/i, '').trim()} Hub
                        </Text>
                      </View>

                      {pickupKm > 0 ? (
                        <View style={styles.flexiDistRow}>
                          <View style={styles.flexiDistIconTag}>
                            <Text style={styles.flexiDistTagText}>PICKUP</Text>
                          </View>
                          <Text style={styles.flexiDistLabel} numberOfLines={1}>
                            {pickupKm} km from Hub (@ ₹30/km)
                          </Text>
                          <Text style={styles.flexiDistVal}>₹{pickupDeliveryCharge}</Text>
                        </View>
                      ) : null}

                      {sameFlexiLocation && pickupKm > 0 ? (
                        <View style={styles.flexiDistRow}>
                          <View style={[styles.flexiDistIconTag, { backgroundColor: '#EDE9FE' }]}>
                            <Text style={[styles.flexiDistTagText, { color: '#6D28D9' }]}>DROP</Text>
                          </View>
                          <Text style={styles.flexiDistLabel} numberOfLines={1}>
                            {pickupKm} km to Hub (@ ₹30/km)
                          </Text>
                          <Text style={styles.flexiDistVal}>₹{pickupDeliveryCharge}</Text>
                        </View>
                      ) : dropKm > 0 ? (
                        <View style={styles.flexiDistRow}>
                          <View style={[styles.flexiDistIconTag, { backgroundColor: '#EDE9FE' }]}>
                            <Text style={[styles.flexiDistTagText, { color: '#6D28D9' }]}>DROP</Text>
                          </View>
                          <Text style={styles.flexiDistLabel} numberOfLines={1}>
                            {dropKm} km to Hub (@ ₹30/km)
                          </Text>
                          <Text style={styles.flexiDistVal}>₹{dropDeliveryCharge}</Text>
                        </View>
                      ) : null}

                      <View style={styles.flexiDistDivider} />

                      <View style={styles.flexiDistTotalRow}>
                        <Text style={styles.flexiDistTotalLabel}>
                          Total Flexi Delivery ({totalDeliveryKm} km)
                        </Text>
                        <Text style={styles.flexiDistTotalVal}>₹{totalDeliveryCharge}</Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.flexiBodyDivider} />

                  {/* Things to keep in mind -> */}
                  <Pressable
                    onPress={() => setThingsKeepInMindOpen(true)}
                    style={styles.flexiKeepInMindRow}
                  >
                    <Text style={styles.flexiKeepInMindText}>
                      Things to keep in mind
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#12804A" />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.assuranceBox}>
              <View style={styles.assuranceLeft}>
                <View style={styles.assuranceItem}>
                  <Ionicons name="checkmark-circle" size={17} color="#4A168C" />
                  <Text style={styles.assuranceText}>With BMS, Geo-Fence & Many More </Text>
                </View>
                <View style={styles.assuranceItem}>
                  <Ionicons name="checkmark-circle" size={17} color="#4A168C" />
                  <Text style={styles.assuranceText}>Great savings vs petrol scooter</Text>
                </View>
                <View style={styles.assuranceItem}>
                  <Ionicons name="checkmark-circle" size={17} color="#4A168C" />
                  <Text style={styles.assuranceText}>Best price vs</Text>
                  <View style={styles.competitorDots}>
                    <View style={[styles.compCircle, { backgroundColor: '#E11D48', marginLeft: 0 }]}>
                      <Ionicons name="pricetag" size={8} color="#FFFFFF" />
                    </View>
                    <View style={[styles.compCircle, { backgroundColor: '#2563EB' }]}>
                      <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                    </View>
                    <View style={[styles.compCircle, { backgroundColor: '#F59E0B' }]}>
                      <Ionicons name="flash" size={8} color="#11141C" />
                    </View>
                    <View style={[styles.compCircle, { backgroundColor: '#111827' }]}>
                      <Ionicons name="star" size={8} color="#F59E0B" />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.festBadge}>
                <Text style={styles.festBadgeLine1}>Fest</Text>
                <Text style={styles.festBadgeLine2}>Forward</Text>
                <Text style={styles.festBadgeLine3}>Days</Text>
              </View>
            </View>

            {/* Location Pill */}
            <View style={styles.ZoneLocationPill}>
              <Ionicons name="location-outline" size={16} color={PRIMARY_BLUE} />
              <Text style={styles.ZoneLocationText} numberOfLines={1}>
                {vehicle?.Zone || 'Zone · Gotri Charging Zone, Vadodara'}
              </Text>
            </View>

            {/* Model Description from API */}
            {effectiveDescription ? (
              <View style={styles.modelDescriptionCard}>
                <View style={styles.modelDescHeaderRow}>
                  <Ionicons name="sparkles" size={15} color={PRIMARY_BLUE} />
                  <Text style={styles.modelDescTitle}>About {vehicleName}</Text>
                </View>
                <Text style={styles.modelDescBody}>{effectiveDescription}</Text>
              </View>
            ) : null}

            {/* Guarantee / Professional Host Banner (Matches Screenshot 1) */}
            <View style={styles.guaranteeHostCard}>
              <View style={styles.guaranteeSealWrap}>
                <View style={styles.guaranteeSealOuter}>
                  <View style={styles.guaranteeSealInner}>
                    <Text style={styles.guaranteeStarsTop}>★ ★ ★</Text>
                    <View style={styles.guaranteeRibbon}>
                      <Text style={styles.guaranteeRibbonText}>GUARANTEE</Text>
                    </View>
                    <Text style={styles.guaranteeStarsTop}>★ ★ ★</Text>
                  </View>
                </View>
              </View>
              <View style={styles.guaranteeHostCopy}>
                <Text style={styles.guaranteeHostTitle}>Professional Host</Text>
                <Text style={styles.guaranteeHostSub}>
                  99% fulfillment with consistent 5-star ratings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>

           
          </Animated.View>
        </View>

        {/* SECTION: Gallery Bento (Variant Info - Screenshot 3) */}
        <View
          style={styles.cardSection}
          onLayout={(e) => {
            sectionOffsets.current.variant = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.cardSectionHeading}>Gallery</Text>

          <View style={styles.bentoContainer}>
            {/* Top full-width tile */}
            <Pressable
              onPress={() =>
                setPreviewImage(effectiveMediaList[0] || vehicleImage)
              }
              style={styles.bentoTopTile}
            >
              <Image
                source={effectiveMediaList[0] || vehicleImage}
                style={[
                  styles.bentoTopImg,
                  {
                    transform: [
                      { scale: bentoConfig.top.scale },
                      { rotate: bentoConfig.top.rotate },
                    ],
                  },
                ]}
                contentFit="contain"
              />
              <View style={styles.bentoZoomPill}>
                <Ionicons name="expand-outline" size={14} color="#64748B" />
              </View>
            </Pressable>

            {/* Bottom 2-column grid */}
            <View style={styles.bentoBottomRow}>
              <View style={styles.bentoLeftCol}>
                <Pressable
                  onPress={() =>
                    setPreviewImage(
                      effectiveMediaList[1] || effectiveMediaList[0] || vehicleImage
                    )
                  }
                  style={styles.bentoSmallTile}
                >
                  <Image
                    source={effectiveMediaList[1] || effectiveMediaList[0] || vehicleImage}
                    style={[
                      styles.bentoSmallImg,
                      {
                        transform: [
                          { scale: bentoConfig.bottomLeftTop.scale },
                          { rotate: bentoConfig.bottomLeftTop.rotate },
                        ],
                      },
                    ]}
                    contentFit="contain"
                  />
                  <View style={styles.bentoZoomPill}>
                    <Ionicons name="expand-outline" size={13} color="#64748B" />
                  </View>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setPreviewImage(
                      effectiveMediaList[2] || effectiveMediaList[0] || vehicleImage
                    )
                  }
                  style={styles.bentoSmallTile}
                >
                  <Image
                    source={effectiveMediaList[2] || effectiveMediaList[0] || vehicleImage}
                    style={[
                      styles.bentoSmallImg,
                      {
                        transform: [
                          { scale: bentoConfig.bottomLeftBottom.scale },
                          { rotate: bentoConfig.bottomLeftBottom.rotate },
                        ],
                      },
                    ]}
                    contentFit="contain"
                  />
                  <View style={styles.bentoZoomPill}>
                    <Ionicons name="expand-outline" size={13} color="#64748B" />
                  </View>
                </Pressable>
              </View>

              <Pressable
                onPress={() =>
                  setPreviewImage(
                    effectiveMediaList[3] ||
                      effectiveMediaList[1] ||
                      effectiveMediaList[0] ||
                      vehicleImage
                  )
                }
                style={styles.bentoRightCol}
              >
                <Image
                  source={effectiveMediaList[3] || effectiveMediaList[1] || effectiveMediaList[0] || vehicleImage}
                  style={[
                    styles.bentoTallImg,
                    {
                      transform: [
                        { scale: bentoConfig.bottomRight.scale },
                        { rotate: bentoConfig.bottomRight.rotate },
                      ],
                    },
                  ]}
                  contentFit="contain"
                />
                <View style={styles.bentoZoomPill}>
                  <Ionicons name="expand-outline" size={14} color="#64748B" />
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* SECTION: Key highlights (Car condition - Screenshot 2) */}
        <View
          style={styles.cardSection}
          onLayout={(e) => {
            sectionOffsets.current.condition = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.cardSectionHeading}>Key highlights</Text>

          <View style={styles.inspectionCard}>
            <View style={styles.inspectionLeft}>
              <Text style={styles.inspectionCountTitle}>1457 parts checked</Text>
              <Text style={styles.inspectionCountSub}>by 3 automotive experts</Text>

              <View style={styles.inspectionDashedLine} />

              <View style={styles.inspectionCheckList}>
                <View style={styles.inspectionCheckRow}>
                  <Ionicons name="checkmark-circle" size={17} color="#4A168C" />
                  <Text style={styles.inspectionCheckText}>Ready to drive</Text>
                </View>
                <View style={styles.inspectionCheckRow}>
                  <Ionicons name="checkmark-circle" size={17} color="#4A168C" />
                  <Text style={styles.inspectionCheckText}>Maintainance Checklist Passed</Text>
                </View>
                <View style={styles.inspectionCheckRow}>
                  <Ionicons name="checkmark-circle" size={17} color="#4A168C" />
                  <Text style={styles.inspectionCheckText}>Get after-rent support</Text>
                </View>
              </View>
            </View>

            <View style={styles.sealBadgeOuter}>
              <View style={styles.sealBadgeGoldRing}>
                <Text style={styles.sealTopBrand}>Evegah</Text>
                <Text style={styles.sealBottomSub}>INSPECTION</Text>
              </View>
              <View style={styles.sealRibbon}>
                <Text style={styles.sealRibbonText}>300 POINT</Text>
              </View>
            </View>
          </View>

          {/* Tyre Life & Top-Down Vehicle Diagram Card */}
          <View style={styles.tyreDiagramCard}>
            <View style={styles.tyreStripHeader}>
              <Text style={styles.tyreStripTitle}>Front</Text>
            </View>

            <View style={styles.tyreDiagramBody}>
              <View style={styles.tyreMainGrid}>
                {/* Left Callouts */}
                <View style={styles.tyreSideColLeft}>
                  <View style={styles.tyreCalloutBlockLeft}>
                    <View style={styles.tyreCalloutTextLeft}>
                      <Text style={styles.tyreCalloutLabel}>{diagram.flLabel}</Text>
                      <Text style={styles.tyreCalloutValue}>{diagram.flValue}</Text>
                    </View>
                    <View style={styles.calloutLineLeft}>
                      <View style={styles.calloutLineBar} />
                      <View style={styles.calloutLineDot} />
                    </View>
                  </View>

                  <View style={styles.tyreCalloutBlockLeft}>
                    <View style={styles.tyreCalloutTextLeft}>
                      <Text style={styles.tyreCalloutLabel}>{diagram.rlLabel}</Text>
                      <Text style={styles.tyreCalloutValue}>{diagram.rlValue}</Text>
                    </View>
                    <View style={styles.calloutLineLeft}>
                      <View style={styles.calloutLineBar} />
                      <View style={styles.calloutLineDot} />
                    </View>
                  </View>
                </View>

                {/* Center Top-Down Vehicle Graphic (mink-top, city-top, pro-top, fly-top) */}
                <View style={styles.topDownCarWrap}>
                  <View style={[styles.greenTyreArc, styles.tyreFL]} />
                  <View style={[styles.greenTyreArc, styles.tyreFR]} />
                  <View style={[styles.greenTyreArc, styles.tyreRL]} />
                  <View style={[styles.greenTyreArc, styles.tyreRR]} />

                  <Image
                    source={extra.topImage}
                    style={styles.frontVehicleDiagramImg}
                    contentFit="contain"
                  />
                </View>

                {/* Right Callouts */}
                <View style={styles.tyreSideColRight}>
                  <View style={styles.tyreCalloutBlockRight}>
                    <View style={styles.calloutLineRight}>
                      <View style={styles.calloutLineDot} />
                      <View style={styles.calloutLineBar} />
                    </View>
                    <View style={styles.tyreCalloutTextRight}>
                      <Text style={styles.tyreCalloutLabel}>{diagram.frLabel}</Text>
                      <Text style={styles.tyreCalloutValue}>{diagram.frValue}</Text>
                    </View>
                  </View>

                  <View style={styles.tyreCalloutBlockRight}>
                    <View style={styles.calloutLineRight}>
                      <View style={styles.calloutLineDot} />
                      <View style={styles.calloutLineBar} />
                    </View>
                    <View style={styles.tyreCalloutTextRight}>
                      <Text style={styles.tyreCalloutLabel}>{diagram.rrLabel}</Text>
                      <Text style={styles.tyreCalloutValue}>{diagram.rrValue}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Bottom Center Callout */}
              <View style={styles.spareCalloutWrap}>
                <View style={styles.calloutLineDot} />
                <View style={styles.spareVerticalLine} />
                <Text style={styles.tyreCalloutLabel}>{diagram.bottomLabel}</Text>
                <Text style={styles.tyreCalloutValueCenter}>{diagram.bottomValue}</Text>
              </View>
            </View>

            <View style={styles.tyreStripFooter}>
              <Text style={styles.tyreStripTitle}>Rear</Text>
            </View>
          </View>

      
        </View>

        {/* SECTION: Features and specs (Screenshot 1) */}
        <View
          style={styles.cardSection}
          onLayout={(e) => {
            sectionOffsets.current.features = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.cardSectionHeading}>Features and specs</Text>
          <Text style={styles.popularFeaturesSub}>Popular features</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularFeaturesScroll}
          >
            {popularList.map((feat) => (
              <View key={feat.key} style={styles.popularFeatureCard}>
                <View style={styles.popularFeaturePedestal} />
                <Image
                  source={feat.image || vehicleImage}
                  style={[
                    styles.popularFeatureImg,
                    { transform: [{ scale: feat.scale || 1.15 }, { rotate: feat.rotate || '0deg' }] },
                  ]}
                  contentFit="contain"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(12, 16, 28, 0.35)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.popularFeaturePill}>
                  <Text style={styles.popularFeaturePillText}>{feat.label}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* 2-tab segmented toggle: Features | Specs */}
          <View style={styles.segmentedBar2}>
            {['Features', 'Specs'].map((mode) => {
              const active = featureSpecMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setFeatureSpecMode(mode)}
                  style={[styles.segmentPill2, active && styles.segmentPillActive]}
                >
                  <Text style={[styles.segmentPillText, active && styles.segmentPillTextActive]}>
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 2-column grid of icon + label */}
          <View style={styles.featureTwoColGrid}>
            {(featureSpecMode === 'Features' ? visibleFeatures : specGridItems).map((item) => (
              <View key={item.key} style={styles.featureGridCell}>
                <View style={styles.featureIconSquare}>
                  <Ionicons name={item.icon} size={19} color={PRIMARY_BLUE} />
                </View>
                <Text style={styles.featureCellLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.lavenderActionBtn}
            onPress={() => setShowAllFeatures((prev) => !prev)}
          >
            <Text style={styles.lavenderActionText}>
              {showAllFeatures ? 'Show fewer features & specs' : 'View all features & specs'}
            </Text>
          </Pressable>
        </View>

        {/* SECTION: Reserve Vehicle & FAQ (Bottom of Screenshot 1) */}
        <View
          style={styles.cardSection}
          onLayout={(e) => {
            sectionOffsets.current.more = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.cardSectionHeading}>Reserve {vehicleName}</Text>
          <Text style={styles.reserveSubText}>
            100% refundable reservation • Instant Zone pickup or doorstep delivery
          </Text>

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
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          style={styles.callSquareBtn}
          onPress={() => Linking.openURL('tel:18008898791')}
        >
          <Ionicons name="call" size={20} color={PRIMARY_BLUE} />
        </Pressable>

        <Pressable style={styles.reserveBtn} onPress={handleProceedBook}>
          <Text style={styles.reserveBtnText}>Reserve EV</Text>
        </Pressable>
      </View>

      {/* Select Delivery / Drop Address Bottom Sheet Modal (Matches Screenshot 3) */}
      <Modal
        visible={addressSheetOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setAddressSheetOpen(false)}
      >
        <View style={styles.addrSheetBackdrop}>
          <Pressable
            style={styles.addrSheetBackdropTouch}
            onPress={() => setAddressSheetOpen(false)}
          />

          {/* Floating Circular X Close Button */}
          <View style={styles.addrFloatingCloseRow}>
            <Pressable
              onPress={() => setAddressSheetOpen(false)}
              style={styles.addrFloatingCloseBtn}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
          </View>

          <View
            style={[
              styles.addrBottomSheet,
              { paddingBottom: Math.max(insets.bottom, 18) },
            ]}
          >
            {/* Pickup / Drop Tab Switcher inside Modal so Rider can easily set BOTH */}
            <View style={styles.addrTargetTabsRow}>
              <Pressable
                onPress={() => setAddressTarget('pickup')}
                style={[
                  styles.addrTargetTab,
                  addressTarget === 'pickup' && styles.addrTargetTabActive,
                ]}
              >
                <Ionicons
                  name="locate-outline"
                  size={15}
                  color={addressTarget === 'pickup' ? '#FFFFFF' : '#374151'}
                />
                <Text
                  style={[
                    styles.addrTargetTabText,
                    addressTarget === 'pickup' && styles.addrTargetTabTextActive,
                  ]}
                >
                  1. Pickup Location {flexiPickupAddress ? '✓' : ''}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAddressTarget('drop')}
                style={[
                  styles.addrTargetTab,
                  addressTarget === 'drop' && styles.addrTargetTabActive,
                ]}
              >
                <Ionicons
                  name="flag-outline"
                  size={15}
                  color={addressTarget === 'drop' ? '#FFFFFF' : '#374151'}
                />
                <Text
                  style={[
                    styles.addrTargetTabText,
                    addressTarget === 'drop' && styles.addrTargetTabTextActive,
                  ]}
                >
                  2. Drop Location {flexiDropAddress ? '✓' : ''}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.addrSheetTitle}>
              {addressTarget === 'pickup'
                ? 'Select Pickup Address'
                : 'Select Drop Address'}
            </Text>
            <Text style={styles.addrSheetSub}>
              {addressTarget === 'pickup'
                ? 'We will deliver the EV at this address for your trip'
                : 'We will pick up the EV from this address after your trip'}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.addrSheetScroll}
            >
              {/* Prime Locations */}
              <Text style={styles.addrSectionHeading}>Prime Locations</Text>

              {PRIME_LOCATIONS.map((loc) => (
                <Pressable
                  key={loc.id}
                  onPress={() => applySelectedAddress(loc.address)}
                  style={styles.primeLocRow}
                >
                  <View style={styles.primeLocIconCircle}>
                    <Ionicons name={loc.icon} size={22} color="#111827" />
                  </View>
                  <View style={styles.primeLocCopy}>
                    <Text style={styles.primeLocTitle}>{loc.title}</Text>
                    <Text style={styles.primeLocSub}>{loc.subtitle}</Text>
                  </View>
                </Pressable>
              ))}

              {/* Saved Addresses */}
              <Text style={[styles.addrSectionHeading, { marginTop: 18 }]}>
                Saved Addresses
              </Text>

              {savedAddresses.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => applySelectedAddress(item.address)}
                  style={styles.savedAddrRow}
                >
                  <View style={styles.savedAddrIconWrap}>
                    <Ionicons name="home-outline" size={22} color="#111827" />
                  </View>
                  <View style={styles.savedAddrCopy}>
                    <Text style={styles.savedAddrTag}>{item.tag}</Text>
                    <Text style={styles.savedAddrText}>{item.address}</Text>
                  </View>
                  <Pressable
                    hitSlop={10}
                    onPress={() => {
                      setEditingAddressId(item.id);
                      setMapAddressDraft(item.address);
                      setAddressSheetOpen(false);
                      setMapPickerOpen(true);
                    }}
                    style={styles.savedAddrEditBtn}
                  >
                    <Text style={styles.savedAddrEditText}>Edit</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={FLEXI_PURPLE}
                    />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>

            {/* Bottom Full-Width Green Button: Add New Address */}
            <Pressable
              onPress={() => {
                setEditingAddressId(null);
                setMapAddressDraft('746R+56R, Vadodara, Gujarat 391410, India');
                setAddressSheetOpen(false);
                setMapPickerOpen(true);
              }}
              style={styles.addNewAddressGreenBtn}
            >
              <Text style={styles.addNewAddressGreenBtnText}>
                Add New Address
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Google Maps Pin Confirmation Full-Screen Overlay View (Free of iOS native modal freeze) */}
      {mapPickerOpen ? (
        <View style={[styles.mapModalRoot, StyleSheet.absoluteFill, { zIndex: 9999 }]}>
          <StatusBar style="dark" />

          {/* Interactive Real Google Map Canvas via WebView */}
          <View style={styles.mapCanvas}>
            <WebView
              ref={webMapRef}
              originWhitelist={['*']}
              source={{ html: googleMapHtml }}
              style={StyleSheet.absoluteFillObject}
              onMessage={handleWebMapMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              scalesPageToFit={false}
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              renderLoading={() => (
                <View style={[StyleSheet.absoluteFill, styles.mapLoaderCenter]}>
                  <ActivityIndicator size="large" color={FLEXI_PURPLE} />
                  <Text style={styles.mapLoaderText}>Loading Google Map...</Text>
                </View>
              )}
            />

            {/* Center Selected Location Pin with Target Badge */}
            <View pointerEvents="none" style={styles.mapCenterPinContainer}>
              <View
                style={[
                  styles.mapTargetTypeBadge,
                  addressTarget === 'drop' && styles.mapTargetTypeBadgeDrop,
                ]}
              >
                <Ionicons
                  name={addressTarget === 'pickup' ? 'navigate-circle' : 'flag'}
                  size={13}
                  color="#FFFFFF"
                />
                <Text style={styles.mapTargetTypeBadgeText}>
                  {addressTarget === 'pickup' ? 'Pickup Location' : 'Drop Location'}
                </Text>
              </View>
              <View
                style={[
                  styles.mapCenterPinHead,
                  addressTarget === 'drop' && { backgroundColor: '#10B981' },
                ]}
              >
                <View style={styles.mapCenterPinInnerDot} />
              </View>
              <View
                style={[
                  styles.mapCenterPinTip,
                  addressTarget === 'drop' && { borderTopColor: '#10B981' },
                ]}
              />
              <View style={styles.mapCenterGroundDot} />
            </View>

            {/* Top Floating Back + Address Search Bar */}
            <View style={[styles.mapTopBarRow, { top: insets.top + 10 }]}>
              <Pressable
                onPress={() => {
                  setMapPickerOpen(false);
                  setTimeout(() => {
                    setAddressSheetOpen(true);
                  }, 150);
                }}
                style={styles.mapBackCircleBtn}
              >
                <Ionicons name="arrow-back" size={20} color="#111827" />
              </Pressable>

              <Pressable
                onPress={() => {
                  setSearchAddressQuery('');
                  setSearchAddressPopupOpen(true);
                }}
                style={styles.mapSearchPill}
              >
                <Text style={styles.mapSearchPillText} numberOfLines={1}>
                  {mapAddressDraft || 'Detecting address on map...'}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setSearchAddressQuery('');
                    setSearchAddressPopupOpen(true);
                  }}
                  style={styles.mapSearchClearBtn}
                >
                  <Ionicons name="close" size={17} color="#4B5563" />
                </Pressable>
              </Pressable>
            </View>

            {/* Distance from Hub Floating Pill */}
            <View style={[styles.mapDistanceFloatingPill, { top: insets.top + 62 }]}>
              <Ionicons name="navigate-outline" size={14} color="#4A168C" />
              <Text style={styles.mapDistanceFloatingText}>
                {zoneCoords.name.replace(/Zone/i, '').trim()} Hub ➔{' '}
                <Text style={styles.mapDistanceFloatingBold}>
                  {addressTarget === 'pickup' ? 'Pickup' : 'Drop'}: {liveDistanceKm} km
                </Text>
                {'  '}•{'  '}
                <Text style={styles.mapDistanceFloatingCost}>
                  ₹{Math.round(liveDistanceKm * 30)} (@ ₹30/km)
                </Text>
              </Text>
            </View>

            {/* Bottom-Right GPS Target Button */}
            <Pressable
              onPress={getMapUserLocation}
              style={styles.mapGpsTargetBtn}
            >
              <Ionicons name="locate" size={22} color={FLEXI_PURPLE} />
            </Pressable>
          </View>

          {/* Bottom White Confirm Footer */}
          <View
            style={[
              styles.mapConfirmFooter,
              { paddingBottom: Math.max(insets.bottom, 14) },
            ]}
          >
            <Pressable
              onPress={() => {
                setCompleteAddressDraft(
                  mapAddressDraft || '746R+56R, Vadodara, Gujarat 391410, India'
                );
                setLocalityDraft('vadodara');
                setAddAddressSheetOpen(true);
              }}
              style={styles.mapConfirmGreenBtn}
            >
              <Text style={styles.mapConfirmGreenBtnText}>Confirm Location</Text>
            </Pressable>
          </View>

          {/* Search Address Popup Overlay View with Keyboard Avoiding */}
          {searchAddressPopupOpen ? (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
              style={[styles.modalBackdropDark, StyleSheet.absoluteFill, { zIndex: 10001 }]}
            >
              <Pressable
                style={styles.modalBackdropTouch}
                onPress={() => {
                  Keyboard.dismiss();
                  setSearchAddressPopupOpen(false);
                }}
              />
              <View
                style={[
                  styles.searchAddressSheet,
                  { paddingBottom: Math.max(insets.bottom, 20) },
                ]}
              >
                {/* Header with Title & Circular Close Button */}
                <View style={styles.searchAddressHeader}>
                  <Text style={styles.searchAddressTitle}>Search Address</Text>
                  <Pressable
                    hitSlop={10}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSearchAddressPopupOpen(false);
                    }}
                    style={styles.modalRoundCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#111827" />
                  </Pressable>
                </View>

                {/* Search Input Box */}
                <View style={styles.searchAddressInputBox}>
                  <TextInput
                    value={searchAddressQuery}
                    onChangeText={setSearchAddressQuery}
                    placeholder="Search address or landmark on Google Maps"
                    placeholderTextColor="#9CA3AF"
                    style={styles.searchAddressTextInput}
                    autoFocus
                  />
                  {searchAddressQuery ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => setSearchAddressQuery('')}
                    >
                      <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                    </Pressable>
                  ) : null}
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 360 }}
                >
                  {isSearchingPlaces && (
                    <View style={styles.placesLoadingRow}>
                      <ActivityIndicator size="small" color={FLEXI_PURPLE} />
                      <Text style={styles.placesLoadingText}>Searching Google Maps...</Text>
                    </View>
                  )}

                  {/* Google Places live predictions */}
                  {googlePlacesPredictions.length > 0 ? (
                    <View>
                      <View style={styles.searchSectionBanner}>
                        <Text style={styles.searchSectionBannerText}>
                          Google Maps Suggestions
                        </Text>
                      </View>
                      {googlePlacesPredictions.map((pred) => (
                        <Pressable
                          key={pred.place_id}
                          onPress={() => selectGooglePlace(pred.place_id, pred.description)}
                          style={styles.searchLocationItemRow}
                        >
                          <View style={styles.locationPinCircle}>
                            <Ionicons
                              name="location-outline"
                              size={18}
                              color={FLEXI_PURPLE}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.searchLocationItemTitle}>
                              {pred.structured_formatting?.main_text || pred.description}
                            </Text>
                            <Text
                              style={styles.searchLocationItemSub}
                              numberOfLines={1}
                            >
                              {pred.structured_formatting?.secondary_text || pred.description}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  {/* Recently Searched Locations */}
                  <View style={styles.searchSectionBanner}>
                    <Text style={styles.searchSectionBannerText}>
                      Recently Searched Locations
                    </Text>
                  </View>

                  {filteredRecent.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        Keyboard.dismiss();
                        setMapAddressDraft(item.address || item.title);
                        setCompleteAddressDraft(item.title);
                        setLocalityDraft(item.locality || 'vadodara');
                        setSearchAddressPopupOpen(false);
                      }}
                      style={styles.searchLocationItemRow}
                    >
                      <View style={styles.locationPinCircle}>
                        <Ionicons
                          name="location"
                          size={18}
                          color={FLEXI_PURPLE}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchLocationItemTitle}>
                          {item.title}
                        </Text>
                        {item.address !== item.title ? (
                          <Text
                            style={styles.searchLocationItemSub}
                            numberOfLines={1}
                          >
                            {item.address}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}

                  {/* Suggested Pickup Locations */}
                  <View style={[styles.searchSectionBanner, { marginTop: 14 }]}>
                    <Text style={styles.searchSectionBannerText}>
                      Suggested Pickup Locations
                    </Text>
                  </View>

                  {filteredSuggested.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        Keyboard.dismiss();
                        setMapAddressDraft(item.title);
                        setCompleteAddressDraft(item.title);
                        setLocalityDraft(item.locality || 'vadodara');
                        setSearchAddressPopupOpen(false);
                      }}
                      style={styles.searchLocationItemRow}
                    >
                      <View style={styles.locationPinCircle}>
                        <Ionicons
                          name="location"
                          size={18}
                          color={FLEXI_PURPLE}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchLocationItemTitle}>
                          {item.title}
                        </Text>
                        {item.address ? (
                          <Text
                            style={styles.searchLocationItemSub}
                            numberOfLines={2}
                          >
                            {item.address}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          ) : null}

          {/* Add A New Delivery Address Overlay View with Keyboard Avoiding */}
          {addAddressSheetOpen ? (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
              style={[styles.modalBackdropDark, StyleSheet.absoluteFill, { zIndex: 10002 }]}
            >
              <Pressable
                style={styles.modalBackdropTouch}
                onPress={() => {
                  Keyboard.dismiss();
                  setAddAddressSheetOpen(false);
                }}
              />
              <View
                style={[
                  styles.addAddressSheet,
                  { paddingBottom: Math.max(insets.bottom, 20) },
                ]}
              >
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <View style={styles.addAddressTopRow}>
                    <Text style={styles.addAddressSheetTitle}>
                      Add A New Delivery Address
                    </Text>
                    <Pressable
                      hitSlop={10}
                      onPress={() => {
                        Keyboard.dismiss();
                        setAddAddressSheetOpen(false);
                      }}
                      style={styles.modalRoundCloseBtn}
                    >
                      <Ionicons name="close" size={20} color="#111827" />
                    </Pressable>
                  </View>

                  {/* Fieldset 1: Complete Address */}
                  <View style={styles.floatingFieldsetBox}>
                    <Text style={styles.floatingFieldsetLabel}>Complete Address</Text>
                    <TextInput
                      value={completeAddressDraft}
                      onChangeText={setCompleteAddressDraft}
                      placeholder="Complete Address"
                      placeholderTextColor="#9CA3AF"
                      style={styles.floatingFieldsetInput}
                      multiline
                    />
                  </View>

                  {/* Fieldset 2: Locality */}
                  <View style={styles.floatingFieldsetBox}>
                    <Text style={styles.floatingFieldsetLabel}>Locality</Text>
                    <TextInput
                      value={localityDraft}
                      onChangeText={setLocalityDraft}
                      placeholder="Locality"
                      placeholderTextColor="#9CA3AF"
                      style={styles.floatingFieldsetInput}
                    />
                  </View>

                  {/* Category Tag Tabs: HOME | WORK | OTHERS */}
                  <View style={styles.addrCategoryTabsRow}>
                    {['HOME', 'WORK', 'OTHERS'].map((cat) => {
                      const active = addressCategoryTag === cat;
                      return (
                        <Pressable
                          key={cat}
                          onPress={() => setAddressCategoryTag(cat)}
                          style={styles.addrCategoryTabItem}
                        >
                          <Text
                            style={[
                              styles.addrCategoryTabText,
                              active && styles.addrCategoryTabTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                          <View
                            style={[
                              styles.addrCategoryUnderline,
                              active && styles.addrCategoryUnderlineActive,
                            ]}
                          />
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Save Address Button */}
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      const finalAddr = completeAddressDraft.trim() || mapAddressDraft;
                      if (editingAddressId) {
                        setSavedAddresses((prev) =>
                          prev.map((item) =>
                            item.id === editingAddressId
                              ? { ...item, address: finalAddr, tag: addressCategoryTag }
                              : item
                          )
                        );
                        setEditingAddressId(null);
                      } else {
                        setSavedAddresses((prev) => [
                          { id: `addr-${Date.now()}`, tag: addressCategoryTag, address: finalAddr },
                          ...prev,
                        ]);
                      }
                      setAddAddressSheetOpen(false);
                      setMapPickerOpen(false);
                      applySelectedAddress(finalAddr);
                    }}
                    style={styles.saveAddressGreenBtn}
                  >
                    <Text style={styles.saveAddressGreenBtnText}>Save Address</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          ) : null}
        </View>
      ) : null}

      {/* ── Full-Screen Image Popup Modal ── */}
      <Modal
        visible={Boolean(previewImage)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.imagePopupBackdrop}>
          <Pressable
            style={styles.imagePopupBackdropDismiss}
            onPress={() => setPreviewImage(null)}
          />
          <View style={[styles.imagePopupHeader, { top: insets.top + 10 }]}>
            <View style={styles.imagePopupPill}>
              <Ionicons name="images-outline" size={16} color="#FFFFFF" />
              <Text style={styles.imagePopupTitle}>{vehicle?.name || 'EV Gallery'}</Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={() => setPreviewImage(null)}
              style={styles.imagePopupCloseBtn}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.imagePopupImgContainer}>
            {previewImage && (
              <Image
                source={previewImage}
                style={styles.imagePopupFull}
                contentFit="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Things to keep in mind Modal (Screenshot 1 / Video Frame 0) */}
      <Modal
        visible={thingsKeepInMindOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setThingsKeepInMindOpen(false)}
      >
        <View style={styles.modalBackdropDark}>
          <Pressable
            style={styles.modalBackdropTouch}
            onPress={() => setThingsKeepInMindOpen(false)}
          />
          <View
            style={[
              styles.keepInMindSheet,
              { paddingBottom: Math.max(insets.bottom, 22) },
            ]}
          >
            {/* Header with Title & Circular Close Button */}
            <View style={styles.keepInMindTopRow}>
              <Text style={styles.keepInMindTitle}>Things to keep in mind</Text>
              <Pressable
                hitSlop={10}
                onPress={() => setThingsKeepInMindOpen(false)}
                style={styles.modalRoundCloseBtn}
              >
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>

            {/* Guideline 1: Coordinate on Location */}
            <View style={styles.keepInMindItemRow}>
              <View style={styles.keepInMindIconCol}>
                <Ionicons name="location-outline" size={22} color="#0284C7" />
              </View>
              <View style={styles.keepInMindTextCol}>
                <Text style={styles.keepInMindItemHeading}>
                  Coordinate on Location
                </Text>
                <Text style={styles.keepInMindItemDesc}>
                  Stay reachable and share your exact location so your EVegah Coordinator can find you easily for pickup and return.
                </Text>
              </View>
            </View>

            <View style={styles.keepInMindDivider} />

            {/* Guideline 2: Be on Time */}
            <View style={styles.keepInMindItemRow}>
              <View style={styles.keepInMindIconCol}>
                <Ionicons name="time-outline" size={22} color="#0284C7" />
              </View>
              <View style={styles.keepInMindTextCol}>
                <Text style={styles.keepInMindItemHeading}>Be on Time</Text>
                <Text style={styles.keepInMindItemDesc}>
                  Be at the agreed pickup and return locations on time. Your EVegah Coordinator will meet you there for the vehicle handover.
                </Text>
              </View>
            </View>

            <View style={styles.keepInMindDivider} />

            {/* Guideline 3: End trip with in-person handover */}
            <View style={styles.keepInMindItemRow}>
              <View style={styles.keepInMindIconCol}>
                <Ionicons name="key-outline" size={22} color="#0284C7" />
              </View>
              <View style={styles.keepInMindTextCol}>
                <Text style={styles.keepInMindItemHeading}>
                  End trip with in-person handover
                </Text>
                <Text style={styles.keepInMindItemDesc}>
                  Make sure that you hand over the car and the keys to the host in person at the time of trip end. Plan your trip accordingly and keep the host in loop at all times. Do not abandon the car.
                </Text>
              </View>
            </View>

            {/* Green Got It Button */}
            <Pressable
              onPress={() => setThingsKeepInMindOpen(false)}
              style={styles.gotItGreenBtn}
            >
              <Text style={styles.gotItGreenBtnText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={storyOpen}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setStoryOpen(false)}
      >
        {storyOpen ? <VehicleStoryModal videoSource={videoSource} onClose={() => setStoryOpen(false)} /> : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F4F9',
  },
  topHeaderContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E9F2',
    zIndex: 10,
  },
  topBarRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F5F9',
    borderWidth: 1,
    borderColor: '#E5E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactHeaderTitleWrap: {
    flex: 1,
  },
  compactHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#11141C',
  },
  compactHeaderPrice: {
    marginTop: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#636978',
  },
  ownedStockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD8F8',
    backgroundColor: '#F9F8FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  ownedStockBrand: {
    fontSize: 12.5,
    fontWeight: '800',
    color: PRIMARY_BLUE,
    marginRight: 4,
  },
  ownedStockDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: PRIMARY_BLUE,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  ownedStockHalf: {
    width: '50%',
    height: '100%',
    backgroundColor: PRIMARY_BLUE,
  },
  ownedStockText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: PRIMARY_BLUE,
    marginLeft: 1,
  },
  sectionNavRow: {
    paddingHorizontal: 12,
    gap: 6,
  },
  sectionNavBtn: {
    paddingHorizontal: 10,
    paddingTop: 4,
    alignItems: 'center',
  },
  sectionNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C6475',
    paddingBottom: 9,
  },
  sectionNavTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: '700',
  },
  sectionNavIndicator: {
    height: 3,
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'transparent',
  },
  sectionNavIndicatorActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  heroWrap: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPedestal: {
    position: 'absolute',
    top: 108,
    left: -40,
    right: -40,
    height: 150,
    borderRadius: 200,
    backgroundColor: '#F2F3FC',
  },
  heroSlide: {
    width: SCREEN_W,
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: SCREEN_W * 0.78,
    height: 204,
  },
  heroMetaRow: {
    marginTop: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sellsFastPill: {
    backgroundColor: '#FFF1EE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sellsFastText: {
    color: '#C84B31',
    fontSize: 11.5,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingBottom: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D0D5E0',
  },
  dotActive: {
    width: 14,
    backgroundColor: '#11141C',
  },
  storyRingBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#6E2EEB',
    padding: 2.5,
    backgroundColor: '#FFFFFF',
    marginTop: -28,
  },
  storyThumbInner: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#D6DEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyThumbImg: {
    width: '100%',
    height: '100%',
  },
  storyPlayOverlay: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 20, 28, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  thumbCard: {
    width: 82,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECEEF3',
    padding: 3,
    overflow: 'hidden',
  },
  thumbCardActive: {
    borderColor: PRIMARY_BLUE,
  },
  thumbImgBox: {
    width: '100%',
    height: 52,
    borderRadius: 10,
    backgroundColor: '#EEF0F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: {
    width: 64,
    height: 44,
  },
  thumbStarBadge: {
    position: 'absolute',
    right: 4,
    top: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4F35F0',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#525866',
    textAlign: 'center',
    paddingVertical: 5,
  },
  thumbLabelActive: {
    color: PRIMARY_BLUE,
    fontWeight: '700',
  },
  mainSheet: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCopy: {
    flex: 1,
  },
  vehicleHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#11141C',
    letterSpacing: 0.2,
  },
  vehicleVariant: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#636978',
    letterSpacing: 0.2,
  },
  wishlistBtn: {
    paddingTop: 2,
  },
  breadcrumbsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  breadcrumbItem: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#5A6070',
  },
  breadcrumbSep: {
    fontSize: 13,
    color: '#D5D8E0',
  },
  dashedDivider: {
    marginTop: 16,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EF',
  },
 
  priceMainRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceMainText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#11141C',
  },
  allInclusiveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allInclusiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  emiRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emiUnderline: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9AA0AC',
    paddingBottom: 1,
  },
  emiPriceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C313D',
  },
  emiSubText: {
    fontSize: 13.5,
    color: '#636978',
    fontWeight: '500',
  },
  assuranceBox: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFE8CE',
    backgroundColor: '#F2FBF6',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  assuranceLeft: {
    flex: 1,
    gap: 9,
  },
  assuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assuranceText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#46505D',
  },
  competitorDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  compCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  festBadge: {
    backgroundColor: '#5B0E14',
    borderWidth: 1.5,
    borderColor: '#E3B252',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  festBadgeLine1: {
    color: '#FFD97D',
    fontSize: 11,
    fontWeight: '800',
  },
  festBadgeLine2: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: -2,
  },
  festBadgeLine3: {
    color: '#FFD97D',
    fontSize: 10,
    fontWeight: '800',
    marginTop: -2,
  },
  cardSection: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cardSectionHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#11141C',
  },
  segmentedBar4: {
    marginTop: 14,
    backgroundColor: '#EEF1F7',
    borderRadius: 28,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentPill4: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBar2: {
    marginTop: 18,
    backgroundColor: '#EEF1F7',
    borderRadius: 28,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentPill2: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentPillText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#4B5262',
  },
  segmentPillTextActive: {
    color: '#11141C',
    fontWeight: '700',
  },
  bentoContainer: {
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  bentoTopTile: {
    width: '100%',
    height: 215,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF2',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bentoFloorRingLarge: {
    position: 'absolute',
    bottom: -26,
    width: '92%',
    height: 110,
    borderRadius: 200,
    backgroundColor: '#F3EEF8',
    borderWidth: 1.5,
    borderColor: '#E7DFEE',
  },
  bentoTopImg: {
    width: '78%',
    height: 180,
  },
  bentoBottomRow: {
    flexDirection: 'row',
    height: 248,
    gap: 8,
  },
  bentoLeftCol: {
    flex: 1,
    gap: 8,
  },
  bentoSmallTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF2',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bentoFloorRingSmall: {
    position: 'absolute',
    bottom: -18,
    width: '94%',
    height: 60,
    borderRadius: 100,
    backgroundColor: '#F3EEF8',
    borderWidth: 1,
    borderColor: '#E7DFEE',
  },
  bentoSmallImg: {
    width: '82%',
    height: 92,
  },
  bentoRightCol: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF2',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bentoFloorRingTall: {
    position: 'absolute',
    bottom: -24,
    width: '96%',
    height: 96,
    borderRadius: 120,
    backgroundColor: '#F3EEF8',
    borderWidth: 1,
    borderColor: '#E7DFEE',
  },
  bentoTallImg: {
    width: '88%',
    height: 170,
  },
  bentoLabelPill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(18, 23, 38, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  bentoLabelText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '600',
  },
  inspectionCard: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E8F2',
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inspectionLeft: {
    flex: 1,
    paddingRight: 10,
  },
  inspectionCountTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  inspectionCountSub: {
    marginTop: 3,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#11141C',
  },
  inspectionDashedLine: {
    marginVertical: 12,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E8F2',
  },
  inspectionCheckList: {
    gap: 9,
  },
  inspectionCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inspectionCheckText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#2B303C',
  },
  sealBadgeOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#371BC8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25108E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  sealBadgeGoldRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1.5,
    borderColor: '#E8B94F',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sealTopBrand: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  sealBottomSub: {
    color: '#F5D076',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sealRibbon: {
    position: 'absolute',
    width: 102,
    backgroundColor: '#2B11A8',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#E8B94F',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  sealRibbonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tyreDiagramCard: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  tyreStripHeader: {
    backgroundColor: '#F6F7FB',
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F6',
  },
  tyreStripFooter: {
    backgroundColor: '#F6F7FB',
    paddingVertical: 11,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F6',
  },
  tyreStripTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11141C',
  },
  tyreDiagramBody: {
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tyreMainGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tyreSideColLeft: {
    flex: 1,
    height: 168,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  tyreSideColRight: {
    flex: 1,
    height: 168,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  tyreCalloutBlockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  tyreCalloutBlockRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  tyreCalloutTextLeft: {
    alignItems: 'flex-end',
  },
  tyreCalloutTextRight: {
    alignItems: 'flex-start',
  },
  tyreCalloutLabel: {
    fontSize: 11.5,
    color: '#6E7585',
    fontWeight: '500',
  },
  tyreCalloutValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#11141C',
  },
  tyreCalloutValueCenter: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#11141C',
    textAlign: 'center',
  },
  calloutLineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calloutLineRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calloutLineBar: {
    width: 18,
    height: 1.5,
    backgroundColor: '#C5C2F2',
  },
  calloutLineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PRIMARY_BLUE,
  },
  topDownCarWrap: {
    width: 122,
    height: 204,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  greenTyreArc: {
    position: 'absolute',
    width: 5,
    height: 34,
    borderRadius: 3,
    backgroundColor: '#1EA853',
    zIndex: 2,
  },
  tyreFL: {
    left: 8,
    top: 22,
  },
  tyreFR: {
    right: 8,
    top: 22,
  },
  tyreRL: {
    left: 8,
    bottom: 22,
  },
  tyreRR: {
    right: 8,
    bottom: 22,
  },
  frontVehicleDiagramImg: {
    width: 108,
    height: 196,
  },
  spareCalloutWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  spareVerticalLine: {
    width: 1.5,
    height: 18,
    backgroundColor: '#C5C2F2',
    marginBottom: 4,
  },
  lavenderActionBtn: {
    marginTop: 16,
    backgroundColor: '#F3F4FE',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lavenderActionText: {
    color: PRIMARY_BLUE,
    fontSize: 15,
    fontWeight: '700',
  },
  popularFeaturesSub: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#222734',
  },
  popularFeaturesScroll: {
    paddingTop: 12,
    gap: 12,
  },
  popularFeatureCard: {
    width: 192,
    height: 126,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ECEEF3',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  popularFeaturePedestal: {
    position: 'absolute',
    bottom: -18,
    width: '94%',
    height: 62,
    borderRadius: 100,
    backgroundColor: '#DDE0E8',
    borderWidth: 1,
    borderColor: '#C6CBD6',
  },
  popularFeatureImg: {
    width: '82%',
    height: 104,
  },
  popularFeaturePill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(18, 23, 38, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  popularFeaturePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  featureTwoColGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
    justifyContent: 'space-between',
  },
  featureGridCell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F2F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCellLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: '#1C202B',
  },
  reserveSubText: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    color: '#636978',
  },
  faqCard: {
    backgroundColor: '#F8F9FC',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ECEEF4',
  },
  faqRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF4',
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
    color: '#11141C',
    fontSize: 14,
    fontWeight: '600',
  },
  faqA: {
    marginTop: 8,
    color: '#636978',
    fontSize: 13,
    lineHeight: 19,
  },
  sparkleFabWrap: {
    position: 'absolute',
    right: 16,
    zIndex: 9,
  },
  sparkleFabGradient: {
    height: 54,
    minWidth: 54,
    borderRadius: 27,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2E147A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  sparkleFabExpanded: {
    paddingHorizontal: 20,
  },
  askMeAnythingText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECEEF3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  callSquareBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY_BLUE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveBtnText: {
    color: PRIMARY_BLUE,
    fontSize: 15,
    fontWeight: '700',
  },
  testDriveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testDriveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  storyModalRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  storyModalStage: {
    flex: 1,
    position: 'relative',
  },
  storyModalVideo: {
    width: '100%',
    height: '100%',
  },
  storyModalControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 12,
  },
  storyModalBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(110, 110, 118, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Location Pill, Guarantee Card & Flexi EV Delivery & Pickup Styles */
  ZoneLocationPill: {
    marginTop: 16,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ZoneLocationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  modelDescriptionCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  modelDescHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modelDescTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modelDescBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  guaranteeHostCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  guaranteeSealWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeSealOuter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeSealInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeStarsTop: {
    fontSize: 5,
    color: '#FEF3C7',
    letterSpacing: 0.5,
  },
  guaranteeRibbon: {
    backgroundColor: '#78350F',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginVertical: 1,
  },
  guaranteeRibbonText: {
    color: '#FDE68A',
    fontSize: 5.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  guaranteeHostCopy: {
    flex: 1,
  },
  guaranteeHostTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#111827',
  },
  guaranteeHostSub: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
  },
  flexiSectionWrap: {
    marginTop: 18,
  },
  flexiTopTabRibbon: {
    alignSelf: 'flex-start',
    backgroundColor: FLEXI_PURPLE,
    paddingHorizontal: 18,
    paddingTop: 9,
    paddingBottom: 11,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 18,
    marginBottom: -4,
    zIndex: 1,
  },
  flexiTopTabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  flexiMainCard: {
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderWidth: 1.5,
    borderColor: '#EDE7F6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    zIndex: 2,
    shadowColor: '#24083C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  flexiMainCardActive: {
    borderColor: '#C9A9F5',
  },
  flexiHeaderGrey: {
    backgroundColor: '#F7F3FB',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE4F4',
  },
  flexiHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  flexiRateText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6E657F',
    fontWeight: '600',
  },
  flexiSwitchRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flexiSwitchTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#CBD5E1',
    padding: 3,
    justifyContent: 'center',
  },
  flexiSwitchTrackOn: {
    backgroundColor: FLEXI_PURPLE,
  },
  flexiSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  flexiSwitchThumbOn: {
    alignSelf: 'flex-end',
  },
  flexiToggleStatusText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#24083C',
  },
  flexiHouseArtWrap: {
    width: 124,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexiVectorImage: {
    width: 124,
    height: 92,
  },
  isoGroundSlab: {
    width: 104,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#EDE4F7',
    borderBottomWidth: 4,
    borderBottomColor: '#BCA3DA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  isoRoadStrip: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    height: 14,
    borderRadius: 6,
    backgroundColor: '#4A168C',
  },
  isoTreeLeft: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 16,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#7A25D9',
  },
  isoHouseWalls: {
    position: 'absolute',
    top: 6,
    right: 14,
    width: 42,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  isoHouseRoof: {
    position: 'absolute',
    top: -8,
    width: 48,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#4A168C',
  },
  isoHouseDoor: {
    width: 10,
    height: 14,
    backgroundColor: '#24083C',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  isoScooterBadge: {
    position: 'absolute',
    bottom: 8,
    left: 26,
    width: 28,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#4A168C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexiWhiteBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  flexiAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  flexiDropAddressRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#EDE7F6',
  },
  flexiAddressCopy: {
    flex: 1,
  },
  flexiAddressKicker: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#6E657F',
  },
  flexiSelectedAddressText: {
    marginTop: 4,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#24083C',
    lineHeight: 18,
  },
  flexiAddAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  flexiAddAddressText: {
    fontSize: 14,
    fontWeight: '800',
    color: FLEXI_PURPLE,
  },
  flexiSameLocRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flexiCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexiCheckboxOn: {
    backgroundColor: FLEXI_PURPLE,
    borderColor: FLEXI_PURPLE,
  },
  flexiSameLocText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#280D42',
  },
  flexiBodyDivider: {
    marginTop: 14,
    marginBottom: 12,
    height: 1,
    backgroundColor: '#F3EEFA',
  },
  flexiKeepInMindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flexiKeepInMindText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#2a195c',
  },
  /* Select Delivery / Drop Address Bottom Sheet Styles */
  addrSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  addrSheetBackdropTouch: {
    flex: 1,
  },
  addrFloatingCloseRow: {
    alignItems: 'flex-end',
    paddingRight: 18,
    marginBottom: 12,
  },
  addrFloatingCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  addrBottomSheet: {
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
  },
  addrTargetTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  addrTargetTab: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addrTargetTabActive: {
    backgroundColor: FLEXI_PURPLE,
  },
  addrTargetTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
  },
  addrTargetTabTextActive: {
    color: '#FFFFFF',
  },
  addrSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: -0.3,
  },
  addrSheetSub: {
    marginTop: 4,
    fontSize: 13.5,
    color: '#6E657F',
    fontWeight: '500',
  },
  addrSheetScroll: {
    marginTop: 16,
    maxHeight: 400,
  },
  addrSectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#24083C',
    marginBottom: 12,
  },
  primeLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  primeLocIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3EEFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primeLocCopy: {
    flex: 1,
  },
  primeLocTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#24083C',
  },
  primeLocSub: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#6E657F',
  },
  savedAddrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  savedAddrIconWrap: {
    paddingTop: 2,
  },
  savedAddrCopy: {
    flex: 1,
  },
  savedAddrTag: {
    fontSize: 13,
    fontWeight: '800',
    color: '#24083C',
    letterSpacing: 0.4,
  },
  savedAddrText: {
    marginTop: 4,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#4B5563',
  },
  savedAddrEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  savedAddrEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: FLEXI_PURPLE,
  },
  addNewAddressGreenBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 12,
    backgroundColor: FLEXI_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FLEXI_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addNewAddressGreenBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  /* Google Maps Pin Confirmation Modal Styles */
  mapModalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#E5E3DF',
    position: 'relative',
    overflow: 'hidden',
  },
  mapLoaderCenter: {
    backgroundColor: '#E5E3DF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  mapLoaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A168C',
  },
  mapParkTopLeft: {
    position: 'absolute',
    top: '8%',
    left: '-10%',
    width: 190,
    height: 160,
    borderRadius: 40,
    backgroundColor: '#DCEFD9',
  },
  mapParkBottomRight: {
    position: 'absolute',
    bottom: '12%',
    right: '-8%',
    width: 170,
    height: 150,
    borderRadius: 36,
    backgroundColor: '#DCEFD9',
  },
  mapRoadH1: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
  },
  mapRoadH2: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: '#FFFFFF',
  },
  mapRoadH3: {
    position: 'absolute',
    top: '76%',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
  },
  mapRoadV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '28%',
    width: 14,
    backgroundColor: '#FFFFFF',
  },
  mapRoadV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '68%',
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  mapRoadDiag: {
    position: 'absolute',
    top: '40%',
    left: '-10%',
    width: SCREEN_W * 1.3,
    height: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-22deg' }],
  },
  mapBuildingBlock: {
    position: 'absolute',
    backgroundColor: '#E2E6DF',
    borderRadius: 6,
  },
  mapLandmarkWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapLandmarkTextCol: {
    alignItems: 'flex-end',
  },
  mapLandmarkTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  mapLandmarkSub: {
    fontSize: 10.5,
    color: '#6B7280',
  },
  mapLandmarkPinCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  zoneMarkerWrap: {
    alignItems: 'center',
  },
  zoneMarkerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4A168C',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  zoneMarkerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  zoneMarkerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#4A168C',
    alignSelf: 'center',
  },
  mapTargetTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4A168C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  mapTargetTypeBadgeDrop: {
    backgroundColor: '#10B981',
  },
  mapTargetTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mapDistanceFloatingPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
  },
  mapDistanceFloatingText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  mapDistanceFloatingBold: {
    fontWeight: '700',
    color: '#1F2937',
  },
  mapDistanceFloatingCost: {
    fontWeight: '800',
    color: '#4A168C',
  },
  placesLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  placesLoadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  flexiDistanceBreakdownCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 12,
    marginTop: 10,
    gap: 6,
  },
  flexiDistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  flexiDistHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A168C',
  },
  flexiDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  flexiDistIconTag: {
    backgroundColor: '#F3EEF8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  flexiDistTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4A168C',
  },
  flexiDistLabel: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  flexiDistVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  flexiDistDivider: {
    height: 1,
    backgroundColor: '#E9D5FF',
    marginVertical: 4,
  },
  flexiDistTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flexiDistTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A168C',
  },
  flexiDistTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A168C',
  },
  mapCenterPinContainer: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    marginLeft: -65,
    width: 130,
    alignItems: 'center',
  },
  mapCenterPinHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A168C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A168C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  mapCenterPinInnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  mapCenterPinTip: {
    width: 4,
    height: 12,
    backgroundColor: '#4A168C',
    marginTop: -2,
  },
  mapCenterGroundDot: {
    marginTop: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapTopBarRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mapBackCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  mapSearchPill: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  mapSearchPillText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 6,
  },
  mapSearchClearBtn: {
    padding: 4,
  },
  mapSearchInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 0,
  },
  googleWatermarkWrap: {
    position: 'absolute',
    left: 14,
    bottom: 14,
  },
  googleWatermarkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  mapGpsTargetBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  mapConfirmFooter: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEEF2',
  },
  mapConfirmGreenBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: FLEXI_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FLEXI_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  mapConfirmGreenBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalBackdropDark: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalRoundCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAddressSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '85%',
  },
  searchAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  searchAddressTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  searchAddressInputBox: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  searchAddressTextInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 0,
  },
  searchSectionBanner: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  searchSectionBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  searchLocationItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locationPinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  searchLocationItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  searchLocationItemSub: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  addAddressSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  addAddressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addAddressSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  floatingFieldsetBox: {
    position: 'relative',
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  floatingFieldsetLabel: {
    position: 'absolute',
    top: -9,
    left: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  floatingFieldsetInput: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 0,
  },
  addrCategoryTabsRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addrCategoryTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  addrCategoryTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  addrCategoryTabTextActive: {
    color: FLEXI_PURPLE,
    fontWeight: '800',
  },
  addrCategoryUnderline: {
    height: 2.5,
    width: '100%',
    backgroundColor: 'transparent',
    marginTop: 6,
  },
  addrCategoryUnderlineActive: {
    backgroundColor: FLEXI_PURPLE,
  },
  saveAddressGreenBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: FLEXI_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FLEXI_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveAddressGreenBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  keepInMindSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  keepInMindTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  keepInMindTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  keepInMindItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  keepInMindIconCol: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  keepInMindTextCol: {
    flex: 1,
  },
  keepInMindItemHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  keepInMindItemDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 4,
  },
  keepInMindDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  gotItGreenBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: FLEXI_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: FLEXI_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  gotItGreenBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  keepMindBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  keepMindText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#374151',
  },
  bentoZoomPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePopupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePopupBackdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePopupHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  imagePopupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imagePopupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imagePopupCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePopupImgContainer: {
    width: SCREEN_W,
    height: SCREEN_W * 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePopupFull: {
    width: '92%',
    height: '92%',
  },
});
