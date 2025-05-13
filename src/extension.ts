import * as vscode from "vscode";
import {
  createDecoration,
  findClosestIndex,
  generatePermutations,
  getVisibleTexts,
} from "./utils";
import { BACKGROUND_COLOR, CHARS, REGEX } from "./consts";
import { StatusBar, VisibleTexts } from "./types";

const backgroundCharDec = vscode.window.createTextEditorDecorationType({
  color: BACKGROUND_COLOR,
});

let charMap: {
  [keyof: string]: vscode.Position;
} = {};
let listenedChar = "";
let maxCharacter = 0;
function pushChar(char: string, position: vscode.Position) {
  charMap[char] = position;
  maxCharacter = Math.max(maxCharacter, char.length);
}

let decorations: vscode.TextEditorDecorationType[] = [];

function setStatusBar(status: StatusBar | string) {
  statusBar.text = `Lumpat: ${status}`;
  statusBar.show();
}

let isEnabled = false;
function setEnabled(enabled: boolean) {
  if (!enabled) {
    setStatusBar(StatusBar.IDLE);
  } else {
    setStatusBar(StatusBar.JUMP);
  }

  isEnabled = enabled;
  vscode.commands.executeCommand("setContext", "lumpat.jump-mode", enabled);
}

let statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
  100
);

function reset(editor?: vscode.TextEditor, deactivate = false) {
  setStatusBar(StatusBar.IDLE);
  setEnabled(false);

  if (editor) {
    editor.setDecorations(backgroundCharDec, []);
    for (let i = 0; i < decorations.length; i++) {
      editor.setDecorations(decorations[i], []);
    }
  }

  if (deactivate) {
    backgroundCharDec.dispose();
    statusBar.dispose();
  }

  for (let i = 0; i < decorations.length; i++) {
    decorations[i].dispose();
  }
  decorations = [];

  charMap = {};
  listenedChar = "";
  maxCharacter = 0;
}

export function activate(context: vscode.ExtensionContext) {
  console.info("Extension 'lumpat' is now active!");

  setStatusBar(StatusBar.IDLE);

  function setTextsColor(
    editor: vscode.TextEditor,
    visibleTexts: VisibleTexts,
    activePosition: vscode.Position
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
          text.index
        );
        positions.push(position);
      }
    }

    const closestIndex = findClosestIndex(activePosition, positions);
    const hints = generatePermutations(CHARS, positions.length, closestIndex);

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

  function jump(editor: vscode.TextEditor) {
    console.log("JUMP TRIGGERED UPDATE");
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

    setEnabled(true);
  }

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

  function close(editor: vscode.TextEditor) {
    reset(editor);
  }

  const disposableClose = vscode.commands.registerCommand(
    "lumpat.close",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      close(editor);
    }
  );
  context.subscriptions.push(disposableClose);

  const disposableOnScroll = vscode.window.onDidChangeTextEditorVisibleRanges(
    async (event) => {
      close(event.textEditor);
    }
  );
  context.subscriptions.push(disposableOnScroll);

  function listenChar(key: string) {
    if (listenedChar.length > maxCharacter) {
      setEnabled(false);
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
        // listen next character
        return;
      }
    }

    reset(editor);
  }

  context.subscriptions.push(
    ...CHARS.map((char) => {
      return vscode.commands.registerCommand(`lumpat.${char}`, () =>
        listenChar(char)
      );
    })
  );
}

export function deactivate() {
  const editor = vscode.window.activeTextEditor;
  reset(editor, true);
}
