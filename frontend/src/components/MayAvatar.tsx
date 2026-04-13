import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, withDelay, Easing, withSpring,
} from 'react-native-reanimated';

export type MayExpression = 'normal' | 'happy' | 'thinking' | 'wink' | 'surprised';

type AvatarProps = { size?: number; showStatus?: boolean; showRing?: boolean; expression?: MayExpression; animate?: boolean };

export default function MayAvatar({ size = 48, showStatus = false, showRing = false, expression = 'normal', animate = true }: AvatarProps) {
  const ringSize = size + (showRing ? 10 : 0);
  return (
    <View style={[avStyles.wrap, { width: ringSize, height: ringSize }]}>
      {showRing && <View style={[avStyles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]} />}
      <View style={[avStyles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        <MayBody size={size * 0.85} expression={expression} animate={animate} compact={size < 50} />
      </View>
      {showStatus && <View style={[avStyles.statusDot, { right: showRing ? 2 : -1, bottom: showRing ? 2 : -1 }]} />}
    </View>
  );
}

export function MayCharacter({ size = 160, expression = 'normal', animate = true }: { size?: number; expression?: MayExpression; animate?: boolean }) {
  return (
    <View style={[charStyles.wrap, { width: size, height: size }]}>
      <MayBody size={size * 0.8} expression={expression} animate={animate} compact={false} />
    </View>
  );
}

function MayBody({ size, expression, animate, compact }: { size: number; expression: MayExpression; animate: boolean; compact: boolean }) {
  const blinkY = useSharedValue(1);
  const floatY = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;
    // Blink
    const blinkLoop = () => {
      blinkY.value = withSequence(
        withTiming(0.05, { duration: 80, easing: Easing.ease }),
        withTiming(1, { duration: 120, easing: Easing.ease }),
      );
    };
    const blinkInterval = setInterval(blinkLoop, 2800 + Math.random() * 2000);
    blinkLoop();
    // Float
    floatY.value = withRepeat(
      withSequence(
        withTiming(-size * 0.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(size * 0.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ), -1, true
    );
    // Breathe
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.98, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ), -1, true
    );
    return () => clearInterval(blinkInterval);
  }, [animate]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));
  const breatheStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));
  const leftEyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: expression === 'happy' ? 0.15 : expression === 'wink' ? 0.15 : blinkY.value }],
  }));
  const rightEyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: expression === 'happy' ? 0.15 : blinkY.value }],
  }));

  const s = size;
  const bodyW = s * 0.88;
  const bodyH = s * 0.76;
  const eyeW = s * 0.095;
  const eyeH = s * 0.115;
  const eyeGap = s * 0.18;
  const eyeOffsetY = -bodyH * 0.05;

  return (
    <Animated.View style={[bodyStyles.floater, floatStyle]}>
      <Animated.View style={[breatheStyle, { alignItems: 'center' }]}>
        {/* Glow */}
        <View style={[bodyStyles.glow, { width: bodyW * 1.4, height: bodyH * 1.4, borderRadius: bodyW * 0.7, top: -bodyH * 0.2, opacity: 0.12 }]} />

        {/* Body */}
        <View style={[bodyStyles.body, {
          width: bodyW, height: bodyH,
          borderTopLeftRadius: bodyW * 0.48,
          borderTopRightRadius: bodyW * 0.48,
          borderBottomLeftRadius: bodyW * 0.44,
          borderBottomRightRadius: bodyW * 0.44,
        }]}>
          {/* Eyes */}
          <View style={[bodyStyles.eyeRow, { marginTop: bodyH * 0.28, gap: eyeGap }]}>
            <Animated.View style={[bodyStyles.eye, leftEyeStyle, {
              width: eyeW, height: eyeH, borderRadius: eyeW * 0.5,
              transform: expression === 'thinking' ? [{ rotate: '10deg' }] : [],
            }]}>
              {expression !== 'happy' && expression !== 'wink' && (
                <View style={[bodyStyles.eyeHighlight, { width: eyeW * 0.35, height: eyeW * 0.35, borderRadius: eyeW * 0.2, top: eyeH * 0.15, right: eyeW * 0.1 }]} />
              )}
            </Animated.View>

            <Animated.View style={[bodyStyles.eye, rightEyeStyle, {
              width: eyeW, height: eyeH, borderRadius: eyeW * 0.5,
              transform: expression === 'thinking' ? [{ rotate: '-10deg' }] : [],
            }]}>
              {expression !== 'happy' && (
                <View style={[bodyStyles.eyeHighlight, { width: eyeW * 0.35, height: eyeW * 0.35, borderRadius: eyeW * 0.2, top: eyeH * 0.15, right: eyeW * 0.1 }]} />
              )}
            </Animated.View>
          </View>

          {/* Blush */}
          {!compact && (
            <View style={[bodyStyles.blushRow, { marginTop: bodyH * 0.02, gap: eyeGap * 1.6 }]}>
              <View style={[bodyStyles.blush, { width: s * 0.09, height: s * 0.045, borderRadius: s * 0.025 }]} />
              <View style={[bodyStyles.blush, { width: s * 0.09, height: s * 0.045, borderRadius: s * 0.025 }]} />
            </View>
          )}

          {/* Mouth */}
          {!compact && (
            <View style={[bodyStyles.mouthWrap, { marginTop: bodyH * 0.02 }]}>
              {expression === 'happy' ? (
                <View style={[bodyStyles.happyMouth, { width: s * 0.1, height: s * 0.05, borderBottomLeftRadius: s * 0.06, borderBottomRightRadius: s * 0.06 }]} />
              ) : expression === 'surprised' ? (
                <View style={[bodyStyles.surprisedMouth, { width: s * 0.055, height: s * 0.06, borderRadius: s * 0.03 }]} />
              ) : (
                <View style={[bodyStyles.normalMouth, { width: s * 0.07, height: s * 0.035, borderBottomLeftRadius: s * 0.04, borderBottomRightRadius: s * 0.04 }]} />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Expression cycling hook for screens that want auto-changing expressions
export function useExpressionCycle(interval = 5000): MayExpression {
  const expressions: MayExpression[] = ['normal', 'happy', 'normal', 'wink', 'normal', 'thinking'];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % expressions.length), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return expressions[idx];
}

export function MayBubble({ message, colors }: { message: string; colors: any }) {
  return (
    <View style={[bubbleStyles.wrap, { backgroundColor: colors.surface }]}>
      <View style={bubbleStyles.header}>
        <MayAvatar size={34} showStatus expression="happy" />
        <Text style={[bubbleStyles.name, { color: colors.primary }]}>May</Text>
      </View>
      <Text style={[bubbleStyles.message, { color: colors.text_primary }]}>{message}</Text>
    </View>
  );
}

const avStyles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: '#A688FA40' },
  container: {
    overflow: 'hidden', backgroundColor: '#0e0e20', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7C4DFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  statusDot: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#34C759', borderWidth: 2, borderColor: '#fff',
  },
});

const charStyles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
});

const bodyStyles = StyleSheet.create({
  floater: { alignItems: 'center' },
  glow: { position: 'absolute', backgroundColor: '#A688FA' },
  body: {
    backgroundColor: '#F8F5FF',
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    alignItems: 'center', overflow: 'hidden',
  },
  eyeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  eye: { backgroundColor: '#1a1a2e', overflow: 'hidden' },
  eyeHighlight: { position: 'absolute', backgroundColor: '#fff' },
  blushRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  blush: { backgroundColor: '#FFB7C5', opacity: 0.6 },
  mouthWrap: { alignItems: 'center' },
  normalMouth: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#2a2a4a', borderTopWidth: 0 },
  happyMouth: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#2a2a4a', borderTopWidth: 0 },
  surprisedMouth: { backgroundColor: '#2a2a4a' },
});

const bubbleStyles = StyleSheet.create({
  wrap: {
    borderRadius: 20, padding: 16, marginHorizontal: 24, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  name: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  message: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
});
