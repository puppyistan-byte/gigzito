import React from "react";
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const { width: SW } = Dimensions.get("window");

type ShareOption = {
  label: string;
  icon: string;
  color: string;
  action: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  videoUrl?: string;
};

export function ShareSheet({ open, onClose, title, url, videoUrl }: Props) {
  const shareText = `Check this out: ${title}`;
  const encodedText = encodeURIComponent(`${shareText}\n${url}`);
  const encodedUrl = encodeURIComponent(url);

  const options: ShareOption[] = [
    {
      label: "Share…",
      icon: "share",
      color: Colors.accent,
      action: () => {
        Share.share({ title, message: `${shareText}\n${url}`, url }).catch(() => {});
      },
    },
    {
      label: "Copy Link",
      icon: "link",
      color: "#4A9EFF",
      action: async () => {
        await Clipboard.setStringAsync(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
    ...(videoUrl ? [{
      label: "Watch",
      icon: "play-circle",
      color: "#FF6B6B",
      action: () => Linking.openURL(videoUrl),
    }] : []),
    {
      label: "SMS",
      icon: "message-square",
      color: "#4CD964",
      action: () => Linking.openURL(`sms:?body=${encodedText}`),
    },
    {
      label: "WhatsApp",
      icon: "message-circle",
      color: "#25D366",
      action: () => Linking.openURL(`https://wa.me/?text=${encodedText}`),
    },
    {
      label: "Facebook",
      icon: "facebook",
      color: "#1877F2",
      action: () => Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
    },
    {
      label: "X / Twitter",
      icon: "twitter",
      color: "#000",
      action: () => Linking.openURL(`https://twitter.com/intent/tweet?text=${encodedText}`),
    },
    {
      label: "Telegram",
      icon: "send",
      color: "#0088CC",
      action: () => Linking.openURL(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`),
    },
    {
      label: "Email",
      icon: "mail",
      color: "#FF9500",
      action: () => Linking.openURL(`mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`),
    },
  ];

  const handleOption = (opt: ShareOption) => {
    Haptics.selectionAsync();
    opt.action();
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Share</Text>
          <Text style={styles.sheetSubtitle} numberOfLines={2}>{title}</Text>

          <View style={styles.grid}>
            {options.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => handleOption(opt)}
                style={styles.optionBtn}
              >
                <View style={[styles.optionIcon, { backgroundColor: `${opt.color}20`, borderColor: `${opt.color}44` }]}>
                  <Feather name={opt.icon as any} size={22} color={opt.color} />
                </View>
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  sheetSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginBottom: 20,
  },
  optionBtn: {
    width: (SW - 80) / 4,
    alignItems: "center",
    gap: 6,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  optionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cancelText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
