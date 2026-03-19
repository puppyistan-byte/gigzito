import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

function SectionCard({ title, icon, children }: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Feather name={icon} size={16} color={Colors.accent} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={styles.ruleRow}>
      <Feather name={met ? "check-circle" : "circle"} size={12} color={met ? Colors.success : Colors.textMuted} />
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
    </View>
  );
}

export default function SecurityScreen() {
  const { changePassword, resetMfa } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const [mfaLoading, setMfaLoading] = useState(false);

  const hasLength = newPw.length >= 8;
  const hasUpper  = /[A-Z]/.test(newPw);
  const hasNumber = /[0-9]/.test(newPw);
  const matches   = newPw.length > 0 && newPw === confirm;
  const canSave   = current.length > 0 && hasLength && hasUpper && hasNumber && matches;

  const handleChangePassword = async () => {
    if (!canSave) return;
    setPwError("");
    setPwSuccess(false);
    setPwLoading(true);
    try {
      await changePassword(current, newPw);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPwSuccess(true);
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPwError(e.message || "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleResetMfa = () => {
    Alert.alert(
      "Reset MFA",
      "This will disable two-factor authentication on your account. You can set it up again later. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable MFA",
          style: "destructive",
          onPress: async () => {
            setMfaLoading(true);
            try {
              await resetMfa();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("MFA Disabled", "Two-factor authentication has been turned off.");
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to reset MFA.");
            } finally {
              setMfaLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>Security</Text>
              <Text style={styles.screenSubtitle}>Manage your password and two-factor auth</Text>
            </View>
          </View>

          {/* Change Password */}
          <SectionCard title="Change Password" icon="lock">
            <TextInput
              label="Current Password"
              icon="lock"
              value={current}
              onChangeText={(t) => { setCurrent(t); setPwError(""); setPwSuccess(false); }}
              placeholder="Your existing password"
              isPassword
            />
            <TextInput
              label="New Password"
              icon="edit-2"
              value={newPw}
              onChangeText={(t) => { setNewPw(t); setPwError(""); setPwSuccess(false); }}
              placeholder="At least 8 characters"
              isPassword
            />
            <TextInput
              label="Confirm New Password"
              icon="edit-2"
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setPwError(""); setPwSuccess(false); }}
              placeholder="Repeat new password"
              isPassword
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
            />

            <View style={styles.rulesBox}>
              <PasswordRule met={hasLength} label="At least 8 characters" />
              <PasswordRule met={hasUpper}  label="One uppercase letter" />
              <PasswordRule met={hasNumber} label="One number" />
              <PasswordRule met={matches}   label="Passwords match" />
            </View>

            {pwError ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={13} color={Colors.danger} />
                <Text style={styles.errorText}>{pwError}</Text>
              </View>
            ) : null}

            {pwSuccess ? (
              <View style={styles.successBox}>
                <Feather name="check-circle" size={13} color={Colors.success} />
                <Text style={styles.successText}>Password updated successfully!</Text>
              </View>
            ) : null}

            <PrimaryButton
              label="Update Password"
              onPress={handleChangePassword}
              loading={pwLoading}
              disabled={pwLoading || !canSave}
            />
          </SectionCard>

          {/* MFA */}
          <SectionCard title="Two-Factor Authentication" icon="shield">
            <Text style={styles.mfaInfo}>
              Two-factor authentication adds an extra layer of security to your account. You'll be asked for a code when signing in.
            </Text>

            <Pressable
              onPress={handleResetMfa}
              disabled={mfaLoading}
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed, mfaLoading && styles.dangerBtnDisabled]}
            >
              <Feather name="shield-off" size={16} color={Colors.danger} />
              <Text style={styles.dangerBtnText}>
                {mfaLoading ? "Disabling…" : "Disable MFA"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/auth/forgot-password")}
              style={styles.linkBtn}
            >
              <Feather name="mail" size={14} color={Colors.accent} />
              <Text style={styles.linkBtnText}>Forgot password? Send reset email</Text>
            </Pressable>
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 60,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  screenSubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: `${Colors.accent}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  rulesBox: {
    backgroundColor: Colors.darker,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    gap: 7,
    marginTop: -6,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  ruleText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  ruleTextMet: {
    color: Colors.success,
    fontFamily: "Inter_500Medium",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.danger}15`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.danger}44`,
    padding: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.success}44`,
    padding: 12,
  },
  successText: {
    color: Colors.success,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  mfaInfo: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.danger}55`,
    backgroundColor: `${Colors.danger}12`,
    height: 46,
  },
  dangerBtnPressed: { opacity: 0.75 },
  dangerBtnDisabled: { opacity: 0.5 },
  dangerBtnText: {
    color: Colors.danger,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 4,
  },
  linkBtnText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
