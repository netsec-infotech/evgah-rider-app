import { NativeModules, Platform } from 'react-native';

const REMOTE_BASE = 'https://evegah.cloud/api';

// Candidate local backend addresses to try in development
const LAN_IP = '192.168.10.13';

function getLocalCandidates() {
  const candidates = [];
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/https?:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1' && match[1] !== '10.0.2.2') {
      candidates.push(`http://${match[1]}:5000/api`);
    }
  } catch (_) {}

  // 1. Always prioritize LAN IP so physical Android & iOS devices on Wi-Fi connect directly
  candidates.push(`http://${LAN_IP}:5000/api`);

  // 2. Android emulator host loopback
  if (Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:5000/api');
  }

  // 3. Standard localhost for simulators / desktop
  candidates.push('http://localhost:5000/api');

  // De-duplicate
  return [...new Set(candidates)];
}

let cachedWorkingLocalBase = null;

/**
 * Determine the appropriate API base URL for an endpoint
 */
export function getBaseForPath(path) {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (path.startsWith('/kyc')) {
    return cachedWorkingLocalBase || `http://${LAN_IP}:5000/api`;
  }
  return REMOTE_BASE;
}

export const BASE = REMOTE_BASE;
export const LOCAL_BASE = `http://${LAN_IP}:5000/api`;

export function last10(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

/**
 * Perform a GET request with smart routing and fallback
 */
export async function apiGet(path) {
  const isKyc = path.startsWith('/kyc');
  const candidateBases = isKyc 
    ? (cachedWorkingLocalBase ? [cachedWorkingLocalBase] : getLocalCandidates())
    : [getBaseForPath(path), REMOTE_BASE];

  let lastError = null;

  for (const base of candidateBases) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${base}${path}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (isKyc) cachedWorkingLocalBase = base;
        return data;
      }

      // If 404 and it's KYC, do not use this base
      if (res.status === 404 && isKyc) {
        continue;
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

  if (isKyc) {
    throw new Error(lastError?.message || `Cannot connect to Evegah backend (${LAN_IP}:5000). Ensure device and PC are on same Wi-Fi.`);
  }
  throw lastError || new Error('Request failed');
}

/**
 * Perform a POST request with smart routing and fallback
 */
export async function apiPost(path, body) {
  const isKyc = path.startsWith('/kyc');
  const candidateBases = isKyc 
    ? (cachedWorkingLocalBase ? [cachedWorkingLocalBase, ...getLocalCandidates().filter(b => b !== cachedWorkingLocalBase)] : getLocalCandidates())
    : [getBaseForPath(path), REMOTE_BASE];

  let lastError = null;

  for (const base of candidateBases) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (isKyc) cachedWorkingLocalBase = base;
        return data;
      }

      // If server responded with a non-404 error (e.g. 400 validation error, OTP error),
      // this server IS the correct backend! Return or throw its error message directly.
      if (res.status !== 404) {
        if (isKyc) cachedWorkingLocalBase = base;
        const err = new Error(data.message || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      // If 404, it might be the wrong host (like evegah.cloud without KYC), try next candidate
      continue;
    } catch (err) {
      lastError = err;
      // If error has a specific status and isn't 404, re-throw immediately
      if (err.status && err.status !== 404) {
        throw err;
      }
    }
  }

  if (isKyc) {
    throw new Error(lastError?.message || `Unable to reach backend at ${LAN_IP}:5000. Please verify PC and phone are on the same Wi-Fi.`);
  }
  throw lastError || new Error('Request failed');
}

/**
 * Aadhaar e-KYC Helper: Send OTP
 */
export async function requestAadhaarOtp(aadhaarNumber, mobile) {
  return apiPost('/kyc/aadhaar/otp', {
    aadhaar_number: String(aadhaarNumber).replace(/\D/g, ''),
    mobile: mobile || undefined,
    consent: 'y',
    reason: 'For KYC',
  });
}

/**
 * Aadhaar e-KYC Helper: Verify OTP
 */
export async function verifyAadhaarOtp(referenceId, otp, mobile) {
  return apiPost('/kyc/aadhaar/verify', {
    reference_id: referenceId,
    otp: String(otp).trim(),
    mobile: mobile || undefined,
  });
}

/**
 * Aadhaar e-KYC Helper: Fetch KYC Status
 */
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
