/**
 * DesktopNotifier — cross-platform desktop notifications.
 * Non-critical: silently fails if the notification tool is unavailable.
 */

import { safeExecFile } from '../security/process.js';

/**
 * Send a desktop notification. Platform-aware:
 * - macOS: osascript display notification
 * - Linux: notify-send
 * - WSL: powershell.exe with BurntToast or msg.exe fallback
 *
 * Silently swallows errors — notifications are best-effort.
 */
export async function notify(title: string, message: string): Promise<void> {
  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      await notifyMacOS(title, message);
    } else if (platform === 'linux') {
      if (isWSL()) {
        await notifyWSL(title, message);
      } else {
        await notifyLinux(title, message);
      }
    } else if (platform === 'win32') {
      await notifyWindows(title, message);
    }
    // Other platforms: silently skip
  } catch {
    // Non-critical — swallow all errors
  }
}

/**
 * macOS notification via osascript.
 */
async function notifyMacOS(title: string, message: string): Promise<void> {
  // osascript -e 'display notification "msg" with title "title"'
  // We build the AppleScript string carefully to avoid injection.
  const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const escapedMessage = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = `display notification "${escapedMessage}" with title "${escapedTitle}"`;

  await safeExecFile('osascript', ['-e', script], { timeout: 5000 });
}

/**
 * Linux notification via notify-send.
 */
async function notifyLinux(title: string, message: string): Promise<void> {
  await safeExecFile('notify-send', [title, message], { timeout: 5000 });
}

/**
 * WSL notification via powershell.exe.
 */
async function notifyWSL(title: string, message: string): Promise<void> {
  // Try BurntToast first, fall back to simple msg
  const escapedTitle = title.replace(/'/g, "''");
  const escapedMessage = message.replace(/'/g, "''");

  try {
    await safeExecFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'`,
      ],
      { timeout: 10000 }
    );
  } catch {
    // Fallback: use msg.exe for console user
    try {
      await safeExecFile(
        'msg.exe',
        ['*', `${title}: ${message}`],
        { timeout: 10000 }
      );
    } catch {
      // Both methods failed — silently give up
    }
  }
}

/**
 * Native Windows notification via powershell.exe.
 */
async function notifyWindows(title: string, message: string): Promise<void> {
  const escapedTitle = title.replace(/'/g, "''");
  const escapedMessage = message.replace(/'/g, "''");

  await safeExecFile(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'`,
    ],
    { timeout: 10000 }
  );
}

/**
 * Detect WSL by checking for Microsoft in the kernel release string.
 */
function isWSL(): boolean {
  try {
    // In WSL, /proc/version contains "Microsoft" or "microsoft"
    // We check the environment variable which is more reliable in Node.
    if (process.env['WSL_DISTRO_NAME']) return true;
    if (process.env['WSLENV']) return true;
    return false;
  } catch {
    return false;
  }
}

export class DesktopNotifier {
  /**
   * Send a desktop notification.
   */
  async notify(title: string, message: string): Promise<void> {
    return notify(title, message);
  }
}
