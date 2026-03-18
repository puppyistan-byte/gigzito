import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

const RESEND_COOLDOWN = 30;

export default function MfaScreen() {
  const { verifyMfa, resendMfaCode } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState("");
  const inputRefs = useRef<TextInput[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    setResendCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await verifyMfa(email, fullCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message || "Invalid code. Try again.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendStatus("");
    setError("");
    try {
      await resendMfaCode(email);
      setResendStatus("Code resent! Check your email.");
      startCooldown(RESEND_COOLDOWN);
    } catch (e: any) {
      const wait = e.waitSeconds;
      if (wait) {
        startCooldown(wait);
        setError(`Please wait ${wait}s before resending.`);
      } else {
        setError(e.message || "Failed to resend code.");
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Feather name="shield" size={32} color={Colors.teal} />
        </View>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{"\n"}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <View style={styles.codeRow}>
          {code.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(r) => { if (r) inputRefs.current[idx] = r; }}
              value={digit}
              onChangeText={(v) => handleChange(v, idx)}
              onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, idx)}
              keyboardType="number-pad"
              maxLength={1}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              selectionColor={Colors.accent}
            />
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {resendStatus && !error ? (
          <View style={styles.successBox}>
            <Feather name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.successText}>{resendStatus}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label="Verify"
          onPress={handleVerify}
          loading={loading}
          disabled={loading || code.join("").length < 6}
        />

        <Pressable onPress={handleResend} disabled={resendCooldown > 0} style={styles.resendBtn}>
          <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't get a code? Resend"}
          </Text>
        </Pressable>

        <Text style={styles.expiry}>Code expires in 10 minutes</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darker,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
    paddingBottom: 60,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${Colors.teal}22`,
    borderWidth: 1,
    borderColor: `${Colors.teal}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginTop: -8,
  },
  emailHighlight: {
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  codeRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  codeInput: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    textAlign: "center",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  codeInputFilled: {
    borderColor: Colors.accent,
    backgroundColor: `${Colors.accent}15`,
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
  resendBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  resendText: {
    color: Colors.accent,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  resendTextDisabled: {
    color: Colors.textMuted,
  },
  expiry: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -8,
  },
});
