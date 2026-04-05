/**
 * Default template for .void/ generic config.
 */

export function genericTemplate(): Record<string, unknown> {
  return {
    version: '1.0',
    harness: 'generic',
    rules: {
      enabled: true,
      path: '.void/rules/',
    },
    hooks: {
      enabled: true,
      path: '.void/hooks/',
    },
    commands: {
      enabled: true,
      path: '.void/commands/',
    },
  };
}
