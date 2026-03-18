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
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result.mfaRequired) {
        router.push({ pathname: "/auth/mfa", params: { email: result.email || email } });
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      setError(e.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
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
                onChangeText={setEmail}
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

            <PrimaryButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginBtn}
            />

            <Pressable onPress={() => Linking.openURL("https://gigzito.com/register")}>
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
  loginBtn: {
    marginTop: 4,
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
