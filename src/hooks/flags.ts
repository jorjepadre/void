/**
 * HookFlags — per-hook flag system using environment variables.
 * Supports individual hook enable/disable via VOID_HOOK_{ID}_ENABLED
 * and bulk disable via VOID_DISABLED_HOOKS comma-separated list.
 */

export class HookFlags {
  /**
   * Checks if a hook is enabled via VOID_HOOK_{ID}_ENABLED env var.
   * Returns true if the env var is not set (default enabled).
   */
  isEnabled(hookId: string): boolean {
    if (this.isDisabled(hookId)) return false;

    const envKey = `VOID_HOOK_${hookId.toUpperCase().replace(/-/g, '_')}_ENABLED`;
    const envValue = process.env[envKey];

    if (envValue === undefined) return true;
    return envValue === 'true' || envValue === '1';
  }

  /**
   * Checks if a hook appears in the VOID_DISABLED_HOOKS comma-separated list.
   */
  isDisabled(hookId: string): boolean {
    const envValue = process.env['VOID_DISABLED_HOOKS'];
    if (!envValue) return false;

    const disabledSet = new Set(
      envValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    return disabledSet.has(hookId);
  }

  /**
   * Collects all VOID_HOOK_*_ENABLED overrides from the environment.
   */
  getOverrides(): Map<string, boolean> {
    const overrides = new Map<string, boolean>();
    const prefix = 'VOID_HOOK_';
    const suffix = '_ENABLED';

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix) && key.endsWith(suffix) && value !== undefined) {
        const hookPart = key.slice(prefix.length, -suffix.length);
        const hookId = hookPart.toLowerCase().replace(/_/g, '-');
        overrides.set(hookId, value === 'true' || value === '1');
      }
    }

    return overrides;
  }
}
