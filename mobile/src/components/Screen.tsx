import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  /** Sticky bar rendered below the content (CTA buttons). */
  footer?: React.ReactNode;
  backgroundColor?: string;
  edges?: Edge[];
}

export function Screen({
  children,
  scroll = true,
  footer,
  backgroundColor = colors.background,
  edges = ['top'],
}: ScreenProps) {
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor }]} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 24 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
