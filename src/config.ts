import * as vscode from "vscode";

// Default values
const DEFAULT_CHARS = "asdghklqwertyuiopzxcvbnmfj";
const DEFAULT_BACKGROUND_COLOR = "#515878";
const DEFAULT_HIGHLIGHT_COLOR = "#0db3d0";
const DEFAULT_HIGHLIGHT_COLOR_PRIORITY = "#f70078";
const DEFAULT_REGEX_PATTERN = "(\\b\\w)|(\\B(?=[A-Z]|[#_]\\w))|\\b$";

// Get configuration values with defaults
function getConfig<T>(key: string, defaultValue: T): T {
  const config = vscode.workspace.getConfiguration("lumpat");
  return config.get<T>(key, defaultValue);
}

// Export configurable constants
export function getChars(): string[] {
  return getConfig<string>("chars", DEFAULT_CHARS).split("");
}

// Export configurable regex pattern
export function getRegexPattern(): string {
  return getConfig<string>("regexPattern", DEFAULT_REGEX_PATTERN);
}

// regex for match chars positions
export function getRegex(): RegExp {
  try {
    return new RegExp(getRegexPattern(), "g");
  } catch (error) {
    console.error("Invalid regex pattern, using default", error);
    return new RegExp(DEFAULT_REGEX_PATTERN, "g");
  }
}

// For backward compatibility
export const REGEX = getRegex();

export function getBackgroundColor(): string {
  return getConfig<string>("backgroundColor", DEFAULT_BACKGROUND_COLOR);
}

export function getHighlightColor(): string {
  return getConfig<string>("highlightColor", DEFAULT_HIGHLIGHT_COLOR);
}

export function getHighlightColorPriority(): string {
  return getConfig<string>("highlightColorPriority", DEFAULT_HIGHLIGHT_COLOR_PRIORITY);
}

// For backward compatibility and simpler access
export const CHARS = getChars();
export const BACKGROUND_COLOR = getBackgroundColor();
export const HIGHTLIGHT_COLOR = getHighlightColor();
export const HIGHTLIGHT_COLOR_PRIORITY = getHighlightColorPriority();
