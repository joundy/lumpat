# Lumpat

"Lumpat" or "Mlumpat" in Javanese means "jump."\
A VS Code extension that enhances text navigation with quick jump-to-highlight functionality.

![lumpat](https://github.com/user-attachments/assets/41543714-80be-43ef-87ef-903ab46bb109)

## Features

- Quick navigation through text using keyboard shortcuts
- Visual highlighting system that shows jump targets
- Efficient movement without using the mouse
- Support vim extension

## Installation

[Marketplace](https://marketplace.visualstudio.com/items?itemName=Joundy.lumpat)

## Usage

1. Trigger the jump mode using `Shift + Enter` (or run command `lumpat.jump`)
2. Visual highlights will appear in your text
3. Type the highlighted character to jump to that location

## Default Keyboard Shortcuts

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Shift + Enter` | `lumpat.jump` | Activate jump mode and highlight jump targets |
| `Escape` | `lumpat.close` | Exit jump mode |
| `a-z` | `lumpat.[key]` | Jump to the highlighted location marked with that letter when jump-mode is active |

## Configuration

Lumpat provides several customization options through VSCode settings:

| Setting | Description | Default |
|---------|-------------|--------|
| `lumpat.chars` | Characters used for jump labels | `"asdghklqwertyuiopzxcvbnmfj"` |
| `lumpat.backgroundColor` | Background color for jump mode | `"#515878"` |
| `lumpat.highlightColor` | Highlight color for jump labels | `"#0db3d0"` |
| `lumpat.highlightColorPriority` | Priority highlight color for jump labels | `"#f70078"` |
| `lumpat.regexPattern` | Regular expression pattern for matching jump positions | `"(\b\w)|(\B(?=[A-Z]|[#_]\w))|\b$"` |

You can customize these settings in your VSCode settings.json file or through the Settings UI.

## Status

This is currently in beta. Please report any issues you encounter!

## Acknowledgments

This extension is highly inspired by:

- [hop.nvim](https://github.com/hadronized/hop.nvim)
- [jumpy2](https://github.com/DavidLGoldberg/jumpy2)

## License

MIT
