import { useMemo, useState } from 'react';
import { EmiResult } from '../../../types';
import { calculateEmi } from '../../../utils/emi';

export function useEmiCalculator() {
  const [price, setPrice] = useState(7500000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const loanAmount = price * (1 - downPct / 100);
  const result: EmiResult = useMemo(
    () => calculateEmi({ principal: loanAmount, annualRatePct: rate, tenureYears: years }),
    [loanAmount, rate, years],
  );

  return { price, setPrice, downPct, setDownPct, rate, setRate, years, setYears, loanAmount, result };
}
