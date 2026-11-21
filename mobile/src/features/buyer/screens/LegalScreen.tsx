import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Header, Screen } from '../../../components';
import { env } from '../../../config/env';
import { RootScreenProps } from '../../../navigation/types';
import { useCmsPage } from '../hooks/useContent';
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

/** CMS page slugs managed from the admin dashboard; the bundled draft text is the offline fallback. */
const SLUGS = { privacy: 'privacy-policy', terms: 'terms-and-conditions' } as const;

/** Fallback text is a DRAFT. Publish counsel-approved pages in the CMS and set real URLs in .env before release. */
export function LegalScreen({ route }: RootScreenProps<'Legal'>) {
  const c = content[route.params.doc];
  const { data: page } = useCmsPage(SLUGS[route.params.doc]);
  const paragraphs = page ? page.body.split('\n').filter(line => line.trim().length > 0) : [...c.body];
  return (
    <Screen>
      <Header title={page?.heading ?? c.title} />
      <View style={styles.pad}>
        {paragraphs.map((p, i) => <Text key={`${i}-${p}`} style={[typography.body, styles.p]}>{p}</Text>)}
        <Button variant="outline" label="Open full document" onPress={() => Linking.openURL(c.url)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, gap: 8 },
  p: { lineHeight: 20 },
});
