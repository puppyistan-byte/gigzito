import React, { useEffect, useState } from "react";
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
import * as Haptics from "expo-haptics";
import { useFullProfile, useUpdateProfile } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

const API_BASE = "https://www.gigzito.com";
function resolveUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

const SOCIAL_FIELDS: {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  placeholder: string;
  color: string;
}[] = [
  { key: "instagramUrl",  label: "Instagram",  icon: "instagram", placeholder: "https://instagram.com/you",  color: "#E1306C" },
  { key: "tiktokUrl",     label: "TikTok",     icon: "music",     placeholder: "https://tiktok.com/@you",    color: "#69C9D0" },
  { key: "youtubeUrl",    label: "YouTube",    icon: "youtube",   placeholder: "https://youtube.com/@you",   color: "#FF0000" },
  { key: "facebookUrl",   label: "Facebook",   icon: "facebook",  placeholder: "https://facebook.com/you",   color: "#1877F2" },
  { key: "twitterUrl",    label: "Twitter / X", icon: "twitter",  placeholder: "https://twitter.com/you",    color: "#1DA1F2" },
  { key: "discordUrl",    label: "Discord",    icon: "message-circle", placeholder: "https://discord.gg/...", color: "#5865F2" },
];

const PHOTO_KEYS = ["photo1Url","photo2Url","photo3Url","photo4Url","photo5Url","photo6Url"];

function PhotoThumb({ uri }: { uri: string }) {
  const resolved = resolveUrl(uri);
  if (!resolved) return (
    <View style={s.thumbPlaceholder}>
      <Feather name="image" size={20} color={Colors.textMuted} />
    </View>
  );
  return <Image source={{ uri: resolved }} style={s.thumb} resizeMode="cover" />;
}

function Section({ title, icon, children }: {
  title: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconWrap}>
          <Feather name={icon} size={13} color={Colors.accent} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

export default function EditGeeZeeScreen() {
  const { refreshMe } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: fullData, isLoading } = useFullProfile();
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile();

  const p = fullData?.profile;

  const [social, setSocial] = useState<Record<string, string>>({
    instagramUrl: "", tiktokUrl: "", youtubeUrl: "",
    facebookUrl: "", twitterUrl: "", discordUrl: "",
  });
  const [photos, setPhotos] = useState<Record<string, string>>({
    photo1Url: "", photo2Url: "", photo3Url: "",
    photo4Url: "", photo5Url: "", photo6Url: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (p) {
      setSocial({
        instagramUrl:  p.instagramUrl  ?? "",
        tiktokUrl:     p.tiktokUrl     ?? "",
        youtubeUrl:    p.youtubeUrl    ?? "",
        facebookUrl:   p.facebookUrl   ?? "",
        twitterUrl:    p.twitterUrl    ?? "",
        discordUrl:    p.discordUrl    ?? "",
      });
      setPhotos({
        photo1Url: p.photo1Url ?? "",
        photo2Url: p.photo2Url ?? "",
        photo3Url: p.photo3Url ?? "",
        photo4Url: p.photo4Url ?? "",
        photo5Url: p.photo5Url ?? "",
        photo6Url: p.photo6Url ?? "",
      });
    }
  }, [p]);

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    try {
      const payload: Record<string, any> = {};
      SOCIAL_FIELDS.forEach(({ key }) => {
        payload[key] = social[key].trim() || null;
      });
      PHOTO_KEYS.forEach((key) => {
        payload[key] = photos[key].trim() || null;
      });
      await updateProfile(payload);
      await refreshMe();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message || "Failed to save GeeZee card");
    }
  };

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topPad, justifyContent: "center" }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.screenTitle}>Edit GeeZee Card</Text>
          <Text style={s.screenSub}>Social links & photo gallery</Text>
        </View>
        <Pressable onPress={handleSave} disabled={saving} style={s.saveBtn}>
          <Text style={[s.saveBtnText, saving && { opacity: 0.5 }]}>
            {saving ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Social Links */}
        <Section title="Social Media Links" icon="share-2">
          {SOCIAL_FIELDS.map(({ key, label, icon, placeholder, color }) => (
            <View key={key} style={s.socialField}>
              <View style={[s.socialIcon, { backgroundColor: `${color}22` }]}>
                <Feather name={icon} size={14} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  label={label}
                  value={social[key]}
                  onChangeText={(v) => setSocial((prev) => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          ))}
        </Section>

        {/* Photo Gallery */}
        <Section title="Photo Gallery (up to 6)" icon="camera">
          <Text style={s.photoHint}>
            Paste image URLs below. These photos appear on your GeeZee card.
          </Text>

          {/* Thumbnail preview row */}
          <View style={s.thumbRow}>
            {PHOTO_KEYS.map((key) => (
              <PhotoThumb key={key} uri={photos[key]} />
            ))}
          </View>

          {PHOTO_KEYS.map((key, i) => (
            <TextInput
              key={key}
              label={`Photo ${i + 1}`}
              icon="image"
              value={photos[key]}
              onChangeText={(v) => setPhotos((prev) => ({ ...prev, [key]: v }))}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ))}
        </Section>

        {error ? (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color={Colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={s.successBox}>
            <Feather name="check-circle" size={14} color={Colors.success} />
            <Text style={s.successText}>GeeZee card updated!</Text>
          </View>
        ) : null}

        <PrimaryButton label="Save GeeZee Card" onPress={handleSave} loading={saving} />

        <Pressable onPress={() => router.push("/profile/edit")} style={s.backLink}>
          <Text style={s.backLinkText}>← Back to Profile Edit</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  screenTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: "Inter_700Bold" },
  screenSub: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" },
  saveBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.accent, borderRadius: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 16, paddingBottom: 60, gap: 16 },
  section: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  sectionIconWrap: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: `${Colors.accent}18`, alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionBody: { padding: 16, gap: 12 },
  socialField: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  socialIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  photoHint: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  thumbRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  thumb: {
    width: 52, height: 52, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  thumbPlaceholder: {
    width: 52, height: 52, borderRadius: 8,
    backgroundColor: Colors.darker, borderWidth: 1,
    borderColor: Colors.surfaceBorder, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: `${Colors.danger}15`, borderRadius: 10,
    borderWidth: 1, borderColor: `${Colors.danger}44`, padding: 12,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  successBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: `${Colors.success}15`, borderRadius: 10,
    borderWidth: 1, borderColor: `${Colors.success}44`, padding: 12,
  },
  successText: { color: Colors.success, fontSize: 13, fontFamily: "Inter_400Regular" },
  backLink: { alignItems: "center", paddingVertical: 8 },
  backLinkText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" },
});
