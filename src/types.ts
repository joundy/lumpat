import * as vscode from "vscode";

export type VisibleTexts = {
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

export enum StatusBar {
  JUMP = "🤸",
  IDLE = "😴",
  HINT_NOT_FOUND = "💢",
}

export type Editor = {
  editor: vscode.TextEditor;
  column: number | undefined;
  visibleTexts: VisibleTexts | null;
  isActive: boolean;
  charHintMap: Map<string, vscode.Position>;
};
