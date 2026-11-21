import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../../theme';
import { ChatMessage } from '../../../types';
import { formatListTime } from '../../../utils/dates';

export function ChatBubble({ message }: { message: ChatMessage }) {
  return (
    <View style={[styles.wrap, message.fromMe ? styles.right : styles.left]}>
      <View style={[styles.bubble, message.fromMe ? styles.mine : styles.theirs]}>
        <Text style={[typography.body, message.fromMe && { color: colors.textInverse }]}>{message.text}</Text>
      </View>
      <Text style={typography.tiny}>{formatListTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '80%', marginBottom: 12, gap: 2 },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { padding: 10, borderRadius: radius.lg },
  mine: { backgroundColor: colors.primary },
  theirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
