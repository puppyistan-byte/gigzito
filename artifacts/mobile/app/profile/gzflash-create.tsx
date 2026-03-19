import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreateFlash, useUpdateFlash } from "@/hooks/useApi";
import { TextInput } from "@/components/ui/TextInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";

const DISPLAY_MODES = [
  { value: "countdown", label: "Countdown Timer", icon: "clock" as const, desc: "Shows time remaining until ad expires" },
  { value: "slots",     label: "Slots Remaining",  icon: "layers" as const, desc: "Shows how many units are still available" },
];

function Section({ title, icon, children }: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIcon}>
          <Feather name={icon} size={14} color={Colors.accent} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function GZFlashCreateScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // If editing, existing ad is passed via params
  const params = useLocalSearchParams<{
    editId?: string;
    editTitle?: string;
    editArtwork?: string;
    editPrice?: string;
    editDiscount?: string;
    editQuantity?: string;
    editDuration?: string;
    editMode?: string;
  }>();

  const isEdit = !!params.editId;

  const [title, setTitle]       = useState(params.editTitle ?? "");
  const [artwork, setArtwork]   = useState(params.editArtwork ?? "");
  const [price, setPrice]       = useState(params.editPrice ? String(Number(params.editPrice) / 100) : "");
  const [discount, setDiscount] = useState(params.editDiscount ?? "");
  const [quantity, setQuantity] = useState(params.editQuantity ?? "");
  const [duration, setDuration] = useState(params.editDuration ?? "60");
  const [mode, setMode]         = useState(params.editMode ?? "countdown");
  const [error, setError]       = useState("");

  const { mutateAsync: createFlash, isPending: creating } = useCreateFlash();
  const { mutateAsync: updateFlash, isPending: updating } = useUpdateFlash();
  const submitting = creating || updating;

  const validate = (): string | null => {
    if (!title.trim()) return "Title is required.";
    if (title.trim().length > 120) return "Title must be 120 characters or less.";
    const p = Number(price);
    if (!price || isNaN(p) || p <= 0) return "Enter a valid retail price (e.g. 99.00).";
    const d = Number(discount);
    if (!discount || isNaN(d) || d < 1 || d > 99) return "Discount must be between 1 and 99%.";
    const q = Number(quantity);
    if (!quantity || isNaN(q) || q < 1 || q > 9999) return "Quantity must be between 1 and 9,999.";
    const dur = Number(duration);
    if (!duration || isNaN(dur) || dur < 5 || dur > 43200) return "Duration must be 5 – 43,200 minutes.";
    return null;
  };

  const handleSubmit = async () => {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const body: Record<string, any> = {
      title:             title.trim(),
      retailPriceCents:  Math.round(Number(price) * 100),
      discountPercent:   Number(discount),
      quantity:          Number(quantity),
      durationMinutes:   Number(duration),
      displayMode:       mode,
    };
    if (artwork.trim()) body.artworkUrl = artwork.trim();

    try {
      if (isEdit && params.editId) {
        await updateFlash({ id: Number(params.editId), body });
      } else {
        await createFlash(body);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    }
  };

  const discountedPrice = () => {
    const p = Number(price);
    const d = Number(discount);
    if (!p || !d) return null;
    return (p * (1 - d / 100)).toFixed(2);
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.topTitle}>{isEdit ? "Edit Flash Ad" : "Create Flash Ad"}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header card */}
        <View style={s.heroBanner}>
          <Feather name="zap" size={20} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>GZFlash Ad</Text>
            <Text style={s.heroSub}>
              Flash ads are time-limited deals shown live in the GZFlash feed. Prices auto-expire.
            </Text>
          </View>
        </View>

        {/* Ad Details */}
        <Section title="Ad Details" icon="file-text">
          <TextInput
            label="Title *"
            icon="type"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. 3 Coaching Sessions for $99"
            maxLength={120}
          />
          <TextInput
            label="Artwork URL (optional)"
            icon="image"
            value={artwork}
            onChangeText={setArtwork}
            placeholder="https://your-cdn.com/banner.jpg"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Section>

        {/* Pricing */}
        <Section title="Pricing" icon="tag">
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Retail Price ($) *"
                icon="dollar-sign"
                value={price}
                onChangeText={setPrice}
                placeholder="99.00"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Discount (%) *"
                icon="percent"
                value={discount}
                onChangeText={setDiscount}
                placeholder="50"
                keyboardType="number-pad"
              />
            </View>
          </View>
          {discountedPrice() ? (
            <View style={s.pricePreview}>
              <Text style={s.pricePreviewLabel}>Deal price after discount:</Text>
              <Text style={s.pricePreviewValue}>${discountedPrice()}</Text>
              <Text style={s.pricePreviewOff}>{discount}% OFF</Text>
            </View>
          ) : null}
        </Section>

        {/* Availability */}
        <Section title="Availability" icon="layers">
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Quantity *"
                icon="hash"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="10"
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Duration (minutes) *"
                icon="clock"
                value={duration}
                onChangeText={setDuration}
                placeholder="60"
                keyboardType="number-pad"
              />
            </View>
          </View>
          <Text style={s.hint}>
            Min 5 min · Max 43,200 min (30 days). Duration starts the moment you post.
          </Text>
        </Section>

        {/* Display Mode */}
        <Section title="Display Mode" icon="eye">
          {DISPLAY_MODES.map((m) => (
            <Pressable
              key={m.value}
              onPress={() => { Haptics.selectionAsync(); setMode(m.value); }}
              style={[s.modeCard, mode === m.value && s.modeCardActive]}
            >
              <View style={[s.modeIcon, mode === m.value && s.modeIconActive]}>
                <Feather name={m.icon} size={16} color={mode === m.value ? "#3B82F6" : Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.modeLabel, mode === m.value && s.modeLabelActive]}>{m.label}</Text>
                <Text style={s.modeDesc}>{m.desc}</Text>
              </View>
              <View style={[s.modeCheck, mode === m.value && s.modeCheckActive]}>
                {mode === m.value && <Feather name="check" size={12} color="#fff" />}
              </View>
            </Pressable>
          ))}
        </Section>

        {/* Error */}
        {error ? (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color={Colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={submitting ? (isEdit ? "Saving..." : "Launching Ad...") : (isEdit ? "Save Changes" : "Launch Flash Ad ⚡")}
          onPress={handleSubmit}
          disabled={submitting}
        />
        <Text style={s.note}>
          Your ad goes live immediately and is visible in the public GZFlash feed ranked by potency score.
        </Text>
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
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  heroBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    padding: 14,
  },
  heroTitle: {
    color: "#3B82F6",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  heroSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sectionIcon: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: `${Colors.accent}18`,
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  row: { flexDirection: "row", gap: 10 },
  pricePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pricePreviewLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  pricePreviewValue: {
    color: "#3B82F6",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  pricePreviewOff: {
    color: Colors.success,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    backgroundColor: `${Colors.success}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.darker,
  },
  modeCardActive: {
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  modeIcon: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: `${Colors.textMuted}18`,
    alignItems: "center", justifyContent: "center",
  },
  modeIconActive: { backgroundColor: "rgba(59,130,246,0.2)" },
  modeLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  modeLabelActive: { color: "#3B82F6" },
  modeDesc: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  modeCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  modeCheckActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: `${Colors.danger}12`,
    borderRadius: 10, borderWidth: 1,
    borderColor: `${Colors.danger}33`, padding: 12,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  note: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
});
