import * as vscode from "vscode";

const chars = "qwertyuiopasdfghjklzxcvbnm".split("");

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

  function createDecoration(char: string) {
    return vscode.window.createTextEditorDecorationType({
      textDecoration: "none; display: none",
      after: {
        contentText: char,
        color: "#f70078",
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
      const words = visibleTexts.texts[i].split(" ");

      let positionIndex = 0;
      for (let j = 0; j < words.length; j++) {
        // skip tab character word
        if (words[j].length === 0) {
          positionIndex++;
          continue;
        }

        let position = new vscode.Position(
          i + visibleTexts.start.line,
          positionIndex,
        );
        positions.push(position);

        positionIndex += words[j].length;
        positionIndex++; // compensate for space
      }
    }

    const closestIndex = findClosestIndex(activePosition, positions);

    const middleCharIndex = Math.floor(chars.length / 2);
    const positionProrityStart = Math.max(closestIndex - middleCharIndex, 0);

    for (let i = positionProrityStart; i < positions.length; i++) {
      if (i - positionProrityStart >= chars.length) {
        break;
      }

      const decoration = createDecoration(chars[i - positionProrityStart]);
      decorations.push(decoration);

      const range = new vscode.Range(
        positions[i],
        positions[i].translate(0, chars[i - positionProrityStart].length),
      );
      editor.setDecorations(decoration, [range]);
      charMap[chars[i - positionProrityStart]] = positions[i];
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
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const text = args.text;

    if (charMap[text]) {
      const selection = new vscode.Selection(charMap[text], charMap[text]);

      editor.selection = selection;
      editor.revealRange(new vscode.Range(charMap[text], charMap[text]));
    }

    reset(editor);
  });

  context.subscriptions.push(typeDisposable);
}

export function deactivate() { }
