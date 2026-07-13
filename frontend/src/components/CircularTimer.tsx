import React, { useEffect } from "react";
import { View, Platform } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "@/src/lib/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CircularTimer = React.memo(function CircularTimer({
  size = 64,
  strokeWidth = 6,
  progress,
  period,
  children,
  testID,
}: Props) {
  const isWeb = Platform.OS === "web";
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const anim = useSharedValue(progress);

  useEffect(() => {
    if (isWeb) {
      anim.value = progress;
    } else {
      anim.value = withTiming(progress, {
        duration: 1000,
        easing: Easing.linear,
      });
    }
  }, [progress, isWeb]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - anim.value),
  }));

  const gradientId = `grad-${size}`;
  const nearEnd = progress < 0.2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} testID={testID}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={nearEnd ? colors.warning : colors.primary} stopOpacity="1" />
            <Stop offset="1" stopColor={nearEnd ? colors.danger : colors.secondary} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
});
