import * as SecureStore from "expo-secure-store"

const KEY_TOKEN = "prv_token"
const KEY_USER_ID = "prv_user_id"
const KEY_ROLE = "prv_role"
const KEY_COMPANY_ID = "prv_company_id"
const KEY_BIOMETRIC = "prv_biometric_unlock"

export interface StoredSession {
  token: string
  userId: string
  role: string
  companyId: string
}

export async function saveSession(session: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_TOKEN, session.token),
    SecureStore.setItemAsync(KEY_USER_ID, session.userId),
    SecureStore.setItemAsync(KEY_ROLE, session.role),
    SecureStore.setItemAsync(KEY_COMPANY_ID, session.companyId),
  ])
}

export async function getSession(): Promise<StoredSession | null> {
  const [token, userId, role, companyId] = await Promise.all([
    SecureStore.getItemAsync(KEY_TOKEN),
    SecureStore.getItemAsync(KEY_USER_ID),
    SecureStore.getItemAsync(KEY_ROLE),
    SecureStore.getItemAsync(KEY_COMPANY_ID),
  ])
  if (!token || !userId || !role || !companyId) return null
  return { token, userId, role, companyId }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_TOKEN),
    SecureStore.deleteItemAsync(KEY_USER_ID),
    SecureStore.deleteItemAsync(KEY_ROLE),
    SecureStore.deleteItemAsync(KEY_COMPANY_ID),
  ])
}

// ── Biometric unlock preference ──────────────────────────────────────────────
// Whether the user wants Face ID / fingerprint offered to unlock the stored
// session on this device. Defaults to enabled; biometrics still only ever
// unlock an existing session, never authenticate on their own.

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEY_BIOMETRIC)
  return v !== "false"
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY_BIOMETRIC, enabled ? "true" : "false")
}
