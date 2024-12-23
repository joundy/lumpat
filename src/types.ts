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
