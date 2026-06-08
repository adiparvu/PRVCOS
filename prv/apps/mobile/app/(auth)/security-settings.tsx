import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import Svg, { Circle, Path, Rect } from "react-native-svg"
import {
  useSecuritySettings,
  useRevokeSession,
  useRevokeAllSessions,
  type SessionInfo,
  type ActivityEntry,
} from "@/hooks/useSecuritySettings"
import { colors, radius, spacing, type } from "@/tokens"

// ── SF Symbol icons ───────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <Svg width={10} height={18} viewBox="0 0 10 18" fill="none">
      <Path
        d="M9 1L1 9L9 17"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ChevronRight() {
  return (
    <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
      <Path
        d="M1 1L6 6L1 11"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function LockShieldFill() {
  return (
    <Svg width={20} height={22} viewBox="0 0 22 24" fill="none">
      <Path
        d="M11 1L2 5V11C2 16.5 5.9 21.7 11 23C16.1 21.7 20 16.5 20 11V5L11 1Z"
        fill="rgba(52,199,89,0.85)"
      />
      <Path
        d="M8 11V8.5C8 6.57 9.57 5 11 5C12.43 5 14 6.57 14 8.5V11"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Rect x={7} y={10.5} width={8} height={6.5} rx={2} fill="rgba(0,0,0,0.5)" />
    </Svg>
  )
}

function ShieldAlert() {
  return (
    <Svg width={18} height={20} viewBox="0 0 22 24" fill="none">
      <Path
        d="M11 1L2 5V11C2 16.5 5.9 21.7 11 23C16.1 21.7 20 16.5 20 11V5L11 1Z"
        stroke="rgba(255,59,48,0.8)"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M11 8V13" stroke="rgba(255,59,48,0.8)" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={11} cy={16} r={0.9} fill="rgba(255,59,48,0.8)" />
    </Svg>
  )
}

function ShieldXmark() {
  return (
    <Svg width={18} height={20} viewBox="0 0 22 24" fill="none">
      <Path
        d="M11 1L2 5V11C2 16.5 5.9 21.7 11 23C16.1 21.7 20 16.5 20 11V5L11 1Z"
        stroke="rgba(255,59,48,0.8)"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M8 9L14 15M14 9L8 15"
        stroke="rgba(255,59,48,0.8)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function KeyIcon() {
  return (
    <Svg width={20} height={12} viewBox="0 0 20 12" fill="none">
      <Circle cx={5} cy={6} r={4.5} stroke="rgba(255,179,64,0.85)" strokeWidth={1.8} />
      <Path d="M9 6H18" stroke="rgba(255,179,64,0.85)" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 6V8.5" stroke="rgba(255,179,64,0.85)" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={5} cy={6} r={1.5} fill="rgba(255,179,64,0.85)" />
    </Svg>
  )
}

function LockRotate() {
  return (
    <Svg width={20} height={20} viewBox="0 0 22 22" fill="none">
      <Path
        d="M11 3C7.13 3 4 6.13 4 10V13"
        stroke="rgba(10,132,255,0.85)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Rect
        x={2}
        y={12}
        width={18}
        height={8}
        rx={3}
        stroke="rgba(10,132,255,0.85)"
        strokeWidth={1.8}
      />
      <Circle cx={11} cy={16} r={1.5} fill="rgba(10,132,255,0.85)" />
      <Path
        d="M16 4L18 6L16 8"
        stroke="rgba(10,132,255,0.85)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function IPhoneIcon({ dim = false }: { dim?: boolean }) {
  const c = dim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.65)"
  return (
    <Svg width={14} height={22} viewBox="0 0 14 22" fill="none">
      <Rect x={1} y={1} width={12} height={20} rx={3} stroke={c} strokeWidth={1.5} />
      <Path d="M5 2.5H9" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={7} cy={18.5} r={1} fill={c} />
    </Svg>
  )
}

function XmarkIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path
        d="M2 2L10 10M10 2L2 10"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function SignOutIcon() {
  return (
    <Svg width={18} height={16} viewBox="0 0 18 16" fill="none">
      <Path
        d="M7 2H3C1.9 2 1 2.9 1 4V12C1 13.1 1.9 14 3 14H7"
        stroke="rgba(255,59,48,0.8)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 5L17 8L12 11"
        stroke="rgba(255,59,48,0.8)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M17 8H7" stroke="rgba(255,59,48,0.8)" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 60) return "Active now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(unixSeconds * 1000).toLocaleDateString()
}

function formatActivityTime(isoString: string | null): string {
  if (!isoString) return ""
  const d = new Date(isoString)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (isToday) return `Today · ${time}`
  if (isYesterday) return `Yesterday · ${time}`
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`
}

function friendlyAction(action: string): string {
  const map: Record<string, string> = {
    "auth.login": "Successful login",
    "auth.mfa.verify": "MFA verified",
    "auth.totp.verify": "Authenticator setup",
    "auth.session.create": "Session created",
    "auth.logout": "Signed out",
    "mobile.security.sessions.revoke_all": "All other sessions revoked",
    "mobile.security.session.revoke": "Session revoked",
  }
  return map[action] ?? action.replace(/\./g, " · ")
}

function deviceLabel(deviceId: string, isCurrent: boolean): string {
  if (isCurrent) return "This device"
  return `Device ···${deviceId.slice(-4).toUpperCase()}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

function Row({
  iconBg,
  icon,
  title,
  sub,
  right,
  titleRed = false,
  onPress,
}: {
  iconBg: string
  icon: React.ReactNode
  title: string
  sub?: string
  right?: React.ReactNode
  titleRed?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, titleRed && styles.rowTitleRed]}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SecuritySettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useSecuritySettings()
  const revokeOne = useRevokeSession()
  const revokeAll = useRevokeAllSessions()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  function confirmRevokeOne(session: SessionInfo) {
    Alert.alert(
      "Sign Out Device",
      `Sign out ${deviceLabel(session.deviceId, false)}? This session will end immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => revokeOne.mutate(session.sessionId),
        },
      ]
    )
  }

  function confirmRevokeAll() {
    Alert.alert(
      "Sign Out All Other Devices",
      "All sessions except this device will be terminated immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out All",
          style: "destructive",
          onPress: () => revokeAll.mutate(),
        },
      ]
    )
  }

  const mfaEnabled = data?.mfa.enabled ?? false
  const backupCodesRemaining = data?.mfa.backupCodesRemaining ?? 0
  const sessions = data?.sessions ?? []
  const otherSessions = sessions.filter((s) => !s.isCurrent)
  const recentActivity = data?.recentActivity ?? []

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Security</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="rgba(255,255,255,0.3)"
          />
        }
      >
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="rgba(255,255,255,0.3)" />
          </View>
        )}

        {isError && !isLoading && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>Failed to load security settings.</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryLabel}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <>
            {/* ── Two-Factor Auth ── */}
            <View style={styles.section}>
              <SectionLabel>Two-Factor Authentication</SectionLabel>

              {!mfaEnabled && (
                <View style={styles.mfaRiskCard}>
                  <View style={styles.mfaRiskIconWrap}>
                    <ShieldAlert />
                  </View>
                  <View style={styles.mfaRiskBody}>
                    <Text style={styles.mfaRiskTitle}>Your account is at risk</Text>
                    <Text style={styles.mfaRiskSub}>
                      Two-factor auth adds a critical layer of protection.
                    </Text>
                  </View>
                </View>
              )}

              <Card>
                <Row
                  iconBg={mfaEnabled ? "rgba(52,199,89,0.15)" : "rgba(255,255,255,0.07)"}
                  icon={mfaEnabled ? <LockShieldFill /> : <ShieldAlert />}
                  title="Two-Factor Auth"
                  sub={mfaEnabled ? "Authenticator app active" : "Not configured"}
                  right={
                    <View style={[styles.badge, mfaEnabled ? styles.badgeGreen : styles.badgeGray]}>
                      <Text
                        style={[
                          styles.badgeText,
                          mfaEnabled ? styles.badgeTextGreen : styles.badgeTextGray,
                        ]}
                      >
                        {mfaEnabled ? "Enabled" : "Disabled"}
                      </Text>
                    </View>
                  }
                  onPress={mfaEnabled ? undefined : () => router.push("/(auth)/totp-setup")}
                />

                {mfaEnabled && (
                  <>
                    <View style={styles.rowDivider} />
                    <Row
                      iconBg="rgba(255,179,64,0.15)"
                      icon={<KeyIcon />}
                      title="Backup Codes"
                      sub={`${backupCodesRemaining} of 10 remaining`}
                      right={
                        <View style={styles.rowRight}>
                          <View style={[styles.badge, styles.badgeAmber]}>
                            <Text style={[styles.badgeText, styles.badgeTextAmber]}>
                              Regenerate
                            </Text>
                          </View>
                          <ChevronRight />
                        </View>
                      }
                      onPress={() => router.push("/(auth)/totp-setup")}
                    />
                    <View style={styles.rowDivider} />
                    <Row
                      iconBg="rgba(255,59,48,0.12)"
                      icon={<ShieldXmark />}
                      title="Disable 2FA"
                      sub="Requires re-authentication"
                      titleRed
                      right={<ChevronRight />}
                      onPress={() =>
                        Alert.alert(
                          "Disable Two-Factor Auth",
                          "This will make your account less secure. You'll be asked to re-authenticate.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Continue",
                              style: "destructive",
                              onPress: () =>
                                router.push({
                                  pathname: "/(auth)/reauth",
                                  params: { reason: "Disable two-factor authentication" },
                                }),
                            },
                          ]
                        )
                      }
                    />
                  </>
                )}

                {!mfaEnabled && (
                  <>
                    <View style={styles.rowDivider} />
                    <TouchableOpacity
                      style={styles.enableMfaBtn}
                      onPress={() => router.push("/(auth)/totp-setup")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.enableMfaBtnText}>Enable 2FA Now</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Card>
            </View>

            {/* ── Account ── */}
            <View style={styles.section}>
              <SectionLabel>Account</SectionLabel>
              <Card>
                <Row
                  iconBg="rgba(10,132,255,0.15)"
                  icon={<LockRotate />}
                  title="Change Password"
                  sub="Update your login credentials"
                  right={<ChevronRight />}
                  onPress={() => router.push("/(auth)/password-reset")}
                />
              </Card>
            </View>

            {/* ── Active Sessions ── */}
            <View style={styles.section}>
              <SectionLabel>Active Sessions</SectionLabel>
              <Card>
                {sessions.map((session, i) => (
                  <View key={session.sessionId}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <View style={styles.sessionRow}>
                      <View style={styles.sessionDeviceIcon}>
                        <IPhoneIcon dim={!session.isCurrent} />
                      </View>
                      <View style={styles.sessionBody}>
                        <View style={styles.sessionNameRow}>
                          <Text
                            style={[
                              styles.sessionName,
                              !session.isCurrent && styles.sessionNameDim,
                            ]}
                          >
                            {deviceLabel(session.deviceId, session.isCurrent)}
                          </Text>
                          {session.isCurrent && (
                            <View style={styles.thisDeviceBadge}>
                              <Text style={styles.thisDeviceText}>This device</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.sessionMeta}>
                          {formatRelativeTime(session.lastActiveAt)}
                        </Text>
                      </View>
                      <View style={styles.sessionRight}>
                        <View
                          style={[styles.dot, session.isCurrent ? styles.dotGreen : styles.dotGray]}
                        />
                        {!session.isCurrent && (
                          <Pressable
                            hitSlop={12}
                            onPress={() => confirmRevokeOne(session)}
                            disabled={revokeOne.isPending}
                          >
                            {revokeOne.isPending ? (
                              <ActivityIndicator size="small" color="rgba(255,255,255,0.2)" />
                            ) : (
                              <XmarkIcon />
                            )}
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                ))}

                {sessions.length === 0 && (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No active sessions found</Text>
                  </View>
                )}
              </Card>

              {otherSessions.length > 0 && (
                <>
                  <View style={{ height: 10 }} />
                  <TouchableOpacity
                    style={styles.signOutAllBtn}
                    onPress={confirmRevokeAll}
                    activeOpacity={0.8}
                    disabled={revokeAll.isPending}
                  >
                    {revokeAll.isPending ? (
                      <ActivityIndicator color="rgba(255,59,48,0.8)" />
                    ) : (
                      <>
                        <SignOutIcon />
                        <Text style={styles.signOutAllLabel}>Sign Out All Other Devices</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* ── Recent Activity ── */}
            {recentActivity.length > 0 && (
              <View style={styles.section}>
                <SectionLabel>Recent Activity</SectionLabel>
                <Card>
                  {recentActivity.map((entry: ActivityEntry, i) => (
                    <View key={entry.id}>
                      {i > 0 && <View style={styles.rowDivider} />}
                      <View style={styles.activityRow}>
                        <View style={styles.activityDotWrap}>
                          <View style={[styles.dot, styles.dotGreen, { marginTop: 4 }]} />
                        </View>
                        <View style={styles.activityBody}>
                          <Text style={styles.activityTitle}>{friendlyAction(entry.action)}</Text>
                          <Text style={styles.activityTime}>
                            {[formatActivityTime(entry.createdAt), entry.ipAddress]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backLabel: {
    ...type.subhead,
    color: "rgba(255,255,255,0.65)",
  },
  pageTitle: {
    ...type.headline,
    color: colors.text1,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    zIndex: -1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: 8,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  errorWrap: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    ...type.subhead,
    color: "rgba(255,255,255,0.35)",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.md,
  },
  retryLabel: {
    ...type.callout,
    color: "rgba(255,255,255,0.6)",
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    ...type.callout,
    color: colors.text1,
    fontWeight: "500",
  },
  rowTitleRed: {
    color: "rgba(255,59,48,0.9)",
  },
  rowSub: {
    ...type.footnote,
    color: colors.text3,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeGreen: { backgroundColor: "rgba(52,199,89,0.15)" },
  badgeGray: { backgroundColor: "rgba(255,255,255,0.08)" },
  badgeAmber: { backgroundColor: "rgba(255,179,64,0.12)" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeTextGreen: { color: "rgba(52,199,89,0.9)" },
  badgeTextGray: { color: "rgba(255,255,255,0.35)" },
  badgeTextAmber: { color: "rgba(255,179,64,0.85)" },
  mfaRiskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,59,48,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.16)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  mfaRiskIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,59,48,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mfaRiskBody: { flex: 1 },
  mfaRiskTitle: {
    ...type.callout,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    marginBottom: 3,
  },
  mfaRiskSub: {
    ...type.footnote,
    color: "rgba(255,255,255,0.35)",
    lineHeight: 16,
  },
  enableMfaBtn: {
    margin: 12,
    height: 46,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  enableMfaBtnText: {
    ...type.callout,
    color: "#000",
    fontWeight: "600",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sessionDeviceIcon: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  sessionBody: { flex: 1 },
  sessionNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 3,
    flexWrap: "wrap",
  },
  sessionName: {
    ...type.callout,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  sessionNameDim: {
    color: "rgba(255,255,255,0.5)",
  },
  thisDeviceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: "rgba(52,199,89,0.12)",
    borderRadius: 10,
  },
  thisDeviceText: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(52,199,89,0.85)",
    letterSpacing: 0.2,
  },
  sessionMeta: {
    ...type.footnote,
    color: "rgba(255,255,255,0.3)",
  },
  sessionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGreen: {
    backgroundColor: "#34C759",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  dotGray: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyText: {
    ...type.footnote,
    color: "rgba(255,255,255,0.25)",
  },
  signOutAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,59,48,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.16)",
    borderRadius: 18,
    paddingVertical: 14,
  },
  signOutAllLabel: {
    ...type.callout,
    color: "rgba(255,59,48,0.85)",
    fontWeight: "500",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  activityDotWrap: {
    width: 36,
    alignItems: "center",
  },
  activityBody: { flex: 1 },
  activityTitle: {
    ...type.callout,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    marginBottom: 3,
  },
  activityTime: {
    ...type.footnote,
    color: "rgba(255,255,255,0.3)",
  },
})
