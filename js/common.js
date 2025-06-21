const TAB_WIDTH = 4;

const Storage = (() => {
    /* interface state {pointer: number; stack: string[]} */
    
    const APP_KEY = "JSONFORMATTER_";
    const POINTER_KEY = "JSONFORMATTER_POINTER";
    
    const savePointer = (state) => {
        const {pointer, stack} = state;
        localStorage.setItem(
            POINTER_KEY, 
            `[${pointer},${stack.length}]`
        );
    };
    /* private */ const getPointer = () => {
        const item = localStorage.getItem(POINTER_KEY);
        return item ? JSON.parse(item) : [0, 0];
    };
    
    const saveState = (state) => {
        const {pointer, stack} = state;
        localStorage.setItem(
            POINTER_KEY, 
            `[${pointer},${stack.length}]`
        );
        stack.forEach((d, i) => 
            localStorage.setItem(`${APP_KEY}${i}`, d)
        );
    };

    const getState = () => {
        const [pointer, length] = getPointer(POINTER_KEY);
        const stack = [];
        
        for(let i = 0; i < length; i++){
            const item = localStorage.getItem(`${APP_KEY}${i}`);
            item && stack.push(item);
        }
        
        return {pointer: pointer, stack: stack};
    };
    
    const clear = (key) => {
        localStorage.clear();
    };
    
    return {
        savePointer: (state) => savePointer(state),
        saveState: (state) => saveState(state),
        getState: () => getState(),
        clear: () => clear()
    };
})();

const PreParser = (() => {
    const TextUtil = (() => {
        const find = (text, charList) => {
            const indices = [];
            let skip = false;

            for(let i = 0; i < text.length; i++) {
                if(text[i] === '"'){
                    skip = !skip;
                }
                else if(!skip && charList.includes(text[i])){
                    indices.push(i);
                }
            }

            return indices;
        };
        const replace = (text, indices, newChar) => {
            const subs = [];
            j = 0, k = 0;

            for(let i = 0; i < indices.length; i++) {
                k = indices[i]; 
                subs.push(text.substring(j, k));
                j = k + 1;
            }

            if(k && k < text.length - 1){
                subs.push(text.substring(k + 1));
            }

            return subs.join(newChar);
        };
        return {
            find: (text, charList) => find(text, charList),
            replace: (text, indices, newChar) => replace(text, indices, newChar)
        };
    })();

    const OuterQuotes = (() => {
        const r1 = /";$/;
        const r2 = /"$/;
        const r3 = /^[a-zA-Z0-9 =]+"/;
        
        const fix = (text) => {
            if(text.length && text[0] === '"'){
                if(r1.exec(text)){
                    text = text.substring(1, text.length - 2);
                }
                else if(r2.exec(text)){
                    text = text.substring(1, text.length - 1);
                }
                return text.trim();
            }
            else {
                const match = r3.exec(text);
                if(match){
                    const len = match[0].length - 1;
                    const trimFront = text.substring(len);

                    return fix(trimFront);
                }
            }
            return text;
        };

        return {
            fix: (text) => fix(text)
        };
    })();

    const WhiteSpace = (() => {  
        const charList = [' ','\t','\n','\r'];

        return {
            fix: (text) => {
                const indices = TextUtil.find(text, charList);

                if(indices.length){
                    return TextUtil.replace(text, indices, "");
                }
                else{
                    return text;
                }
            }
        };
    })();

    const ObjNotation = (() => {    
        const getObjFixes = () => [
            {// java toString notation
                r1: /[a-zA-Z][a-zA-Z0-9_]*[(][^)]+[)]/g,
                r2: /^[a-zA-Z][a-zA-Z0-9_]*[(]/g,
                trim: 1
            },
            {// Bson Document notation
                r1: /[a-zA-Z][a-zA-Z0-9_]*[{]{2}[^}]+[}]{2}/g,
                r2: /^[a-zA-Z][a-zA-Z0-9_]*[{]{2}/g,
                trim: 2
            }
        ];

        let text = "";
        let good = true;
        let modified = false;

        const fixEqualSigns = () => {
            const indices = TextUtil.find(text, ["="]);

            if(indices.length){
                good = false;
                modified = true;
                text = TextUtil.replace(text, indices, ":");
            }
        };

        const findObjFix = (objFixes) => {
            for(let i = 0; i < objFixes.length; i++){
                
                if(objFixes[i].r1.exec(text)){
                    objFixes[i].r1.lastIndex = 0;// reset the regex
                    return i;
                }
            }

            return -1;
        };

        const doObjFix = (objFix) => {
            const tok = [];
            let match;
            let i = 0, j = 0, k = 0;

            while ((match = objFix.r1.exec(text))) {
                // this loop always runs at least once because findObjFix detected
                // the pattern
                const i = match.index;
                const j = i + match[0].length;

                if(k < i){
                    tok.push(text.substring(k, i));
                }

                k = j;

                const badText = text.substring(i, j - objFix.trim);
                const shortMatch = objFix.r2.exec(badText);

                if(shortMatch){
                    tok.push("{" + badText.substring(shortMatch[0].length) + "}");
                }
                
                objFix.r2.lastIndex = 0; // reset the short match
            }

            if(k < text.length){
                tok.push(text.substring(k));
            }

            if(tok.length){
                good = true;
                text = tok.join("");
                return;
            }
            good = false;
        };

        return {
            fix: (setText) => {
                text = setText;
                good = true;
                modified = false;

                fixEqualSigns();

                if(!good){
                    const objFixes = getObjFixes();
                    const iFix = findObjFix(objFixes);

                    if(iFix === -1){
                        good = true;
                    }
                    else {
                        doObjFix(objFixes[iFix]);
                    }
                }

                return text;
            },
            isGood: () => good,
            isModified: () => modified
        };
    })();
    
    let warnings = [];
    
    const preParse = (origText) => {
        warnings = [];
        
        let text = origText.replaceAll(/[\\]["]/g, '"');
        text = OuterQuotes.fix(text);
        text = WhiteSpace.fix(text);
        
        const fixedObjText = ObjNotation.fix(text);
        if(ObjNotation.isModified()){
            warnings.push("Warning: equal signs detected; check corrections");
            if(ObjNotation.isGood()){
                text = fixedObjText;
            }
        }

        return text;
    };
    
    return {
        preParse: (origText) => preParse(origText),
        getWarnings: () => warnings
    };
})();

const TokenGen = (() => {
    const properties = {
        [OBJ_OPEN]:     {opener: 1, closer: 0, key: 0, val: 0, endl: 1, ckEndl: 1, className: "charDelim"},
        [OBJ_CLOSE]:    {opener: 0, closer: 1, key: 0, val: 0, endl: 1, ckEndl: 1, className: "charDelim"},
        [ARR_OPEN]:     {opener: 1, closer: 0, key: 0, val: 0, endl: 1, ckEndl: 1, className: "charDelim"},
        [ARR_CLOSE]:    {opener: 0, closer: 1, key: 0, val: 0, endl: 1, ckEndl: 1, className: "charDelim"},
        [COLON]:        {opener: 0, closer: 0, key: 0, val: 0, endl: 0, ckEndl: 0, className: "charDelim"},
        [COMMA]:        {opener: 0, closer: 0, key: 0, val: 0, endl: 1, ckEndl: 0, className: "charDelim"},
        [KEY_TEXT]:     {opener: 0, closer: 0, key: 1, val: 0, endl: 0, ckEndl: 1, className: "charKey"},
        [VAL_TEXT]:     {opener: 0, closer: 0, key: 0, val: 1, endl: 1, ckEndl: 1, className: "charValue"},
        [VAL_ISO]:      {opener: 0, closer: 0, key: 0, val: 1, endl: 1, ckEndl: 1, className: "charDateValue"},
        [VAL_NUM]:      {opener: 0, closer: 0, key: 0, val: 1, endl: 1, ckEndl: 1, className: "charNumVal"},
        [VAL_BOOL]:     {opener: 0, closer: 0, key: 0, val: 1, endl: 1, ckEndl: 1, className: "charBoolVal"},
        [VAL_UNDEF]:    {opener: 0, closer: 0, key: 0, val: 1, endl: 1, ckEndl: 1, className: "charNullVal"},
        [VAL_DIFF]:     {opener: 0, closer: 0, key: 0, val: 1, endl: 1, ckEndl: 1, className: "diffToken"}
    };
    
    const genFormatToken = (htmlFormatter, jsonToken) => {
        const {tokType, text, id} = jsonToken;
        const {opener, closer, key, val, endl, ckEndl, className} = properties[tokType];
        
        return {
            tokType: tokType,       // tokType from JsonParser
            className: className,   // CSS class for token color
            id: id,			// id for highlighting on click
            isOpener: !!opener,     // true for {[
            isCloser: !!closer,	// true for }]
            isValue: !!val,		// true for any non-key text, number or boolean
            isKey: !!key,		// true for any key text
            checkEndline: !!ckEndl,	// true if token can be first in the current line (DomProxy adds newLine if needed)
            isEndline: !!endl,	// true if token can be last in the current line (drawFormatted() passes request to next token)
            isColon: false,		// true for :
            isErr: false,		// to be set by errChecker
            indent: 0,		// set by setIndents()
            counterpart: undefined, // openers reference closers and vice versa; other tokens leave this undefined 
            domObject: undefined,	// a reference to the dom object so it can be modified from the AppState.currTokens list
            value: text,		// text content
            formatted: "",		// DomProxy puts a non-html copy of the formatting here for clipboard
            onClick:  () => htmlFormatter? htmlFormatter.linkView(id) : () => {}
        };
    };
    
    const genNullToken = () => {
        return genFormatToken(undefined, {tokType: VAL_DIFF, text: " ", id: 0});
    };
//    
    const genDiffToken = (replaceToken) => {
        return {
            ...replaceToken, value: "_", className: "diffToken", onClick: () => {}
        };
    };
    
    return {
        genFormatToken: (htmlFormatter, jsonToken) => genFormatToken(htmlFormatter, jsonToken),
        //genDiffToken: (replaceToken) => genDiffToken(replaceToken),
        genNullToken: () => genNullToken()
    };
})();

const getHtmlFormatter = (formatDivId) => {  
    let tokenSource;
    
    const tabHtml = (indent) => {
        return (indent > 0)? '&nbsp;'.repeat(indent*TAB_WIDTH) : "";
    };
    const setIndents = (tokens) => {
        let indent = 0;

        for (let i = 0; i < tokens.length; i++){
            if(tokens[i].isOpener){
                tokens[i].indent = indent;
                indent++;
            }
            else if(tokens[i].isCloser){
                indent--;
                tokens[i].indent = indent;
            }
            else{
                tokens[i].indent = indent;
            }
        }
    };
    
    const linkView = (id) => {
        if(tokenSource){
            if(id){
                // link
                tokenSource.getTokens().forEach(t => {
                    t.domObject.setAttribute(
                        "class", 
                        t.id === id? "highlight" : t.className
                    );
                });
            }
            else {
                // unlink
                tokenSource.getTokens().forEach(t => {
                    t.domObject.setAttribute("class", t.className);
                    //t.domObject.classList.add(t.className);
                });
            }
        }
    };
    
    const appendText = (domParent, token, isEndline) => {
        let domChild = document.createElement("DIV");
        domChild.classList.add(token.className);

        domChild.addEventListener("click", token.onClick);
        token.domObject = domChild;

        if(token.checkEndline && isEndline){
            domParent.appendChild(document.createElement("BR"));
            domChild.innerHTML = tabHtml(token.indent) + token.value;
            //token.formatted = "\n" + tabSpace(token.indent) + token.value;
        }
        else{
            domChild.innerHTML = token.value;
            //token.formatted = token.value;
        }
        domParent.appendChild(domChild);
    };
    
    const appendErr = (domParent, text) => {
        let domChild = document.createElement("DIV");

        domChild.classList.add("errMessage");
        domChild.innerHTML = text;
        domParent.appendChild(document.createElement("BR"));
        domParent.appendChild(domChild);
    };
    
    const appendWarn = (domParent, text) => {
        let domChild = document.createElement("DIV");

        domChild.classList.add("warnMessage");
        domChild.innerHTML = text;
        domParent.appendChild(document.createElement("BR"));
        domParent.appendChild(domChild);
    };
    
    const drawFormattedHtml = (tokens, jsonErrs, warnings) => {
        setIndents(tokens);
        
        let isEndline = false;
        let div = document.getElementById(formatDivId);
        div.innerHTML = "";

        for (let i = 0; i < tokens.length; i++){
            appendText(div, tokens[i], isEndline);
            isEndline = tokens[i].isEndline;
        }
        jsonErrs.forEach(e => appendErr(div, e));
        warnings.forEach(w => appendWarn(div, w));
    };
    
    return {
        drawFormattedHtml: (tokens, jsonErrs, warnings) => drawFormattedHtml(tokens, jsonErrs, warnings),
        linkView: (id) => linkView(id),
        setTokenSource: (setSource) => tokenSource = setSource,
        appendWarn: (domParent, text) => appendWarn(domParent, text)
    };
};

const getPlainTextFormatter = () => {
    const tabSpace = (indent) => {
        return (indent > 0)? ' '.repeat(indent*TAB_WIDTH) : "";
    };
    
    const setIndents = (tokens) => {
        let indent = 0;

        for (let i = 0; i < tokens.length; i++){
            if(tokens[i].isOpener){
                tokens[i].indent = indent;
                indent++;
            }
            else if(tokens[i].isCloser){
                indent--;
                tokens[i].indent = indent;
            }
            else{
                tokens[i].indent = indent;
            }
        }
    };
          
    const formattedToArray = (tokens) => {
        setIndents(tokens);
        
        let isEndline = false;

        tokens.forEach(t => {
            t.formatted = (t.checkEndline && isEndline)?
                `\n${tabSpace(t.indent)}${t.value}` :
                t.value;
            isEndline = t.isEndline;
        });
        
        return tokens.map(t => t.formatted);
    };
    
    return {
        formattedToArray: (tokens) => formattedToArray(tokens)
    };
};

const getTokenSource = (htmlFormatter) => {
    let tokens = [];
    
    const setTokens = (jsonTokens) => {
        tokens = jsonTokens.map(
            t => TokenGen.genFormatToken(htmlFormatter, t) /* common.TokenGen */
        );
    };

    return {
        setTokens: (jsonTokens) => setTokens(jsonTokens),
        haveTokens: () => !!tokens.length,
        getTokens: () => tokens
        //formattedToArray: () => tokens.map(t => t.formatted)
    };
};
