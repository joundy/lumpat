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

// Decoration pool to reuse decorations instead of creating new ones each time
class DecorationPool {
  private pool: Map<string, vscode.TextEditorDecorationType> = new Map();
  private active: Map<string, vscode.TextEditorDecorationType> = new Map();
  
  // Get a decoration from the pool or create a new one
  get(char: string, isPriority: boolean): vscode.TextEditorDecorationType {
    const key = `${char}-${isPriority ? 'priority' : 'normal'}`;
    
    // Check if we already have this decoration active
    if (this.active.has(key)) {
      return this.active.get(key)!;
    }
    
    // Check if we have this decoration in the pool
    let decoration: vscode.TextEditorDecorationType;
    if (this.pool.has(key)) {
      decoration = this.pool.get(key)!;
      this.pool.delete(key);
    } else {
      // Create a new decoration if not in pool
      decoration = createDecoration(char, isPriority);
    }
    
    // Mark as active
    this.active.set(key, decoration);
    return decoration;
  }
  
  // Return all active decorations to the pool
  recycleAll(): void {
    // Move all active decorations back to the pool
    this.active.forEach((decoration, key) => {
      this.pool.set(key, decoration);
    });
    this.active.clear();
  }
  
  // Get all active decorations
  getActiveDecorations(): vscode.TextEditorDecorationType[] {
    return Array.from(this.active.values());
  }
  
  // Dispose all decorations (both active and pooled)
  disposeAll(): void {
    this.active.forEach(decoration => decoration.dispose());
    this.pool.forEach(decoration => decoration.dispose());
    this.active.clear();
    this.pool.clear();
  }
}

const decorationPool = new DecorationPool();
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

function setActive(isActive: boolean) {
  if (!isActive) {
    setStatusBar(StatusBar.IDLE);
  } else {
    setStatusBar(StatusBar.JUMP);
  }

  isActive = isActive;
  vscode.commands.executeCommand("setContext", "lumpat.jump-mode", isActive);
}

function disposeDecorations() {
  // Recycle decorations instead of disposing them
  decorationPool.recycleAll();
  decorations = [];
}

function reset(editor?: vscode.TextEditor, deactivate = false) {
  setStatusBar(StatusBar.IDLE);
  setActive(false);

  if (editor) {
    editor.setDecorations(backgroundCharDec, []);
    for (let i = 0; i < decorations.length; i++) {
      editor.setDecorations(decorations[i], []);
    }
  }

  if (deactivate) {
    backgroundCharDec.dispose();
    statusBar.dispose();
    // Fully dispose all decorations when deactivating
    decorationPool.disposeAll();
  } else {
    // Just recycle decorations during normal operation
    disposeDecorations();
  }

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
  // Limit the number of decorations to improve performance
  const maxDecorations = Math.min(positions.length, hints.length, 300);
  
  for (let i = 0; i < maxDecorations; i++) {
    const char = hints[i];
    const isPriority = char.length === 1;
    
    // Get decoration from pool instead of creating a new one
    const decoration = decorationPool.get(char, isPriority);
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

  // Filter hints that match the current listened char for better performance
  const matchingHints = hints.filter(hint => hint.startsWith(listenedChar));
  
  for (const hint of matchingHints) {
    const charReminder = hint.slice(listenedChar.length);
    const isPriority = charReminder.length === 1;
    
    // Get decoration from pool instead of creating a new one
    const decoration = decorationPool.get(charReminder, isPriority);
    decorations.push(decoration);

    const charPosition = charMap[hint];
    const newPosition = new vscode.Position(
      charPosition.line,
      charPosition.character + listenedChar.length // Fix: use listenedChar instead of listenChar
    );

    const range = new vscode.Range(
      newPosition,
      newPosition.translate(0, charReminder.length)
    );

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

  reset(editor);
}

export function activate(context: vscode.ExtensionContext) {
  console.info("Extension 'lumpat' is now active!");

  setStatusBar(StatusBar.IDLE);

  // COMMANDS

  function jump(editor: vscode.TextEditor) {
    if (isActive) {
      reset(editor);
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

  function close(editor: vscode.TextEditor) {
    reset(editor);
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
      close(editor);
    }
  );
  context.subscriptions.push(disposableClose);

  // Debounce implementation to prevent excessive calls
  function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timer: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        fn(...args);
        timer = null;
      }, delay);
    };
  }
  
  // Debounced close function to reduce performance impact during scrolling
  const debouncedClose = debounce((textEditor: vscode.TextEditor) => {
    if (isActive) {
      close(textEditor);
    }
  }, 150); // 150ms debounce time
  
  const disposableOnScroll = vscode.window.onDidChangeTextEditorVisibleRanges(
    (event) => {
      debouncedClose(event.textEditor);
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
  const editor = vscode.window.activeTextEditor;
  reset(editor, true);
}
