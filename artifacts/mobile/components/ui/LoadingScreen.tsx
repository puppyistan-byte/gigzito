import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export function LoadingScreen({ label }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.accent} size="large" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

export function LoadingSpinner() {
  return (
    <View style={styles.spinner}>
      <ActivityIndicator color={Colors.accent} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  spinner: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
