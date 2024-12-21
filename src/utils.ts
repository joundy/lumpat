import * as vscode from "vscode";
import { VisibleTexts } from "./types";
import { HIGHTLIGHT_COLOR, HIGHTLIGHT_COLOR_PRIORITY } from "./consts";

export function shiftPermutations(
  arr: string[],
  startIndex: number,
  endIndex: number,
  targetIndex: number,
) {
  const toShift = arr.slice(startIndex, endIndex + 1);
  arr.splice(startIndex, endIndex - startIndex + 1);
  arr.splice(targetIndex, 0, ...toShift);
  return arr;
}

export const generateMax2Permutations = (
  chars: string[],
  total = 10,
): {
  priorityIndex: number;

  hints: string[];
} => {
  const results = [];

  if (total < chars.length) {
    return {
      priorityIndex: 0,
      hints: chars.slice(0, total),
    };
  }

  for (let i = 0; i < chars.length; i++) {
    for (let j = 0; j < chars.length; j++) {
      results.push(chars[i] + chars[j]);

      if (results.length + chars.length - i - 1 === total) {
        return {
          priorityIndex: results.length,
          hints: results.concat(chars.slice(i + 1)),
        };
      }

      if (results.length === total) {
        return {
          priorityIndex: results.length,
          hints: results,
        };
      }
    }
  }

  return {
    priorityIndex: -1,
    hints: results,
  };
};

// expensive, TODO: optimize this function
export const findClosestIndex = (
  target: vscode.Position,
  positions: vscode.Position[],
): number =>
  positions.reduce(
    (closest, pos, i) => {
      const diff =
        Math.abs(target.line - pos.line) * 1000 +
        Math.abs(target.character - pos.character);
      return diff < closest.diff ? { diff, index: i } : closest;
    },
    { diff: Infinity, index: -1 },
  ).index;

export function getVisibleTexts(
  editor: vscode.TextEditor,
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
