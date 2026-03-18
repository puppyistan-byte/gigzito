import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { useListings } from "@/hooks/useApi";
import { FeedCard } from "@/components/FeedCard";
import Colors from "@/constants/colors";

const { height: SH } = Dimensions.get("window");

function EmptyFeed() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🎬</Text>
      <Text style={styles.emptyTitle}>No listings yet</Text>
      <Text style={styles.emptySubtitle}>Check back soon for new content</Text>
    </View>
  );
}

function LoadingFeed() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}

export default function FeedScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: listings, isLoading, refetch, isRefetching } = useListings();

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  if (isLoading) return <LoadingFeed />;

  const items = listings ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <FeedCard item={item} isActive={index === activeIndex} />
        )}
        pagingEnabled
        snapToInterval={SH}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: SH, offset: SH * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={refetch}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
        ListEmptyComponent={<EmptyFeed />}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loading: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    height: SH,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#000",
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
