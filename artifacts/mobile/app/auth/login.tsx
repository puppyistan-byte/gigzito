import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
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

const logo = require("@/assets/images/gigzito-logo.png");

export default function LoginScreen() {
  const { login, resendVerification } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setEmailNotVerified(false);
    setVerificationSent(false);
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result.mfaRequired) {
        router.push({ pathname: "/auth/mfa", params: { email: result.email || email } });
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      if (e.emailNotVerified) {
        setEmailNotVerified(true);
        setError("Your email isn't verified yet. Check your inbox or resend the link below.");
      } else {
        setError(e.message || "Login failed. Check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setResendingVerification(true);
    try {
      await resendVerification(email.trim().toLowerCase());
      setVerificationSent(true);
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to resend verification email.");
    } finally {
      setResendingVerification(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.form}>
            <View style={styles.formHeader}>
              <Text style={styles.title}>Sign In</Text>
              <View style={styles.titleUnderline} />
            </View>

            <View style={styles.fields}>
              <TextInput
                label="Email"
                icon="mail"
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailNotVerified(false); setVerificationSent(false); setError(""); }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextInput
                label="Password"
                icon="lock"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                isPassword
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {verificationSent ? (
              <View style={styles.successBox}>
                <Feather name="check-circle" size={14} color={Colors.success} />
                <Text style={styles.successText}>
                  Verification email sent! Check your inbox and click the link, then sign in.
                </Text>
              </View>
            ) : null}

            {emailNotVerified && !verificationSent ? (
              <Pressable
                onPress={handleResendVerification}
                disabled={resendingVerification}
                style={styles.resendVerifyBtn}
              >
                <Feather name="send" size={14} color={Colors.accent} />
                <Text style={styles.resendVerifyText}>
                  {resendingVerification ? "Sending…" : "Resend verification email"}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => router.push("/auth/forgot-password")}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot your password?</Text>
            </Pressable>

            <PrimaryButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginBtn}
            />

            <Pressable onPress={() => Linking.openURL("https://gigzito.com/auth")}>
              <Text style={styles.hint}>
                Need an account?{" "}
                <Text style={styles.hintAccent}>Register on gigzito.com</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darker,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 32,
  },
  logoSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  logo: {
    width: 467,
    height: 200,
  },
  form: {
    gap: 20,
  },
  formHeader: {
    gap: 6,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  fields: {
    gap: 14,
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
  resendVerifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: `${Colors.accent}15`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.accent}44`,
  },
  resendVerifyText: {
    color: Colors.accent,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  loginBtn: {
    marginTop: 4,
  },
  forgotBtn: {
    alignItems: "flex-end",
    marginTop: -8,
  },
  forgotText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  hintAccent: {
    color: Colors.accent,
    fontFamily: "Inter_500Medium",
  },
});
