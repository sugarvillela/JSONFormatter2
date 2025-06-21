# JSONFormatter2
JSON Formatter is a software tool for display, cleanup, editing, and difference of JSON and JSON-like text.
* Useful for quick viewing of obfuscated JSON, such as from debuggers, toString functions and variable definitions.
* Also useful for originating test data or other JSON content.
* Contains customizations for cleaning debug output from Java or other languages (whose output is similar to JSON but not valid JSON).
* Diff function allows comparison of similar JSON samples.

## Requirements
Here are some ideas I came up with for an ideal tool.  JSON Formatter meets these requirements.

### Display:
* "Pretty print" JSON in main display window.
* Display keys and values in different colors.
* Strings, numbers, booleans and null/undefined each have their own color.
* Date (ISO and informal) slightly different color from normal strings.
* Display total size of the JSON input (number of values AKA leaves).
* Highlight opening/closing symbols on click.

### Input and auto-cleanup:
* The parser reads JSON pasted or typed in the main input window (text area).
* Auto-add quotes to unquoted fields, except for numeric, boolean or null/undefined.
  * Useful for quick typing/editing of JSON text.
  * Note: Unquoted null/undefined may break some 3rd party JSON parsers. You should surround these in quotes when using Formatter output as input to other software.
* Auto-remove escape symbol before quotes.
  * Useful for viewing JSON from quoted strings.
* Auto-remove surrounding quotes from the entire JSON string.
  * Some debuggers surround strings with extra quotes.
* Auto-remove leading text data where JSON is pasted from a variable declaration.
* Auto-tranform some Java toString formats.
  * Supports Java map, Bson Document, Lombok toString and similar.
* Auto-remove spaces, tabs and newlines, unless surrounded by quotes.

Note: JSON Formatter does not support nested escaped quotes, as in "He said, \\"Hello.\\"".  Instead, it removes all escape symbols.

### Parsing:
* Update parsing on-key-up or paste.
* Display errors on invalid JSON input.

### Storage:
* Store any number of JSON items.
* To save time, don't name stored items. Just keep them in the order they were stored.
* Arrange storage in a stack-like structure.
  * Provide push, pop, top, and front/back navigation controls.
* Display storage size, along with current display position. 
* Use the browser's localStorage for persistence beyond page refresh.

### Output:
* Copy the original input text to the clipboard.
* Copy formatted output text to the clipboard.
* Copy the original input text to the clipboard with escape symbols added before quotes.
* Send contents of storage to a difference engine.
  * Enabled when storage has at least two items.

### Difference engine:
* Generate diff view in a new tab.
* Show diffs in side-by-side display.
* Allow the user to select from any JSON items in storage.
* Auto-update diff tab when main tab storage is changed.
* Warn the user when storage contains fewer than two items for diff.

## How to use the JSON Formatter:
JSON Formatter has an input window (a text area) and an output window (a read-only div).
Paste or type JSON in the input window and view the formatted JSON in the output window.

## Contols:
To save space, controls are cryptic. You can hover over a button if you forget what it does.

There are three control groups: Input, Storage, and Output.

### Input control group: 
Descriptions left to right:
* "Clear Window" (a trash icon):
  * Clears the input window (same as if you highlighted and deleted the contents).
* "Window Size" (either a plus or minus sign):
  * Click the size button to toggle through 1, 8, or 30 row height. Default size is 8 rows high. 
* "Slide Formatted" (vertical arrow):
  * Copies the formatted output back to the input.
  * Because the formatter auto-adds quotes, sliding the output to the input saves you from having to type the quotes yourself.
  * If you want to edit the input text, it is easier when the text is formatted.
* "Clean" (it looks like a power button).  Default is on.
  * When Clean is on, all the auto-cleanup described above is automatically applied to the input window. The text is "scrunched" as spaces and newlines are removed.
  * When Clean is off (the button turns red), auto-cleanup is not applied. This makes it easier to edit, especially if you slide the formatted output to the input with the Window Size set to its largest.
  * Auto-cleanup is always applied to the formatted output, whether the Clean button is on or off.
* "Object Size" (a number in parentheses).
  * The number of values/leaves in the JSON input.

### Storage Control Group:
Descriptions left to right:
* "Push" (a plus sign):
  * Pushes the text in the input window onto the top of the stack.
  * Your position in the stack is set to the top of the stack.
* "Save" (floppy-disk icon):
  * Saves the text to the current position in the stack.
  * Because this overwrites whatever is there, you must click this button twice,
    * The first click turns the button red, and the tooltip says "Overwrite?"
    * Click it again to save.
    * Clicking anywhere else during the save process cancels the save.
  * Clicking save when the stack is empty is the same as push (nothing to overwrite).
* "Back" (left chevron):
  * Decrements your position in the stack.
* "Forward" (right chevron):
  * Increments your position in the stack.
* "Top" (double right chevron):
  * Sets your position to the top of the stack.
* "Pop" (an asterisk):
  * Discards the top item in the stack. Sets your position to the new top of the stack.
* "Clear State" (another trash icon):
  * Empties the stack and local storage.
* "Current position" (position/size)
  * Displays your position and the size of the stack. 

## Output Control Group:
Descriptions left to right:
* "Copy Original" (Clipboard Icon + Orig):
  * Input text to the clipboard.
  * Useful for retrieving auto-cleanup of input text.
* "Copy Formatted" (Clipboard Icon + Orig):
  * Formatted text to clipboard.
  * Replaces the HTML display with plain text (spaces and newlines).
* "Copy with Quotes Escaped" (Clipboard Icon + Escape):
  * Input text to the clipboard with escape symbols added.
  * Useful when your outside text editor does not auto-escape quotes.
* "Diff Items in Stack" (a diagonal up arrow):
  * Opens a new tab for diff display
  * Send contents of storage to a difference engine (enabled when storage has at least two items).

## How to use JSON Diff
* JSON Diff opens in a new tab next to JSON Formatter.
* Uses the contents of JSON Formatter's storage to display side-by-side differences.
* There are two dropdown selectors, each containing the storage contents as options.
  * The first time JSON Diff opens, it has two storage items pre-selected, based on the pointer position from JSON Formatter.
  * You can select any two storage items for comparison.
* You can return to JSON Formatter and modify the storage contents. JSON Diff will automatically update when you return to it.
* JSON Diff needs at least two storage items for comparison.
  * If you delete items in JSON Formatter, JSON Diff may warn you that it needs more items.

