import React, { useEffect, useState } from "react";
import {
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
import { useAuth } from "@/contexts/AuthContext";
import { useFullProfile, useUpdateProfile, useUpdateAccount } from "@/hooks/useApi";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

const CATEGORIES = [
  "MARKETING", "SOCIAL", "MUSIC", "EVENTS", "BUSINESS",
  "COURSES", "PRODUCTS", "CRYPTO", "ARTS", "INFLUENCER",
];

function Section({ title, icon, children }: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
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

export default function EditProfileScreen() {
  const { refreshMe } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: fullData, isLoading } = useFullProfile();
  const { mutateAsync: updateProfile, isPending: savingProfile } = useUpdateProfile();
  const { mutateAsync: updateAccount, isPending: savingAccount } = useUpdateAccount();

  const p = fullData?.profile;
  const acc = fullData?.account;

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [location, setLocation] = useState("");
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [email, setEmail] = useState("");

  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (p) {
      setDisplayName(p.displayName ?? "");
      setUsername(p.username ?? "");
      setBio(p.bio ?? "");
      setAvatarUrl(p.avatarUrl ?? "");
      setLocation(p.location ?? "");
      setPrimaryCategory(p.primaryCategory ?? "");
      setContactEmail(p.contactEmail ?? "");
      setContactPhone(p.contactPhone ?? "");
      setContactTelegram(p.contactTelegram ?? "");
      setWebsiteUrl(p.websiteUrl ?? "");
      setShowPhone(p.showPhone ?? false);
      setInstagramUrl(p.instagramUrl ?? "");
      setTiktokUrl(p.tiktokUrl ?? "");
      setYoutubeUrl(p.youtubeUrl ?? "");
      setFacebookUrl(p.facebookUrl ?? "");
      setTwitterUrl(p.twitterUrl ?? "");
      setDiscordUrl(p.discordUrl ?? "");
    }
    if (acc) {
      setEmail(acc.email ?? "");
    }
  }, [p, acc]);

  const saving = savingProfile || savingAccount;

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    try {
      const profileData: Record<string, any> = {
        displayName, username, bio, avatarUrl, location,
        primaryCategory, contactEmail, contactPhone,
        contactTelegram, websiteUrl, showPhone,
        instagramUrl: instagramUrl.trim() || null,
        tiktokUrl:    tiktokUrl.trim()    || null,
        youtubeUrl:   youtubeUrl.trim()   || null,
        facebookUrl:  facebookUrl.trim()  || null,
        twitterUrl:   twitterUrl.trim()   || null,
        discordUrl:   discordUrl.trim()   || null,
      };
      await updateProfile(profileData);

      if (email.trim() && email.trim() !== acc?.email) {
        await updateAccount({ email: email.trim().toLowerCase() });
      }

      await refreshMe();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message || "Failed to save changes");
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
        <Text style={s.screenTitle}>Edit Profile</Text>
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
        {/* Avatar editor */}
        <View style={s.avatarSection}>
          <View style={s.avatarWrap}>
            <Avatar uri={avatarUrl} name={displayName || "?"} size={86} />
            <View style={s.cameraBadge}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
          </View>
          <View style={s.avatarUrlRow}>
            <TextInput
              label="Photo URL"
              icon="image"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://your-photo-url.com/pic.jpg"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={s.avatarUrlInput}
            />
          </View>
        </View>

        {/* Identity */}
        <Section title="Identity" icon="user">
          <TextInput label="Display Name" icon="user" value={displayName}
            onChangeText={setDisplayName} placeholder="Your name" />
          <TextInput label="Username" icon="at-sign" value={username}
            onChangeText={setUsername} placeholder="yourhandle"
            autoCapitalize="none" autoCorrect={false} />
          <View style={s.bioWrap}>
            <Text style={s.fieldLabel}>Bio / Slogan</Text>
            <TextInput value={bio} onChangeText={setBio}
              placeholder="Tell your story…" multiline
              containerStyle={s.bioContainer}
              style={{ minHeight: 90, textAlignVertical: "top" } as any} />
          </View>
        </Section>

        {/* Category */}
        <Section title="Primary Category" icon="grid">
          <CategoryPicker value={primaryCategory} onChange={setPrimaryCategory} />
        </Section>

        {/* Social Media Links */}
        <Section title="Social Media Links" icon="share-2">
          {([
            { key: "instagramUrl", label: "Instagram",    icon: "instagram",      placeholder: "https://instagram.com/you",  color: "#E1306C", value: instagramUrl, onChange: setInstagramUrl },
            { key: "tiktokUrl",    label: "TikTok",       icon: "music",          placeholder: "https://tiktok.com/@you",    color: "#69C9D0", value: tiktokUrl,    onChange: setTiktokUrl    },
            { key: "youtubeUrl",   label: "YouTube",      icon: "youtube",        placeholder: "https://youtube.com/@you",   color: "#FF0000", value: youtubeUrl,   onChange: setYoutubeUrl   },
            { key: "facebookUrl",  label: "Facebook",     icon: "facebook",       placeholder: "https://facebook.com/you",   color: "#1877F2", value: facebookUrl,  onChange: setFacebookUrl  },
            { key: "twitterUrl",   label: "Twitter / X",  icon: "twitter",        placeholder: "https://twitter.com/you",    color: "#1DA1F2", value: twitterUrl,   onChange: setTwitterUrl   },
            { key: "discordUrl",   label: "Discord",      icon: "message-circle", placeholder: "https://discord.gg/...",     color: "#5865F2", value: discordUrl,   onChange: setDiscordUrl   },
          ] as const).map(({ key, label, icon, placeholder, color, value, onChange }) => (
            <View key={key} style={s.socialField}>
              <View style={[s.socialIcon, { backgroundColor: `${color}22` }]}>
                <Feather name={icon as any} size={14} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  label={label}
                  value={value}
                  onChangeText={onChange}
                  placeholder={placeholder}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          ))}
        </Section>

        {/* Location & Contact */}
        <Section title="Location & Contact" icon="map-pin">
          <TextInput label="Location" icon="map-pin" value={location}
            onChangeText={setLocation} placeholder="City, State" />
          <TextInput label="Contact Email" icon="mail" value={contactEmail}
            onChangeText={setContactEmail} placeholder="contact@email.com"
            keyboardType="email-address" autoCapitalize="none" />
          <TextInput label="Contact Phone" icon="phone" value={contactPhone}
            onChangeText={setContactPhone} placeholder="+1 (555) 000-0000"
            keyboardType="phone-pad" />
          <TextInput label="Telegram" icon="send" value={contactTelegram}
            onChangeText={setContactTelegram} placeholder="@yourhandle"
            autoCapitalize="none" />
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Show phone publicly</Text>
              <Text style={s.switchSub}>Display your phone on your GeeZee card</Text>
            </View>
            <Switch
              value={showPhone}
              onValueChange={setShowPhone}
              trackColor={{ false: Colors.surfaceBorder, true: `${Colors.accent}80` }}
              thumbColor={showPhone ? Colors.accent : Colors.textMuted}
            />
          </View>
        </Section>

        {/* Links */}
        <Section title="Website" icon="link">
          <TextInput label="Website URL" icon="globe" value={websiteUrl}
            onChangeText={setWebsiteUrl} placeholder="https://yoursite.com"
            keyboardType="url" autoCapitalize="none" />
        </Section>

        {/* Account email */}
        <Section title="Account Email" icon="mail">
          <TextInput label="Login Email" icon="mail" value={email}
            onChangeText={setEmail} placeholder="you@example.com"
            keyboardType="email-address" autoCapitalize="none" />
          <Text style={s.hint}>Changing this updates your login email.</Text>
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
            <Text style={s.successText}>Profile saved!</Text>
          </View>
        ) : null}

        <PrimaryButton label="Save Changes" onPress={handleSave} loading={saving} style={{ marginTop: 4 }} />

        <Pressable
          onPress={() => router.push("/profile/edit-geezee")}
          style={s.geezeeLink}
        >
          <Feather name="credit-card" size={15} color={Colors.accent} />
          <Text style={s.geezeeLinkText}>Edit GeeZee Card (social links & photos) →</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  screenTitle: {
    flex: 1, color: Colors.textPrimary,
    fontSize: 18, fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.accent, borderRadius: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 16, paddingBottom: 60, gap: 16 },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 8, paddingHorizontal: 4 },
  avatarWrap: { position: "relative" },
  cameraBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.dark,
  },
  avatarUrlRow: { flex: 1 },
  avatarUrlInput: { flex: 1 },
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
  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  bioWrap: { gap: 4 },
  bioContainer: { flex: 1 },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catPill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.darker, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  catPillActive: { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent },
  catPillText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_500Medium" },
  catPillTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  switchRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 12,
    backgroundColor: Colors.darker, borderRadius: 12, padding: 14,
  },
  switchLabel: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_500Medium" },
  switchSub: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  hint: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
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
  geezeeLink: {
    flexDirection: "row", alignItems: "center", gap: 8,
    justifyContent: "center", paddingVertical: 12,
  },
  geezeeLinkText: { color: Colors.accent, fontSize: 14, fontFamily: "Inter_500Medium" },
  socialField: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  socialIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
});
