import React, { useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useListings, useToggleLike, useVideoLikes } from "@/hooks/useApi";
import { VideoCard } from "@/components/VideoCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

const CATEGORIES = ["All", "Music", "Comedy", "Business", "Art", "Sports", "Tech", "Lifestyle"];

function VideoCardWithLikes({ item }: { item: any }) {
  const { data: likesData } = useVideoLikes(item.id);
  const { mutate: toggleLike } = useToggleLike(item.id);
  return (
    <VideoCard
      item={item}
      onLike={() => toggleLike()}
      likeCount={likesData?.count ?? likesData?.likes ?? 0}
    />
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: listings, isLoading, refetch, isRefetching } = useListings(
    category || undefined,
    searchQuery || undefined
  );

  const handleSearch = () => setSearchQuery(search);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.header}>
        <Image source={require("@/assets/images/gigzito-logo.png")} style={styles.logoImage} resizeMode="contain" />
        <Feather name="bell" size={22} color={Colors.textSecondary} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={Colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            placeholder="Search listings..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => { setSearch(""); setSearchQuery(""); }}>
              <Feather name="x" size={16} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
        renderItem={({ item: cat }) => (
          <Pressable
            onPress={() => setCategory(cat === "All" ? "" : cat)}
            style={[styles.catChip, (cat === "All" ? !category : category === cat) && styles.catChipActive]}
          >
            <Text style={[(cat === "All" ? !category : category === cat) ? styles.catTextActive : styles.catText]}>
              {cat}
            </Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={listings ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <VideoCardWithLikes item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="video"
              title="No listings found"
              subtitle="Try adjusting your search or category filter"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  logoImage: {
    width: 140,
    height: 48,
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  catList: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  catChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  catText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  catTextActive: {
    color: Colors.darker,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
