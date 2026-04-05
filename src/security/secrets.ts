/**
 * SecretRedactor — detects and redacts secrets from text and objects.
 * Prevents accidental leakage of credentials in logs, outputs, and tool results.
 */

export interface SecretPatternDef {
  name: string;
  pattern: string;
  severity: string;
}

export interface DetectedSecret {
  name: string;
  severity: string;
  match: string;
}

/** Built-in patterns that cover common secret formats. */
const BUILTIN_PATTERNS: SecretPatternDef[] = [
  {
    name: 'AWS Access Key',
    pattern: '(?:^|[^A-Z0-9])(?:AKIA[0-9A-Z]{16})(?:$|[^A-Z0-9])',
    severity: 'critical',
  },
  {
    name: 'GitHub Token',
    pattern: '(?:ghp_|gho_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{20,}',
    severity: 'critical',
  },
  {
    name: 'JWT Token',
    pattern: 'eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}',
    severity: 'high',
  },
  {
    name: 'Private Key',
    pattern: '-----BEGIN[A-Z ]*PRIVATE KEY-----',
    severity: 'critical',
  },
  {
    name: 'Generic Secret (key=value)',
    pattern: '(?:password|secret|token|api_key|apikey|api_secret|access_token|auth_token|private_key)\\s*[=:]\\s*["\']?[A-Za-z0-9/+=_-]{8,}["\']?',
    severity: 'high',
  },
];

/** Key names that suggest a secret value. */
const SECRET_KEY_PATTERNS = /^(password|secret|token|api_key|apikey|api_secret|access_token|auth_token|private_key|credential|auth|authorization|bearer|session_key|signing_key|encryption_key|client_secret)$/i;

export class SecretRedactor {
  private readonly _compiled: Array<{
    name: string;
    regex: RegExp;
    severity: string;
  }>;

  constructor(customPatterns?: SecretPatternDef[]) {
    const allPatterns = [...BUILTIN_PATTERNS, ...(customPatterns ?? [])];
    this._compiled = allPatterns.map((p) => ({
      name: p.name,
      regex: new RegExp(p.pattern, 'gi'),
      severity: p.severity,
    }));
  }

  /**
   * Replaces all detected secrets in text with [REDACTED].
   */
  redact(text: string): string {
    let result = text;
    for (const { regex } of this._compiled) {
      // Reset lastIndex since we reuse the regex
      regex.lastIndex = 0;
      result = result.replace(regex, '[REDACTED]');
    }
    return result;
  }

  /**
   * Deep-clones an object and redacts all string values.
   */
  redactObject(obj: unknown): unknown {
    return this._deepRedact(obj, new WeakSet());
  }

  /**
   * Checks if a key name suggests it holds a secret value.
   */
  isSecret(key: string): boolean {
    return SECRET_KEY_PATTERNS.test(key);
  }

  /**
   * Detects all secrets in text and returns detailed findings.
   * Useful for gate checks that need to enumerate violations.
   */
  detect(text: string): DetectedSecret[] {
    const results: DetectedSecret[] = [];
    for (const { name, regex, severity } of this._compiled) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        results.push({
          name,
          severity,
          match: match[0],
        });
        // Prevent infinite loops on zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }
    return results;
  }

  private _deepRedact(value: unknown, seen: WeakSet<object>): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.redact(value);
    }

    if (typeof value !== 'object') {
      return value;
    }

    // Guard against circular references
    const obj = value as object;
    if (seen.has(obj)) {
      return '[Circular]';
    }
    seen.add(obj);

    if (Array.isArray(value)) {
      return value.map((item) => this._deepRedact(item, seen));
    }

    // Plain object
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (this.isSecret(k) && typeof v === 'string') {
        result[k] = '[REDACTED]';
      } else {
        result[k] = this._deepRedact(v, seen);
      }
    }
    return result;
  }
}
