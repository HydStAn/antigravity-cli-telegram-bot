/**
 * Shared, dependency-free text utilities for parsing AGY's PTY report output.
 *
 * These live in the domain layer (pure functions, no I/O) so the report
 * parsers (`quota-report.ts`, `credits-report.ts`, `context-report.ts`) can be
 * unit tested against captured fixtures without spawning a PTY. `pty-runner.ts`
 * re-exports them to preserve its historical public surface.
 */

/** Strip ANSI/VT escape sequences, OSC/kitty sequences and control bytes. */
export function cleanAnsi(text: string): string {
  return text
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-9;?:>=<!]*[ -/]*[@-~a-zA-Z]/g, "")
    .replace(/\x1b[()#%*+-.][0-9a-zA-Z]/g, "")
    .replace(/\x1b[@-Z\\-_]/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\r/g, "");
}

/** Collapse TUI progress-bar glyphs and box-drawing runs into plain spaces. */
export function stripProgressBar(str: string): string {
  return str.replace(/[█░▒▓━═─\-_[\]=><#]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parse a human duration ("151h 15m", "2d", "90s") into minutes.
 * Returns null when nothing recognizable is present.
 */
export function parseDurationToMinutes(text: string | null | undefined): number | null {
  if (!text) return null;
  const str = text.trim().toLowerCase();
  let totalMinutes = 0;
  let matched = false;

  const daysMatch = str.match(/(\d+(?:\.\d+)?)\s*d(?:ays?)?/);
  if (daysMatch) {
    totalMinutes += parseFloat(daysMatch[1]) * 24 * 60;
    matched = true;
  }

  const hoursMatch = str.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?/);
  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
    matched = true;
  }

  const minsMatch = str.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?/);
  if (minsMatch) {
    totalMinutes += parseFloat(minsMatch[1]);
    matched = true;
  }

  const secsMatch = str.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?/);
  if (secsMatch) {
    totalMinutes += parseFloat(secsMatch[1]) / 60;
    matched = true;
  }

  return matched ? totalMinutes : null;
}

/** Parse a token count such as "146.3k" or "1.0M" into an integer. */
export function parseTokenValue(raw: string): number | null {
  const match = raw.trim().replace(/,/g, "").match(/^([\d.]+)\s*([kKmM]?)$/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (Number.isNaN(val)) return null;
  const unit = match[2].toUpperCase();
  if (unit === "M") return Math.round(val * 1_000_000);
  if (unit === "K") return Math.round(val * 1_000);
  return Math.round(val);
}
