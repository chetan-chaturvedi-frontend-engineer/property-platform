import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Screen, SectionTitle, Stepper } from '../../../components';
import { colors, radius, typography } from '../../../theme';
import { formatCompactPrice, formatRupees } from '../../../utils/format';
import { useEmiCalculator } from '../hooks/useEmiCalculator';

const banks = [
  { name: 'State Bank of India', rate: '8.40%' },
  { name: 'HDFC Bank', rate: '8.50%' },
  { name: 'ICICI Bank', rate: '8.60%' },
  { name: 'Kotak Mahindra', rate: '8.75%' },
];

export function EmiCalculatorScreen() {
  const c = useEmiCalculator();
  const principalShare = c.loanAmount / (c.result.totalPayment || 1);

  return (
    <Screen>
      <Header title="Loan & EMI Calculator" subtitle="Calculate your home loan EMI and plan better" />
      <Card style={styles.card}>
        <Stepper label="Property Price" value={c.price} display={formatRupees(c.price)} step={500000} min={1000000} max={50000000} onChange={c.setPrice} />
        <Stepper label="Down Payment (%)" value={c.downPct} display={`${c.downPct}%  •  ${formatRupees((c.price * c.downPct) / 100)}`} step={5} min={5} max={90} onChange={c.setDownPct} />
        <View style={styles.loan}><Text style={typography.muted}>Loan Amount</Text><Text style={typography.h3}>{formatCompactPrice(c.loanAmount)}</Text></View>
        <Stepper label="Interest Rate (p.a.)" value={c.rate} display={`${c.rate.toFixed(2)}%`} step={0.25} min={6} max={15} onChange={c.setRate} />
        <Stepper label="Loan Tenure" value={c.years} display={`${c.years} Years`} step={1} min={5} max={30} onChange={c.setYears} />
      </Card>

      <Card style={[styles.card, styles.result]}>
        <Text style={typography.muted}>Your Monthly EMI</Text>
        <Text style={styles.emi}>{formatRupees(c.result.emi)}<Text style={typography.muted}> /month</Text></Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { flex: principalShare }]} />
          <View style={[styles.barInterest, { flex: 1 - principalShare }]} />
        </View>
        <View style={styles.split}>
          <View><Text style={typography.tiny}>Principal</Text><Text style={typography.h3}>{formatRupees(c.loanAmount)}</Text></View>
          <View><Text style={typography.tiny}>Total Interest</Text><Text style={typography.h3}>{formatRupees(c.result.totalInterest)}</Text></View>
          <View><Text style={typography.tiny}>Total Payment</Text><Text style={typography.h3}>{formatRupees(c.result.totalPayment)}</Text></View>
        </View>
      </Card>

      <SectionTitle title="Lowest Home Loan Interest Rates" />
      <View style={styles.banks}>
        {banks.map(b => (
          <Card key={b.name} style={styles.bank}>
            <Text style={typography.h3} numberOfLines={1}>{b.name}</Text>
            <Text style={styles.rate}>{b.rate} p.a.</Text>
            <Button small variant="soft" label="Apply Now" />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8 },
  loan: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  result: { backgroundColor: colors.primaryTint },
  emi: { fontSize: 30, fontWeight: '700', color: colors.primary, marginVertical: 4 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginVertical: 10 },
  barFill: { backgroundColor: colors.primary },
  barInterest: { backgroundColor: colors.warning },
  split: { flexDirection: 'row', justifyContent: 'space-between' },
  banks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  bank: { width: '47%', gap: 4, borderRadius: radius.md },
  rate: { color: colors.success, fontWeight: '700' },
});
