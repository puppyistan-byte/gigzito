import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
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
const gzFlashLogo = require("@/assets/images/gz-flash-logo.png");
const gzLogo = require("@/assets/images/gz-logo.png");

const NAV_ITEMS: {
  label: string;
  icon?: string;
  image?: any;
  route: string;
  accentColor?: string;
}[] = [
  { label: "Home",     icon: "home",        route: "/(tabs)" },
  { label: "GeeZee",   image: gzLogo,       route: "/(tabs)/geezee" },
  { label: "GZ Flash", image: gzFlashLogo,  route: "/(tabs)/gzflash", accentColor: "#3B82F6" },
  { label: "Events",   icon: "zap",         route: "/(tabs)/events" },
  { label: "Live",     icon: "radio",       route: "/(tabs)/live" },
  { label: "Profile",  icon: "user",        route: "/(tabs)/profile" },
];

const CATEGORIES = [
  "All Videos",
  "Music Gigs",
  "Events",
  "Influencers",
  "Marketing",
  "Courses",
  "Products",
  "Crypto",
  "Artists/Arts",
  "Business",
  "Flash Sale",
  "Flash Coupons",
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NavigationMenu({ open, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const [catsOpen, setCatsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Videos");
  const catsHeight = useRef(new Animated.Value(0)).current;

  const CAT_ITEM_H = 42;
  const CAT_MAX_H = CATEGORIES.length * CAT_ITEM_H;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: open ? 0 : -DRAWER_W,
      useNativeDriver: true,
      tension: 65,
      friction: 13,
    }).start();
    if (!open) setCatsOpen(false);
  }, [open]);

  useEffect(() => {
    Animated.timing(catsHeight, {
      toValue: catsOpen ? CAT_MAX_H : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [catsOpen]);

  const handleNav = (route: string) => {
    Haptics.selectionAsync();
    onClose();
    setTimeout(() => router.push(route as any), 50);
  };

  const handleCategory = (cat: string) => {
    Haptics.selectionAsync();
    setActiveCategory(cat);
    onClose();
    setTimeout(() => router.push("/(tabs)" as any), 50);
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

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.navList}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.route);
              const accent = item.accentColor ?? Colors.accent;
              return (
                <Pressable
                  key={item.label}
                  onPress={() => handleNav(item.route)}
                  style={[styles.navItem, active && { backgroundColor: `${accent}12` }]}
                >
                  <View style={[
                    styles.navIconWrap,
                    active && { backgroundColor: `${accent}20` },
                  ]}>
                    {item.image ? (
                      <Image
                        source={item.image}
                        style={styles.navIconImg}
                        resizeMode="contain"
                      />
                    ) : (
                      <Feather
                        name={item.icon as any}
                        size={20}
                        color={active ? accent : Colors.textSecondary}
                      />
                    )}
                  </View>
                  <Text style={[styles.navLabel, active && { color: Colors.textPrimary, fontFamily: "Inter_600SemiBold" }]}>
                    {item.label}
                  </Text>
                  {active && <View style={[styles.activeDot, { backgroundColor: accent }]} />}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setCatsOpen((v) => !v);
            }}
            style={styles.catHeader}
          >
            <View style={styles.catHeaderLeft}>
              <View style={styles.navIconWrap}>
                <Feather name="grid" size={20} color={Colors.textSecondary} />
              </View>
              <Text style={styles.catHeaderLabel}>Categories</Text>
            </View>
            <Feather
              name={catsOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.textMuted}
            />
          </Pressable>

          <Animated.View style={{ height: catsHeight, overflow: "hidden" }}>
            <View style={styles.catList}>
              {CATEGORIES.map((cat) => {
                const isActiveCat = activeCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => handleCategory(cat)}
                    style={[styles.catItem, isActiveCat && styles.catItemActive]}
                  >
                    {isActiveCat && (
                      <View style={styles.catBullet} />
                    )}
                    <Text style={[styles.catLabel, isActiveCat && styles.catLabelActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

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
    marginBottom: 4,
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
  navIconImg: {
    width: 24,
    height: 24,
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
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  catHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  catHeaderLabel: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  catList: {
    paddingLeft: 16,
    paddingBottom: 8,
  },
  catItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 10,
  },
  catItemActive: {
    backgroundColor: `${Colors.accent}10`,
  },
  catBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  catLabel: {
    color: Colors.textMuted,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  catLabelActive: {
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  drawerFooter: {
    paddingTop: 8,
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
