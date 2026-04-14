import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const VERSION_URL =
  "https://gigzito.com/ota-dist/android/version.json";

export type UpdateInfo = {
  versionCode: number;
  version: string;
  downloadUrl: string;
  releaseNotes?: string;
};

export function useUpdateCheck() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    // Only run on Android native — web and iOS use different distribution
    if (Platform.OS !== "android") return;

    const currentCode: number =
      (Constants.expoConfig?.android?.versionCode as number) ?? 0;

    fetch(VERSION_URL, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: UpdateInfo) => {
        if (data.versionCode > currentCode) {
          setUpdate(data);
        }
      })
      .catch(() => {});
  }, []);

  return update;
}
