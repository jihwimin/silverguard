1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
// template
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Shield } from "lucide-react-native";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Stack.Screen options={{ title: "페이지를 찾을 수 없습니다" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>

        <View style={styles.iconBg}>
          <Shield size={40} color={Colors.textTertiary} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>페이지를 찾을 수 없습니다</Text>
        <Text style={styles.subtitle}>요청하신 화면이 존재하지 않습니다.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
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
    padding: 20,
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
    fontWeight: "bold",
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});
