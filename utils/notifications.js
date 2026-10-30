/**
 * Extract last 10 digits from any phone/mobile string.
 */
export function last10(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

/**
 * Format timestamp or date into short readable format.
 */
export function shortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Remove any unicode emojis and clean up whitespace.
 * Ensures notifications are clean and professional without emojis.
 */
export function stripEmojis(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2388}-\u{23E9}\u{2B05}-\u{2B55}\u{200D}\u{200C}\u{FE0F}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map raw notification type or category to user-facing filter kind:
 * 'Rides' | 'Wallet' | 'Offers' | 'System'
 */
export function kindFor(type, category) {
  const value = `${type || ''} ${category || ''}`.toLowerCase();
  if (
    value.includes('promo') ||
    value.includes('offer') ||
    value.includes('coupon') ||
    value.includes('discount')
  ) {
    return 'Offers';
  }
  if (
    value.includes('ride') ||
    value.includes('book') ||
    value.includes('reservation') ||
    value.includes('trip') ||
    value.includes('rental')
  ) {
    return 'Rides';
  }
  if (
    value.includes('pay') ||
    value.includes('wallet') ||
    value.includes('transaction') ||
    value.includes('recharge') ||
    value.includes('topup')
  ) {
    return 'Wallet';
  }
  return 'System';
}

/**
 * Check if a notification explicitly belongs to the given user account.
 */
export function isUserSpecificNotification(item, user) {
  if (!user) return false;
  const userMobile = last10(
    typeof user === 'string'
      ? user
      : user.mobile || user.phone || user.rider_mobile
  );
  const userId = String(
    (typeof user === 'object' && (user.rider_id || user.id || user.user_id)) || ''
  ).trim();

  const itemMobile = last10(
    item?.mobile || item?.phone || item?.user_mobile || item?.rider_mobile
  );
  const itemId = String(
    item?.rider_id || item?.user_id || item?.userId || item?.riderId || ''
  ).trim();

  if (userMobile && itemMobile && userMobile === itemMobile) {
    return true;
  }
  if (userId && itemId && userId === itemId) {
    return true;
  }
  return false;
}

/**
 * Check if notification is a promo / offer.
 */
export function isPromoNotification(item) {
  const kind = item?.kind || kindFor(item?.type, item?.category);
  return kind === 'Offers';
}

/**
 * Check if notification is a ride-related notification.
 */
export function isRideNotification(item) {
  const kind = item?.kind || kindFor(item?.type, item?.category);
  return kind === 'Rides';
}

/**
 * Filter raw notifications according to business rule:
 * - In global feed, only promos/offers and general system announcements are allowed.
 * - Ride bookings, reservations, and trip updates MUST be user-specific.
 * - Global booking notifications for other users are strictly excluded.
 * - Emojis are removed from titles and messages.
 */
export function filterNotificationFeed(rawItems, user) {
  if (!Array.isArray(rawItems)) return [];

  const userMobile = last10(
    typeof user === 'string'
      ? user
      : user?.mobile || user?.phone || user?.rider_mobile
  );

  return rawItems
    .map((item) => {
      const kind = item.kind || kindFor(item.type, item.category);
      const title = stripEmojis(item.title || '');
      const text = stripEmojis(item.message || item.text || '');

      return {
        id: String(item.id || Math.random()),
        kind,
        title,
        text,
        time: item.time || shortDate(item.created_at || item.timestamp || Date.now()),
        read: Boolean(item.read || item.is_read),
        mobile: item.mobile || item.phone || null,
        rider_id: item.rider_id || item.user_id || null,
      };
    })
    .filter((item) => {
      // Rule 1: Rides must be user-specific.
      if (item.kind === 'Rides') {
        if (!userMobile) {
          // If no authenticated user, do not show any rides
          return false;
        }
        // Must explicitly match the authenticated user
        return isUserSpecificNotification(item, user);
      }

      // Rule 2: Personal wallet alerts must be user-specific if user target is present
      if (item.kind === 'Wallet') {
        const itemMobile = last10(item.mobile);
        if (itemMobile && userMobile && itemMobile !== userMobile) {
          return false;
        }
        return true;
      }

      // Rule 3: Offers / Promos are allowed globally and for targeted users
      if (item.kind === 'Offers') {
        const itemMobile = last10(item.mobile);
        if (itemMobile && userMobile && itemMobile !== userMobile) {
          return false;
        }
        return true;
      }

      // Rule 4: System notices are allowed globally if general announcements
      if (item.kind === 'System') {
        const itemMobile = last10(item.mobile);
        if (itemMobile && userMobile && itemMobile !== userMobile) {
          return false;
        }
        return true;
      }

      return false;
    });
}

/**
 * Convert a user's reservation into a clean, emoji-free user-specific notification.
 */
export function formatReservationAsNotification(res) {
  if (!res) return null;
  const resId = res.reservation_id || res.id || 'RID';
  const pkg = res.package_name || res.package_type || 'Ride';
  const zone = res.zone_name || res.pickup_zone || 'station';
  const status = String(res.status || '').toLowerCase();

  let title = 'Ride Confirmed';
  let text = `Your ${pkg} reservation (${resId}) in ${zone} is confirmed.`;

  if (status.includes('active') || status.includes('ongoing')) {
    title = 'Active Ride';
    text = `Your ${pkg} ride (${resId}) is currently active.`;
  } else if (status.includes('complete') || status.includes('ended')) {
    title = 'Ride Completed';
    text = `Your ${pkg} ride (${resId}) has ended successfully.`;
  } else if (status.includes('cancel')) {
    title = 'Ride Cancelled';
    text = `Your reservation (${resId}) has been cancelled.`;
  }

  return {
    id: `res_${resId}`,
    kind: 'Rides',
    title: stripEmojis(title),
    text: stripEmojis(text),
    time: shortDate(res.created_at || res.start_time || res.date || Date.now()),
    read: status.includes('complete') || status.includes('cancel'),
    mobile: res.mobile || res.phone || null,
    rider_id: res.rider_id || null,
  };
}

/**
 * Convert an active ride into a clean, emoji-free user-specific notification.
 */
export function formatActiveRideAsNotification(activeRide) {
  if (!activeRide) return null;
  const resId = activeRide.reservation_id || `RIDE_${activeRide.id || 'ACTIVE'}`;
  const vehicle = activeRide.vehicle_id || activeRide.registration_number || 'vehicle';
  const pkg = activeRide.package_name || 'Active Ride';

  return {
    id: `active_${resId}`,
    kind: 'Rides',
    title: 'Active Ride in Progress',
    text: stripEmojis(`Your ${pkg} with vehicle ${vehicle} is currently active.`),
    time: 'Just now',
    read: false,
    mobile: activeRide.mobile || activeRide.phone || null,
    rider_id: activeRide.rider_id || null,
  };
}

/**
 * Convert a coupon into a clean, emoji-free promo notification.
 */
export function formatCouponAsNotification(coupon) {
  if (!coupon) return null;
  const code = coupon.code || 'PROMO';
  const title = stripEmojis(coupon.title || `${code} Available`);
  const discount = coupon.discount_value ? `Flat Rs ${parseFloat(coupon.discount_value)} off` : 'Special discount';
  const text = stripEmojis(
    coupon.description || `${discount} on your next rental. Use code ${code} at checkout.`
  );

  return {
    id: `coupon_${coupon.id || code}`,
    kind: 'Offers',
    title,
    text,
    time: coupon.end_date ? `Valid till ${shortDate(coupon.end_date)}` : 'Active offer',
    read: false,
    mobile: null,
    rider_id: null,
  };
}

/**
 * Merge multiple notification lists, remove duplicates by ID, and keep order.
 */
export function mergeNotifications(...lists) {
  const seen = new Set();
  const merged = [];

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.id) continue;
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }

  return merged;
}
