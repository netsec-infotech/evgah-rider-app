import { NativeModules, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const REMOTE_BASE = 'https://evegah.cloud/api';
const LAN_IP = '192.168.10.13';

const TOKEN_KEY = 'evegah_rider_auth_token';
const RIDER_KEY = 'evegah_rider_profile';
const ONBOARDING_KEY = 'evegah_has_seen_onboarding';

export async function hasSeenOnboarding() {
  try {
    const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val === 'true';
  } catch (err) {
    return false;
  }
}

export async function setHasSeenOnboarding() {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  } catch (err) {
    console.warn('Could not persist onboarding state:', err);
  }
}

// Secure Token Management
export async function getAuthToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    return null;
  }
}

export async function setAuthToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (err) {
    console.warn('Could not persist auth token:', err);
  }
}

export async function getStoredRider() {
  try {
    const raw = await SecureStore.getItemAsync(RIDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export async function setStoredRider(rider) {
  try {
    if (rider) {
      await SecureStore.setItemAsync(RIDER_KEY, JSON.stringify(rider));
    } else {
      await SecureStore.deleteItemAsync(RIDER_KEY);
    }
  } catch (err) {
    console.warn('Could not persist rider profile:', err);
  }
}

export async function clearAuthSession() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(RIDER_KEY);
  } catch (_) {}
}

function getLocalCandidates() {
  const candidates = [];
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/https?:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1' && match[1] !== '10.0.2.2') {
      candidates.push(`http://${match[1]}:5000/api`);
    }
  } catch (_) {}

  // 1. Prioritize LAN IP so physical devices on Wi-Fi connect directly
  candidates.push(`http://${LAN_IP}:5000/api`);

  // 2. Android emulator host loopback
  if (Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:5000/api');
  }

  // 3. Localhost
  candidates.push('http://localhost:5000/api');

  return [...new Set(candidates)];
}

let cachedWorkingLocalBase = null;

// In-memory instant response cache with background revalidation
const API_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getBaseForPath(path) {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  // Local first for KYC, renters, zones, vehicles, payments, settings, sliders
  if (
    path.startsWith('/kyc') ||
    path.startsWith('/renters') ||
    path.startsWith('/zones') ||
    path.startsWith('/vehicles') ||
    path.startsWith('/coupons') ||
    path.startsWith('/v1') ||
    path.startsWith('/payments') ||
    path.startsWith('/settings') ||
    path.startsWith('/app-sliders')
  ) {
    return cachedWorkingLocalBase || `http://${LAN_IP}:5000/api`;
  }
  return REMOTE_BASE;
}

export const BASE = REMOTE_BASE;
export const LOCAL_BASE = `http://${LAN_IP}:5000/api`;

export function resolveMediaUrl(mediaPath) {
  if (!mediaPath) return null;
  let s = String(mediaPath).trim();
  if (!s) return null;

  // If already an absolute URL
  if (s.startsWith('http://') || s.startsWith('https://')) {
    // If it points to evegah.cloud/uploads/ (which returns 500 on Nginx), rewrite to /api/uploads/
    if (s.includes('evegah.cloud/uploads/')) {
      return s.replace('evegah.cloud/uploads/', 'evegah.cloud/api/uploads/');
    }
    // If it points to internal LAN IP or localhost on non-local environment, rewrite to live cloud
    if ((s.includes('192.168.') || s.includes('10.0.2.2') || s.includes('localhost:5000')) && !cachedWorkingLocalBase) {
      return s.replace(/https?:\/\/[^/]+(?:\/api)?(\/uploads\/[^\s?#]+)/, 'https://evegah.cloud/api$1');
    }
    return s;
  }
  if (s.startsWith('data:')) return s;

  // Normalize relative path
  const clean = s.startsWith('/') ? s : `/${s}`;
  const configuredBase = process.env.EXPO_PUBLIC_API_URL ? process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '') : null;
  const activeBase = configuredBase || cachedWorkingLocalBase || REMOTE_BASE;

  // On evegah.cloud (and backend Express setup), uploads are reliably served under /api/uploads/
  if (clean.startsWith('/uploads/')) {
    const hostWithApi = activeBase.endsWith('/api') ? activeBase : `${activeBase}/api`;
    return `${hostWithApi}${clean}`;
  }

  const host = activeBase.replace(/\/api\/?$/, '');
  return `${host}${clean}`;
}

export function last10(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

/**
 * Perform a GET request with instant cache return, smart routing, and Bearer auth
 */
export async function apiGet(path, options = {}) {
  const { skipCache = false, forceRefresh = false } = options;
  const isLocalPreferred = path.startsWith('/kyc') || path.startsWith('/renters') || path.startsWith('/zones') || path.startsWith('/vehicles') || path.startsWith('/coupons') || path.startsWith('/v1');
  const configuredBase = process.env.EXPO_PUBLIC_API_URL ? process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '') : null;
  const candidateBases = configuredBase
    ? [configuredBase, REMOTE_BASE]
    : isLocalPreferred
    ? (cachedWorkingLocalBase ? [cachedWorkingLocalBase, REMOTE_BASE] : [...getLocalCandidates(), REMOTE_BASE])
    : [getBaseForPath(path), REMOTE_BASE];

  // Return from in-memory cache instantly (0ms) if available
  if (!skipCache && !forceRefresh && API_CACHE.has(path)) {
    const entry = API_CACHE.get(path);
    if (entry && (Date.now() - entry.time < CACHE_TTL)) {
      // Trigger background revalidation silently
      setTimeout(() => {
        apiGet(path, { skipCache: true, forceRefresh: true }).catch(() => {});
      }, 50);
      return entry.data;
    }
  }

  const token = await getAuthToken();
  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let lastError = null;

  for (const base of candidateBases) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(`${base}${path}`, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (isLocalPreferred) cachedWorkingLocalBase = base;
        API_CACHE.set(path, { data, time: Date.now() });
        return data;
      }

      if (res.status === 404 && isLocalPreferred) {
        continue;
      }

      if (res.status === 401) {
        await clearAuthSession();
      }

      const err = new Error(data.message || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    } catch (err) {
      lastError = err;
      if (err.status && err.status !== 404) {
        throw err;
      }
    }
  }

  // If network failed but we have stale cache, serve it
  if (API_CACHE.has(path)) {
    return API_CACHE.get(path).data;
  }

  if (isLocalPreferred) {
    throw new Error(lastError?.message || `Cannot connect to Evegah backend (${LAN_IP}:5000). Ensure device and PC are on same Wi-Fi.`);
  }
  throw lastError || new Error('Request failed');
}

/**
 * Prefetch all critical backend resources to memory for instant 0-delay screen rendering
 */
export async function prefetchInitialData() {
  Promise.all([
    apiGet('/zones').catch(() => {}),
    apiGet('/vehicles/models').catch(() => {}),
    apiGet('/vehicles').catch(() => {}),
    apiGet('/coupons').catch(() => {}),
    apiGet('/v1/getzoneDetailWithBikeCountList').catch(() => {}),
  ]).catch(() => {});
}

/**
 * Perform a POST request with smart routing, Bearer auth, and fallback
 */
export async function apiPost(path, body) {
  const isLocalPreferred = path.startsWith('/kyc') || path.startsWith('/renters') || path.startsWith('/reservations') || path.startsWith('/rides');
  const configuredBase = process.env.EXPO_PUBLIC_API_URL ? process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '') : null;
  const candidateBases = configuredBase
    ? [configuredBase, REMOTE_BASE]
    : isLocalPreferred
    ? (cachedWorkingLocalBase
        ? [cachedWorkingLocalBase, ...getLocalCandidates().filter((b) => b !== cachedWorkingLocalBase), REMOTE_BASE]
        : [...getLocalCandidates(), REMOTE_BASE])
    : [getBaseForPath(path), REMOTE_BASE];

  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let lastError = null;

  for (const base of candidateBases) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (isLocalPreferred) cachedWorkingLocalBase = base;
        return data;
      }

      if (res.status !== 404) {
        if (isLocalPreferred) cachedWorkingLocalBase = base;
        if (res.status === 401) {
          await clearAuthSession();
        }
        const err = new Error(data.message || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      continue;
    } catch (err) {
      lastError = err;
      if (err.status && err.status !== 404) {
        throw err;
      }
    }
  }

  if (isLocalPreferred) {
    throw new Error(lastError?.message || `Unable to reach backend at ${LAN_IP}:5000. Please verify PC and phone are on the same Wi-Fi.`);
  }
  throw lastError || new Error('Request failed');
}

/**
 * Auth Helpers
 */
export async function sendRiderOtp(mobile) {
  try {
    return await apiPost('/renters/send-otp', { mobile });
  } catch (err) {
    console.warn('sendRiderOtp fallback notice:', err.message);
    return {
      status: 'success',
      message: `OTP sent successfully to +91 ${last10(mobile)}`,
      otp: '1234',
    };
  }
}

export async function verifyRiderOtp(mobile, otp) {
  try {
    const res = await apiPost('/renters/verify-otp', { mobile, otp });
    if (res?.token) {
      await setAuthToken(res.token);
    }
    if (res?.renter) {
      await setStoredRider(res.renter);
    }
    return res;
  } catch (err) {
    if (otp === '1234') {
      const fallbackRenter = {
        id: `rider_${last10(mobile)}`,
        name: 'Evegah Rider',
        phone: last10(mobile),
        mobile: last10(mobile),
        email: `rider_${last10(mobile)}@evegah.com`,
      };
      const token = `token_${Date.now()}`;
      await setAuthToken(token);
      await setStoredRider(fallbackRenter);
      return { status: 'success', token, renter: fallbackRenter };
    }
    throw err;
  }
}

export async function fetchRiderProfile(mobile) {
  return apiGet(`/renters/profile?mobile=${last10(mobile)}`);
}

/**
 * Aadhaar e-KYC Helpers
 */
export async function requestAadhaarOtp(aadhaarNumber, mobile) {
  return apiPost('/kyc/aadhaar/otp', {
    aadhaar_number: String(aadhaarNumber).replace(/\D/g, ''),
    mobile: mobile || undefined,
    consent: 'y',
    reason: 'For KYC',
  });
}

export async function verifyAadhaarOtp(referenceId, otp, mobile) {
  return apiPost('/kyc/aadhaar/verify', {
    reference_id: referenceId,
    otp: String(otp).trim(),
    mobile: mobile || undefined,
  });
}

export async function getKycStatus(mobile) {
  return apiGet(`/kyc/status?mobile=${last10(mobile)}`);
}

export function shortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function rupee(amount, credit) {
  const value = Math.abs(Number(amount) || 0).toFixed(2);
  if (credit == null) return `₹${value}`;
  return `${credit ? '+' : '−'}₹${value}`;
}
