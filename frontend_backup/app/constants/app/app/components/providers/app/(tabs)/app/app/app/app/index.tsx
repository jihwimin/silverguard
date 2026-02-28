
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
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
97
98
99
100
101
102
103
104
105
106
107
108
import React, { useEffect, useRef } from 'react';
        }),
      ]),
      Animated.timing(taglineFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (!hasSeenOnboarding) {
        router.replace('/onboarding');
      } else if (!isVerified) {
        router.replace('/verification');
      } else {
        router.replace('/(tabs)/home');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [isLoading, hasSeenOnboarding, isVerified]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconWrapper}>
          <Shield size={56} color={Colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.appName}>SilverGuard</Text>
      </Animated.View>
      <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
        실시간 보이스피싱 방어 솔루션
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});