import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={styles.ruleRow}>
      <Feather
        name={met ? "check-circle" : "circle"}
        size={13}
        color={met ? Colors.success : Colors.textMuted}
      />
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
    </View>
  );
}

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const { token: paramToken } = useLocalSearchParams<{ token?: string }>();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [token, setToken] = useState(paramToken ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = token.trim() && hasLength && hasUpper && hasNumber && matches;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await resetPassword(token.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </Pressable>

          {done ? (
            <View style={styles.successState}>
              <View style={styles.successIcon}>
                <Feather name="check-circle" size={36} color={Colors.success} />
              </View>
              <Text style={styles.title}>Password Updated!</Text>
              <Text style={styles.subtitle}>
                Your password has been changed successfully. You can now sign in with your new password.
              </Text>
              <PrimaryButton
                label="Sign In"
                onPress={() => router.replace("/auth/login")}
              />
            </View>
          ) : (
            <>
              <View style={styles.iconWrap}>
                <Feather name="lock" size={30} color={Colors.accent} />
              </View>
              <Text style={styles.title}>Set New Password</Text>
              <Text style={styles.subtitle}>
                Paste the reset token from your email and choose a new password.
              </Text>

              <TextInput
                label="Reset Token"
                icon="key"
                value={token}
                onChangeText={(t) => { setToken(t); setError(""); }}
                placeholder="Paste token from email"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                label="New Password"
                icon="lock"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                placeholder="At least 8 characters"
                isPassword
                returnKeyType="next"
              />

              <TextInput
                label="Confirm Password"
                icon="lock"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setError(""); }}
                placeholder="Repeat new password"
                isPassword
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              <View style={styles.rulesBox}>
                <PasswordRule met={hasLength} label="At least 8 characters" />
                <PasswordRule met={hasUpper}  label="One uppercase letter" />
                <PasswordRule met={hasNumber} label="One number" />
                <PasswordRule met={matches}   label="Passwords match" />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <PrimaryButton
                label="Update Password"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || !canSubmit}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darker },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
    justifyContent: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: `${Colors.accent}18`,
    borderWidth: 1,
    borderColor: `${Colors.accent}33`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginTop: -8,
  },
  rulesBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 8,
    marginTop: -8,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ruleText: {
    color: Colors.textMuted,
    fontSize: 13,
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
  successState: {
    gap: 20,
    alignItems: "flex-start",
  },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: `${Colors.success}18`,
    borderWidth: 1,
    borderColor: `${Colors.success}33`,
    alignItems: "center",
    justifyContent: "center",
  },
});
