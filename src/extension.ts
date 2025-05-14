import * as vscode from "vscode";
import {
  createDecoration,
  findClosestIndex,
  generatePermutations,
  getVisibleTexts,
} from "./utils";
import { getBackgroundColor, getChars, getRegex } from "./config";
import { StatusBar, VisibleTexts } from "./types";

const backgroundCharDec = vscode.window.createTextEditorDecorationType({
  color: getBackgroundColor(),
});

let statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
  100
);

// VARIABLES

let charMap: {
  [keyof: string]: vscode.Position;
} = {};

let listenedChar = "";

let maxCharacter = 0;

let decorations: vscode.TextEditorDecorationType[] = [];

let hints: string[] = [];

let isActive = false;

// FUNCTIONS

function pushChar(char: string, position: vscode.Position) {
  charMap[char] = position;
  maxCharacter = Math.max(maxCharacter, char.length);
}

function setStatusBar(status: StatusBar | string) {
  statusBar.text = `Lumpat: ${status}`;
  statusBar.show();
}

function setActive(value: boolean) {
  if (!value) {
    setStatusBar(StatusBar.IDLE);
  } else {
    setStatusBar(StatusBar.JUMP);
  }

  isActive = value;

  vscode.commands.executeCommand("setContext", "lumpat.jump-mode", value);
}

function disposeDecorations() {
  for (let i = 0; i < decorations.length; i++) {
    decorations[i].dispose();
  }
  decorations = [];
}

function reset(deactivate = false) {
  setStatusBar(StatusBar.IDLE);
  setActive(false);

  vscode.window.visibleTextEditors.forEach((editor) => {
    editor.setDecorations(backgroundCharDec, []);
    for (let i = 0; i < decorations.length; i++) {
      editor.setDecorations(decorations[i], []);
    }
  });

  if (deactivate) {
    backgroundCharDec.dispose();
    statusBar.dispose();
  }

  disposeDecorations();

  charMap = {};
  listenedChar = "";
  maxCharacter = 0;
  hints = [];
}

function generateHintAndPositions(
  visibleTexts: VisibleTexts,
  activePosition: vscode.Position
) {
  const positions: vscode.Position[] = [];

  for (let i = 0; i < visibleTexts.texts.length; i++) {
    const regexTexts = visibleTexts.texts[i].matchAll(getRegex());
    for (const text of regexTexts) {
      if (text[0] === "") {
        continue;
      }

      let position = new vscode.Position(
        i + visibleTexts.start.line,
        text.index
      );
      positions.push(position);
    }
  }

  const closestIndex = findClosestIndex(activePosition, positions);
  hints = generatePermutations(getChars(), positions.length, closestIndex);

  return {
    positions,
    hints,
  };
}

function setHighlight(
  editor: vscode.TextEditor,
  hints: string[],
  positions: vscode.Position[]
) {
  for (let i = 0; i < positions.length; i++) {
    if (i > hints.length) {
      break;
    }

    const char = hints[i];
    const decoration = createDecoration(char, hints[i].length === 1);
    decorations.push(decoration);

    const range = new vscode.Range(
      positions[i],
      positions[i].translate(0, char.length)
    );

    pushChar(char, positions[i]);

    editor.setDecorations(decoration, [range]);
  }
}

function setNextHighlight(editor: vscode.TextEditor) {
  disposeDecorations();

  for (const hint of hints) {
    if (hint.startsWith(listenedChar)) {
      const charReminder = hint.slice(listenedChar.length);

      const decoration = createDecoration(
        charReminder,
        charReminder.length === 1
      );
      decorations.push(decoration);

      const charPosition = charMap[hint];
      const newPosition = new vscode.Position(
        charPosition.line,
        charPosition.character + listenedChar.length
      );

      const range = new vscode.Range(
        newPosition,
        newPosition.translate(0, charReminder.length)
      );

      editor.setDecorations(decoration, [range]);
    }
  }
}

function setBackgroundColor(
  editor: vscode.TextEditor,
  visibleTexts: VisibleTexts
) {
  const firstRange = new vscode.Position(visibleTexts.start.line, 0);
  const lastRange = new vscode.Position(
    visibleTexts.end.line,
    visibleTexts.end.character
  );

  const range = new vscode.Range(firstRange, lastRange);

  editor.setDecorations(backgroundCharDec, [range]);
}

function listenChar(key: string) {
  if (listenedChar.length > maxCharacter) {
    setActive(false);
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  listenedChar += key;

  setStatusBar(listenedChar);

  if (charMap[listenedChar]) {
    const selection = new vscode.Selection(
      charMap[listenedChar],
      charMap[listenedChar]
    );

    editor.selection = selection;
    editor.revealRange(
      new vscode.Range(charMap[listenedChar], charMap[listenedChar])
    );
  } else {
    if (listenedChar.length < maxCharacter) {
      setNextHighlight(editor);

      return;
    }
  }

  reset();
}

export function activate(context: vscode.ExtensionContext) {
  console.info("Extension 'lumpat' is now active!");

  setStatusBar(StatusBar.IDLE);

  // COMMANDS

  function jump(editor: vscode.TextEditor) {
    if (isActive) {
      reset();
      return;
    }

    const visibleTexts = getVisibleTexts(editor);
    if (!visibleTexts) {
      return;
    }

    const activePosition = editor.selection.active;

    setBackgroundColor(editor, visibleTexts);

    const { hints, positions } = generateHintAndPositions(
      visibleTexts,
      activePosition
    );
    setHighlight(editor, hints, positions);

    setActive(true);
  }

  function close() {
    if (isActive) {
      reset();
    }
  }

  // EVENTS

  const disposableJump = vscode.commands.registerCommand(
    "lumpat.jump",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      jump(editor);
    }
  );
  context.subscriptions.push(disposableJump);

  const disposableClose = vscode.commands.registerCommand(
    "lumpat.close",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      close();
    }
  );
  context.subscriptions.push(disposableClose);

  const disposableOnScroll = vscode.window.onDidChangeTextEditorVisibleRanges(
    async () => {
      close();
    }
  );
  context.subscriptions.push(disposableOnScroll);

  context.subscriptions.push(
    ...getChars().map((char: string) => {
      return vscode.commands.registerCommand(`lumpat.${char}`, () =>
        listenChar(char)
      );
    })
  );
}

export function deactivate() {
  reset(true);
}
