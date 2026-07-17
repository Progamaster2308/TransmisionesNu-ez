const LOCK_KEY = 'tn_admin_login_lock';
const MAX_ATTEMPTS = 4;
const LOCK_MS = 5 * 60 * 1000;

function now() {
  return Date.now();
}

function readLockState() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0, lastAttemptAt: 0 };
    const parsed = JSON.parse(raw);
    return {
      attempts: Math.max(0, Number(parsed.attempts) || 0),
      lockedUntil: Math.max(0, Number(parsed.lockedUntil) || 0),
      lastAttemptAt: Math.max(0, Number(parsed.lastAttemptAt) || 0)
    };
  } catch {
    return { attempts: 0, lockedUntil: 0, lastAttemptAt: 0 };
  }
}

function writeLockState(state) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(state));
  } catch {
    // Login protection still works for the current attempt even if storage is unavailable.
  }
}

export function getAdminLoginLock() {
  const state = readLockState();
  if (state.lockedUntil && state.lockedUntil <= now()) {
    resetAdminLoginLock();
    return { attempts: 0, locked: false, remainingMs: 0, remainingAttempts: MAX_ATTEMPTS };
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - state.attempts);
  return {
    attempts: state.attempts,
    locked: state.lockedUntil > now(),
    remainingMs: Math.max(0, state.lockedUntil - now()),
    remainingAttempts
  };
}

export function registerAdminLoginFailure() {
  const current = getAdminLoginLock();
  if (current.locked) return current;

  const attempts = current.attempts + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? now() + LOCK_MS : 0;
  const nextState = { attempts, lockedUntil, lastAttemptAt: now() };
  writeLockState(nextState);

  return getAdminLoginLock();
}

export function resetAdminLoginLock() {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {
    // Nothing to reset.
  }
}

export function formatLockTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}
