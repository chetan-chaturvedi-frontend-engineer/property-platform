import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScrollView as ScrollViewType } from 'react-native';
import { EmptyState, Header, IconButton, Screen, TextField } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { ChatBubble } from '../components/ChatBubble';
import { useChatMessages } from '../hooks/useChat';

export function ChatScreen({ route }: RootScreenProps<'Chat'>) {
  const { id, propertyId, title, subtitle } = route.params;
  const { messages, ready, sending, error, send } = useChatMessages({ conversationId: id, propertyId });
  const [text, setText] = useState('');
  const scroller = useRef<React.ComponentRef<typeof ScrollViewType>>(null);

  async function submit() {
    const draft = text;
    setText('');
    if (!(await send(draft))) {
      setText(draft);
    }
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <Header title={title} subtitle={subtitle} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroller} style={styles.flex} contentContainerStyle={styles.list} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
          {!ready ? <EmptyState title="Loading…" /> : null}
          {ready && messages.length === 0 ? <EmptyState title="Say hello" body="Ask about price, availability or a site visit. The owner will reply here." /> : null}
          {messages.map(m => <ChatBubble key={m.id} message={m} />)}
        </ScrollView>
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <View style={styles.composer}>
          <View style={styles.flex}>
            <TextField placeholder="Type a message…" value={text} onChangeText={setText} onSubmitEditing={submit} returnKeyType="send" maxLength={2000} />
          </View>
          <IconButton name="send" color={sending ? colors.textFaint : colors.primary} accessibilityLabel="Send message" onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, flexGrow: 1 },
  error: { ...typography.tiny, color: colors.danger, paddingHorizontal: 16, textAlign: 'center' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
