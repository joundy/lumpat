import * as vscode from "vscode";
import {
  createDecoration,
  findClosestIndex,
  generateMax2Permutations,
  getVisibleTexts,
  shiftPermutations,
} from "./utils";
import { BACKGROUND_COLOR, CHARS, REGEX } from "./consts";
import { VisibleTexts } from "./types";

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
    color: BACKGROUND_COLOR,
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

  function setTextsColor(
    editor: vscode.TextEditor,
    visibleTexts: VisibleTexts,
    activePosition: vscode.Position,
  ) {
    const positions: vscode.Position[] = [];

    for (let i = 0; i < visibleTexts.texts.length; i++) {
      const regexTexts = visibleTexts.texts[i].matchAll(REGEX);
      for (const text of regexTexts) {
        if (text[0] === "") {
          continue;
        }

        let position = new vscode.Position(
          i + visibleTexts.start.line,
          text.index,
        );
        positions.push(position);
      }
    }

    const closestIndex = findClosestIndex(activePosition, positions);

    const permutation = generateMax2Permutations(CHARS, positions.length);
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
    setTextsColor(editor, visibleTexts, activePosition);
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
