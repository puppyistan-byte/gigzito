import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

type Props = {
  item: any;
  open: boolean;
  onClose: () => void;
};

export function InquireModal({ item, open, onClose }: Props) {
  const { apiRequest, user } = useAuth();

  const [firstName, setFirstName] = useState(
    user?.displayName?.split(" ")[0] ?? user?.username ?? ""
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setSuccess(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Resolve IDs from the item — handle multiple possible shapes
    const videoId =
      item.videoId ??
      item.listingId ??
      item.listing_id ??
      item.id ??
      null;

    const creatorUserId =
      item.provider?.userId ??
      item.provider?.id ??
      item.userId ??
      item.creatorUserId ??
      item.providerId ??
      null;

    const category = item.vertical ?? item.category ?? item.niche ?? undefined;

    try {
      await apiRequest("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          videoId:       videoId ? Number(videoId) : undefined,
          creatorUserId: creatorUserId ? Number(creatorUserId) : undefined,
          firstName:     firstName.trim(),
          email:         email.trim() || null,
          videoTitle:    item.title ?? undefined,
          category,
          viewerUsername: user?.username ?? undefined,
        }),
      });
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheet}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {item.ctaType === "Join Event"   ? "Join Event"  :
                   item.ctaType === "Book Service" ? "Book Now"    :
                   item.ctaType === "Join Guild"   ? "Join Guild"  :
                   "Inquire"}
                </Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <Feather name="x" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {success ? (
              <View style={styles.successBox}>
                <Feather name="check-circle" size={40} color={Colors.success} />
                <Text style={styles.successTitle}>Request Sent!</Text>
                <Text style={styles.successText}>
                  The creator will be in touch shortly.
                  {email.trim() ? `\n\nWe'll reach you at ${email.trim()}.` : ""}
                </Text>
                <Pressable onPress={handleClose} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Your first name"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Email (optional)</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color={Colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={loading}
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                >
                  <Text style={styles.submitBtnText}>
                    {loading ? "Sending…" : "Send Inquiry"}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  content: { padding: 20, gap: 16 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    maxWidth: 260,
  },
  closeBtn: { padding: 4 },
  form: { gap: 14 },
  field: { gap: 6 },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
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
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  successTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  successText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  doneBtn: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
