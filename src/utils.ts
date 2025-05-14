import * as vscode from "vscode";
import { VisibleTexts } from "./types";
import { HIGHTLIGHT_COLOR, HIGHTLIGHT_COLOR_PRIORITY } from "./config";
import { triePermutations } from "./trie-permutation";

export function generatePermutations(
  keys: string[],
  n: number,
  fromPosition: number
): string[] {
  if (fromPosition < 0 || fromPosition >= n) {
    throw new Error("Invalid fromPosition");
  }
  const results: string[] = new Array(n).fill("");
  const chars: string[] = triePermutations(keys, n);
  results[fromPosition] = chars[0];
  let leftIndex = fromPosition - 1;
  let rightIndex = fromPosition + 1;
  for (let i = 1; i < chars.length; i++) {
    if (i % 2 === 1) {
      if (leftIndex >= 0) {
        results[leftIndex] = chars[i];
        leftIndex--;
      } else if (rightIndex < n) {
        results[rightIndex] = chars[i];
        rightIndex++;
      }
    } else {
      if (rightIndex < n) {
        results[rightIndex] = chars[i];
        rightIndex++;
      } else if (leftIndex >= 0) {
        results[leftIndex] = chars[i];
        leftIndex--;
      }
    }
  }
  return results;
}

/**
 * Find the index of the position closest to the target position
 * Optimized version using early termination and manhattan distance
 */
export const findClosestIndex = (
  target: vscode.Position,
  positions: vscode.Position[]
): number => {
  if (positions.length === 0) {
    return -1;
  }
  if (positions.length === 1) {
    return 0;
  }
  
  let closestIndex = 0;
  let minDiff = Infinity;
  
  // Use manhattan distance for efficiency
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    // Prioritize line difference over character difference
    const lineDiff = Math.abs(target.line - pos.line);
    
    // Early termination - if we're on the same line, this is likely the best match
    if (lineDiff === 0) {
      const charDiff = Math.abs(target.character - pos.character);
      if (charDiff === 0) {
        return i; // Exact match, return immediately
      }
      
      const diff = charDiff;
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    } else {
      const charDiff = Math.abs(target.character - pos.character);
      const diff = lineDiff * 1000 + charDiff; // Line difference is weighted more heavily
      
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
  }
  
  return closestIndex;
};

export function getVisibleTexts(
  editor: vscode.TextEditor
): VisibleTexts | null {
  const visibleRanges = editor.visibleRanges;
  
  if (visibleRanges.length === 0) {
    return null;
  }
  
  // Get the first visible range (most important one)
  const visibleRange = visibleRanges[0];
  const startLine = visibleRange.start.line;
  const endLine = visibleRange.end.line;
  
  // Pre-allocate array with exact size needed
  const lineCount = endLine - startLine + 1;
  const visibleTexts = new Array<string>(lineCount);
  
  // Batch process visible lines
  for (let i = 0; i < lineCount; i++) {
    visibleTexts[i] = editor.document.lineAt(startLine + i).text;
  }
  
  return {
    texts: visibleTexts,
    start: {
      line: startLine,
      character: visibleRange.start.character,
    },
    end: {
      line: endLine,
      character: visibleRange.end.character,
    },
  };
}

export function createDecoration(char: string, isPriority: boolean = false) {
  return vscode.window.createTextEditorDecorationType({
    textDecoration: "none; display: none",
    after: {
      contentText: char,
      color: isPriority ? HIGHTLIGHT_COLOR_PRIORITY : HIGHTLIGHT_COLOR,
      fontWeight: "bold",
    },
  });
}
