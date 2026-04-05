/**
 * HookProfileManager — manages hook profiles (minimal, standard, strict)
 * and filters hooks based on the active profile and disabled hooks list.
 */

import type { HookDefinition, HookProfileName } from '../types/hook.js';

const VALID_PROFILES: ReadonlySet<string> = new Set([
  'minimal',
  'standard',
  'strict',
]);

export class HookProfileManager {
  private readonly _hooks: HookDefinition[];
  private _activeProfile: HookProfileName;

  constructor(hooks: HookDefinition[]) {
    this._hooks = hooks;
    this._activeProfile = this._readProfileFromEnv();
  }

  /**
   * Returns the currently active profile.
   * Reads from VOID_HOOK_PROFILE env var, defaults to 'standard'.
   */
  getActiveProfile(): HookProfileName {
    return this._activeProfile;
  }

  /**
   * Overrides the active profile for this manager instance.
   */
  setActiveProfile(profile: HookProfileName): void {
    this._activeProfile = profile;
  }

  /**
   * Returns hooks that belong to the given profile (or the active profile).
   */
  getHooksForProfile(profile?: HookProfileName): HookDefinition[] {
    const targetProfile = profile ?? this._activeProfile;
    return this._hooks.filter(
      (hook) => hook.enabled && hook.profiles.includes(targetProfile),
    );
  }

  /**
   * Checks whether a hook is enabled (not in the VOID_DISABLED_HOOKS list).
   */
  isHookEnabled(hookId: string): boolean {
    const disabled = this._getDisabledHooks();
    return !disabled.has(hookId);
  }

  private _readProfileFromEnv(): HookProfileName {
    const envValue = process.env['VOID_HOOK_PROFILE'];
    if (envValue && VALID_PROFILES.has(envValue)) {
      return envValue as HookProfileName;
    }
    return 'standard';
  }

  private _getDisabledHooks(): Set<string> {
    const envValue = process.env['VOID_DISABLED_HOOKS'];
    if (!envValue) return new Set();
    return new Set(
      envValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
}
