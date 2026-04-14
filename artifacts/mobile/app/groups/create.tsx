import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreateGroup } from "@/hooks/useApi";
import Colors from "@/constants/colors";

const PURPLE = "#60a5fa";

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const createGroup = useCreateGroup();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const isValid = name.trim().length > 0;

  const submit = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createGroup.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
        isPrivate,
      },
      {
        onSuccess: (data) => {
          router.replace(`/groups/${data.id}` as any);
        },
        onError: (e: any) => {
          Alert.alert("Error", e?.message ?? "Could not create group.");
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Create Group</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconPreview}>
          <Feather name="users" size={40} color={PURPLE} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Group Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Phoenix Marketers"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={80}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="What is this group about?"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Cover Image URL (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={Colors.textMuted}
            value={coverUrl}
            onChangeText={setCoverUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Private Group</Text>
            <Text style={styles.toggleSub}>Members join by invite or request only</Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={(v) => { setIsPrivate(v); Haptics.selectionAsync(); }}
            trackColor={{ false: Colors.surfaceBorder, true: PURPLE }}
            thumbColor="#fff"
          />
        </View>

        <Pressable
          style={[styles.submitBtn, { opacity: isValid ? 1 : 0.4 }]}
          onPress={submit}
          disabled={createGroup.isPending || !isValid}
        >
          {createGroup.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="users" size={18} color="#fff" />
              <Text style={styles.submitText}>Create Group</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  body: {
    padding: 20,
    gap: 20,
  },
  iconPreview: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: `${PURPLE}22`,
    alignSelf: "center",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  field: {
    gap: 8,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputMulti: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
  },
  toggleLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  toggleSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
