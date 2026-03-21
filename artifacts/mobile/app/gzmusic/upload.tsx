import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";

const GZ = {
  orange: "#ff7a00",
  orangeDim: "#ff7a0020",
  orangeBorder: "#ff7a0040",
  bg: "#000000",
  card: "#0b0b0b",
  surface: "#111111",
  txt: "#ffffff",
  txt2: "#888888",
  muted: "#555555",
  danger: "#ff2b2b",
};
const API_BASE = "https://www.gigzito.com";

const GENRES = [
  "Hip-Hop", "Trap / Drill", "Phonk", "Rapcore", "Lo-Fi Hip-Hop",
  "R&B / Soul", "Neo-Soul", "Soul / Motown", "Funk / Groove",
  "Pop", "Synth-Pop", "Bedroom Pop", "K-Pop / J-Pop", "Dance-Pop",
  "Rock", "Alternative / Indie", "Indie Rock", "Indie Folk",
  "Classic Rock", "Hard Rock", "Grunge", "Post-Rock", "Psychedelic Rock",
  "Electronic / EDM", "House", "Deep House", "Techno", "Trance",
  "Dubstep / Riddim", "Drum & Bass / Jungle", "Ambient / Chillout",
  "Synthwave / Retrowave", "Lo-Fi", "Afrobeats", "Amapiano", "Dancehall",
  "Reggae", "Reggaeton", "Latin", "Jazz / Fusion", "Jazz", "Blues / Blues Rock",
  "Gospel / Worship", "Country & Folk", "Singer-Songwriter", "Acoustic",
  "Classical", "Film Score / Cinematic", "Gaming / Chiptune", "Other",
];

interface FileAsset {
  name: string;
  uri: string;
  mimeType?: string;
}

export default function UploadTrackScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [showGenres, setShowGenres] = useState(false);
  const [downloadEnabled, setDownloadEnabled] = useState(false);
  const [sharedToLibrary, setSharedToLibrary] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [audioFile, setAudioFile] = useState<FileAsset | null>(null);
  const [coverFile, setCoverFile] = useState<FileAsset | null>(null);
  const [licenseFile, setLicenseFile] = useState<FileAsset | null>(null);

  const upload = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await fetch(`${API_BASE}/api/gz-music/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      return json;
    },
    onSuccess: (track) => {
      Alert.alert("Track Uploaded!", `"${track.title}" is now in GZMusic.`, [
        { text: "Back to GZMusic", onPress: () => router.back() },
      ]);
    },
    onError: (e: Error) => Alert.alert("Upload Failed", e.message),
  });

  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/mpeg",
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const a = result.assets[0];
      setAudioFile({ name: a.name, uri: a.uri, mimeType: a.mimeType ?? "audio/mpeg" });
    }
  }

  async function pickCover() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const a = result.assets[0];
      setCoverFile({ name: a.fileName ?? "cover.jpg", uri: a.uri, mimeType: "image/jpeg" });
    }
  }

  async function pickLicense() {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.length > 0) {
      const a = result.assets[0];
      setLicenseFile({ name: a.name, uri: a.uri, mimeType: "application/pdf" });
    }
  }

  function handleSubmit() {
    if (!token) { router.push("/auth/login"); return; }
    if (!audioFile) { Alert.alert("Missing Audio", "Please select an MP3 file."); return; }
    if (!title.trim()) { Alert.alert("Missing Title", "Please enter a track title."); return; }
    if (!artist.trim()) { Alert.alert("Missing Artist", "Please enter the artist name."); return; }
    if (!genre) { Alert.alert("Missing Genre", "Please select a genre."); return; }
    if (!authenticated) { Alert.alert("Authenticity Required", "Please confirm this is your original work."); return; }

    const fd = new FormData();
    fd.append("audio", { uri: audioFile.uri, name: audioFile.name, type: audioFile.mimeType ?? "audio/mpeg" } as any);
    if (coverFile) fd.append("cover", { uri: coverFile.uri, name: coverFile.name, type: coverFile.mimeType ?? "image/jpeg" } as any);
    if (licenseFile) fd.append("license", { uri: licenseFile.uri, name: licenseFile.name, type: licenseFile.mimeType ?? "application/pdf" } as any);
    fd.append("title", title.trim());
    fd.append("artist", artist.trim());
    fd.append("genre", genre);
    fd.append("downloadEnabled", String(downloadEnabled));
    fd.append("sharedToLibrary", String(sharedToLibrary));
    fd.append("authenticityConfirmed", "true");

    upload.mutate(fd);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={GZ.txt} />
        </Pressable>
        <Text style={styles.headerTitle}>Upload Track</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Audio file */}
        <View style={styles.section}>
          <Text style={styles.label}>MP3 File <Text style={styles.required}>*</Text></Text>
          <Pressable style={[styles.filePicker, audioFile && styles.filePickerFilled]} onPress={pickAudio}>
            <Ionicons name="musical-note" size={20} color={audioFile ? GZ.orange : GZ.muted} />
            <Text style={[styles.filePickerText, audioFile && { color: GZ.txt }]} numberOfLines={1}>
              {audioFile ? audioFile.name : "Select MP3 audio file"}
            </Text>
            {audioFile && <Ionicons name="checkmark-circle" size={18} color={GZ.orange} />}
          </Pressable>
        </View>

        {/* Cover art */}
        <View style={styles.section}>
          <Text style={styles.label}>Cover Art <Text style={styles.optional}>(optional)</Text></Text>
          <Pressable style={[styles.coverPicker, coverFile && styles.coverPickerFilled]} onPress={pickCover}>
            {coverFile ? (
              <Image source={{ uri: coverFile.uri }} style={styles.coverPreview} />
            ) : (
              <>
                <Ionicons name="image-outline" size={28} color={GZ.muted} />
                <Text style={styles.coverPickerText}>Tap to add square cover art</Text>
              </>
            )}
            {coverFile && (
              <Pressable style={styles.removeCover} onPress={() => setCoverFile(null)}>
                <Ionicons name="close-circle" size={22} color={GZ.danger} />
              </Pressable>
            )}
          </Pressable>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Track title"
            placeholderTextColor={GZ.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Artist */}
        <View style={styles.section}>
          <Text style={styles.label}>Artist / Stage Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Your artist name"
            placeholderTextColor={GZ.muted}
            value={artist}
            onChangeText={setArtist}
          />
        </View>

        {/* Genre */}
        <View style={styles.section}>
          <Text style={styles.label}>Genre <Text style={styles.required}>*</Text></Text>
          <Pressable style={[styles.input, styles.genreBtn]} onPress={() => setShowGenres(!showGenres)}>
            <Text style={[styles.genreBtnText, !genre && { color: GZ.muted }]}>{genre || "Select a genre"}</Text>
            <Feather name={showGenres ? "chevron-up" : "chevron-down"} size={16} color={GZ.txt2} />
          </Pressable>
          {showGenres && (
            <View style={styles.genreList}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                {GENRES.map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.genreItem, genre === g && styles.genreItemActive]}
                    onPress={() => { setGenre(g); setShowGenres(false); }}
                  >
                    <Text style={[styles.genreItemText, genre === g && { color: GZ.orange }]}>{g}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* License */}
        <View style={styles.section}>
          <Text style={styles.label}>License File <Text style={styles.optional}>(optional PDF)</Text></Text>
          <Pressable style={[styles.filePicker, licenseFile && styles.filePickerFilled]} onPress={pickLicense}>
            <Ionicons name="document-outline" size={20} color={licenseFile ? GZ.orange : GZ.muted} />
            <Text style={[styles.filePickerText, licenseFile && { color: GZ.txt }]} numberOfLines={1}>
              {licenseFile ? licenseFile.name : "Select PDF license"}
            </Text>
            {licenseFile && <Ionicons name="checkmark-circle" size={18} color={GZ.orange} />}
          </Pressable>
        </View>

        {/* Toggles */}
        <View style={styles.togglesCard}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Allow Downloads</Text>
              <Text style={styles.toggleSub}>Let listeners download this track</Text>
            </View>
            <Switch
              value={downloadEnabled}
              onValueChange={setDownloadEnabled}
              trackColor={{ false: GZ.surface, true: GZ.orange }}
              thumbColor={GZ.txt}
            />
          </View>
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: "#1a1a1a" }]}>
            <View>
              <Text style={styles.toggleLabel}>Share to GZ100 Library</Text>
              <Text style={styles.toggleSub}>Appear in chart & library search</Text>
            </View>
            <Switch
              value={sharedToLibrary}
              onValueChange={setSharedToLibrary}
              trackColor={{ false: GZ.surface, true: GZ.orange }}
              thumbColor={GZ.txt}
            />
          </View>
        </View>

        {/* Authenticity */}
        <Pressable style={styles.authRow} onPress={() => setAuthenticated(!authenticated)}>
          <View style={[styles.checkbox, authenticated && styles.checkboxChecked]}>
            {authenticated && <Ionicons name="checkmark" size={14} color={GZ.bg} />}
          </View>
          <Text style={styles.authText}>
            I confirm this is my original work and I have the rights to distribute it.
          </Text>
        </Pressable>

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, (!authenticated || upload.isPending) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!authenticated || upload.isPending}
        >
          {upload.isPending ? (
            <ActivityIndicator color={GZ.bg} />
          ) : (
            <>
              <Feather name="upload-cloud" size={18} color={GZ.bg} />
              <Text style={styles.submitBtnText}>Submit Track</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GZ.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
    justifyContent: "space-between",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: GZ.txt },

  section: { marginTop: 20 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GZ.txt2, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  required: { color: GZ.orange },
  optional: { color: GZ.muted, textTransform: "none", letterSpacing: 0 },

  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GZ.surface,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#222",
    borderStyle: "dashed",
  },
  filePickerFilled: { borderColor: GZ.orangeBorder, borderStyle: "solid" },
  filePickerText: { flex: 1, fontSize: 14, color: GZ.muted, fontFamily: "Inter_400Regular" },

  coverPicker: {
    height: 140,
    backgroundColor: GZ.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#222",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  coverPickerFilled: { borderStyle: "solid", borderColor: GZ.orangeBorder, padding: 0, overflow: "hidden" },
  coverPreview: { width: "100%", height: "100%", borderRadius: 12 },
  coverPickerText: { color: GZ.muted, fontSize: 13, fontFamily: "Inter_400Regular" },
  removeCover: { position: "absolute", top: 8, right: 8 },

  input: {
    backgroundColor: GZ.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GZ.txt,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: "#222",
  },
  genreBtn: { flexDirection: "row", alignItems: "center" },
  genreBtnText: { flex: 1, fontSize: 15, color: GZ.txt, fontFamily: "Inter_400Regular" },
  genreList: {
    backgroundColor: GZ.surface,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
  },
  genreItem: { paddingHorizontal: 14, paddingVertical: 11 },
  genreItemActive: { backgroundColor: GZ.orangeDim },
  genreItemText: { fontSize: 14, color: GZ.txt2, fontFamily: "Inter_400Regular" },

  togglesCard: {
    backgroundColor: GZ.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    marginTop: 20,
    overflow: "hidden",
  },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: GZ.txt },
  toggleSub: { fontSize: 11, color: GZ.muted, marginTop: 2 },

  authRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 20 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: GZ.muted,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: GZ.orange, borderColor: GZ.orange },
  authText: { flex: 1, fontSize: 13, color: GZ.txt2, lineHeight: 19, fontFamily: "Inter_400Regular" },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GZ.orange,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 28,
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: GZ.bg },
});
