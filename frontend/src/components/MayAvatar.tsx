import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const mayCharImage = require('../../assets/may_character.png');

type Props = { size?: number; showStatus?: boolean; showRing?: boolean };

export default function MayAvatar({ size = 48, showStatus = false, showRing = false }: Props) {
  const ringSize = size + (showRing ? 8 : 0);
  return (
    <View style={[styles.wrap, { width: ringSize, height: ringSize }]}>
      {showRing && <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]} />}
      <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={mayCharImage} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
      {showStatus && <View style={[styles.statusDot, { right: showRing ? 2 : -1, bottom: showRing ? 2 : -1 }]} />}
    </View>
  );
}

export function MayCharacter({ size = 160 }: { size?: number }) {
  return (
    <View style={[charStyles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={mayCharImage} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

export function MayBubble({ message, colors }: { message: string; colors: any }) {
  return (
    <View style={[bubbleStyles.wrap, { backgroundColor: colors.surface }]}>
      <View style={bubbleStyles.header}>
        <MayAvatar size={32} showStatus />
        <Text style={[bubbleStyles.name, { color: colors.primary }]}>May</Text>
      </View>
      <Text style={[bubbleStyles.message, { color: colors.text_primary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: '#A688FA40' },
  avatarContainer: {
    overflow: 'hidden', backgroundColor: '#0a0a1a',
    shadowColor: '#7C4DFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  statusDot: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#34C759', borderWidth: 2, borderColor: '#fff',
  },
});

const charStyles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#0a0a1a' },
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
