import * as vscode from "vscode";
import {
  createDecoration,
  findClosestIndex,
  generatePermutations,
  getVisibleTexts,
} from "./utils";
import { getBackgroundColor, getChars, getRegex } from "./config";
import { Editor, StatusBar, VisibleTexts } from "./types";

const backgroundCharDec = vscode.window.createTextEditorDecorationType({
  color: getBackgroundColor(),
});

let statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
  100
);

// VARIABLES

let listenedChar = "";

let maxCharacter = 0;

let decorations: vscode.TextEditorDecorationType[] = [];

let isActive = false;

// FUNCTIONS

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

function setHighlight() {
  for (const editor of editors) {
    for (const hint of editor.charHintMap) {
      const decoration = createDecoration(hint[0], hint[0].length === 1);
      decorations.push(decoration);

      const range = new vscode.Range(
        hint[1],
        hint[1].translate(0, hint[0].length)
      );

      editor.editor.setDecorations(decoration, [range]);
    }
  }
}

function setNextHighlight() {
  disposeDecorations();
  for (const editor of editors) {
    for (const hint of editor.charHintMap) {
      if (hint[0].startsWith(listenedChar)) {
        const charReminder = hint[0].slice(listenedChar.length);

        const decoration = createDecoration(
          charReminder,
          charReminder.length === 1
        );
        decorations.push(decoration);

        const charPosition = hint[1];
        const newPosition = new vscode.Position(
          charPosition.line,
          charPosition.character + listenedChar.length
        );

        const range = new vscode.Range(
          newPosition,
          newPosition.translate(0, charReminder.length)
        );

        editor.editor.setDecorations(decoration, [range]);
      }
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
    reset();
    return;
  }

  listenedChar += key;

  setStatusBar(listenedChar);

  for (const editor of editors) {
    if (editor.charHintMap.has(listenedChar)) {
      const position = editor.charHintMap.get(listenedChar)!;

      const selection = new vscode.Selection(position, position);

      editor.editor.selection = selection;
      editor.editor.revealRange(new vscode.Range(position, position));

      vscode.window.showTextDocument(
        editor.editor.document,
        editor.column,
        false
      );

      reset();
      return;
    }
  }

  setNextHighlight();
}

let editors: Editor[] = [];

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

  listenedChar = "";
  maxCharacter = 0;
  editors = [];
}

function setEditors(isMulti: boolean) {
  const activeEditor = vscode.window.activeTextEditor;

  let visibleEditors: vscode.TextEditor[] = [];
  if (isMulti) {
    visibleEditors = [...vscode.window.visibleTextEditors];
  } else {
    if (!activeEditor) {
      return;
    }
    visibleEditors = [activeEditor];
  }

  const editorWihtoutHints: (Omit<Editor, "charHintMap"> & {
    positions: vscode.Position[];
  })[] = [];
  let closestIndex = 0;

  for (const editor of visibleEditors) {
    const positions: vscode.Position[] = [];
    const visibleTexts = getVisibleTexts(editor);

    if (visibleTexts) {
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
    }

    if (activeEditor && editor.viewColumn === activeEditor?.viewColumn) {
      closestIndex = findClosestIndex(activeEditor.selection.active, positions);
    }

    editorWihtoutHints.push({
      column: editor.viewColumn,
      isActive: editor.viewColumn === activeEditor?.viewColumn,
      visibleTexts,
      editor: editor,
      positions,
    });
  }

  editorWihtoutHints.sort((a, b) =>
    a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1
  );
  const editorsPositionsLength = editorWihtoutHints.reduce(
    (acc, editor) => acc + editor.positions.length,
    0
  );

  let hints = generatePermutations(
    getChars(),
    editorsPositionsLength,
    closestIndex
  );

  for (const editor of editorWihtoutHints) {
    let editorHint: string[] = [];
    if (editor.positions.length > 0) {
      editorHint = hints.splice(0, editor.positions.length);
    }

    editors.push({
      column: editor.column,
      isActive: editor.isActive,
      editor: editor.editor,
      visibleTexts: editor.visibleTexts,
      charHintMap: new Map(
        editorHint.map((hint, index) => {
          maxCharacter = Math.max(maxCharacter, hint.length);
          return [hint, editor.positions[index]];
        })
      ),
    });
  }
}

function doJump(isMulti: boolean) {
  setEditors(isMulti);
  if (editors.length === 0) {
    return;
  }

  if (isActive) {
    reset();
    return;
  }

  for (const editor of editors) {
    if (editor.visibleTexts) {
      setBackgroundColor(editor.editor, editor.visibleTexts);
    }
  }

  setHighlight();

  setActive(true);
}

export function activate(context: vscode.ExtensionContext) {
  console.info("Extension 'lumpat' is now active!");

  setStatusBar(StatusBar.IDLE);

  // COMMANDS

  function jump() {
    doJump(false);
  }

  function jumpMulti() {
    doJump(true);
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
      jump();
    }
  );
  context.subscriptions.push(disposableJump);

  const disposableJumpMulti = vscode.commands.registerCommand(
    "lumpat.jumpMulti",
    async () => {
      jumpMulti();
    }
  );
  context.subscriptions.push(disposableJumpMulti);

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
