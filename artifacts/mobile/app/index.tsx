import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function Index() {
  const { isLoading, token } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (token) return <Redirect href="/(tabs)" />;
  return <Redirect href="/auth/login" />;
}
