import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const { width: SW } = Dimensions.get("window");
const DRAWER_W = Math.min(SW * 0.72, 300);

const logo = require("@/assets/images/gigzito-logo.png");

const NAV_ITEMS = [
  { label: "Feed",    icon: "play-circle",  route: "/(tabs)" },
  { label: "GeeZee",  icon: "users",        route: "/(tabs)/geezee" },
  { label: "Events",  icon: "zap",          route: "/(tabs)/events" },
  { label: "Live",    icon: "radio",        route: "/(tabs)/live" },
  { label: "Profile", icon: "user",         route: "/(tabs)/profile" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NavigationMenu({ open, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: open ? 0 : -DRAWER_W,
      useNativeDriver: true,
      tension: 65,
      friction: 13,
    }).start();
  }, [open]);

  const handleNav = (route: string) => {
    Haptics.selectionAsync();
    onClose();
    setTimeout(() => router.push(route as any), 50);
  };

  if (!open) return null;

  const isActive = (route: string) => {
    if (route === "/(tabs)") return pathname === "/" || pathname === "/(tabs)";
    return pathname.includes(route.replace("/(tabs)/", ""));
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.drawer,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          { transform: [{ translateX }] },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.route);
            return (
              <Pressable
                key={item.label}
                onPress={() => handleNav(item.route)}
                style={[styles.navItem, active && styles.navItemActive]}
              >
                <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                  <Feather
                    name={item.icon as any}
                    size={20}
                    color={active ? Colors.accent : Colors.textSecondary}
                  />
                </View>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {active && <View style={styles.activeDot} />}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.drawerFooter}>
          <View style={styles.divider} />
          <Text style={styles.footerText}>Gigzito • Getcho Gig On</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export function HamburgerButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.hamburger}>
      <Feather name="menu" size={24} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  drawer: {
    width: DRAWER_W,
    backgroundColor: Colors.darker,
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
    paddingHorizontal: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  logo: {
    width: 130,
    height: 50,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 8,
  },
  navList: {
    gap: 4,
    marginTop: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  navItemActive: {
    backgroundColor: `${Colors.accent}12`,
  },
  navIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconWrapActive: {
    backgroundColor: `${Colors.accent}20`,
  },
  navLabel: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  navLabelActive: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  drawerFooter: {
    marginTop: "auto",
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 12,
  },
  hamburger: {
    position: "absolute",
    top: 56,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
