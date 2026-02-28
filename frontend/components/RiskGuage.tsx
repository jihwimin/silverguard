import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg'; // 🌟 Svg 라이브러리 임포트 추가
import Colors from '../constants/colors';

// 🌟 Props 타입 정의 추가
interface RiskGaugeProps {
  value: number;
  size?: number;
  animated?: boolean;
}

// 🌟 함수 시작 부분과 내보내기(export default) 추가
export default function RiskGauge({ value, size = 200, animated = true }: RiskGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(0.9)).current;
  
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (circumference * displayValue) / 100;

  // 색상 및 라벨 유틸리티 함수들
  const getColor = (v: number) => {
    if (v >= 80) return Colors.danger;
    if (v >= 50) return Colors.caution;
    return Colors.safe;
  };

  const getLabel = (v: number) => {
    if (v >= 80) return '고위험';
    if (v >= 50) return '주의';
    return '안전';
  };

  const getLabelBg = (v: number) => {
    if (v >= 80) return Colors.dangerBg;
    if (v >= 50) return Colors.cautionBg;
    return Colors.safeBg;
  };

  const getLabelColor = (v: number) => getColor(v);

  useEffect(() => {
    // 등장 애니메이션
    Animated.parallel([
      Animated.timing(animatedOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(animatedScale, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    // 숫자 카운트업 애니메이션 [cite: 2026-02-28]
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    const duration = 1500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

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
        {/* 배경 원 */}
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
        {/* 위험도 표시 원 */}
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