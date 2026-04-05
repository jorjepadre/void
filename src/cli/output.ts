/**
 * Terminal formatting utilities — consistent CLI output with colors and structure.
 */

import chalk from 'chalk';

/** Green checkmark + message. */
export function success(msg: string): void {
  console.log(chalk.green('✔') + ' ' + msg);
}

/** Red X + message. */
export function error(msg: string): void {
  console.error(chalk.red('✖') + ' ' + msg);
}

/** Yellow warning + message. */
export function warn(msg: string): void {
  console.warn(chalk.yellow('⚠') + ' ' + msg);
}

/** Blue info + message. */
export function info(msg: string): void {
  console.log(chalk.blue('ℹ') + ' ' + msg);
}

/** Bold + underlined heading. */
export function heading(msg: string): void {
  console.log('');
  console.log(chalk.bold.underline(msg));
  console.log('');
}

/**
 * Simple ASCII table. First row is headers (bold), remaining rows are data.
 * Auto-sizes columns to fit content.
 */
export function table(headers: string[], rows: string[][]): void {
  const allRows = [headers, ...rows];
  const colWidths: number[] = headers.map((_, colIdx) => {
    let max = 0;
    for (const row of allRows) {
      const cell = row[colIdx] ?? '';
      if (cell.length > max) max = cell.length;
    }
    return max;
  });

  // Header row
  const headerLine = headers
    .map((h, i) => chalk.bold(h.padEnd(colWidths[i] ?? 0)))
    .join('  ');
  console.log(headerLine);

  // Separator
  const sep = colWidths.map((w) => '─'.repeat(w)).join('──');
  console.log(sep);

  // Data rows
  for (const row of rows) {
    const line = row
      .map((cell, i) => cell.padEnd(colWidths[i] ?? 0))
      .join('  ');
    console.log(line);
  }
}

/** Pretty-printed JSON output. */
export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Simple spinner using setInterval + carriage-return overwrite.
 * Returns an object with a stop() method to finalize.
 */
export function spinner(msg: string): { stop: (finalMsg?: string) => void } {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let idx = 0;

  const timer = setInterval(() => {
    const frame = frames[idx % frames.length];
    process.stdout.write(`\r${chalk.cyan(frame ?? '⠋')} ${msg}`);
    idx++;
  }, 80);

  return {
    stop(finalMsg?: string) {
      clearInterval(timer);
      const display = finalMsg ?? msg;
      process.stdout.write(`\r${chalk.green('✔')} ${display}\n`);
    },
  };
}
