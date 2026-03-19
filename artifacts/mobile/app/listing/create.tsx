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
import * as Haptics from "expo-haptics";
import { useCreateListing } from "@/hooks/useApi";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

const CATEGORIES = [
  "MARKETING", "SOCIAL", "MUSIC", "EVENTS", "BUSINESS",
  "COURSES", "PRODUCTS", "CRYPTO", "ARTS", "INFLUENCER",
];

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.catWrap}>
      {CATEGORIES.map((cat) => (
        <Pressable
          key={cat}
          onPress={() => { Haptics.selectionAsync(); onChange(cat); }}
          style={[s.catPill, value === cat && s.catPillActive]}
        >
          <Text style={[s.catPillText, value === cat && s.catPillTextActive]}>
            {cat.charAt(0) + cat.slice(1).toLowerCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function CreateListingScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { mutateAsync: createListing, isPending } = useCreateListing();

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl]     = useState("");
  const [category, setCategory]     = useState("");
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setError("");
    try {
      const result = await createListing({
        title:       title.trim(),
        description: description.trim() || undefined,
        videoUrl:    videoUrl.trim()    || undefined,
        category:    category           || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => {
        if (result?.id) router.replace(`/listing/${result.id}`);
        else router.back();
      }, 900);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message || "Failed to create listing");
    }
  };

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
        <View style={s.titleWrap}>
          <View style={s.redDot}>
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
        {/* Video URL */}
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Feather name="link" size={14} color={Colors.accent} />
            <Text style={s.panelTitle}>Video Link</Text>
          </View>
          <View style={s.panelBody}>
            <TextInput
              label="Video URL"
              icon="video"
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://youtube.com/watch?v=... or direct MP4"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={s.hint}>
              Paste a YouTube, Vimeo, TikTok, or direct video link
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Feather name="file-text" size={14} color={Colors.accent} />
            <Text style={s.panelTitle}>Details</Text>
          </View>
          <View style={s.panelBody}>
            <TextInput
              label="Title"
              icon="type"
              value={title}
              onChangeText={setTitle}
              placeholder="Give your video a title"
            />
            <View style={s.descWrap}>
              <Text style={s.fieldLabel}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Tell people what this video is about…"
                multiline
                containerStyle={s.descContainer}
                style={{ minHeight: 100, textAlignVertical: "top" } as any}
              />
            </View>
          </View>
        </View>

        {/* Category */}
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Feather name="grid" size={14} color={Colors.accent} />
            <Text style={s.panelTitle}>Category</Text>
          </View>
          <View style={s.panelBody}>
            <CategoryPicker value={category} onChange={setCategory} />
          </View>
        </View>

        {/* Error / Success */}
        {error ? (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color={Colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={s.successBox}>
            <Feather name="check-circle" size={14} color={Colors.success} />
            <Text style={s.successText}>Video posted!</Text>
          </View>
        ) : null}

        <PrimaryButton
          label="Post Video"
          onPress={handleSubmit}
          loading={isPending}
          disabled={isPending}
        />

        <Text style={s.footNote}>
          Your video will appear in the Gigzito feed once posted.
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
  titleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  redDot: {
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
  panelTitle: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  panelBody: { padding: 16, gap: 12 },

  hint: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  descWrap: { gap: 4 },
  descContainer: { flex: 1 },

  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catPill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.darker, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  catPillActive: { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent },
  catPillText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_500Medium" },
  catPillTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },

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

  footNote: {
    color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular",
    textAlign: "center", paddingBottom: 8,
  },
});
