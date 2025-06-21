/* global testData, TokenGen */

const DEBOUNCE = 250;

const DomProxy = (() => {// for index.html dom access
    const getOrigTextValue = () => {
        return document.getElementById('origText').value;
    };
    const setOrigTextValue = (text) => {
        document.getElementById('origText').value = text;
    };
    const clearFields = () => {
        document.getElementById("origText").value = "";
        document.getElementById("formatOut").innerHTML = "";
        document.getElementById("objSize").innerHTML = "";
    };
    const renderObjSize = (objSize) => {
        document.getElementById('objSize').innerHTML = (objSize)? `(${objSize})` : "";
    };
    const renderState = (state) => {
        const {pointer, stack} = state;
        document.getElementById("pointerPos").innerHTML = 
                stack.length? `${pointer+1}/${stack.length}` : 
                "";
    };
    const renderPowerButton = (powerOn) => {
        const b = document.getElementById("buttonPower");

        if(powerOn){
            b.value = `\u{23FB}`;
            b.className = "";
            b.title = "Clean";
        }
        else{
            b.value = `\u{23FC}`;
            b.className = "bgRed";
            b.title = "Raw";
        }
    };
    /*private*/ const clearOnOutClick = (e) => {
        if(!document.getElementById("buttonSave").contains(e.target)){
            Flags.setConfirmSave(false);
        }
    };
    const renderSaveButton = (newState) => {
        const buttonSave = document.getElementById("buttonSave");
        if(newState){
            buttonSave.className = "bgRed";
            buttonSave.title = "Overwrite?";
            document.addEventListener("click", clearOnOutClick, false);
        }
        else{
            buttonSave.className = "";
            buttonSave.title = "Save";
            document.removeEventListener("click", clearOnOutClick, false);
        }
    };
    const setWindowSize = (windowSize) => {
        const height = ["1", "8", "30"];
        const buttonText = ["+", "+", "-"]; 
        document.getElementById("origText").rows = height[windowSize];
        document.getElementById("buttonWinSize").value = buttonText[windowSize];
    };
    /*private*/ const toClipboard = (text) => {
        let temp = document.createElement("textarea");
        document.body.appendChild(temp);
        temp.value = text;
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        document.getElementById('origText').focus();
    };
    const origToClipboard = () => {
        document.getElementById('origText').select();
        document.execCommand("copy");
    };

    const escapedToClipboard = () => {
        let text = getOrigTextValue();
        text = text.replaceAll(/["]/g, '\\"');
        toClipboard(text);
    };

    const formattedToClipboard = () => {
        if(TokenSource.haveTokens()){
            let formatted = PlainTextFormatter.formattedToArray(
                TokenSource.getTokens()
            );
            toClipboard(formatted.join(""));
        }
    };
    
    const renderDiffButton = (disabled) => {
        document.getElementById("buttonDiff").disabled = disabled;
    };

    return {
        getOrigTextValue: () => getOrigTextValue(),
        setOrigTextValue: (text) => setOrigTextValue(text),
        clearFields: () => clearFields(),
        renderObjSize: (newCount) => renderObjSize(newCount),
        renderState: (state) => renderState(state),
        renderPowerButton: (powerOn) => renderPowerButton(powerOn),
        renderSaveButton: (newState) => renderSaveButton(newState),
        setWindowSize: (hide) => setWindowSize(hide),
        origToClipboard: () => origToClipboard(),
        escapedToClipboard: () => escapedToClipboard(),
        formattedToClipboard: () => formattedToClipboard(),
        renderDiffButton: (disabled) => renderDiffButton(disabled)
    };
})();

const Flags = (() => {// for index.html button states
    let windowSize = 1;
    let powerOn = true;
    let confirmSave = false;

    const toggleHide = () => {
        windowSize = (windowSize + 1) % 3;
        DomProxy.setWindowSize(windowSize);
    };
    const togglePowerButton = () => {
        powerOn = !powerOn;
        DomProxy.renderPowerButton(powerOn);
        Parser.parse();
    };

    const setConfirmSave = (newState) => {
        confirmSave = newState;
        DomProxy.renderSaveButton(newState);
    };

    return {
        toggleHide: () => toggleHide(),
        togglePowerButton: () => togglePowerButton(),
        isPowerOn: () => powerOn,
        setConfirmSave: (newState) => setConfirmSave(newState),
        isConfirmSave: () => confirmSave
    };
})();

const AppState = (() => {// for index.html state
    /* import common.Storage */
    /* interface {pointer: number; stack: string[]} */
    
    const state = {pointer: 0, stack: []};

    /*private*/ const incPointer = () => {
        state.pointer = Math.min(state.pointer + 1, state.stack.length - 1);
        DomProxy.renderState(state);
        Storage.savePointer(state);
    };
    /*private*/ const decPointer = () => {
        state.pointer = Math.max(state.pointer - 1, 0);
        DomProxy.renderState(state);
        Storage.savePointer(state);
    };
    const save = (text) => { 
        state.stack[state.pointer] = text;
        Storage.saveState(state);
    };
    const push = (text) => { 
        state.stack.push(text);
        state.pointer = state.stack.length - 1;
        DomProxy.renderDiffButton(state.stack.length < 2);
        DomProxy.renderState(state);
        Storage.saveState(state);
    };
    const back = () => { 
        decPointer();
        return state.stack[state.pointer];
    };
    const forward = () => { 
        incPointer();
        return state.stack[state.pointer];
    };
    const top = () => { 
        state.pointer = state.stack.length - 1;
        DomProxy.renderState(state);
        Storage.savePointer(state);
        return state.stack[state.pointer];
    };
    const pop = () => {
        state.stack.pop();
        
        DomProxy.renderDiffButton(state.stack.length < 2);
        
        if(state.stack.length){
            state.pointer = Math.min(state.pointer, state.stack.length - 1);
            Storage.saveState(state);
            DomProxy.renderState(state);
            return top();
        }
        else {
            clearState();
            return "";
        }
    };
    const clearState = () => {
        state.pointer = 0;
        state.stack = [];
        Storage.clear();
        DomProxy.renderState(state);
    };
    
    const initFromStorage = () => {
        let {pointer, stack} = Storage.getState();
        let value;
        
        if(stack.length){
            pointer = Math.min(pointer, stack.length - 1);
            value = stack[pointer];
        }
        else{
            pointer = 0;
        }
        
        state.pointer = pointer;
        state.stack = stack;
    };

    const initIndexFromStorage = () => {
        initFromStorage();

        DomProxy.renderState(state);
        DomProxy.renderDiffButton(state.stack.length < 2);
        
        if(state.stack.length){
            DomProxy.setOrigTextValue(state.stack[state.pointer]);
            Parser.parse();
        }
    };
    
    return {
        save: (text) => save(text),
        push: (text) => push(text),
        back: () => back(),
        forward: () => forward(),
        top: () => top(),
        pop: () => pop(),
        haveState: () => !!state.stack.length,
        initIndexFromStorage: () => initIndexFromStorage(),
        clearState: () => clearState()
    };
})();

const HtmlFormatter = getHtmlFormatter("formatOut"); /* commons.getHtmlFormatter() */
const PlainTextFormatter = getPlainTextFormatter();
const TokenSource = getTokenSource(HtmlFormatter);
HtmlFormatter.setTokenSource(TokenSource);

const Parser = (() => {
    const parse = () => {
        // Trim this to remove any unknown characters from front and back
        // Solves gitHub paste from readme problem
        const origText = DomProxy.getOrigTextValue()?.trim();
        
        if(origText?.length){
            let text = PreParser.preParse(origText);
            
            if(Flags.isPowerOn()){
                DomProxy.setOrigTextValue(text);
            }
            
            const [jsonTokens, jsonErrs] = JsonParser.parse(text);
            
            // JsonTokens in, FormatTokens out
            TokenSource.setTokens(jsonTokens);
            const formatTokens = TokenSource.getTokens();

            DomProxy.renderObjSize(
                formatTokens.reduce((acc, t) => t.isValue ? ++acc : acc, 0)
            );

            HtmlFormatter.drawFormattedHtml(formatTokens, jsonErrs, PreParser.getWarnings());
        }
    };
    
    const debounceParse = (() => {
        let timeout;

        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(parse, DEBOUNCE);
        };
    })();
    
    return {
        onExternalChange: () => debounceParse(),
        parse: () => parse()
    };
})();

// DOM events

const clearFields = () => {
    DomProxy.clearFields();
};

const clearState = () => {
    AppState.clearState();
    DomProxy.clearFields();
};

const toggleHide = () => {
    Flags.toggleHide();
};

const togglePowerButton = () => {
    Flags.togglePowerButton();
};

const slideFormatted = () => {
    if(TokenSource.haveTokens()){
        let formatted = PlainTextFormatter.formattedToArray(
            TokenSource.getTokens()
        );
        DomProxy.setOrigTextValue(formatted.join(""));
        Parser.parse();
    }
};

const stateSave = () => {
    const text = DomProxy.getOrigTextValue();

    if(text.length){
        if(AppState.haveState()){
            if(Flags.isConfirmSave()){
                Flags.setConfirmSave(false);
                AppState.save(text);
            }
            else {
                Flags.setConfirmSave(true);
            }
        }
        else {
                AppState.push(text);
        }
    }
    else{
        Flags.setConfirmSave(false);
    }
};

const statePush = () => {
    const text = DomProxy.getOrigTextValue();
    if(text.length){
        AppState.push(text);
    }
};

const stateBack = () => {
    if(AppState.haveState()){
        DomProxy.setOrigTextValue(AppState.back());
        Parser.parse();
    }
};

const stateForward = () => {
    if(AppState.haveState()){
        DomProxy.setOrigTextValue(AppState.forward());
        Parser.parse();
    }	
};

const stateTop = () => {
    if(AppState.haveState()){
        DomProxy.setOrigTextValue(AppState.top());
        Parser.parse();		
    }	
};

const statePop = () => {
    if(AppState.haveState()){
        DomProxy.setOrigTextValue(AppState.pop());
        Parser.parse();		
    }	
};

const origToClipboard = () => {
    DomProxy.origToClipboard();
};

const escapedToClipboard = () => {
    DomProxy.escapedToClipboard();
};

const formattedToClipboard = () => {
    DomProxy.formattedToClipboard();
};

const onTextChange = () => {
    
};

const newDiff = () => {
    window.open("diff.html", '_blank');
};

/*
TEST VALUES

DIFF
{firstName:Bill,lastName:Burns,age:61,dob:1959:07:04,children:[Bill,Bueford,Bart,Benny],jobs:[computerscientist,musicproducer,respiratorytherapist]}
{firstName:Bill,lastName:Burns,age:62,dob:1958:07:04,children:[Billy,Bueford,Bart,Benny],jobs:[computerscientist,musicproducer,doctor]}
{"firstName":"Bill","lastName":"Burns","age":62,"dob":"1958:07:04",favoriteColor:blue,favoriteMusic:opera,"children":["Billy","Bueford","Bart","Benji"],"jobs":["computerscientist","musicproducer","respiratorytherapist"]}
{thing:{"id":"file","value":"File","popup":{"menuitem":[{"value":false,"onclick":"doIt()"},{"value":-00033.60000,"onclick":"OpenDoc()"},{"value":true,"onclick":"CloseDoc()"}]}}}
{thing:{"id":"file","value":"File","popup":{"menuitem":[{"value":true,"onclick":"doIt()"},{"value":-00033.6,"onclick":"OpenDoc()"},{"value":false,"onclick":"CloseDoc()"}]}}}

TEST DATA SHORT:
    {"list of numbers":[1,2,3],anObject:{"some key":"some value"},"an empty object":{}, anEmptyArray:[]}

TEST DATA LONG:
    {"menu": {"id": "file","value": "File","popup": {"menuitem": [{"value": "New", 
    "onclick": "CreateNewDoc()"},{"value": "Open", "onclick": "OpenDoc()"},{"value": 
    "Close", "onclick": "CloseDoc()"} ]}}}

ESCAPED
    {\"this\":[],\"string\":{\"has\":10},\"escaped\":\"quotes\"}
    {\"this\":[],\"string\":{\"has\":10},\"escaped\":\"quotes\"}

UNNECESSARY QUOTES
    "{"surrounded":[1,2,3],"by":{"unnecessary":23},"quotes":"again"}";

ESCAPED WITH UNNECESSARY QUOTES
    "{\"surrounded\":[1,2,3],\"by\":{\"unnecessary\":23},\"quotes\":\"again\"}"

PASTED FROM A STRING VARIABLE
    String myString = "{\"surrounded\":[1,2,3],\"by\":{\"unnecessary\":23},\"quotes\":\"again\"}";

TAB AND NEWLINE (Due to HTML, multi-space only shows up when format copied to clipboard)
    {a:		b,c    :d 
    , e: "in	quotes 		tabs"}

BOOLEAN, NUMBER, DATES, UNDEFINED, NULL
    {"anObject":{"someKey":"someValue","a bool value":true,"an inner object":
    {"an inner array":[{"another bool":false,"what to do about undefined?":undefined},
    {"a string":"spaces in quotes","a number":-00033.60000,"what to do about null?":null},
    {"date":2025-01-05T02:30:14.321Z,"date2":10/15/2020,"date3":2025-01-05,"text":
    someText,"date4":2025-01-05}]}}}

INNER QUOTES NOT SUPPORTED!
    ["He said, \"Hello!\""]

JAVA MAP
    {a=first,b=second}

JAVA BSON DOCUMENT
    Document{{key1=value1, key2=value2, key3="keep the = sign"}} 

JAVA BSON DOCUMENT IN ARRAY
    [a, b, Document{{name=John Doe, age=30, city=New York}},d]

    [Document{{name=John Doe, age=30, city=New York}},Document{{name=Jane Doo, age=35, city=LosAngeles}}]

JAVA TOSTRING NOTATION IN ARRAY
    [a, b, ClassName(key1=value1, key2=value2, key3="keep the = sign"), d]

    [ClassName(key1=value1, key2=value2, key3=value3), ClassName2(key4=value4, key5=value5, key6=value6)]

IGNORE JAVA MAP-LIKE MISTAKE
    [objectName{key1:value1, key2:value2, key3:"keep the = sign"}]

*/

