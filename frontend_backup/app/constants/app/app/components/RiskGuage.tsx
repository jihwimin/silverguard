
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
109
110
111
112
113
114
115
116
117
118
119
120
121
122
123
124
125
126
127
128
129
130
131
132
133
134
135
136
137
138
139
140
141
142
143
144
145
146
147
148
149
150
151
152
153
154
155
156
157
import React, { useEffect, useRef, useState } from 'react';
    return () => clearInterval(timer);
  }, [value]);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: animatedOpacity, transform: [{ scale: animatedScale }] },
      ]}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.borderLight}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(displayValue)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.valueText, { color: getColor(displayValue) }]}>
          {displayValue}%
        </Text>
        <View style={[styles.labelChip, { backgroundColor: getLabelBg(displayValue) }]}>
          <Text style={[styles.labelText, { color: getLabelColor(displayValue) }]}>
            {getLabel(displayValue)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 48,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  labelChip: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
