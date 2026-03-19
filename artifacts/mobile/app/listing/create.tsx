import React, { useState } from "react";
import {
  ActivityIndicator,
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
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

const API_BASE = "https://www.gigzito.com";

const VERTICALS = [
  "MARKETING", "COACHING", "COURSES", "MUSIC", "CRYPTO",
  "INFLUENCER", "PRODUCTS", "FLASH_SALE", "FLASH_COUPON",
  "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS", "FOR_SALE",
];

const VERTICAL_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  COACHING: "Coaching",
  COURSES: "Courses",
  MUSIC: "Music",
  CRYPTO: "Crypto",
  INFLUENCER: "Influencer",
  PRODUCTS: "Products",
  FLASH_SALE: "Flash Sale",
  FLASH_COUPON: "Flash Coupon",
  MUSIC_GIGS: "Music Gigs",
  EVENTS: "Events",
  CORPORATE_DEALS: "Corporate Deals",
  FOR_SALE: "For Sale",
};

const CTA_TYPES = ["Visit Offer", "Shop Product", "Join Event", "Book Service", "Join Guild"];

function Section({ title, icon, children }: {
  title: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode;
}) {
  return (
    <View style={s.panel}>
      <View style={s.panelHeader}>
        <View style={s.panelIconWrap}>
          <Feather name={icon} size={13} color={Colors.danger} />
        </View>
        <Text style={s.panelTitle}>{title}</Text>
      </View>
      <View style={s.panelBody}>{children}</View>
    </View>
  );
}

function VerticalPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.pillWrap}>
      {VERTICALS.map((v) => (
        <Pressable
          key={v}
          onPress={() => { Haptics.selectionAsync(); onChange(v); }}
          style={[s.pill, value === v && s.pillActive]}
        >
          <Text style={[s.pillText, value === v && s.pillTextActive]}>
            {VERTICAL_LABELS[v]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function CreateListingScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const qc = useQueryClient();

  const [sourceTab, setSourceTab] = useState<"device" | "url">("url");
  const [videoUrl, setVideoUrl]   = useState("");
  const [pickedFileName, setPickedFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done">("idle");

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [vertical, setVertical]     = useState("");
  const [tags, setTags]             = useState("");
  const [ctaType, setCtaType]       = useState("");
  const [ctaUrl, setCtaUrl]         = useState("");
  const [ctaLabel, setCtaLabel]     = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState<number | null>(null);

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Camera roll permission is required to pick a video.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setPickedFileName(asset.fileName ?? asset.uri.split("/").pop() ?? "video.mp4");
    setUploadProgress("uploading");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName ?? "video.mp4",
        type: asset.mimeType ?? "video/mp4",
      } as any);

      const res = await fetch(`${API_BASE}/api/upload/video`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setVideoUrl(data.url);
      setUploadProgress("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setUploadProgress("idle");
      setError(e.message || "Upload failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!vertical)     { setError("Category is required"); return; }
    if (!videoUrl.trim()) { setError("A video URL or uploaded file is required"); return; }

    setError("");
    setSubmitting(true);

    try {
      const body: Record<string, any> = {
        title:    title.trim(),
        vertical,
        postType: "VIDEO",
        videoUrl: videoUrl.trim(),
      };
      if (description.trim()) body.description = description.trim();
      if (tags.trim()) body.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (ctaType) {
        body.ctaType  = ctaType;
        if (ctaUrl.trim())   body.ctaUrl   = ctaUrl.trim();
        if (ctaLabel.trim()) body.ctaLabel = ctaLabel.trim();
      }

      const res = await fetch(`${API_BASE}/api/listings/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Submission failed");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["listings", "mine"] });
      qc.invalidateQueries({ queryKey: ["listings"] });

      setSuccess(data.listingId);
      setTimeout(() => {
        if (data.listingId) router.replace(`/listing/${data.listingId}`);
        else router.back();
      }, 1200);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={[s.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 }]}>
        <View style={s.successIcon}>
          <Feather name="check" size={32} color="#fff" />
        </View>
        <Text style={s.successTitle}>Video Posted!</Text>
        <Text style={s.successSub}>Your video is live and being scanned by Bif AI. Going to your listing…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.titleRow}>
          <View style={s.redIcon}>
            <Feather name="video" size={14} color="#fff" />
          </View>
          <Text style={s.screenTitle}>Add Video</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Source tabs */}
        <Section title="Video Source" icon="film">
          <View style={s.tabs}>
            <Pressable
              onPress={() => { setSourceTab("device"); setVideoUrl(""); setPickedFileName(""); setUploadProgress("idle"); }}
              style={[s.tab, sourceTab === "device" && s.tabActive]}
            >
              <Feather name="upload" size={14} color={sourceTab === "device" ? Colors.danger : Colors.textMuted} />
              <Text style={[s.tabText, sourceTab === "device" && s.tabTextActive]}>Upload from device</Text>
            </Pressable>
            <Pressable
              onPress={() => { setSourceTab("url"); setVideoUrl(""); setPickedFileName(""); setUploadProgress("idle"); }}
              style={[s.tab, sourceTab === "url" && s.tabActive]}
            >
              <Feather name="link" size={14} color={sourceTab === "url" ? Colors.danger : Colors.textMuted} />
              <Text style={[s.tabText, sourceTab === "url" && s.tabTextActive]}>Paste a URL</Text>
            </Pressable>
          </View>

          {sourceTab === "device" ? (
            <View style={s.uploadArea}>
              {uploadProgress === "idle" ? (
                <Pressable onPress={pickVideo} style={s.pickBtn}>
                  <Feather name="plus-circle" size={28} color={Colors.danger} />
                  <Text style={s.pickBtnText}>Choose video from camera roll</Text>
                  <Text style={s.pickBtnSub}>MP4 · MOV · WebM · max 60 sec · 200 MB</Text>
                </Pressable>
              ) : uploadProgress === "uploading" ? (
                <View style={s.uploadingWrap}>
                  <ActivityIndicator color={Colors.danger} size="large" />
                  <Text style={s.uploadingText}>Uploading {pickedFileName}…</Text>
                </View>
              ) : (
                <View style={s.uploadedWrap}>
                  <Feather name="check-circle" size={20} color={Colors.success} />
                  <Text style={s.uploadedText}>{pickedFileName} uploaded</Text>
                  <Pressable onPress={() => { setUploadProgress("idle"); setVideoUrl(""); setPickedFileName(""); }}>
                    <Text style={s.rePickText}>Change</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View>
              <TextInput
                label="Video URL"
                icon="link"
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="https://youtube.com/shorts/... or tiktok.com/@..."
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={s.urlHint}>YouTube Shorts · TikTok · Instagram Reels · Vimeo · direct MP4</Text>
            </View>
          )}
        </Section>

        {/* Details */}
        <Section title="Details" icon="file-text">
          <TextInput
            label="Title *"
            icon="type"
            value={title}
            onChangeText={setTitle}
            placeholder="Give your video a compelling title"
          />
          <View>
            <Text style={s.fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Tell people what this is about…"
              multiline
              containerStyle={{ flex: 1 }}
              style={{ minHeight: 90, textAlignVertical: "top" } as any}
            />
          </View>
          <TextInput
            label="Tags"
            icon="tag"
            value={tags}
            onChangeText={setTags}
            placeholder="music, hiphop, events (comma separated)"
            autoCapitalize="none"
          />
        </Section>

        {/* Category */}
        <Section title="Category *" icon="grid">
          <VerticalPicker value={vertical} onChange={setVertical} />
        </Section>

        {/* CTA (optional) */}
        <Section title="Call to Action (optional)" icon="external-link">
          <View style={s.pillWrap}>
            {["", ...CTA_TYPES].map((type) => (
              <Pressable
                key={type || "none"}
                onPress={() => { Haptics.selectionAsync(); setCtaType(type); }}
                style={[s.pill, ctaType === type && s.pillActive]}
              >
                <Text style={[s.pillText, ctaType === type && s.pillTextActive]}>
                  {type || "None"}
                </Text>
              </Pressable>
            ))}
          </View>
          {ctaType ? (
            <View style={{ gap: 10, marginTop: 4 }}>
              <TextInput
                label="Button URL"
                icon="link"
                value={ctaUrl}
                onChangeText={setCtaUrl}
                placeholder="https://..."
                keyboardType="url"
                autoCapitalize="none"
              />
              <TextInput
                label="Button Label"
                icon="edit-2"
                value={ctaLabel}
                onChangeText={setCtaLabel}
                placeholder={ctaType}
              />
            </View>
          ) : null}
        </Section>

        {/* Error */}
        {error ? (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color={Colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label="Post Video"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || uploadProgress === "uploading"}
        />

        <Text style={s.footNote}>
          Videos uploaded from your device are scanned by Bif AI before going live.
        </Text>
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
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  redIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: "center", justifyContent: "center",
  },
  screenTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: "Inter_700Bold" },

  scroll: { paddingHorizontal: 16, paddingBottom: 60, gap: 14 },

  panel: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  panelIconWrap: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: `${Colors.danger}18`,
    alignItems: "center", justifyContent: "center",
  },
  panelTitle: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  panelBody: { padding: 16, gap: 12 },

  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.darker, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  tabActive: { borderColor: Colors.danger, backgroundColor: `${Colors.danger}12` },
  tabText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_500Medium" },
  tabTextActive: { color: Colors.danger, fontFamily: "Inter_600SemiBold" },

  uploadArea: {
    borderRadius: 12, borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderStyle: "dashed", overflow: "hidden",
  },
  pickBtn: {
    alignItems: "center", gap: 8, padding: 24,
    backgroundColor: `${Colors.danger}08`,
  },
  pickBtnText: { color: Colors.textPrimary, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickBtnSub:  { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  uploadingWrap: { alignItems: "center", gap: 10, padding: 24 },
  uploadingText: { color: Colors.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular" },
  uploadedWrap: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 16,
    backgroundColor: `${Colors.success}12`,
  },
  uploadedText: { flex: 1, color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_500Medium" },
  rePickText: { color: Colors.accent, fontSize: 13, fontFamily: "Inter_500Medium" },

  urlHint: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.darker, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  pillActive: { backgroundColor: `${Colors.danger}18`, borderColor: Colors.danger },
  pillText: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_500Medium" },
  pillTextActive: { color: Colors.danger, fontFamily: "Inter_600SemiBold" },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: `${Colors.danger}15`, borderRadius: 10,
    borderWidth: 1, borderColor: `${Colors.danger}44`, padding: 12,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  footNote: {
    color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.success, alignItems: "center", justifyContent: "center",
  },
  successTitle: { color: Colors.textPrimary, fontSize: 24, fontFamily: "Inter_700Bold" },
  successSub: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
