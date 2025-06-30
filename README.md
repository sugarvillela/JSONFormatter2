# JSONFormatter2
JSON Formatter is a software tool for display, cleanup, editing, and difference of JSON and JSON-like text.
* Useful for quick viewing of obfuscated JSON, such as from debuggers, toString() functions, and variable definitions.
* Also useful for originating test data or other JSON content.
* Contains customizations for cleaning debug output from Java or other languages (whose output is similar to JSON but not valid JSON).
* Diff function allows comparison of similar JSON samples.

## Requirements

### Display:
* "Pretty print" JSON in main display window.
* Displays keys and values in different colors.
* Strings, numbers, booleans and null/undefined each have their own color.
* Date (ISO and informal) have slightly different color from normal strings.
* Displays total size of the JSON input (number of values AKA leaves).
* Highlights opening/closing symbols on click.

### Input and auto-cleanup:
* The parser reads JSON pasted or typed in the main input window (text area).
* Auto-adds quotes to unquoted fields, except for numeric, boolean or null/undefined.
  * Useful for quick typing/editing of JSON text.
  * Note: Unquoted null/undefined may break some 3rd party JSON parsers. You should surround these in quotes when using Formatter output as input to other software.
* Auto-removes escape symbol before quotes.
  * Useful for viewing JSON from quoted strings.
* Auto-removes surrounding quotes from the entire JSON string.
  * Some debuggers surround strings with unnecessary quotes.
* Auto-removes leading text where JSON is pasted from a variable declaration, like this...
  * String myJson = "{\\"this\\":[],\\"is\\":{\\"a\\":1},\\"variable\\":\\"declaration\\"}";
* Automatically transforms some Java toString() formats.
  * Supports Java Map, Bson Document, Lombok toString(), and similar.
* Auto-removes spaces, tabs, and newlines, unless surrounded by quotes.

Note: JSON Formatter does not support nested escaped quotes, as in "He said, \\"Hello.\\"".  Instead, it removes all escape symbols.

### Parsing:
* Parses the input on-key-up or paste.
* Displays errors on invalid JSON input.

### Storage:
* Stores any number of JSON items.
* Keeps them in a stack-like structure, organized by position, not by name.
  * Provides push, pop, top, and front/back navigation controls.
* Displays storage size, along with current display position. 
* Uses the browser's localStorage for persistence beyond page refresh.

### Output:
* Copies the original input text to the clipboard.
* Copies formatted output text to the clipboard.
* Copies the original input text to the clipboard with escape symbols added before quotes.
* Sends contents of storage to a difference engine.
  * Enables the button when storage has at least two items.

### Difference engine:
* Generates Diff view in a new tab.
* Shows diffs in side-by-side display.
* Allows the user to select from any JSON items in storage.
* Auto-updates the Diff tab when the main tab's storage is changed.
* Warns the user when storage contains fewer than two items for Diff.

## How to use the JSON Formatter:
JSON Formatter has an input window (a text area) and an output window (a read-only div).
Paste or type JSON in the input window and view the formatted JSON in the output window.

## Contols:
To save space, controls are cryptic. You can hover over a button if you forget what it does.

There are three control groups: __Input__, __Storage__, and __Output__.

### Input control group: 
Descriptions left to right:
* "Clear Window" ( &#128465; ):
  * Clears the input window (same as if you highlighted and deleted the contents).
* "Window Size" (either a plus or minus sign):
  * Click the size button to toggle through 1, 8, or 30 row height. Default size is 8 rows high. 
* "Slide Formatted" ( &uarr; ):
  * Copies the formatted output back to the input.
  * Because the formatter auto-adds quotes, sliding the output to the input saves you from having to type the quotes yourself.
  * If you want to edit the input text, it is easier when the text is formatted.
* "Clean" ( &#x23fb; ).  Default is on.
  * When Clean is on, all the auto-cleanup described above is automatically applied to the input window. The text is "scrunched" as spaces and newlines are removed.
  * When Clean is off (the button turns red), auto-cleanup is not applied. This makes it easier to edit, especially if you slide the formatted output to the input with the Window Size set to its largest.
  * Auto-cleanup is always applied to the formatted output, whether the Clean button is on or off.
* "Object Size" (a number in parentheses).
  * The number of values/leaves in the JSON input.

### Storage Control Group:
Descriptions left to right:
* "Push" ( + ):
  * Pushes the text in the input window onto the top of the stack.
  * Your position in the stack is set to the top of the stack.
* "Save" ( &#128190; ):
  * Saves the text to the current position in the stack.
  * Because this overwrites whatever is there, you must click this button twice,
    * The first click turns the button red, and the tooltip says "Overwrite?"
    * Click it again to save.
    * Clicking anywhere else during the save process cancels the save.
  * Clicking save when the stack is empty is the same as push (nothing to overwrite).
* "Back" ( &lsaquo; ):
  * Decrements your position in the stack.
* "Forward" ( &rsaquo; ):
  * Increments your position in the stack.
* "Top" ( &rsaquo;&rsaquo; ):
  * Sets your position to the top of the stack.
* "Pop" ( * ):
  * Discards the top item in the stack. Sets your position to the new top of the stack.
* "Clear State" ( &#128465; ):
  * Empties the stack and local storage.
* "Current position" (position/size)
  * Displays your position and the size of the stack. 

### Output Control Group:
Descriptions left to right:
* "Copy Original" ( &#128203;Orig ):
  * Input text to the clipboard.
  * Useful for retrieving auto-cleanup of input text.
* "Copy Formatted" ( &#128203;Formatted ):
  * Formatted text to clipboard.
  * Replaces the HTML display with plain text (spaces and newlines).
* "Copy with Quotes Escaped" ( &#128203;Escape ):
  * Input text to the clipboard with escape symbols added.
  * Useful when your outside text editor does not auto-escape quotes.
* "Diff Items in Stack" ( &nearr;Diff ):
  * Opens a new tab for diff display
  * Send contents of storage to a new diff tab (enabled when storage has at least two items).

## How to use JSON Diff
* JSON Diff opens in a new tab next to JSON Formatter.
* Uses the contents of JSON Formatter's storage to display side-by-side differences.
* There are two dropdown selectors, each containing the storage contents as options.
  * The first time JSON Diff opens, it has two storage items pre-selected, based on the pointer position from JSON Formatter.
  * You can select any two storage items for comparison.
* You can return to JSON Formatter and modify the storage contents. JSON Diff will automatically update when you return to it.
* JSON Diff needs at least two storage items for comparison.
  * If you delete items in JSON Formatter, JSON Diff may warn you that it needs more items.

## Test Values
Paste these JSON samples into JSON Formatter to demonstrate how it handles various problems

#### TEST DATA SHORT:

    {"list of numbers":[1,2,3],anObject:{"some key":"some value"},"an empty object":{}, anEmptyArray:[]}

#### BOOLEAN, NUMBER, DATES, UNDEFINED, NULL

    {"anObject":{"someKey":"someValue","a bool value":true,"an inner object":
    {"an inner array":[{"another bool":false,"what to do about undefined?":undefined},
    {"a string":"spaces in quotes","a number":-00033.60000,"what to do about null?":null},
    {"date":2025-01-05T02:30:14.321Z,"date2":10/15/2020,"date3":2025-01-05,"text":
    someText,"date4":2025-01-05}]}}}

#### ESCAPED
     {\"this\":[],\"string\":{\"has\":10},\"escaped\":\"quotes\"}

#### UNNECESSARY QUOTES
    "{"surrounded":[1,2,3],"by":{"unnecessary":23},"quotes":"again"}";

#### ESCAPED WITH UNNECESSARY QUOTES
    "{\"surrounded\":[1,2,3],\"by\":{\"unnecessary\":23},\"quotes\":\"again\"}"

#### PASTED FROM A STRING VARIABLE
    String myString = "{\"surrounded\":[1,2,3],\"by\":{\"unnecessary\":23},\"quotes\":\"again\"}";

#### TAB AND NEWLINE 
(Due to HTML rules, multi-space only shows up when the formatted text is copied to the clipboard)

    {a:		 
    b,c    
    :d 
    , e: "in	quotes 		tabs"}

#### INNER QUOTES NOT SUPPORTED!
    ["He said, \"Hello!\""]

#### JAVA MAP
    {a=first,b=second}

#### JAVA BSON DOCUMENT
    Document{{key1=value1, key2=value2, key3="keep the = sign"}} 

#### JAVA BSON DOCUMENT IN ARRAY
    [a, b, Document{{name=John Doe, age=30, city=New York}},d]

#### TWO DOCUMENTS BACK TO BACK IN ARRAY

    [Document{{name=John Doe, age=30, city=New York}},Document{{name=Jane Doo, age=35, city=LosAngeles}}]

#### JAVA TOSTRING NOTATION IN ARRAY
    [a, b, ClassName(key1=value1, key2=value2, key3="keep the = sign"), d]

#### TWO JAVA TOSTRING IN ARRAY

    [ClassName(key1=value1, key2=value2, key3=value3), ClassName2(key4=value4, key5=value5, key6=value6)]

#### DIFF
Push these values into storage and click "Diff"

    {firstName:Bill,lastName:Burns,age:61,dob:1959:07:04,children:[Bill,Bueford,Bart,Benny],jobs:[computerscientist,musicproducer,respiratorytherapist]}

    {firstName:Bill,lastName:Burns,age:62,dob:1958:07:04,children:[Billy,Bueford,Bart,Benny],jobs:[computerscientist,musicproducer,doctor]}

    {"firstName":"Bill","lastName":"Burns","age":62,"dob":"1958:07:04",favoriteColor:blue,favoriteMusic:opera,"children":["Billy","Bueford","Bart","Benji"],"jobs":
    ["computerscientist","musicproducer","respiratorytherapist"]}

    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,25,26,27,28,29,20,21,22,23,24,25,26,27,28,29,30,1,2,3,4,5,6,7,8,9,40,41,42,43,44,45,46,47,48,49,50]

    [1,2,4,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]

    {thing:{"id":"file","value":"File","popup":{"menuitem":[{"value":false,"onclick":"doIt()"},{"value":-00033.60000,"onclick":"OpenDoc()"},  {"value":true,"onclick":"CloseDoc()"}]}}}

    {thing:{"id":"file","value":"File","popup":{"menuitem":[{"value":true,"onclick":"doIt()"},{"value":-00033.6,"onclick":"OpenDoc()"},{"value":false,"onclick":"CloseDoc()"}]}}}

    {"anObject":{"someKey":"someValue","a bool value":true,"an inner object":{"an inner array":[{"another bool":false,"what to do about undefined?":undefined},{"date":"2025-01-05T02:30:14.321Z","date2":"10/15/2020","date3":"2025-01-05","text":"someText","date4":"2025-01-05"},{"a string":"spacesNotInQuotes","a number":-17,"what to do about null?":null},{"date":"2020-01-05T02:30:14.321Z","date2":"01/05/2020","date3":"2025-01-05","text":"someText","date4":"2025-01-05"},]}}}

    {"anObject":{"someOtherKey":"someOtherValue","a bool value":false,"an inner object":{"an inner array":[{"a bool value":false,"what to do about undefined?":"defined"},{"a string":"spaces in quotes","a number":-00033.60000,"what to do about null?":null},{"date":"2025-01-05T02:30:14.321Z","date2":"10/15/2020","date3":"2025-01-05","text":"someText","date4":"2025-01-05"},{"a string":"spacesNotInQuotes","a number":-17,"what to do about null?":"not null"},{"date":"2020-01-05T02:30:14.321Z","date2":"01/05/2020","date3":"2022-01-05","text":"someOtherValue","date4":"2025-01-05"},]}}}

    

