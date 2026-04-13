import React, { useState } from "react";
import {
  Image,
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
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

const BASE_URL = "https://www.gigzito.com";
const logo = require("@/assets/images/gigzito-logo.png");

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleRegister = async () => {
    setError("");
    if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const usernameRe = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRe.test(username.trim())) {
      setError("Username must be 3–30 characters and contain only letters, numbers, or underscores.");
      return;
    }

    if (!disclaimerAccepted) {
      setError("You must accept the participation disclaimer to register.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
          disclaimerAccepted: true,
        }),
      });
      const data = await res.json().catch(() => ({ message: "Registration failed." }));
      if (!res.ok) {
        setError(data.message || "Registration failed. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.successScreen}>
          <View style={styles.successIconWrap}>
            <Feather name="mail" size={40} color={Colors.accent} />
          </View>
          <Text style={styles.successTitle}>Check your inbox!</Text>
          <Text style={styles.successBody}>
            We've sent a verification email to{"\n"}
            <Text style={styles.successEmail}>{email.trim().toLowerCase()}</Text>
            {"\n\n"}Click the link in the email to activate your account, then sign in.
          </Text>
          <PrimaryButton
            label="Back to Sign In"
            onPress={() => router.replace("/auth/login")}
            style={styles.successBtn}
          />
        </View>
      </View>
    );
  }

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
              <Text style={styles.title}>Create Account</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.subtitle}>Join the Gigzito community</Text>
            </View>

            <View style={styles.fields}>
              <TextInput
                label="Display Name"
                icon="user"
                value={displayName}
                onChangeText={(t) => { setDisplayName(t); setError(""); }}
                placeholder="Your full name"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextInput
                label="Username"
                icon="at-sign"
                value={username}
                onChangeText={(t) => { setUsername(t); setError(""); }}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextInput
                label="Email"
                icon="mail"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
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
                onChangeText={(t) => { setPassword(t); setError(""); }}
                placeholder="Min. 8 characters"
                isPassword
                returnKeyType="next"
              />
              <TextInput
                label="Confirm Password"
                icon="lock"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                placeholder="Repeat your password"
                isPassword
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>

            <Pressable
              style={styles.disclaimerRow}
              onPress={() => { setDisclaimerAccepted((v) => !v); setError(""); }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: disclaimerAccepted }}
            >
              <View style={[styles.checkbox, disclaimerAccepted && styles.checkboxChecked]}>
                {disclaimerAccepted && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.disclaimerText}>
                I agree to Gigzito's{" "}
                <Text
                  style={styles.disclaimerLink}
                  onPress={() => {
                    const { Linking } = require("react-native");
                    Linking.openURL("https://gigzito.com/terms");
                  }}
                >
                  Terms of Service
                </Text>
                {" "}and{" "}
                <Text
                  style={styles.disclaimerLink}
                  onPress={() => {
                    const { Linking } = require("react-native");
                    Linking.openURL("https://gigzito.com/privacy");
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label="Create Account"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.registerBtn}
            />

            <Pressable onPress={() => router.replace("/auth/login")}>
              <Text style={styles.hint}>
                Already have an account?{" "}
                <Text style={styles.hintAccent}>Sign In</Text>
              </Text>
            </Pressable>
          </View>
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
    justifyContent: "center",
    gap: 32,
  },
  logoSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  logo: { width: 467, height: 200 },
  form: { gap: 20 },
  formHeader: { gap: 6 },
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
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  fields: { gap: 14 },
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
  registerBtn: { marginTop: 4 },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  disclaimerText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  disclaimerLink: {
    color: Colors.accent,
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
  successScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.accent}15`,
    borderWidth: 1,
    borderColor: `${Colors.accent}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  successBody: {
    color: Colors.textMuted,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  successEmail: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  successBtn: { width: "100%", marginTop: 8 },
});
