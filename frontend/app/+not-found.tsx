import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Shield } from "lucide-react-native";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "페이지를 찾을 수 없습니다" }} />
      <View style={styles.container}>
        <View style={styles.iconBg}>
          <Shield size={40} color={Colors.textTertiary} strokeWidth={1.5} />
        </View>
        
        <Text style={styles.title}>페이지를 찾을 수 없습니다</Text>
        <Text style={styles.subtitle}>요청하신 화면이 존재하지 않습니다.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>홈으로 돌아가기</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: Colors.background,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textTertiary,
    marginBottom: 24,
  },
  link: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});