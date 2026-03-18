import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGeeZeeCards, useEngageLeaderboard, useLoveLeaderboard } from "@/hooks/useApi";
import { GeeZeeCardItem } from "@/components/GeeZeeCardItem";
import { GeeZeeFullCard } from "@/components/GeeZeeFullCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import { NavigationMenu } from "@/components/NavigationMenu";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const TABS = ["Cards", "Top Loved", "Most Engaged"];

const PLACEHOLDER_CARDS = [
  {
    id: "p1",
    displayName: "Here for the party",
    username: "instig8r",
    subscriptionTier: "GZLurker",
    category: "Social",
    ageRange: "40+",
    gender: "Female",
    bio: "Here for the vibes and good energy only. Life's too short to not be living your best life on Gigzito!",
    engageCount: 1,
  },
  {
    id: "p2",
    displayName: "The Music Mogul",
    username: "musicgz",
    subscriptionTier: "GZMarketerPro",
    category: "Music Gigs",
    bio: "Making beats and taking names. Booking available for events, shows, and studio sessions.",
    engageCount: 47,
  },
  {
    id: "p3",
    displayName: "Business First",
    username: "bizboss",
    subscriptionTier: "GZBusiness",
    category: "Business",
    bio: "Building something great every single day. Entrepreneur, visionary, and Gigzito power user.",
    engageCount: 23,
  },
  {
    id: "p4",
    displayName: "Flash Queen",
    username: "flashq",
    subscriptionTier: "GZLurker",
    category: "Flash Sale",
    bio: "Best deals you've never seen before. Flash Sales drop every Friday — follow to stay notified.",
    engageCount: 8,
  },
  {
    id: "p5",
    displayName: "Crypto Bro",
    username: "cryptobro",
    subscriptionTier: "GZMarketerPro",
    category: "Crypto",
    bio: "Web3 enthusiast. Building the future one block at a time.",
    engageCount: 112,
  },
  {
    id: "p6",
    displayName: "Artist in Motion",
    username: "artmotion",
    subscriptionTier: "GZLurker",
    category: "Artists/Arts",
    bio: "Painter, muralist, and digital creator. Commissions open.",
    engageCount: 19,
  },
];

export default function GeeZeeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gridMode, setGridMode] = useState(false);
  const [listHeight, setListHeight] = useState(600);

  const { data: cards, isLoading: cardsLoading, refetch: refetchCards, isRefetching: refetchingCards } = useGeeZeeCards();
  const { data: loveBoard,   isLoading: loveLoading,   refetch: refetchLove   } = useLoveLeaderboard();
  const { data: engageBoard, isLoading: engageLoading, refetch: refetchEngage } = useEngageLeaderboard();

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const apiData     = activeTab === 0 ? cards : activeTab === 1 ? loveBoard : engageBoard;
  const activeLoading = activeTab === 0 ? cardsLoading : activeTab === 1 ? loveLoading : engageLoading;
  const onRefresh   = activeTab === 0 ? refetchCards : activeTab === 1 ? refetchLove : refetchEngage;

  const displayData = (apiData && apiData.length > 0) ? apiData : PLACEHOLDER_CARDS;

