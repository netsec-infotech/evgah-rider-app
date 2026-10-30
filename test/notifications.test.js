import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripEmojis,
  kindFor,
  isUserSpecificNotification,
  isPromoNotification,
  isRideNotification,
  filterNotificationFeed,
  formatReservationAsNotification,
  formatActiveRideAsNotification,
  formatCouponAsNotification,
  mergeNotifications,
} from '../utils/notifications.js';

test('stripEmojis removes emojis while preserving text', () => {
  const input = '🎉 New Ride Booking Confirmed 🛵';
  assert.equal(stripEmojis(input), 'New Ride Booking Confirmed');

  const promoInput = '🔥 Flat ₹50 OFF on your first ride! ⚡';
  assert.equal(stripEmojis(promoInput), 'Flat ₹50 OFF on your first ride!');

  assert.equal(stripEmojis(''), '');
  assert.equal(stripEmojis(null), '');
});

test('kindFor properly classifies notification types', () => {
  assert.equal(kindFor('booking'), 'Rides');
  assert.equal(kindFor('ride_confirmed'), 'Rides');
  assert.equal(kindFor('rental_started'), 'Rides');
  assert.equal(kindFor('promo'), 'Offers');
  assert.equal(kindFor('discount_coupon'), 'Offers');
  assert.equal(kindFor('wallet_credit'), 'Wallet');
  assert.equal(kindFor('payment_success'), 'Wallet');
  assert.equal(kindFor('general_notice'), 'System');
});

test('isUserSpecificNotification checks user identity accurately', () => {
  const currentUser = { mobile: '+91 98765 43210', rider_id: 'rider_123' };

  // Matching mobile
  assert.equal(
    isUserSpecificNotification({ mobile: '9876543210' }, currentUser),
    true
  );

  // Matching rider_id
  assert.equal(
    isUserSpecificNotification({ rider_id: 'rider_123' }, currentUser),
    true
  );

  // Mismatched user
  assert.equal(
    isUserSpecificNotification({ mobile: '9123456789' }, currentUser),
    false
  );

  // Null mobile and rider_id (global)
  assert.equal(
    isUserSpecificNotification({ mobile: null, rider_id: null }, currentUser),
    false
  );
});

test('filterNotificationFeed excludes global rides and only keeps promos and user rides', () => {
  const currentUser = { mobile: '9999900001', rider_id: 'rider_me' };

  const rawNotifications = [
    // Global booking without mobile (leaked from backend)
    {
      id: 'notif-other-1',
      mobile: null,
      rider_id: null,
      title: '🎉 New Ride Booking Confirmed',
      message: 'Ketan bhai created a new Daily Pass reservation (RID-101) in Gotri.',
      type: 'booking',
      read: false,
    },
    // Another user specific ride
    {
      id: 'notif-other-2',
      mobile: '9876543210',
      rider_id: 'rider_other',
      title: 'Ride completed',
      message: 'Your ride RID-102 has ended.',
      type: 'ride',
      read: false,
    },
    // Current user specific ride
    {
      id: 'notif-user-1',
      mobile: '9999900001',
      rider_id: 'rider_me',
      title: '🎉 Your Ride is Ready',
      message: 'Your Evegah City scooter is ready for pickup in Gotri.',
      type: 'booking',
      read: false,
    },
    // Global promo (should be allowed)
    {
      id: 'notif-promo-1',
      mobile: null,
      title: '⚡ Weekend Flash Sale',
      message: 'Use code WEEKEND20 for 20% discount on all rides.',
      type: 'promo',
      read: false,
    },
    // Global system announcement (should be allowed)
    {
      id: 'notif-system-1',
      mobile: null,
      title: 'New Zones Available',
      message: 'We have added new drop-off stations in Alkapuri.',
      type: 'system',
      read: true,
    },
  ];

  const filtered = filterNotificationFeed(rawNotifications, currentUser);

  // Must not contain other user rides
  const hasKetanRide = filtered.some((item) =>
    item.text.includes('Ketan bhai')
  );
  assert.equal(hasKetanRide, false);

  const hasOtherRide = filtered.some((item) => item.id === 'notif-other-2');
  assert.equal(hasOtherRide, false);

  // Must contain current user ride
  const userRide = filtered.find((item) => item.id === 'notif-user-1');
  assert.ok(userRide);
  assert.equal(userRide.kind, 'Rides');
  assert.equal(userRide.title, 'Your Ride is Ready'); // Emojis removed

  // Must contain promo
  const promo = filtered.find((item) => item.id === 'notif-promo-1');
  assert.ok(promo);
  assert.equal(promo.kind, 'Offers');
  assert.equal(promo.title, 'Weekend Flash Sale'); // Emojis removed

  // Must contain system announcement
  const system = filtered.find((item) => item.id === 'notif-system-1');
  assert.ok(system);
  assert.equal(system.kind, 'System');

  // Total should be 3 (user ride, promo, system notice)
  assert.equal(filtered.length, 3);
});

test('formatReservationAsNotification creates clean user ride notification', () => {
  const reservation = {
    reservation_id: 'RID-2026-8899',
    package_name: 'Daily Pass',
    pickup_zone: 'Gotri',
    status: 'Upcoming',
    created_at: '2026-10-25T10:00:00.000Z',
    mobile: '9999900001',
  };

  const notif = formatReservationAsNotification(reservation);
  assert.equal(notif.id, 'res_RID-2026-8899');
  assert.equal(notif.kind, 'Rides');
  assert.equal(notif.title, 'Ride Confirmed');
  assert.equal(
    notif.text,
    'Your Daily Pass reservation (RID-2026-8899) in Gotri is confirmed.'
  );
  assert.equal(notif.mobile, '9999900001');
});

test('formatActiveRideAsNotification creates active ride notification', () => {
  const activeRide = {
    id: '44',
    reservation_id: 'RID-ACTIVE-44',
    vehicle_id: 'GJ-06-EV-1002',
    package_name: 'City Commute',
    mobile: '9999900001',
  };

  const notif = formatActiveRideAsNotification(activeRide);
  assert.equal(notif.id, 'active_RID-ACTIVE-44');
  assert.equal(notif.kind, 'Rides');
  assert.equal(notif.title, 'Active Ride in Progress');
  assert.equal(
    notif.text,
    'Your City Commute with vehicle GJ-06-EV-1002 is currently active.'
  );
});

test('formatCouponAsNotification creates promo notification', () => {
  const coupon = {
    id: 'c1',
    code: 'EVEGAH100',
    title: '🎉 Flat ₹100 Off',
    description: 'Get Flat ₹100 discount on rentals above ₹500',
    end_date: '2026-12-31T23:59:59.000Z',
  };

  const notif = formatCouponAsNotification(coupon);
  assert.equal(notif.id, 'coupon_c1');
  assert.equal(notif.kind, 'Offers');
  assert.equal(notif.title, 'Flat ₹100 Off'); // Emojis removed
  assert.equal(
    notif.text,
    'Get Flat ₹100 discount on rentals above ₹500'
  );
});

test('mergeNotifications deduplicates by id while preserving ordering', () => {
  const listA = [
    { id: '1', title: 'First' },
    { id: '2', title: 'Second' },
  ];
  const listB = [
    { id: '2', title: 'Second Duplicate' },
    { id: '3', title: 'Third' },
  ];

  const merged = mergeNotifications(listA, listB);
  assert.equal(merged.length, 3);
  assert.deepEqual(
    merged.map((m) => m.id),
    ['1', '2', '3']
  );
  assert.equal(merged[1].title, 'Second');
});
