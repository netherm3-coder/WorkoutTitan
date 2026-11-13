/**
 * Whether the person has the premium subscription.
 *
 * There is nothing to buy yet: purchases arrive with the store stage, and this is the one
 * place they will plug into. Until then nobody is premium, and everything that asks is
 * already written against the answer.
 */
export function usePremium(): boolean {
  return false;
}
