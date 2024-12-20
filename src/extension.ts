import * as vscode from "vscode";

function getRandomLowerCaseLetter() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

export function activate(context: vscode.ExtensionContext) {
  const backgroundCharDec = vscode.window.createTextEditorDecorationType({
    color: "#515878",
  });

  let isEnabled = false;

  let decorations: vscode.TextEditorDecorationType[] = [];

  function updateDecorations(editor: vscode.TextEditor) {
    const text = editor.document.getText();
    if (text.length === 0) {
      return;
    }

    function setBackgroundColor() {
      const firstRange = new vscode.Position(0, 0);

      const lastLineIndex = editor.document.lineCount - 1;
      const lastLine = editor.document.lineAt(lastLineIndex);
      const lastCharacterIndex = lastLine.text.length;
      const lastRange = new vscode.Position(lastLineIndex, lastCharacterIndex);
      const range = new vscode.Range(firstRange, lastRange);

      editor.setDecorations(backgroundCharDec, [range]);
    }

    function setWordsColor() {
      const textLines = text.split("\n");

      // let ranges: vscode.Range[] = [];
      for (let i = 0; i < textLines.length; i++) {
        const words = textLines[i].split(" ");

        // console.log({ words });

        let positionIndex = 0;
        for (let j = 0; j < words.length; j++) {
          // skip tab character word
          if (words[j].length === 0) {
            positionIndex++;
            continue;
          }

          let position = new vscode.Position(i, positionIndex);
          const range = new vscode.Range(position, position.translate(0, 1));

          let decor = vscode.window.createTextEditorDecorationType({
            textDecoration: "none; display: none",
            after: {
              contentText: getRandomLowerCaseLetter(),
              color: "#f70078",
              fontWeight: "bold",
            },
          });

          decorations.push(decor);
          editor.setDecorations(decor, [range]);

          // ranges.push(range);

          positionIndex += words[j].length;
          positionIndex++; // compensate for space

          // console.log({ word: words[j], range, positionIndex });
        }
      }

      // console.log({ ranges });

      // editor.setDecorations(wordCharDec, [
      //   new vscode.Range(new vscode.Position(13, 7), new vscode.Position(13, 8)),
      // ]);
    }

    if (isEnabled) {
      isEnabled = false;
      editor.setDecorations(backgroundCharDec, []);

      for (let i = 0; i < decorations.length; i++) {
        editor.setDecorations(decorations[i], []);
      }
      decorations = [];

      return;
    } else {
      setBackgroundColor();
      setWordsColor();
      isEnabled = true;
    }
  }

  const disposable = vscode.commands.registerCommand(
    "lumpat.jump",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      updateDecorations(editor);

      // const result = await vscode.window.showInputBox({
      //   prompt: "Press any key",
      //   password: true,
      //   ignoreFocusOut: true,
      //   placeHolder: "Press any key",
      // });
      //
      // console.log({ result });
    },
  );

  context.subscriptions.push(disposable);

  const typeDisposable = vscode.commands.registerCommand("type", (args) => {
    if (!isEnabled) {
      vscode.commands.executeCommand("default:type", args);
      return;
    }
    const text = args.text;

    console.log({ text });
  });

  context.subscriptions.push(typeDisposable);
}

export function deactivate() { }
