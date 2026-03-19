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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
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

          <View style={styles.iconWrap}>
            <Feather name="mail" size={30} color={Colors.accent} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your account email and we'll send you a link to reset your password.
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <Feather name="check-circle" size={18} color={Colors.success} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.successTitle}>Check your inbox</Text>
                <Text style={styles.successText}>
                  If an account exists for <Text style={styles.emailBold}>{email}</Text>, you'll receive a reset link shortly. Check your spam folder too.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                label="Email Address"
                icon="mail"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <PrimaryButton
                label="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
              />
            </>
          )}

          <Pressable
            onPress={() => router.push("/auth/reset-password")}
            style={styles.manualLink}
          >
            <Feather name="key" size={14} color={Colors.textMuted} />
            <Text style={styles.manualLinkText}>Already have a reset token?</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back to Sign In</Text>
          </Pressable>
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
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${Colors.success}44`,
    padding: 16,
  },
  successTitle: {
    color: Colors.success,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  successText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  emailBold: {
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  manualLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 6,
  },
  manualLinkText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  backLinkText: {
    color: Colors.accent,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
