import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";

type Props = {
  label: string;
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
  small?: boolean;
};

export function Badge({ label, color, bgColor, style, small }: Props) {
  return (
    <View
      style={[
        styles.badge,
        small && styles.small,
        bgColor ? { backgroundColor: bgColor } : null,
        style,
      ]}
    >
      <Text style={[styles.text, small && styles.smallText, color ? { color } : null]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  smallText: {
    fontSize: 10,
  },
});
