/* global testData, TokenGen */

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
    const renderHideButton = (hide) => {
        document.getElementById("buttonHide").value = (hide)? "+":"-";
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
    const hideWindow = (hide) => {
        document.getElementById("origText").style.maxHeight = (hide)? "20px":"500px";
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
        renderHideButton: (hide) => renderHideButton(hide),
        renderPowerButton: (powerOn) => renderPowerButton(powerOn),
        renderSaveButton: (newState) => renderSaveButton(newState),
        hideWindow: (hide) => hideWindow(hide),
        origToClipboard: () => origToClipboard(),
        escapedToClipboard: () => escapedToClipboard(),
        formattedToClipboard: () => formattedToClipboard(),
        renderDiffButton: (disabled) => renderDiffButton(disabled)
    };
})();

const Flags = (() => {// for index.html button states
    let hideWindow = false;
    let powerOn = true;
    let confirmSave = false;

    const toggleHide = () => {
        hideWindow = !hideWindow;
        DomProxy.renderHideButton(hideWindow);
        DomProxy.hideWindow(hideWindow);
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
        //console.log("init a")
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
       // console.log("init d", state)
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
        clearState: () => clearState(),
        newDiff: () => StorageDiff.saveState(state)
    };
})();

const HtmlFormatter = getHtmlFormatter("formatOut"); /* commons.getHtmlFormatter() */
const PlainTextFormatter = getPlainTextFormatter();
const TokenSource = getTokenSource(HtmlFormatter);

const Parser = (() => {
    const parse = () => {
        //console.log("parse");
        const origText = DomProxy.getOrigTextValue();
        //console.log("parse", origText);
        
        if(origText?.length){
            let text = PreParser.preParse(origText);
            
            if(Flags.isPowerOn()){
                DomProxy.setOrigTextValue(text);
            }
            
            const [jsonTokens, jsonErrs] = JsonParser.parse(text);
            
//            console.log("jsonErrs 1", jsonErrs);
//            console.log(jsonTokens);
            TokenSource.setTokens(jsonTokens);

            let tokens = TokenSource.getTokens();

            DomProxy.renderObjSize(
                tokens.reduce((acc, t) => t.isValue ? ++acc : acc, 0)
            );

            HtmlFormatter.drawFormattedHtml(tokens, jsonErrs, PreParser.getWarnings());
        }
        //console.log(testData);
    };
    
    const debounceParse = (() => {
        let timeout;

        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(parse, 250);
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
    let formattedString = TokenSource.getTokens().map(
        t => t.formatted
    ).join("");

    DomProxy.setOrigTextValue(formattedString);
    Parser.parse();
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
    AppState.newDiff();
    window.open("diff.html", '_blank');
};

