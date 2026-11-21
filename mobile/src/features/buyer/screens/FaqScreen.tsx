import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, EmptyState, Header, Icon, Screen } from '../../../components';
import { colors, typography } from '../../../theme';
import { useFaqCategories, useFaqs } from '../hooks/useContent';

export function FaqScreen() {
  const [category, setCategory] = useState<string>();
  const [open, setOpen] = useState<number>();
  const categories = useFaqCategories();
  const faqs = useFaqs(category);

  return (
    <Screen>
      <Header title="Support & Help" subtitle="Frequently asked questions" />
      <View style={styles.tabs}>
        <Chip label="All" active={!category} onPress={() => setCategory(undefined)} />
        {(categories.data ?? []).map(c => (
          <Chip key={c.key} label={c.label} active={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </View>
      {faqs.error ? <EmptyState title="Could not load FAQs" body={faqs.error.message} actionLabel="Retry" onAction={faqs.reload} /> : null}
      {faqs.loading && !faqs.data ? <EmptyState title="Loading…" /> : null}
      {!faqs.loading && !faqs.error && faqs.data?.length === 0 ? <EmptyState title="No questions here yet" /> : null}
      {(faqs.data ?? []).map(f => {
        const expanded = open === f.id;
        return (
          <Card key={f.id} style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? undefined : f.id)}
              style={styles.question}>
              <Text style={[typography.h3, styles.flex]}>{f.question}</Text>
              <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </Pressable>
            {expanded ? <Text style={[typography.body, styles.answer]}>{f.answer}</Text> : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  card: { marginHorizontal: 16, marginBottom: 10 },
  question: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  answer: { marginTop: 8, lineHeight: 20 },
});
