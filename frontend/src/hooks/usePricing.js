import { useMemo } from 'react';
import { calculatePricing } from '../utils/pricing';

export function usePricing(registration) {
  return useMemo(() => calculatePricing(registration), [registration]);
}
