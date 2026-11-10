import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Header, IconButton, Screen, TextField } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme';
import { ChatBubble } from '../components/ChatBubble';
import { useChatMessages } from '../hooks/useChat';

export function ChatScreen({ route }: RootScreenProps<'Chat'>) {
  const { id, title } = route.params;
  const { messages, send } = useChatMessages(id);
  const [text, setText] = useState('');

  const submit = () => {
    send(text);
    setText('');
  };

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <Header title={title} subtitle="Project Expert" right={<IconButton name="call-outline" accessibilityLabel="Call" />} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.list}>
          {messages.map(m => <ChatBubble key={m.id} message={m} />)}
        </ScrollView>
        <View style={styles.composer}>
          <View style={styles.flex}>
            <TextField placeholder="Type a message…" value={text} onChangeText={setText} onSubmitEditing={submit} returnKeyType="send" />
          </View>
          <IconButton name="send" color={colors.primary} accessibilityLabel="Send message" onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
