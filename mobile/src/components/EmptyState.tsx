import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../theme';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Centered message for empty lists, errors and "sign in required" states. */
export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.box}>
      <Text style={typography.h3}>{title}</Text>
      {body ? <Text style={[typography.muted, styles.body]}>{body}</Text> : null}
      {actionLabel && onAction ? <Button small label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 10, padding: 24 },
  body: { textAlign: 'center' },
});
