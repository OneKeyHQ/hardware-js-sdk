import type { MultisigTestCase, ValidationIssue } from './types';
import { validateMultisigCase } from './validation';

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function setByPath(
  source: Record<string, unknown>,
  path: Array<string | number>,
  value: unknown
): Record<string, unknown> {
  const update = (current: unknown, remaining: Array<string | number>): unknown => {
    if (remaining.length === 0) return value;
    const [segment, ...rest] = remaining;

    if (typeof segment === 'number') {
      const next = Array.isArray(current) ? [...current] : [];
      next[segment] = update(next[segment], rest);
      return next;
    }

    const record =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {};
    return {
      ...record,
      [segment]: update(record[segment], rest),
    };
  };

  return update(source, path) as Record<string, unknown>;
}

export function applyJsonDraft(
  draft: string,
  testCase: MultisigTestCase
): { parameters?: Record<string, unknown>; issues: ValidationIssue[] } {
  let parameters: unknown;
  try {
    parameters = JSON.parse(draft);
  } catch {
    return { issues: [{ path: '$', message: 'JSON 格式无效' }] };
  }

  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    return { issues: [{ path: '$', message: '请求参数必须是 JSON 对象' }] };
  }

  const candidate = {
    ...testCase,
    parameters: parameters as Record<string, unknown>,
  };
  const validation = validateMultisigCase(candidate);
  if (!validation.valid) return { issues: validation.issues };

  return {
    parameters: cloneValue(candidate.parameters),
    issues: [],
  };
}

export function cloneAsCustomCase(
  testCase: MultisigTestCase,
  id: string,
  title = `${testCase.title} 副本`
): MultisigTestCase {
  return {
    ...cloneValue(testCase),
    id,
    title,
    source: 'custom',
    builtIn: false,
  };
}
