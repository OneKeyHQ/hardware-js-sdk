export type PortfolioCaseExpectation = 'accept' | 'reject' | 'client-block';

export type PortfolioCaseDefinition = {
  id: string;
  title: string;
  description: string;
  expected: PortfolioCaseExpectation;
  expectedError?: string;
  package?: string;
  payload: Record<string, unknown>;
};

export type PortfolioCasesManifest = {
  version: number;
  firmwareCommit: string;
  intervalMs: number;
  cases: PortfolioCaseDefinition[];
};

type PortfolioTokenAmounts = {
  balance?: unknown;
  fiatValue?: unknown;
};

export function countSignificantAsciiDigits(value: string): number {
  return value.replace(/[^0-9]/g, '').replace(/^0+/, '').length;
}

export function getPortfolioDisplayAmounts(payload: Record<string, unknown>): string[] {
  const amounts: unknown[] = [payload.totalFiat];
  if (Array.isArray(payload.tokens)) {
    payload.tokens.forEach(token => {
      if (token && typeof token === 'object') {
        const tokenAmounts = token as PortfolioTokenAmounts;
        amounts.push(tokenAmounts.balance, tokenAmounts.fiatValue);
      }
    });
  }
  if (payload.otherTokens && typeof payload.otherTokens === 'object') {
    amounts.push((payload.otherTokens as { fiat?: unknown }).fiat);
  }
  return amounts.filter((amount): amount is string => typeof amount === 'string');
}

export function validatePortfolioSignificantDigits(
  payload: Record<string, unknown>
): string | null {
  const invalidAmount = getPortfolioDisplayAmounts(payload).find(
    amount => countSignificantAsciiDigits(amount) > 7
  );
  return invalidAmount ? `金额字符串超过 7 位有效数字：${invalidAmount}` : null;
}

export function getExpectationLabel(expected: PortfolioCaseExpectation): string {
  if (expected === 'accept') return '固件接受';
  if (expected === 'reject') return '固件拒绝';
  return '客户端拦截';
}
