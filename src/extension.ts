import * as vscode from "vscode";

const chars = "fjkasdlghqwertyuiopzxcvbnm".split("");

// regex for match chars positions
const regex = /(\b\w)|(\B(?=[A-Z]|[#_]\w))|\b$/g;

function shiftPermutations(
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

const generateMax2Permutations = (
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
const findClosestIndex = (
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

export function activate(context: vscode.ExtensionContext) {
  let charMap: {
    [keyof: string]: vscode.Position;
  } = {};
  let listenChar = "";
  let maxCharacter = 0;
  function pushChar(char: string, position: vscode.Position) {
    charMap[char] = position;
    maxCharacter = Math.max(maxCharacter, char.length);
  }

  const backgroundCharDec = vscode.window.createTextEditorDecorationType({
    color: "#515878",
  });

  let isEnabled = false;

  let decorations: vscode.TextEditorDecorationType[] = [];

  function reset(editor: vscode.TextEditor) {
    isEnabled = false;
    editor.setDecorations(backgroundCharDec, []);

    for (let i = 0; i < decorations.length; i++) {
      editor.setDecorations(decorations[i], []);
    }
    decorations = [];
    charMap = {};
    listenChar = "";
    maxCharacter = 0;
  }

  type VisibleTexts = {
    texts: string[];
    start: {
      line: number;
      character: number;
    };
    end: {
      line: number;
      character: number;
    };
  };

  function getVisibleTexts(editor: vscode.TextEditor): VisibleTexts | null {
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

  function createDecoration(char: string, isPriority: boolean = false) {
    return vscode.window.createTextEditorDecorationType({
      textDecoration: "none; display: none",
      after: {
        contentText: char,
        color: isPriority ? "#f70078" : "#0db3d0",
        fontWeight: "bold",
      },
    });
  }

  function setWordsColor(
    editor: vscode.TextEditor,
    visibleTexts: VisibleTexts,
    activePosition: vscode.Position,
  ) {
    const positions: vscode.Position[] = [];

    for (let i = 0; i < visibleTexts.texts.length; i++) {
      const regexWords = visibleTexts.texts[i].matchAll(regex);
      for (const word of regexWords) {
        if (word[0] === "") {
          continue;
        }

        let position = new vscode.Position(
          i + visibleTexts.start.line,
          word.index,
        );
        positions.push(position);
      }
    }

    const closestIndex = findClosestIndex(activePosition, positions);

    const permutation = generateMax2Permutations(chars, positions.length);
    let hints = permutation.hints;

    const targetShiftIndex = Math.max(
      closestIndex - Math.floor((hints.length - permutation.priorityIndex) / 2),
      0,
    );
    if (permutation.priorityIndex > 0) {
      hints = shiftPermutations(
        hints,
        permutation.priorityIndex,
        hints.length - 1,
        targetShiftIndex,
      );
    }

    for (let i = 0; i < positions.length; i++) {
      if (i > hints.length) {
        break;
      }

      const char = hints[i];
      const decoration = createDecoration(char, hints[i].length === 1);
      decorations.push(decoration);

      const range = new vscode.Range(
        positions[i],
        positions[i].translate(0, char.length),
      );

      pushChar(char, positions[i]);

      editor.setDecorations(decoration, [range]);
    }
  }

  function setBackgroundColor(
    editor: vscode.TextEditor,
    visibleTexts: VisibleTexts,
  ) {
    const firstRange = new vscode.Position(visibleTexts.start.line, 0);
    const lastRange = new vscode.Position(
      visibleTexts.end.line,
      visibleTexts.end.character,
    );

    const range = new vscode.Range(firstRange, lastRange);

    editor.setDecorations(backgroundCharDec, [range]);
  }

  function jump(editor: vscode.TextEditor) {
    if (isEnabled) {
      reset(editor);
      return;
    }

    const visibleTexts = getVisibleTexts(editor);
    if (!visibleTexts) {
      return;
    }

    const activePosition = editor.selection.active;

    setBackgroundColor(editor, visibleTexts);
    setWordsColor(editor, visibleTexts, activePosition);
    isEnabled = true;
  }

  const disposable = vscode.commands.registerCommand(
    "lumpat.jump",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      jump(editor);
    },
  );

  context.subscriptions.push(disposable);

  const typeDisposable = vscode.commands.registerCommand("type", (args) => {
    if (!isEnabled) {
      vscode.commands.executeCommand("default:type", args);
      return;
    }
    if (listenChar.length > maxCharacter) {
      vscode.commands.executeCommand("default:type", args);
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const text = args.text;
    listenChar += text;

    if (charMap[listenChar]) {
      const selection = new vscode.Selection(
        charMap[listenChar],
        charMap[listenChar],
      );

      editor.selection = selection;
      editor.revealRange(
        new vscode.Range(charMap[listenChar], charMap[listenChar]),
      );
    } else {
      if (listenChar.length < maxCharacter) {
        // listen next character
        return;
      }
    }

    reset(editor);
  });

  context.subscriptions.push(typeDisposable);
}

export function deactivate() { }
