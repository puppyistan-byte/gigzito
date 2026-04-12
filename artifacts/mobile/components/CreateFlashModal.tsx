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
import { useCreateFlash } from "@/hooks/useApi";

const DURATIONS = [
  { label: "1 hr",  hours: 1 },
  { label: "4 hrs", hours: 4 },
  { label: "12 hrs",hours: 12 },
  { label: "24 hrs",hours: 24 },
  { label: "48 hrs",hours: 48 },
  { label: "72 hrs",hours: 72 },
];

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CreateFlashModal({ visible, onClose }: Props) {
  const { mutate: create, isPending } = useCreateFlash();

  const [title, setTitle]                 = useState("");
  const [retailPrice, setRetailPrice]     = useState("");
  const [discountPct, setDiscountPct]     = useState("");
  const [quantity, setQuantity]           = useState("10");
  const [durationIdx, setDurationIdx]     = useState(3);
  const [displayMode, setDisplayMode]     = useState<"countdown" | "slots">("countdown");
  const [artworkUrl, setArtworkUrl]       = useState("");
  const [description, setDescription]    = useState("");
  const [error, setError]                 = useState("");

  const flashPreview = (() => {
    const retail = parseFloat(retailPrice);
    const pct    = parseFloat(discountPct);
    if (!isNaN(retail) && retail > 0 && !isNaN(pct) && pct > 0 && pct < 100) {
      return `$${(retail * (1 - pct / 100)).toFixed(2)}`;
    }
    return null;
  })();

  const reset = () => {
    setTitle(""); setRetailPrice(""); setDiscountPct("");
    setQuantity("10"); setDurationIdx(3); setDisplayMode("countdown");
    setArtworkUrl(""); setDescription(""); setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    setError("");
    const retail = parseFloat(retailPrice);
    const pct    = parseFloat(discountPct);
    const qty    = parseInt(quantity, 10);

    if (!title.trim())                          return setError("Deal title is required.");
    if (isNaN(retail) || retail <= 0)           return setError("Enter a valid retail price.");
    if (isNaN(pct) || pct < 1 || pct > 99)     return setError("Discount must be between 1% and 99%.");
    if (isNaN(qty) || qty < 1)                  return setError("Available slots must be at least 1.");

    const body: Record<string, any> = {
      title:             title.trim(),
      retailPriceCents:  Math.round(retail * 100),
      discountPercent:   pct,
      quantity:          qty,
      expiresAt:         hoursFromNow(DURATIONS[durationIdx].hours),
      displayMode,
    };
    if (artworkUrl.trim())   body.artworkUrl   = artworkUrl.trim();
    if (description.trim())  body.description  = description.trim();

    create(body, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        handleClose();
      },
      onError: (e: any) => {
        setError(e?.message || "Failed to post deal. Please try again.");
      },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Drag handle */}
        <View style={s.handle} />

        {/* Header bar */}
        <View style={s.header}>
          <Pressable onPress={handleClose} style={s.headerBtn}>
            <Feather name="x" size={20} color="#60A5FA" />
          </Pressable>

          <View style={s.headerCenter}>
            <Feather name="zap" size={16} color="#FACC15" />
            <Text style={s.headerTitle}>New Flash Deal</Text>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            style={[s.postBtn, isPending && s.postBtnDisabled]}
          >
            <Text style={s.postBtnText}>{isPending ? "Posting…" : "Post"}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Error banner */}
          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={14} color="#F87171" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Title ── */}
          <Field label="Deal Title *">
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 50% Off Logo Design Package"
              placeholderTextColor="#2d3e58"
              maxLength={80}
              returnKeyType="next"
            />
          </Field>

          {/* ── Price + Discount row ── */}
          <View style={s.row}>
            <Field label="Retail Price ($) *" flex>
              <TextInput
                style={s.input}
                value={retailPrice}
                onChangeText={setRetailPrice}
                placeholder="99.00"
                placeholderTextColor="#2d3e58"
                keyboardType="decimal-pad"
              />
            </Field>
            <Field label="Discount % *" flex>
              <TextInput
                style={s.input}
                value={discountPct}
                onChangeText={setDiscountPct}
                placeholder="30"
                placeholderTextColor="#2d3e58"
                keyboardType="number-pad"
                maxLength={2}
              />
            </Field>
          </View>

          {/* Flash price live preview */}
          {flashPreview ? (
            <View style={s.previewRow}>
              <Feather name="zap" size={12} color="#4ADE80" />
              <Text style={s.previewText}>
                Flash price: <Text style={s.previewPrice}>{flashPreview}</Text>
              </Text>
            </View>
          ) : null}

          {/* ── Slots ── */}
          <Field label="Available Slots *">
            <TextInput
              style={s.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="10"
              placeholderTextColor="#2d3e58"
              keyboardType="number-pad"
            />
          </Field>

          {/* ── Duration chips ── */}
          <Field label="Deal Duration *">
            <View style={s.chipRow}>
              {DURATIONS.map((d, i) => (
                <Pressable
                  key={d.label}
                  onPress={() => { Haptics.selectionAsync(); setDurationIdx(i); }}
                  style={[s.chip, durationIdx === i && s.chipActive]}
                >
                  <Text style={[s.chipText, durationIdx === i && s.chipTextActive]}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          {/* ── Display mode toggle ── */}
          <Field label="Urgency Display">
            <View style={s.toggleRow}>
              <Pressable
                onPress={() => setDisplayMode("countdown")}
                style={[s.toggleBtn, displayMode === "countdown" && s.toggleBtnActive]}
              >
                <Feather name="clock" size={14} color={displayMode === "countdown" ? "#fff" : "#60A5FA"} />
                <Text style={[s.toggleText, displayMode === "countdown" && s.toggleTextActive]}>
                  Countdown
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDisplayMode("slots")}
                style={[s.toggleBtn, displayMode === "slots" && s.toggleBtnActive]}
              >
                <Feather name="layers" size={14} color={displayMode === "slots" ? "#fff" : "#60A5FA"} />
                <Text style={[s.toggleText, displayMode === "slots" && s.toggleTextActive]}>
                  Slots Left
                </Text>
              </Pressable>
            </View>
          </Field>

          {/* ── Description (optional) ── */}
          <Field label="Description (optional)">
            <TextInput
              style={[s.input, s.inputMulti]}
              value={description}
              onChangeText={setDescription}
              placeholder="Briefly describe your deal…"
              placeholderTextColor="#2d3e58"
              multiline
              numberOfLines={3}
              maxLength={280}
            />
          </Field>

          {/* ── Artwork URL (optional) ── */}
          <Field label="Artwork Image URL (optional)">
            <TextInput
              style={s.input}
              value={artworkUrl}
              onChangeText={setArtworkUrl}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor="#2d3e58"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          {/* Post button at bottom too */}
          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            style={[s.submitBtn, isPending && s.postBtnDisabled]}
          >
            <Feather name="zap" size={16} color="#FACC15" />
            <Text style={s.submitBtnText}>{isPending ? "Posting deal…" : "Post Flash Deal"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, children, flex,
}: {
  label: string; children: React.ReactNode; flex?: boolean;
}) {
  return (
    <View style={[s.field, flex && { flex: 1 }]}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050a18",
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: "#1a2848",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0e1c30",
  },
  headerBtn: {
    width: 38, height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  postBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnDisabled: {
    backgroundColor: "#1a2030",
  },
  postBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 18,
    paddingBottom: 60,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(127,29,29,0.35)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.25)",
    padding: 12,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 18,
  },
  field: { gap: 6 },
  row: { flexDirection: "row", gap: 12 },
  label: {
    color: "#60A5FA",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#070d1a",
    borderWidth: 1,
    borderColor: "#1a2848",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 13,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: -10,
    paddingHorizontal: 2,
  },
  previewText: {
    color: "#64748B",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  previewPrice: {
    color: "#4ADE80",
    fontFamily: "Inter_700Bold",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#070d1a",
    borderWidth: 1,
    borderColor: "#1a2848",
  },
  chipActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#3B82F6",
  },
  chipText: {
    color: "#60A5FA",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#070d1a",
    borderWidth: 1,
    borderColor: "#1a2848",
  },
  toggleBtnActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#3B82F6",
  },
  toggleText: {
    color: "#60A5FA",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  toggleTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  submitBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 12,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
