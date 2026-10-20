import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import OtpScreen from './screens/OtpScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import LocationScreen, { EVEGAH_ZONES } from './screens/LocationScreen';
import MyRidesScreen from './screens/MyRidesScreen';
import RideDetailScreen from './screens/RideDetailScreen';
import ScanScreen from './screens/ScanScreen';
import UnlockingScreen from './screens/UnlockingScreen';
import BluetoothScreen from './screens/BluetoothScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import KycScreen from './screens/KycScreen';
import ReferScreen from './screens/ReferScreen';
import OffersScreen from './screens/OffersScreen';
import GiftCardScreen from './screens/GiftCardScreen';
import RedeemGiftCardScreen from './screens/RedeemGiftCardScreen';
import HelpScreen from './screens/HelpScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import AboutScreen from './screens/AboutScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import TransactionScreen from './screens/TransactionScreen';
import InsightsScreen from './screens/InsightsScreen';
import SecurityScreen from './screens/SecurityScreen';
import SplashScreen from './screens/SplashScreen';
import WalletScreen from './screens/WalletScreen';
import VehicleDetailsScreen from './screens/VehicleDetailsScreen';
import VehicleListScreen from './screens/VehicleListScreen';
import RentScreen from './screens/RentScreen';
import PayScreen from './screens/PayScreen';
import BookingConfirmedScreen from './screens/BookingConfirmedScreen';
import RideScreen from './screens/RideScreen';
import EndRideScreen from './screens/EndRideScreen';
import WalletIntro from './components/WalletIntro';
import {
  apiGet,
  apiPost,
  last10,
  getAuthToken,
  getStoredRider,
  setStoredRider,
  clearAuthSession,
  prefetchInitialData,
  sendRiderOtp,
  hasSeenOnboarding,
  setHasSeenOnboarding,
} from './services/api';

export default function App() {
  const [screen, setScreen] = useState('splash');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [loginReturnTo, setLoginReturnTo] = useState('home');
  const [phone, setPhone] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [calendarTriggerTick, setCalendarTriggerTick] = useState(0);
  const [walletIntro, setWalletIntro] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [vehicleFrom, setVehicleFrom] = useState('home');
  const [rentFrom, setRentFrom] = useState('home');
  const [vehicleListFrom, setVehicleListFrom] = useState('rent');
  const [payBackTo, setPayBackTo] = useState('vehicle');
  const [trip, setTrip] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [rideSummary, setRideSummary] = useState(null);
  const [pastRide, setPastRide] = useState(null);
  const [rideFrom, setRideFrom] = useState('booked');
  const [unlockFrom, setUnlockFrom] = useState('scan');
  const [unlockScooter, setUnlockScooter] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    gender: 'Other',
    dob: '',
    address: '',
    aadhaar: '',
    avatarIndex: 0,
  });
  const [editProfileFrom, setEditProfileFrom] = useState('profile');
  const [kyc, setKyc] = useState({ selfie: false, front: false, back: false });
  const [offersFrom, setOffersFrom] = useState('profile');
  const [redeemFrom, setRedeemFrom] = useState('profile');
  const [prefs, setPrefs] = useState({ push: true, email: false });
  const [tx, setTx] = useState(null);
  const [notes, setNotes] = useState([
    {
      id: 'wallet',
      kind: 'Wallet',
      title: 'Wallet top-up',
      text: 'Your Razorpay top-up is in.',
      time: '28 Aug 2026',
      read: false,
    },
    {
      id: 'ride',
      kind: 'Rides',
      title: 'Ride confirmed',
      text: 'Your Evegah City reservation in Gotri is ready for pickup.',
      time: '28 Aug 2026',
      read: false,
    },
    {
      id: 'battery',
      kind: 'System',
      title: 'Battery is low',
      text: 'The scooter is at 18%. Swap at the nearest Evegah station.',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 'offer',
      kind: 'Offers',
      title: 'EVE20 is ready',
      text: '₹40 off this ride. Apply it at checkout.',
      time: 'Yesterday',
      read: false,
    },
    {
      id: 'zones',
      kind: 'System',
      title: 'Zones are open',
      text: 'Find Zones near to you.',
      time: '2 days ago',
      read: true,
    },
  ]);

  const navigateProtected = (targetScreen) => {
    if (!isLoggedIn) {
      setLoginReturnTo(targetScreen);
      setScreen('login');
      return;
    }
    setScreen(targetScreen);
  };

  const openWallet = () => {
    if (!isLoggedIn) {
      setLoginReturnTo('wallet');
      setScreen('login');
      return;
    }
    if (walletIntro || screen === 'wallet') return;
    setWalletIntro(true);
  };

  // Route Protection: If logged out and routing to my ride, scan, wallet or profile, force login
  useEffect(() => {
    if (!isLoggedIn) {
      const protectedScreens = ['rides', 'scan', 'wallet', 'profile', 'editProfile', 'myRides'];
      if (protectedScreens.includes(screen)) {
        setLoginReturnTo(screen);
        setScreen('login');
      }
    }
  }, [isLoggedIn, screen]);

  useEffect(() => {
    prefetchInitialData();
    async function restoreSession() {
      try {
        const token = await getAuthToken();
        const storedRider = await getStoredRider();
        if (token && storedRider) {
          setIsLoggedIn(true);
          setPhone(storedRider.mobile || '');
          setProfile((cur) => ({
            ...cur,
            name: storedRider.rider_name || storedRider.name || cur.name,
            phone: storedRider.mobile || cur.phone,
            email: storedRider.email || cur.email || '',
            drivingLicense: storedRider.dl_number || storedRider.drivingLicense || cur.drivingLicense || '',
            gender: storedRider.gender || cur.gender,
            dob: storedRider.date_of_birth || cur.dob,
            address: storedRider.address || storedRider.present_address || cur.address,
            aadhaar: storedRider.aadhaar || cur.aadhaar || '',
            avatar: storedRider.avatar || storedRider.avatar_url || cur.avatar || '',
          }));
          const kycStatus = String(storedRider.kyc_status || '').toLowerCase();
          if (kycStatus.includes('approv') || kycStatus.includes('verif')) {
            setKyc({ selfie: true, front: true, back: true });
          }
        }
      } catch (err) {
        console.warn('Session restore error:', err);
      }
    }
    restoreSession();
  }, []);

  const handleLogout = async () => {
    try {
      await clearAuthSession();
    } catch (_) {}
    setIsLoggedIn(false);
    setPhone('');
    setProfile({
      name: '',
      phone: '',
      gender: 'Other',
      dob: '',
      address: '',
      aadhaar: '',
      avatar: '',
      avatarIndex: 0,
    });
    setKyc({ selfie: false, front: false, back: false });
    setPendingBooking(null);
    setLoginReturnTo('home');
    setScreen('home');
  };

  
  const openActiveRide = (item) => {
    const activeVehicle = {
      name: item.vehicle || item.vehicle_model || item.evegah_model_name || 'Evegah City',
      code: item.vehicleNumber || item.vehicle_number || item.vehicle_id || 'EV-450X-101',
      regNo: item.vehicleNumber || item.vehicle_number || item.vehicle_id || 'EV-450X-101',
      battery_pct: item.batteryPct || (item.battery ? parseInt(item.battery) : 88),
      battery_id: item.batteryId || item.battery_id || 'BAT-450X-101',
      Zone: item.pickup || 'Gotri Zone',
      zone: item.pickup || 'Gotri Zone',
    };
    const activeTrip = {
      pickupName: item.pickup || 'Gotri Zone',
      dropName: item.drop || 'Gotri Zone',
      pickupAt: Date.now(),
      dropAt: Date.now() + 24 * 3600 * 1000,
      packageId: item.plan || item.package_type || 'Daily',
      durationText: item.span || '24 hrs',
      battery_id: item.batteryId || item.battery_id,
    };
    const activeReceipt = {
      bookingId: item.id || item.reservation_id || `EVG${Date.now().toString().slice(-6)}`,
      fare: item.fare || 199,
      deposit: item.deposit || 250,
      total: (item.fare || 199) + (item.deposit || 250),
      vehicle_number: item.vehicleNumber || item.vehicle_number || item.vehicle_id,
      battery_id: item.batteryId || item.battery_id,
      paid: true,
    };
    setVehicle(activeVehicle);
    setTrip(activeTrip);
    setReceipt(activeReceipt);
    setRideFrom('rides');
    setScreen('ride');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.stage}>
      {screen === 'splash' ? (
        <SplashScreen
          onFinish={async () => {
            const seen = await hasSeenOnboarding();
            if (!seen) {
              setScreen('onboarding');
            } else {
              setScreen('home');
            }
          }}
        />
      ) : screen === 'onboarding' ? (
        <OnboardingScreen
          onFinish={async () => {
            await setHasSeenOnboarding();
            setScreen('home');
          }}
        />
      ) : screen === 'rent' || screen === 'pay' || screen === 'booked' || screen === 'ride' || screen === 'ended' ? (
        <View style={styles.stage}>
          <RentScreen
            vehicle={vehicle}
            selectedZone={selectedZone}
            onBack={() => setScreen(rentFrom || 'home')}
            onContinue={(next) => {
              setTrip(next);
              setVehicleListFrom('rent');
              setScreen('vehicleList');
            }}
          />
          {screen === 'pay' || screen === 'booked' || screen === 'ride' || screen === 'ended' ? (
            <View style={styles.cover}>
              <PayScreen
                vehicle={vehicle}
                trip={trip}
                riderProfile={profile}
                onBack={() => setScreen(payBackTo)}
                onPay={async (next) => {
                  const bookingId = next.txnid || `EVG${Date.now().toString().slice(-8)}`;
                  const receiptData = { ...next, bookingId };
                  setReceipt(receiptData);
                  setScreen('booked');

                  // Post reservation asynchronously to PostgreSQL backend
                  try {
                    await apiPost('/reservations', {
                      customer_name: profile.name || 'Evegah Rider',
                      mobile: profile.phone || phone || '+91 9999999999',
                      reservation_date: new Date().toISOString().slice(0, 10),
                      reservation_time: new Date().toTimeString().slice(0, 8),
                      package_type: trip?.packageId ? `${trip.packageId.charAt(0).toUpperCase() + trip.packageId.slice(1)} Pass` : 'Daily Pass',
                      vehicle_category: vehicle?.category || vehicle?.tag || 'E-Scooter',
                      vehicle_model: vehicle?.name || 'Evegah City',
                      evegah_model_name: vehicle?.name || 'Evegah City',
                      fare: next.fare || 0,
                      deposit: next.deposit || 0,
                      total_payable: next.total || 0,
                      payment_mode: 'PayU',
                      payment_status: 'Paid',
                      transaction_id: next.txnid || next.payu_id || null,
                      pickup_zone: trip?.pickupName || selectedZone?.name || 'Gotri Zone',
                      drop_zone: trip?.dropName || selectedZone?.name || 'Gotri Zone',
                      coupon_code: next.appliedCode || null,
                      discount: next.discount || 0,
                      delivery_charge: next.flexiDeliveryCharge || 0,
                      delivery_distance_km: next.totalDeliveryKm || 0,
                      booking_source: 'Rider App (PayU Gateway)',
                    });
                  } catch (e) {
                    console.warn('Backend reservation sync notice:', e.message);
                  }
                }}
              />
            </View>
          ) : null}
          {screen === 'booked' ? (
            <View style={styles.booked}>
              <BookingConfirmedScreen
                vehicle={vehicle}
                trip={trip}
                receipt={receipt}
                onBack={() => setScreen('rides')}
                onStart={() => {
                  setScreen('rides');
                }}
              />
            </View>
          ) : null}
          {screen === 'ride' || screen === 'ended' ? (
            <View style={styles.ride}>
              <RideScreen
                vehicle={vehicle}
                trip={trip}
                receipt={receipt}
                onBack={() => setScreen(rideFrom)}
                onExtendRide={({ addedPrice, newDropAt }) => {
                  setTrip((prev) =>
                    prev ? { ...prev, dropAt: newDropAt } : prev,
                  );
                  setReceipt((prev) =>
                    prev
                      ? { ...prev, total: (prev.total || 0) + (addedPrice || 0) }
                      : prev,
                  );
                }}
                onEnd={(summary) => {
                  setRideSummary(summary);
                  setScreen('ended');
                }}
              />
            </View>
          ) : null}
          {screen === 'ended' ? (
            <View style={styles.ended}>
              <EndRideScreen
                vehicle={vehicle}
                trip={trip}
                receipt={receipt}
                summary={rideSummary}
                onDone={() => setScreen('home')}
              />
            </View>
          ) : null}
        </View>
      ) : screen === 'vehicleList' ? (
        <View style={styles.stage}>
          <VehicleListScreen
            trip={trip}
            selectedZone={selectedZone}
            onBack={() => setScreen(vehicleListFrom || 'home')}
            onOpenLocation={() => setLocationOpen(true)}
            onSelectVehicle={(next) => {
              setVehicle(next);
              setVehicleFrom('vehicleList');
              setScreen('vehicle');
            }}
          />
          <Modal
            visible={locationOpen}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={() => setLocationOpen(false)}
          >
            <LocationScreen
              selectedZone={selectedZone}
              onBack={() => setLocationOpen(false)}
              onSelectZone={(zone) => {
                setSelectedZone(zone);
                setLocationOpen(false);
              }}
            />
          </Modal>
        </View>
      ) : screen === 'vehicle' ? (
        <VehicleDetailsScreen
          vehicle={vehicle}
          trip={trip}
          selectedZone={selectedZone}
          onBack={() => setScreen(vehicleFrom || 'vehicleList')}
          onBook={(flexiData) => {
            let nextVehicle = vehicle;
            let nextTrip = trip;
            if (flexiData && typeof flexiData === 'object') {
              nextVehicle = { ...(vehicle || {}), ...flexiData };
              setVehicle(nextVehicle);
              if (flexiData.flexiPickupAddress || flexiData.flexiDropAddress || flexiData.flexiEnabled) {
                nextTrip = {
                  ...(trip || {
                    pickupAt: Date.now(),
                    dropAt: Date.now() + 24 * 3600 * 1000,
                    packageId: 'daily',
                    durationText: '24 hrs',
                  }),
                  pickupName: flexiData.flexiPickupAddress || trip?.pickupName || selectedZone?.name || 'Gotri Zone',
                  dropName: flexiData.flexiDropAddress || trip?.dropName || selectedZone?.name || 'Gotri Zone',
                  deliveryAnywhere: Boolean(flexiData.flexiEnabled),
                  flexiEnabled: Boolean(flexiData.flexiEnabled),
                  flexiDeliveryCharge: Number(flexiData.totalDeliveryCharge || 0),
                  totalDeliveryKm: Number(flexiData.pickupKm || 0) + Number(flexiData.dropKm || 0),
                  pickupKm: Number(flexiData.pickupKm || 0),
                  dropKm: Number(flexiData.dropKm || 0),
                  pickupDeliveryCharge: Number(flexiData.pickupDeliveryCharge || 0),
                  dropDeliveryCharge: Number(flexiData.dropDeliveryCharge || 0),
                };
                setTrip(nextTrip);
              }
            }
            if (!isLoggedIn) {
              setPendingBooking({
                vehicle: nextVehicle,
                trip: nextTrip,
                target: 'pay',
              });
              setLoginReturnTo('vehicle');
              setScreen('login');
              return;
            }
            setPayBackTo('vehicle');
            setScreen('pay');
          }}
        />
      ) : screen === 'security' ? (
        <SecurityScreen
          phone={profile.phone}
          onBack={() => setScreen('profile')}
          onLogout={() => {
            setIsLoggedIn(false);
            setPendingBooking(null);
            setLoginReturnTo('home');
            setScreen('home');
          }}
        />
      ) : screen === 'insights' ? (
        <InsightsScreen onBack={() => setScreen('home')} />
      ) : screen === 'transaction' ? (
        <TransactionScreen tx={tx} onBack={() => setScreen('wallet')} />
      ) : screen === 'wallet' ? (
        <WalletScreen
          enterCards={false}
          onOpenHome={() => setScreen('home')}
          onOpenMyRide={() => navigateProtected('rides')}
          onOpenScan={() => navigateProtected('scan')}
          onOpenProfile={() => navigateProtected('profile')}
          onOffers={() => {
            setOffersFrom('wallet');
            setScreen('offers');
          }}
          onOpenTx={(item) => {
            setTx(item);
            setScreen('transaction');
          }}
          phone={profile.phone}
        />
      ) : screen === 'notifications' ? (
        <NotificationsScreen
          notes={notes}
          phone={profile.phone}
          onBack={() => setScreen('home')}
          onRead={(id) => setNotes((list) => list.map((item) => (item.id === id ? { ...item, read: true } : item)))}
          onReadAll={() => setNotes((list) => list.map((item) => ({ ...item, read: true })))}
        />
      ) : screen === 'about' ? (
        <AboutScreen
          phone={profile.phone}
          name={profile.name}
          onBack={() => setScreen('profile')}
          onExplore={() => setScreen('home')}
        />
      ) : screen === 'preferences' ? (
        <PreferencesScreen
          prefs={prefs}
          onChange={setPrefs}
          onBack={() => setScreen('profile')}
        />
      ) : screen === 'help' ? (
        <HelpScreen onBack={() => setScreen('profile')} />
      ) : screen === 'giftCard' ? (
        <GiftCardScreen
          onBack={() => setScreen('profile')}
          onHelp={() => setScreen('help')}
          onRedeem={() => {
            setRedeemFrom('giftCard');
            setScreen('redeemGiftCard');
          }}
        />
      ) : screen === 'redeemGiftCard' ? (
        <RedeemGiftCardScreen
          onBack={() => setScreen(redeemFrom)}
          onRedeemed={() => setScreen('wallet')}
        />
      ) : screen === 'offers' ? (
        <OffersScreen onBack={() => setScreen(offersFrom)} />
      ) : screen === 'refer' ? (
        <ReferScreen
          phone={profile.phone}
          name={profile.name}
          onBack={() => setScreen('profile')}
        />
      ) : screen === 'kyc' ? (
        <KycScreen
          kyc={kyc}
          profile={{ ...profile, phone: profile?.phone || phone }}
          onBack={() => {
            if (pendingBooking) {
              const pb = pendingBooking;
              setPendingBooking(null);
              if (pb.vehicle) setVehicle(pb.vehicle);
              if (pb.trip) setTrip(pb.trip);
              setPayBackTo('vehicle');
              setScreen(pb.target || 'pay');
            } else {
              setScreen(isLoggedIn ? 'home' : 'profile');
            }
          }}
          onStep={(key) => setKyc((current) => ({ ...current, [key]: true }))}
          onKycComplete={(verifiedData) => {
            setKyc({ selfie: true, front: true, back: true });
            if (verifiedData?.name) {
              setProfile((prev) => ({
                ...prev,
                name: verifiedData.name || prev.name,
                dob: verifiedData.dob || prev.dob,
                gender: verifiedData.gender || prev.gender,
                aadhaar: verifiedData.aadhaar || prev.aadhaar,
                address: verifiedData.address || prev.address,
              }));
              apiPost('/renters', {
                rider_name: verifiedData.name,
                mobile: profile.phone || phone,
                gender: verifiedData.gender,
                date_of_birth: verifiedData.dob,
                address: verifiedData.address,
                aadhaar: verifiedData.aadhaar,
              }).catch(() => {});
            }
          }}
        />
      ) : screen === 'editProfile' ? (
        <EditProfileScreen
          profile={profile}
          onBack={() => {
            if (editProfileFrom === 'pendingBooking' && pendingBooking) {
              const pb = pendingBooking;
              setPendingBooking(null);
              if (pb.vehicle) setVehicle(pb.vehicle);
              if (pb.trip) setTrip(pb.trip);
              setPayBackTo('vehicle');
              setScreen(pb.target || 'pay');
            } else if (editProfileFrom === 'home') {
              setScreen('home');
            } else {
              setScreen('profile');
            }
          }}
          onSave={async (next) => {
            setProfile(next);
            try {
              const stored = await getStoredRider();
              if (stored) {
                await setStoredRider({
                  ...stored,
                  rider_name: next.name,
                  email: next.email,
                  dl_number: next.drivingLicense,
                  gender: next.gender,
                  date_of_birth: next.dob,
                  address: next.address,
                  aadhaar: next.aadhaar,
                  avatar: next.avatar,
                });
              }
            } catch (_) {}
            const profilePayload = {
              rider_name: next.name,
              name: next.name,
              mobile: next.phone || profile.phone || phone,
              phone: next.phone || profile.phone || phone,
              email: next.email,
              dl_number: next.drivingLicense,
              drivingLicense: next.drivingLicense,
              gender: next.gender,
              date_of_birth: next.dob,
              dob: next.dob,
              address: next.address,
              aadhaar: next.aadhaar,
              aadhaar_number: next.aadhaar,
              avatar: next.avatar,
              avatar_url: next.avatar,
            };
            apiPost('/renters/profile', profilePayload).catch(() => {});
            apiPost('/renters', profilePayload).catch(() => {});

            if (editProfileFrom === 'pendingBooking' && pendingBooking) {
              const pb = pendingBooking;
              setPendingBooking(null);
              if (pb.vehicle) setVehicle(pb.vehicle);
              if (pb.trip) setTrip(pb.trip);
              setPayBackTo('vehicle');
              setScreen(pb.target || 'pay');
            } else if (editProfileFrom === 'home') {
              setScreen('home');
            } else {
              setScreen('profile');
            }
          }}
        />
      ) : screen === 'profile' ? (
        <ProfileScreen
          profile={profile}
          verified={kyc.selfie && kyc.front && kyc.back}
          onEdit={() => {
            setEditProfileFrom('profile');
            setScreen('editProfile');
          }}
          onKyc={() => setScreen('kyc')}
          onRefer={() => setScreen('refer')}
          onOffers={() => {
            setOffersFrom('profile');
            setScreen('offers');
          }}
          onGiftCard={() => setScreen('giftCard')}
          onRedeemGiftCard={() => {
            setRedeemFrom('profile');
            setScreen('redeemGiftCard');
          }}
          onHelp={() => setScreen('help')}
          onPreferences={() => setScreen('preferences')}
          onAbout={() => setScreen('about')}
          onSecurity={() => setScreen('security')}
          onLogout={handleLogout}
          onOpenHome={() => setScreen('home')}
          onOpenMyRide={() => navigateProtected('rides')}
          onOpenScan={() => navigateProtected('scan')}
          onOpenWallet={openWallet}
        />
      ) : screen === 'security' ? (
        <SecurityScreen
          phone={profile.phone || phone}
          onBack={() => setScreen('profile')}
          onLogout={handleLogout}
        />
      ) : screen === 'bluetooth' ? (
        <BluetoothScreen
          onBack={() => setScreen('scan')}
          onUnlock={(scooter) => {
            setUnlockFrom('bluetooth');
            setUnlockScooter(scooter);
            setScreen('unlocking');
          }}
        />
      ) : screen === 'unlocking' ? (
        <UnlockingScreen
          scooter={unlockScooter}
          onBack={() => setScreen(unlockFrom)}
          onStart={() => {
            setRideFrom('unlocking');
            const code = unlockScooter?.code || 'EV-1042';
            if (!trip) {
              const start = Date.now();
              setTrip({
                pickupName: selectedZone?.name || 'Gotri',
                dropName: selectedZone?.name || 'Gotri',
                pickupAt: start,
                dropAt: start + 2 * 60 * 60 * 1000,
              });
            }
            if (!receipt) setReceipt({ bookingId: code.replace('-', '') });
            setScreen('ride');
          }}
        />
      ) : screen === 'scan' ? (
        <ScanScreen
          onOpenHome={() => setScreen('home')}
          onOpenMyRide={() => navigateProtected('rides')}
          onOpenProfile={() => navigateProtected('profile')}
          onOpenWallet={openWallet}
          onFindNearby={() => {
            setScreen('home');
            setLocationOpen(true);
          }}
          onScan={() => {
            setUnlockFrom('scan');
            setUnlockScooter(null);
            setScreen('unlocking');
          }}
          onBluetooth={() => setScreen('bluetooth')}
        />
      ) : screen === 'rideDetail' ? (
        <RideDetailScreen ride={pastRide} onBack={() => setScreen('rides')} />
      ) : screen === 'rides' ? (
        <MyRidesScreen
          onOpenHome={() => setScreen('home')}
          onOpenScan={() => navigateProtected('scan')}
          onOpenProfile={() => navigateProtected('profile')}
          onOpenWallet={openWallet}
          onOpenRide={(item) => {
            if (item.status === 'ongoing') {
              openActiveRide(item);
            } else {
              setPastRide(item);
              setScreen('rideDetail');
            }
          }}
          onOpenActiveRide={(item) => {
            openActiveRide(item);
          }}
          phone={profile.phone}
        />
      ) : screen === 'home' ? (
        <View style={styles.stage}>
          <HomeScreen
            selectedZone={selectedZone}
            calendarTriggerTick={calendarTriggerTick}
            onOpenLocation={() => setLocationOpen(true)}
            onOpenMyRide={() => navigateProtected('rides')}
            onOpenScan={() => navigateProtected('scan')}
            onOpenProfile={() => navigateProtected('profile')}
            onOpenWallet={openWallet}
            onOpenVehicleList={() => {
              setVehicleListFrom('home');
              setScreen('vehicleList');
            }}
            onSearchVehicles={(tripPayload) => {
              setTrip(tripPayload);
              setVehicleListFrom('home');
              setScreen('vehicleList');
            }}
            onOpenVehicle={(next) => {
              setVehicle(next);
              setVehicleFrom('home');
              setScreen('vehicle');
            }}
            onOpenRent={(nextVehicle, initialTrip) => {
              if (nextVehicle) setVehicle(nextVehicle);
              if (initialTrip) setTrip(initialTrip);
              setRentFrom('home');
              setScreen('rent');
            }}
            onOpenNotifications={() => setScreen('notifications')}
            onOpenInsights={() => setScreen('insights')}
            hasUnread={notes.some((item) => !item.read)}
          />
          <Modal
            visible={locationOpen}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={() => setLocationOpen(false)}
          >
            <LocationScreen
              selectedZone={selectedZone}
              onBack={() => setLocationOpen(false)}
              onSelectZone={(zone) => {
                setSelectedZone(zone);
                setLocationOpen(false);
                setCalendarTriggerTick((t) => t + 1);
              }}
            />
          </Modal>
        </View>
      ) : screen === 'login' ? (
        <LoginScreen
          onBack={() => {
            const protectedScreens = ['rides', 'scan', 'wallet', 'profile', 'editProfile', 'myRides', 'login', 'otp'];
            const target = (!loginReturnTo || protectedScreens.includes(loginReturnTo)) ? 'home' : loginReturnTo;
            setPendingBooking(null);
            setLoginReturnTo('home');
            setScreen(target);
          }}
          onContinue={async (nextPhone) => {
            setPhone(nextPhone);
            try {
              await sendRiderOtp(nextPhone);
            } catch (_) {}
            setScreen('otp');
          }}
        />
      ) : screen === 'otp' ? (
        <OtpScreen
          phone={phone}
          onEdit={() => setScreen('login')}
          onBack={() => setScreen('login')}
          onSuccess={(authResult) => {
            setIsLoggedIn(true);
            const renter = authResult?.renter;
            if (renter) {
              setProfile((current) => ({
                ...current,
                name: renter.rider_name || renter.name || current.name,
                phone: renter.mobile || current.phone,
                gender: renter.gender || current.gender,
                dob: renter.date_of_birth || current.dob,
                address: renter.address || renter.present_address || current.address,
              }));
              const kycStatus = String(renter.kyc_status || '').toLowerCase();
              if (kycStatus.includes('approv') || kycStatus.includes('verif')) {
                setKyc({ selfie: true, front: true, back: true });
              }
            } else {
              const mobile = last10(phone);
              if (mobile) {
                apiGet(`/renters/check-mobile/${mobile}`)
                  .then((body) => {
                    const r = body?.renter;
                    if (!r) return;
                    setProfile((current) => ({
                      ...current,
                      name: r.rider_name || r.name || current.name,
                      phone: r.mobile || current.phone,
                      gender: r.gender || current.gender,
                      dob: r.date_of_birth || current.dob,
                      address: r.address || r.present_address || current.address,
                    }));
                    const kycStatus = String(r.kyc_status || '').toLowerCase();
                    if (kycStatus.includes('approv') || kycStatus.includes('verif')) {
                      setKyc({ selfie: true, front: true, back: true });
                    }
                  })
                  .catch(() => {});
              }
            }

            if (pendingBooking) {
              setEditProfileFrom('pendingBooking');
              setScreen('editProfile');
            } else if (loginReturnTo && loginReturnTo !== 'home') {
              const target = loginReturnTo;
              setLoginReturnTo('home');
              setScreen(target);
            } else {
              setScreen('home');
            }
          }}
        />
      ) : (
        <View style={styles.stage}>
          <HomeScreen
            selectedZone={selectedZone}
            calendarTriggerTick={calendarTriggerTick}
            onOpenLocation={() => setLocationOpen(true)}
            onOpenMyRide={() => navigateProtected('rides')}
            onOpenScan={() => navigateProtected('scan')}
            onOpenProfile={() => navigateProtected('profile')}
            onOpenWallet={openWallet}
            onOpenActiveRide={(activeItem) => openActiveRide(activeItem)}
            onOpenVehicleList={() => setScreen('vehicleList')}
            onSearchVehicles={(tripPayload) => {
              setTrip(tripPayload);
              setPayBackTo('vehicle');
              setScreen('vehicleList');
            }}
            onOpenVehicle={(next) => {
              setVehicle(next);
              setVehicleFrom('home');
              setScreen('vehicle');
            }}
            onOpenNotifications={() => setScreen('notifications')}
            onOpenInsights={() => setScreen('insights')}
            onOpenBms={() => setScreen('bms')}
            hasUnread={notes.some((item) => !item.read)}
          />
        </View>
      )}
      {walletIntro ? (
        <WalletIntro
          active={screen}
          onOpenHome={() => setScreen('home')}
          onOpenMyRide={() => navigateProtected('rides')}
          onOpenScan={() => navigateProtected('scan')}
          onOpenProfile={() => navigateProtected('profile')}
          onOpen={() => setScreen('wallet')}
          onDone={() => setWalletIntro(false)}
        />
      ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    elevation: 8,
  },
  booked: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
    elevation: 12,
  },
  ride: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 7,
    elevation: 16,
  },
  ended: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 8,
    elevation: 20,
  },
});
