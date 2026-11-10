import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Header, Screen } from '../../../components';
import { env } from '../../../config/env';
import { RootScreenProps } from '../../../navigation/types';
import { typography } from '../../../theme';

const content = {
  privacy: {
    title: 'Privacy Policy',
    url: env.privacyPolicyUrl,
    body: [
      'What we collect: account details you provide (name, phone, email), property preferences, bookings, messages, and for sellers the listing details and identity documents you upload.',
      'How we use it: to run the app, connect buyers and sellers, schedule visits, prevent fraud and provide support.',
      'Sharing: we share details with a seller or builder only when you enquire or book. We do not sell personal data.',
      'Your choices: you can access, correct or delete your data, including deleting your account in Settings → Delete Account.',
      'Contact: ' + env.supportEmail,
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    url: env.termsUrl,
    body: [
      'Listings are provided by sellers and builders; verify details, RERA status and documents before transacting.',
      'Prices shown with * are starting prices and may change.',
      'You must provide accurate information and may not post misleading or unlawful listings.',
      'We may suspend accounts that breach these terms.',
    ],
  },
} as const;

/** DRAFT text only. Replace with counsel-approved policy text and real URLs in src/config/env.ts before release. */
export function LegalScreen({ route }: RootScreenProps<'Legal'>) {
  const c = content[route.params.doc];
  return (
    <Screen>
      <Header title={c.title} />
      <View style={styles.pad}>
        {c.body.map(p => <Text key={p} style={[typography.body, styles.p]}>{p}</Text>)}
        <Button variant="outline" label="Open full document" onPress={() => Linking.openURL(c.url)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, gap: 8 },
  p: { lineHeight: 20 },
});
