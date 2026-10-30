/**
 * Utilities for cleaning address strings, stripping Google Plus codes,
 * and preserving zone integrity during flexi delivery booking.
 */

/**
 * Strips Google Plus Codes / Open Location Codes (e.g., '746R+56R, ', '74RD+9X, ')
 * from address strings to ensure human-readable street and locality display.
 *
 * @param {string} addr
 * @param {string} [fallback]
 * @returns {string}
 */
export function cleanAddressText(addr, fallback = 'Gotri - Bhayli Road, Bhayli, Vadodara, Gujarat 391410, India') {
  if (!addr || typeof addr !== 'string') return fallback;

  // Match standard Plus Codes (e.g. 746R+56R, 74RD+9X, 8FW4+V2 Vadodara)
  let cleaned = addr
    .replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}(?:,\s*|\s+)/i, '')
    .trim();

  // Strip leading comma or hyphens if leftover
  cleaned = cleaned.replace(/^[,-\s]+/, '').trim();

  // If the entire address was just a Plus Code (or is now empty), return fallback
  if (!cleaned || /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}$/i.test(cleaned)) {
    return fallback;
  }

  return cleaned;
}

/**
 * Ensures that booking a flexi delivery retains the zone identity and never
 * overwrites the hub/zone name with a delivery street address.
 *
 * @param {Object} trip
 * @param {Object} selectedZone
 * @param {Object} flexiData
 * @returns {Object}
 */
export function preserveZoneOnBooking(trip, selectedZone, flexiData = {}) {
  const zoneName =
    selectedZone?.name ||
    trip?.pickupZoneName ||
    trip?.zone ||
    trip?.pickupName ||
    'Gotri Zone';

  const zoneLat = selectedZone?.lat || selectedZone?.center?.lat || trip?.pickupZoneObj?.lat || 22.3168;
  const zoneLng = selectedZone?.lng || selectedZone?.center?.lng || trip?.pickupZoneObj?.lng || 73.1415;

  const isFlexi = Boolean(flexiData?.flexiEnabled);
  const flexiPickup = isFlexi ? cleanAddressText(flexiData.flexiPickupAddress || '') : '';
  const flexiDrop = isFlexi ? cleanAddressText(flexiData.flexiDropAddress || '') : '';

  const pickupKm = Number(flexiData.pickupKm || 0);
  const dropKm = Number(flexiData.dropKm || 0);
  const pickupDeliveryCharge = Number(flexiData.pickupDeliveryCharge || 0);
  const dropDeliveryCharge = Number(flexiData.dropDeliveryCharge || 0);
  const totalDeliveryCharge = Number(flexiData.totalDeliveryCharge || pickupDeliveryCharge + dropDeliveryCharge);

  return {
    ...(trip || {
      pickupAt: Date.now(),
      dropAt: Date.now() + 24 * 3600 * 1000,
      packageId: 'daily',
      durationText: '24 hrs',
    }),
    // Maintain hub/zone name strictly for pickup and drop zone reference
    pickupName: zoneName,
    dropName: zoneName,
    pickupZoneName: zoneName,
    dropZoneName: zoneName,
    zone: zoneName,
    pickupZoneObj: {
      id: selectedZone?.id || 'zone_gotri',
      name: zoneName,
      lat: zoneLat,
      lng: zoneLng,
    },
    // Store flexi delivery addresses in their dedicated properties
    flexiEnabled: isFlexi,
    deliveryAnywhere: isFlexi,
    flexiPickupAddress: flexiPickup,
    flexiDropAddress: flexiDrop,
    deliveryAddress: flexiPickup,
    returnAddress: flexiDrop,
    pickupKm,
    dropKm,
    pickupDeliveryCharge,
    dropDeliveryCharge,
    flexiDeliveryCharge: totalDeliveryCharge,
    totalDeliveryKm: pickupKm + dropKm,
  };
}
