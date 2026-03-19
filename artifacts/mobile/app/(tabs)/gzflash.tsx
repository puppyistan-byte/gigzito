import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useGZFlash, useClaimFlash } from "@/hooks/useApi";
import { GZFlashCard, CardSize } from "@/components/GZFlashCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";

const { width: SW } = Dimensions.get("window");
const OUTER_PAD = 12;
const ITEM_GAP = 8;

function numColsForCount(count: number): 1 | 2 | 3 {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  return 3;
}

function sizeForCols(cols: 1 | 2 | 3): CardSize {
  if (cols === 1) return "full";
  if (cols === 2) return "medium";
  return "compact";
}

export default function GZFlashScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: raw, isLoading, refetch, isRefetching } = useGZFlash();
  const { mutate: claim, isPending: claiming, variables: claimingId } = useClaimFlash();

  const listRef = useRef<FlatList>(null);
  const [showMore, setShowMore] = useState(false);
  const contentH = useRef(0);
  const listH = useRef(0);
  const scrollY = useRef(0);

  const deals = (raw ?? []).slice().sort(
    (a: any, b: any) => (b.potencyScore ?? 0) - (a.potencyScore ?? 0)
  );

  const numCols = numColsForCount(deals.length);
  const cardSize = sizeForCols(numCols);

  const handleClaim = (id: number) => {
    Haptics.impactAsync();
    claim(id);
  };

  const checkMore = useCallback(() => {
    const canScroll = contentH.current > listH.current + 40;
    const atBottom = scrollY.current >= contentH.current - listH.current - 80;
    setShowMore(canScroll && !atBottom);
  }, []);

  const handleScrollMore = () => {
    Haptics.selectionAsync();
    listRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#60A5FA" />
        </Pressable>
        <Image
          source={require("@/assets/images/gz-flash-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={styles.titleH}>GZ Flash</Text>
          <Text style={styles.subtitle}>
            {deals.length > 0
              ? `${deals.length} live deal${deals.length !== 1 ? "s" : ""} · hottest first`
              : "Limited-time deals, live now"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            key={numCols}
            data={deals}
            numColumns={numCols}
            keyExtractor={(item, idx) => String(item?.id ?? idx)}
            renderItem={({ item }) => (
              <View style={[
                styles.cellWrap,
                numCols === 1 && styles.cellFull,
              ]}>
                <GZFlashCard
                  item={item}
                  onClaim={handleClaim}
                  claiming={claiming && claimingId === item.id}
                  size={cardSize}
                />
              </View>
            )}
            columnWrapperStyle={numCols > 1 ? styles.row : undefined}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onLayout={(e) => {
              listH.current = e.nativeEvent.layout.height;
              checkMore();
            }}
            onContentSizeChange={(_w, h) => {
              contentH.current = h;
              checkMore();
            }}
            onScroll={(e) => {
              scrollY.current = e.nativeEvent.contentOffset.y;
              checkMore();
            }}
            scrollEventThrottle={100}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#3B82F6"
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="zap"
                title="No Flash Deals Active"
                subtitle="Check back soon for limited-time offers"
              />
            }
          />

          {/* Floating "more" button */}
          {showMore && (
            <Pressable
              onPress={handleScrollMore}
              style={styles.moreBtn}
            >
              <View style={styles.moreBtnInner}>
                <Text style={styles.moreBtnText}>More deals below</Text>
                <Feather name="chevrons-down" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const ROW_WIDTH = SW - OUTER_PAD * 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#070d1a",
    borderWidth: 1,
    borderColor: "#1a2030",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 44,
    height: 28,
  },
  headerText: {
    flex: 1,
  },
  titleH: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: "#60A5FA",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    backgroundColor: "#1a2030",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: OUTER_PAD,
    paddingTop: 10,
    paddingBottom: 100,
    gap: ITEM_GAP,
  },
  row: {
    gap: ITEM_GAP,
    flex: 1,
    alignItems: "stretch",
  },
  cellWrap: {
    flex: 1,
  },
  cellFull: {
    flex: 1,
  },
  moreBtn: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  moreBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
  },
  moreBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
