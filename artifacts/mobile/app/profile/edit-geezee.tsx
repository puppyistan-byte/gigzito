import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMyGeeZeeCard, useSaveGeeZeeCard, useFullProfile, useUpdateProfile } from "@/hooks/useApi";
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
  key: string; label: string;
  icon: keyof typeof Feather.glyphMap;
  placeholder: string; color: string;
}[] = [
  { key: "instagramUrl", label: "Instagram",   icon: "instagram",     placeholder: "https://instagram.com/you",  color: "#E1306C" },
  { key: "tiktokUrl",    label: "TikTok",      icon: "music",         placeholder: "https://tiktok.com/@you",    color: "#69C9D0" },
  { key: "youtubeUrl",   label: "YouTube",     icon: "youtube",       placeholder: "https://youtube.com/@you",   color: "#FF0000" },
  { key: "facebookUrl",  label: "Facebook",    icon: "facebook",      placeholder: "https://facebook.com/you",   color: "#1877F2" },
  { key: "twitterUrl",   label: "Twitter / X", icon: "twitter",       placeholder: "https://twitter.com/you",    color: "#1DA1F2" },
  { key: "discordUrl",   label: "Discord",     icon: "message-circle",placeholder: "https://discord.gg/...",     color: "#5865F2" },
];

const AGE_OPTIONS   = ["18-25", "25-40", "40+"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const INTENT_OPTIONS = [
  { value: "marketing", label: "Marketing" },
  { value: "social",    label: "Social"    },
  { value: "activity",  label: "Activity"  },
];

const MAX_GALLERY = 9;

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

function PillPicker<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T | null; options: { value: T; label: string }[]; onChange: (v: T | null) => void }) {
  return (
    <View style={s.pillGroup}>
      <Text style={s.pillLabel}>{label}</Text>
      <View style={s.pillRow}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable
              key={o.value}
              style={[s.pill, active && s.pillActive]}
              onPress={() => onChange(active ? null : o.value)}
            >
              <Text style={[s.pillText, active && s.pillTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ToggleRow({ label, sub, value, onChange }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.surfaceBorder, true: Colors.accent }}
        thumbColor={Colors.textPrimary}
      />
    </View>
  );
}

function PhotoThumb({ uri }: { uri: string }) {
  const resolved = resolveUrl(uri);
  if (!resolved) return (
    <View style={s.thumbPlaceholder}>
      <Feather name="image" size={18} color={Colors.textMuted} />
    </View>
  );
  return <Image source={{ uri: resolved }} style={s.thumb} resizeMode="cover" />;
}

export default function EditGeeZeeScreen() {
  const { refreshMe } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: cardData, isLoading: cardLoading } = useMyGeeZeeCard();
  const { data: fullData, isLoading: profileLoading } = useFullProfile();
  const { mutateAsync: saveCard, isPending: savingCard } = useSaveGeeZeeCard();
  const { mutateAsync: saveProfile, isPending: savingProfile } = useUpdateProfile();

  const saving = savingCard || savingProfile;

  const p = fullData?.profile;

  const [slogan,    setSlogan]    = useState("");
  const [profilePic,setProfilePic]= useState("");
  const [isPublic,  setIsPublic]  = useState(true);
  const [allowMsg,  setAllowMsg]  = useState(true);
  const [locationEn,setLocationEn]= useState(false);
  const [ageBracket,setAgeBracket]= useState<string | null>(null);
  const [gender,    setGender]    = useState<string | null>(null);
  const [intent,    setIntent]    = useState<string | null>(null);
  const [gallery,   setGallery]   = useState<string[]>(Array(MAX_GALLERY).fill(""));
  const [social,    setSocial]    = useState<Record<string, string>>({
    instagramUrl: "", tiktokUrl: "", youtubeUrl: "",
    facebookUrl: "", twitterUrl: "", discordUrl: "",
  });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (cardData) {
      setSlogan(cardData.slogan ?? "");
      setProfilePic(cardData.profilePic ?? "");
      setIsPublic(cardData.isPublic ?? true);
      setAllowMsg(cardData.allowMessaging ?? true);
      setLocationEn(cardData.locationServicesEnabled ?? false);
      setAgeBracket(cardData.ageBracket ?? null);
      setGender(cardData.gender ?? null);
      setIntent(cardData.intent ?? null);
      const raw: string[] = Array.isArray(cardData.gallery) ? cardData.gallery : [];
      const padded = [...raw, ...Array(MAX_GALLERY).fill("")].slice(0, MAX_GALLERY);
      setGallery(padded);
    }
  }, [cardData]);

  useEffect(() => {
    if (p) {
      setSocial({
        instagramUrl: p.instagramUrl ?? "",
        tiktokUrl:    p.tiktokUrl    ?? "",
        youtubeUrl:   p.youtubeUrl   ?? "",
        facebookUrl:  p.facebookUrl  ?? "",
        twitterUrl:   p.twitterUrl   ?? "",
        discordUrl:   p.discordUrl   ?? "",
      });
    }
  }, [p]);

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    try {
      const galleryClean = gallery.map((u) => u.trim()).filter(Boolean);
      await saveCard({
        slogan:                  slogan.trim() || null,
        profilePic:              profilePic.trim() || null,
        gallery:                 galleryClean,
        isPublic,
        allowMessaging:          allowMsg,
        locationServicesEnabled: locationEn,
        ageBracket:              ageBracket ?? null,
        gender:                  gender     ?? null,
        intent:                  intent     ?? null,
      });
      const socialPayload: Record<string, any> = {};
      SOCIAL_FIELDS.forEach(({ key }) => {
        socialPayload[key] = social[key].trim() || null;
      });
      await saveProfile(socialPayload);
      await refreshMe();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message || "Failed to save GeeZee card");
    }
  };

  if (cardLoading || profileLoading) {
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
          <Text style={s.screenSub}>Your social identity tile</Text>
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
        {/* ── 1. Card Identity ── */}
        <Section title="Card Identity" icon="credit-card">
          <TextInput
            label="Slogan"
            value={slogan}
            onChangeText={setSlogan}
            placeholder="Let's connect and grow together!"
            maxLength={120}
            autoCapitalize="sentences"
          />
          <Text style={s.charCount}>{slogan.length}/120</Text>
          <TextInput
            label="Profile Picture URL"
            icon="image"
            value={profilePic}
            onChangeText={setProfilePic}
            placeholder="https://cdn.example.com/photo.jpg"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {profilePic.trim() ? (
            <Image
              source={{ uri: resolveUrl(profilePic.trim()) ?? "" }}
              style={s.profilePicPreview}
              resizeMode="cover"
            />
          ) : null}
        </Section>

        {/* ── 2. Privacy & Discovery ── */}
        <Section title="Privacy & Discovery" icon="shield">
          <ToggleRow
            label="Public Card"
            sub="Visible in the GeeZee browse directory"
            value={isPublic}
            onChange={setIsPublic}
          />
          <View style={s.divider} />
          <ToggleRow
            label="Allow Messaging"
            sub="Let others send you DMs from your card"
            value={allowMsg}
            onChange={setAllowMsg}
          />
          <View style={s.divider} />
          <ToggleRow
            label="Location Services"
            sub="Enable geo-based matching features"
            value={locationEn}
            onChange={setLocationEn}
          />
        </Section>

        {/* ── 3. About You ── */}
        <Section title="About You" icon="user">
          <PillPicker
            label="Age Bracket"
            value={ageBracket}
            options={AGE_OPTIONS.map((v) => ({ value: v, label: v }))}
            onChange={setAgeBracket}
          />
          <PillPicker
            label="Gender"
            value={gender}
            options={GENDER_OPTIONS.map((v) => ({ value: v, label: v }))}
            onChange={setGender}
          />
          <PillPicker
            label="Intent"
            value={intent}
            options={INTENT_OPTIONS}
            onChange={setIntent}
          />
        </Section>

        {/* ── 4. Photo Gallery ── */}
        <Section title={`Photo Gallery (up to ${MAX_GALLERY})`} icon="camera">
          <Text style={s.hint}>
            Paste image URLs below. These photos appear on your GeeZee card.
          </Text>
          <View style={s.thumbRow}>
            {gallery.map((url, i) => <PhotoThumb key={i} uri={url} />)}
          </View>
          {gallery.map((url, i) => (
            <TextInput
              key={i}
              label={`Photo ${i + 1}`}
              icon="image"
              value={url}
              onChangeText={(v) => {
                const next = [...gallery];
                next[i] = v;
                setGallery(next);
              }}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ))}
        </Section>

        {/* ── 5. Social Media Links ── */}
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
  container:        { flex: 1, backgroundColor: Colors.dark },
  topBar:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:          { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  screenTitle:      { color: Colors.textPrimary, fontSize: 18, fontFamily: "Inter_700Bold" },
  screenSub:        { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" },
  saveBtn:          { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.accent, borderRadius: 10 },
  saveBtnText:      { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll:           { paddingHorizontal: 16, paddingBottom: 60, gap: 16 },
  section:          { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: "hidden" },
  sectionHeader:    { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  sectionIconWrap:  { width: 26, height: 26, borderRadius: 7, backgroundColor: `${Colors.accent}18`, alignItems: "center", justifyContent: "center" },
  sectionTitle:     { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionBody:      { padding: 16, gap: 12 },
  charCount:        { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: -8 },
  hint:             { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  profilePicPreview:{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: Colors.accent, alignSelf: "center" },
  divider:          { height: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: -16 },
  toggleRow:        { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel:      { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_500Medium" },
  toggleSub:        { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  pillGroup:        { gap: 8 },
  pillLabel:        { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" },
  pillRow:          { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill:             { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.darker },
  pillActive:       { borderColor: Colors.accent, backgroundColor: `${Colors.accent}22` },
  pillText:         { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_500Medium" },
  pillTextActive:   { color: Colors.accent },
  thumbRow:         { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  thumb:            { width: 52, height: 52, borderRadius: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  thumbPlaceholder: { width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.darker, borderWidth: 1, borderColor: Colors.surfaceBorder, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  socialField:      { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  socialIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  errorBox:         { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${Colors.danger}15`, borderRadius: 10, borderWidth: 1, borderColor: `${Colors.danger}44`, padding: 12 },
  errorText:        { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  successBox:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${Colors.success}15`, borderRadius: 10, borderWidth: 1, borderColor: `${Colors.success}44`, padding: 12 },
  successText:      { color: Colors.success, fontSize: 13, fontFamily: "Inter_400Regular" },
  backLink:         { alignItems: "center", paddingVertical: 8 },
  backLinkText:     { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" },
});
