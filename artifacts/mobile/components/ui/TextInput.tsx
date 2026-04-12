import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
};

export function TextInput({ label, error, icon, containerStyle, isPassword, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // On web, keyboardType="email-address" maps to type="email" which shows
  // the browser's built-in validation popup. Force type="text" on web and
  // rely on inputMode for the correct mobile keyboard hint instead.
  const webOverrides: any =
    Platform.OS === "web" && props.keyboardType === "email-address"
      ? { type: "text", inputMode: "email" }
      : {};

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.focused,
          !!error && styles.errorBorder,
        ]}
      >
        {icon ? (
          <Feather name={icon} size={18} color={focused ? Colors.accent : Colors.textMuted} style={styles.icon} />
        ) : null}
        <RNTextInput
          {...props}
          {...webOverrides}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, icon && styles.inputWithIcon]}
        />
        {isPassword ? (
          <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={18}
              color={Colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 16,
    height: 52,
  },
  focused: {
    borderColor: Colors.accent,
  },
  errorBorder: {
    borderColor: Colors.danger,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  inputWithIcon: {
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  error: {
    color: Colors.danger,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },
});
