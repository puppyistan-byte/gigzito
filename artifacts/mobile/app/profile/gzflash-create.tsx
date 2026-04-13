import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useCreateFlash, useUpdateFlash } from "@/hooks/useApi";

type DurationMode = "from_now" | "pick_date";

export default function GZFlashCreateScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const params = useLocalSearchParams<{
    editId?: string;
    editTitle?: string;
    editArtwork?: string;
    editPrice?: string;    // retail cents
    editDiscount?: string; // percent 0–100
    editQuantity?: string;
    editDuration?: string; // minutes
    editMode?: string;
  }>();
  const isEdit = !!params.editId;

  // Reverse-compute flash price from retail + discount when editing
  const editRetail = params.editPrice ? Number(params.editPrice) / 100 : 0;
  const editDiscPct = params.editDiscount ? Number(params.editDiscount) : 0;
  const editFlash   = editRetail > 0 && editDiscPct > 0
    ? editRetail * (1 - editDiscPct / 100)
    : 0;

  // Reverse-compute hours/minutes from duration (minutes)
  const editMins  = params.editDuration ? Number(params.editDuration) : 60;
  const editHours = Math.floor(editMins / 60);
  const editRem   = editMins % 60;

  const [title, setTitle]             = useState(params.editTitle ?? "");
  const [imageUri, setImageUri]       = useState("");
  const [imageUrlInput, setImageUrl]  = useState(params.editArtwork ?? "");
  const [retailPrice, setRetailPrice] = useState(editRetail > 0 ? String(editRetail) : "");
  const [flashPrice, setFlashPrice]   = useState(editFlash > 0 ? editFlash.toFixed(2) : "");
  const [slots, setSlots]             = useState(params.editQuantity ?? "10");
  const [durationMode, setDurationMode] = useState<DurationMode>("from_now");
  const [hours, setHours]             = useState(String(editHours || 1));
  const [minutes, setMinutes]         = useState(String(editRem));
  const [displayMode, setDisplayMode] = useState<"countdown" | "slots">(
    (params.editMode as "countdown" | "slots") ?? "countdown"
  );
  const [error, setError]             = useState("");

  const { mutateAsync: createFlash, isPending: creating } = useCreateFlash();
  const { mutateAsync: updateFlash, isPending: updating } = useUpdateFlash();
  const submitting = creating || updating;

  const activeBannerUri = imageUri || imageUrlInput.trim() || null;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [300, 168],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageUrl("");
    }
  };

  const computedDiscountPct = (() => {
    const r = parseFloat(retailPrice);
    const f = parseFloat(flashPrice);
    if (!isNaN(r) && r > 0 && !isNaN(f) && f >= 0 && f < r) {
      return Math.round(((r - f) / r) * 100);
    }
    return null;
  })();

  const potencyPreview = (() => {
    const r = parseFloat(retailPrice);
    const f = parseFloat(flashPrice);
    const qty = parseInt(slots, 10);
    if (!isNaN(r) && r > 0 && !isNaN(f) && f >= 0 && f < r && !isNaN(qty) && qty > 0) {
      const V = r * 100;
      const P = f * 100;
      const savingsIndex   = (V - P) / V;
      const timeFactor     = 1.0;
      const scarcityFactor = 2.0;
      const COMFORT        = 10000;
      const priceFriction  = 1 / (1 + P / COMFORT);
      const raw = savingsIndex * timeFactor * scarcityFactor * priceFriction;
      return Math.min(100, Math.round(raw * 100));
    }
    return null;
  })();

  const potencyZone = (score: number) => {
    if (score >= 80) return { label: "HOT",      color: "#F87171", bar: "#F87171" };
    if (score >= 55) return { label: "TRENDING",  color: "#FB923C", bar: "#FB923C" };
    if (score >= 30) return { label: "ACTIVE",    color: "#FACC15", bar: "#FACC15" };
    return             { label: "COOL",     color: "#60A5FA", bar: "#1D4ED8" };
  };

  const totalDurationMinutes = (): number => {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    return h * 60 + m;
  };

  const handleSubmit = async () => {
    setError("");
    const retail = parseFloat(retailPrice);
    const flash  = parseFloat(flashPrice);
    const qty    = parseInt(slots, 10);
    const durMin = totalDurationMinutes();

    if (!title.trim())                return setError("Ad title is required.");
    if (isNaN(retail) || retail <= 0) return setError("Enter a valid retail price.");
    if (isNaN(flash)  || flash < 0)   return setError("Enter a valid flash sale price.");
    if (flash >= retail)              return setError("Flash price must be lower than retail price.");
    if (isNaN(qty) || qty < 1)        return setError("Number of offers must be at least 1.");
    if (durMin < 5)                   return setError("Duration must be at least 5 minutes.");
    if (durMin > 43200)               return setError("Duration cannot exceed 43,200 minutes (30 days).");

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const discountPercent = Math.round(((retail - flash) / retail) * 100);
    const body: Record<string, any> = {
      title:            title.trim(),
      retailPriceCents: Math.round(retail * 100),
      discountPercent,
      quantity:         qty,
      durationMinutes:  durMin,
      displayMode,
    };
    const artwork = imageUri || imageUrlInput.trim();
    if (artwork) body.artworkUrl = artwork;

    try {
      if (isEdit && params.editId) {
        await updateFlash({ id: Number(params.editId), body });
      } else {
        await createFlash(body);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      const raw = e?.message ?? "";
      if (raw.toLowerCase().includes("unauthorized") || raw.includes("401")) {
        setError("Not authorized. Ensure your account has GZMarketerPro, GZBusiness, or GZEnterprise tier.");
      } else {
        setError(raw || "Something went wrong. Please try again.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#60A5FA" />
        </Pressable>
        <View style={s.topBarCenter}>
          <Feather name="zap" size={14} color="#60A5FA" />
          <Text style={s.topBarTitle}>GZFlash Ad Center</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          {/* Card header */}
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Feather name="zap" size={15} color="#60A5FA" />
              <Text style={s.cardTitle}>{isEdit ? "Edit Flash Ad" : "New GZFlash Ad"}</Text>
            </View>
            <Pressable onPress={() => router.back()}>
              <Feather name="x" size={18} color="#64748B" />
            </Pressable>
          </View>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={13} color="#F87171" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Ad Title */}
          <View style={s.field}>
            <Text style={s.label}>Ad Title *</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Summer Sale – 50% off sneakers"
              placeholderTextColor="#2d3e58"
              maxLength={120}
              returnKeyType="next"
            />
          </View>

          {/* Ad Image */}
          <View style={s.field}>
            <Text style={s.label}>Ad Image</Text>
            <View style={s.imageRow}>
              <Pressable onPress={pickImage} style={s.uploadBtn}>
                <Feather name="upload" size={14} color="#60A5FA" />
                <Text style={s.uploadBtnText}>Upload Image</Text>
              </Pressable>
              <TextInput
                style={[s.input, s.urlInput]}
                value={imageUrlInput}
                onChangeText={(t) => { setImageUrl(t); setImageUri(""); }}
                placeholder="or paste image URL"
                placeholderTextColor="#2d3e58"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Pressable onPress={pickImage} style={s.bannerZone}>
              {activeBannerUri ? (
                <Image source={{ uri: activeBannerUri }} style={s.bannerPreview} resizeMode="cover" />
              ) : (
                <View style={s.bannerPlaceholder}>
                  <Feather name="image" size={20} color="#2d3e58" />
                  <Text style={s.bannerPlaceholderText}>
                    Click to add banner image (300×168px ideal)
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Retail + Flash Price */}
          <View style={s.row}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Retail Price ($) *</Text>
              <TextInput
                style={s.input}
                value={retailPrice}
                onChangeText={setRetailPrice}
                placeholder="29.99"
                placeholderTextColor="#2d3e58"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Flash Sale Price ($) *</Text>
              <TextInput
                style={s.input}
                value={flashPrice}
                onChangeText={setFlashPrice}
                placeholder="14.99"
                placeholderTextColor="#2d3e58"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          {computedDiscountPct !== null ? (
            <View style={s.discountHint}>
              <Feather name="tag" size={11} color="#4ADE80" />
              <Text style={s.discountHintText}>{computedDiscountPct}% discount</Text>
            </View>
          ) : null}

          {/* Live potency preview */}
          {potencyPreview !== null ? (() => {
            const zone = potencyZone(potencyPreview);
            return (
              <View style={s.potencyBox}>
                <View style={s.potencyTopRow}>
                  <Feather name="zap" size={12} color={zone.color} />
                  <Text style={s.potencyLabel}>Launch Potency Score</Text>
                  <View style={[s.potencyBadge, { backgroundColor: zone.bar + "33", borderColor: zone.bar + "66" }]}>
                    <Text style={[s.potencyBadgeText, { color: zone.color }]}>{zone.label}</Text>
                  </View>
                  <Text style={[s.potencyScore, { color: zone.color }]}>{potencyPreview}</Text>
                </View>
                <View style={s.potencyBarBg}>
                  <View style={[s.potencyBarFill, { width: `${potencyPreview}%` as any, backgroundColor: zone.bar }]} />
                </View>
                <Text style={s.potencyHint}>Score at launch · rises as slots fill and deadline nears</Text>
              </View>
            );
          })() : null}

          {/* Number of Offers */}
          <View style={s.field}>
            <Text style={s.label}>Number of Offers (slots) *</Text>
            <TextInput
              style={s.input}
              value={slots}
              onChangeText={setSlots}
              placeholder="10"
              placeholderTextColor="#2d3e58"
              keyboardType="number-pad"
            />
          </View>

          {/* Duration */}
          <View style={s.field}>
            <View style={s.durationHeader}>
              <Text style={s.label}>Duration *</Text>
              <View style={s.durationToggleRow}>
                <Pressable
                  onPress={() => setDurationMode("pick_date")}
                  style={[s.durationToggle, durationMode === "pick_date" && s.durationToggleActive]}
                >
                  <Feather name="calendar" size={11} color={durationMode === "pick_date" ? "#fff" : "#60A5FA"} />
                  <Text style={[s.durationToggleText, durationMode === "pick_date" && s.durationToggleTextActive]}>
                    Pick date & time
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setDurationMode("from_now")}
                  style={[s.durationToggle, durationMode === "from_now" && s.durationToggleActive]}
                >
                  <Feather name="clock" size={11} color={durationMode === "from_now" ? "#fff" : "#60A5FA"} />
                  <Text style={[s.durationToggleText, durationMode === "from_now" && s.durationToggleTextActive]}>
                    From now
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={s.row}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={hours}
                onChangeText={setHours}
                keyboardType="number-pad"
                maxLength={3}
              />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={s.durationHint}>
              hours / minutes from now · min 5 min · max 43,200 min (30 days)
            </Text>
          </View>

          {/* Display Mode */}
          <View style={s.field}>
            <Text style={s.label}>Ad Display Mode</Text>
            <View style={s.modeRow}>
              <Pressable
                onPress={() => setDisplayMode("countdown")}
                style={[s.modeCard, displayMode === "countdown" && s.modeCardActive]}
              >
                <Feather name="clock" size={22} color={displayMode === "countdown" ? "#fff" : "#64748B"} />
                <Text style={[s.modeCardTitle, displayMode === "countdown" && s.modeCardTitleActive]}>
                  Countdown Clock
                </Text>
                <Text style={[s.modeCardSub, displayMode === "countdown" && s.modeCardSubActive]}>
                  Shows live timer — drives time urgency
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDisplayMode("slots")}
                style={[s.modeCard, displayMode === "slots" && s.modeCardActive]}
              >
                <Feather name="hash" size={22} color={displayMode === "slots" ? "#fff" : "#64748B"} />
                <Text style={[s.modeCardTitle, displayMode === "slots" && s.modeCardTitleActive]}>
                  Number of Offers
                </Text>
                <Text style={[s.modeCardSub, displayMode === "slots" && s.modeCardSubActive]}>
                  Shows slots remaining — drives scarcity
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[s.launchBtn, submitting && s.launchBtnDisabled]}
          >
            <Feather name="zap" size={18} color="#fff" />
            <Text style={s.launchBtnText}>
              {submitting
                ? (isEdit ? "Saving…" : "Launching…")
                : (isEdit ? "Save Changes" : "Launch GZFlash")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070d1a" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0e1c30",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "#0a1525",
    borderWidth: 1, borderColor: "#1a2848",
    alignItems: "center", justifyContent: "center",
  },
  topBarCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 60 },
  card: {
    backgroundColor: "#0d1726",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1a2848",
    padding: 16,
    gap: 18,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(127,29,29,0.35)",
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(248,113,113,0.2)", padding: 10,
  },
  errorText: { color: "#F87171", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  field: { gap: 7 },
  row: { flexDirection: "row", gap: 10 },
  label: { color: "#CBD5E1", fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    backgroundColor: "#0a1525",
    borderWidth: 1, borderColor: "#1a2848", borderRadius: 8,
    paddingHorizontal: 13, paddingVertical: 12,
    color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_400Regular",
  },
  imageRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0a1525", borderWidth: 1, borderColor: "#1a2848",
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
  },
  uploadBtnText: { color: "#60A5FA", fontSize: 13, fontFamily: "Inter_500Medium" },
  urlInput: { flex: 1, fontSize: 13 },
  bannerZone: {
    borderWidth: 1, borderColor: "#1a2848", borderStyle: "dashed",
    borderRadius: 8, overflow: "hidden", minHeight: 80,
  },
  bannerPreview: { width: "100%", height: 120 },
  bannerPlaceholder: { height: 80, alignItems: "center", justifyContent: "center", gap: 6 },
  bannerPlaceholderText: { color: "#2d3e58", fontSize: 12, fontFamily: "Inter_400Regular" },
  discountHint: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: -10, paddingHorizontal: 2,
  },
  discountHintText: { color: "#4ADE80", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  potencyBox: {
    backgroundColor: "#070d1a", borderWidth: 1, borderColor: "#1a2848",
    borderRadius: 10, padding: 12, gap: 8,
  },
  potencyTopRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  potencyLabel: { color: "#94A3B8", fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  potencyBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  potencyBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  potencyScore: { fontSize: 18, fontFamily: "Inter_700Bold", minWidth: 32, textAlign: "right" },
  potencyBarBg: { height: 5, backgroundColor: "#1a2848", borderRadius: 3, overflow: "hidden" },
  potencyBarFill: { height: 5, borderRadius: 3 },
  potencyHint: { color: "#334155", fontSize: 10, fontFamily: "Inter_400Regular" },
  durationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  durationToggleRow: { flexDirection: "row", gap: 6 },
  durationToggle: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    borderWidth: 1, borderColor: "#1a2848", backgroundColor: "#0a1525",
  },
  durationToggleActive: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  durationToggleText: { color: "#60A5FA", fontSize: 11, fontFamily: "Inter_500Medium" },
  durationToggleTextActive: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  durationHint: { color: "#2d3e58", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -4 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: {
    flex: 1, backgroundColor: "#0a1525", borderWidth: 1, borderColor: "#1a2848",
    borderRadius: 10, padding: 14, alignItems: "center", gap: 6,
  },
  modeCardActive: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  modeCardTitle: { color: "#64748B", fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  modeCardTitleActive: { color: "#FFFFFF" },
  modeCardSub: { color: "#334155", fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 14 },
  modeCardSubActive: { color: "rgba(255,255,255,0.7)" },
  launchBtn: {
    backgroundColor: "#2563EB", borderRadius: 10, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 4,
  },
  launchBtnDisabled: { backgroundColor: "#1a2030" },
  launchBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
});
