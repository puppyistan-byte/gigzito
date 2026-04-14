import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import Colors from "@/constants/colors";

export function UpdateBanner() {
  const update = useUpdateCheck();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);

  if (!update || dismissed || Platform.OS !== "android") return null;

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(update.downloadUrl);
  };

  const handleDismiss = () => {
    Haptics.selectionAsync();
    setDismissed(true);
  };

  return (
    <View style={[styles.banner, { top: insets.top + 8 }]}>
      <View style={styles.left}>
        <Feather name="download-cloud" size={16} color="#fff" />
        <View style={styles.textWrap}>
          <Text style={styles.title}>Update Available — v{update.version}</Text>
          {update.releaseNotes ? (
            <Text style={styles.notes} numberOfLines={1}>
              {update.releaseNotes}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={handleDownload}
          style={({ pressed }) => [styles.updateBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.updateBtnText}>Update</Text>
        </Pressable>
        <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
          <Feather name="x" size={14} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  notes: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  updateBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  updateBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dismissBtn: {
    padding: 4,
  },
});
