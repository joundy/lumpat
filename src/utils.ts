import * as vscode from "vscode";
import { VisibleTexts } from "./types";
import { HIGHTLIGHT_COLOR, HIGHTLIGHT_COLOR_PRIORITY } from "./consts";
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

// expensive, TODO: optimize this function
export const findClosestIndex = (
  target: vscode.Position,
  positions: vscode.Position[]
): number =>
  positions.reduce(
    (closest, pos, i) => {
      const diff =
        Math.abs(target.line - pos.line) * 1000 +
        Math.abs(target.character - pos.character);
      return diff < closest.diff ? { diff, index: i } : closest;
    },
    { diff: Infinity, index: -1 }
  ).index;

export function getVisibleTexts(
  editor: vscode.TextEditor
): VisibleTexts | null {
  const visibleRanges = editor.visibleRanges;
  let visibleTexts: string[] = [];

  if (visibleRanges.length === 0) {
    return null;
  }

  for (
    let i = visibleRanges[0].start.line;
    i <= visibleRanges[0].end.line;
    i++
  ) {
    const text = editor.document.lineAt(i).text;
    visibleTexts.push(text);
  }

  return {
    texts: visibleTexts,
    start: {
      line: visibleRanges[0].start.line,
      character: visibleRanges[0].start.character,
    },
    end: {
      line: visibleRanges[0].end.line,
      character: visibleRanges[0].end.character,
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
