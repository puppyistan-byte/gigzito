import React, { useEffect, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

export default function EditProfileScreen() {
  const { profile, apiRequest, refreshMe } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("/api/profile/me", {
        method: "PUT",
        body: JSON.stringify({ username, displayName, bio, avatarUrl }),
      });
      await refreshMe();
      qc.invalidateQueries({ queryKey: ["profile"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    } catch (e: any) {
      setError(e.message || "Failed to update profile");
    }
    setLoading(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fields}>
          <TextInput
            label="Display Name"
            icon="user"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
          />
          <TextInput
            label="Username"
            icon="at-sign"
            value={username}
            onChangeText={setUsername}
            placeholder="yourhandle"
            autoCapitalize="none"
          />
          <TextInput
            label="Avatar URL"
            icon="image"
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://..."
            keyboardType="url"
            autoCapitalize="none"
          />
          <View style={styles.bioField}>
            <Text style={styles.bioLabel}>Bio</Text>
            <View style={styles.bioWrapper}>
              <Text style={styles.bioInput} onPress={() => {}}>
                {/* Textarea simulation */}
              </Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell your story..."
                multiline
                containerStyle={{ flex: 1 }}
                style={{ minHeight: 100, textAlignVertical: "top" } as any}
              />
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Feather name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.successText}>Profile updated!</Text>
          </View>
        ) : null}

        <PrimaryButton label="Save Changes" onPress={handleSave} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  title: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },
  fields: { gap: 14 },
  bioField: { gap: 6 },
  bioLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginLeft: 2,
  },
  bioWrapper: { flex: 1 },
  bioInput: {},
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
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
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
  successText: { color: Colors.success, fontSize: 13, fontFamily: "Inter_400Regular" },
});
