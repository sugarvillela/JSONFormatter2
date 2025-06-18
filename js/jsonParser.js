const EOI = false;
const ERR_EARLY1 = "end of JSON before end of input";
const ERR_EARLY2 = "unexpected end of input";
const ERR_MULTI_ROOT = "expected a single root object or array";
const POS_INFO_LEN = 20; // How much of the input string to display with error

const OBJ_OPEN = "OBJ_OPEN";
const OBJ_CLOSE = "OBJ_CLOSE";
const ARR_OPEN = "ARR_OPEN";
const ARR_CLOSE = "ARR_CLOSE";
const KEY_TEXT = "KEY_TEXT";
const COLON = "COLON";
const VAL_TEXT = "VAL_TEXT";
const VAL_ISO = "VAL_ISO";
const VAL_NUM = "VAL_NUM";
const VAL_BOOL = "VAL_BOOL";
const VAL_UNDEF = "VAL_UNDEF";
const COMMA = "COMMA";
const VAL_TBD = "VAL_DBD";           // to be determined
const VAL_DIFF = "VAL_DIFF";         // 

const JsonParser = (() => {
    const AccTokens = (() => {
        let orig = "";
        let tokens = [];
        
        const reset = () => {
            tokens = [];
        };

        const dispTokens = () => {
            console.log(orig);
            tokens.forEach(t => {
                if(t.id){
                    console.log(`${t.tokType}: ${t.text} id=${t.id}`);
                }
                else {
                    console.log(`${t.tokType}: ${t.text}`);
                }
            });
        };

        const dispString = () => {
            console.log(orig);
            const text = tokens.map(t => t.text).join(" ");
            console.log(text);
        };

        return {
            reset: () => reset(),
            setOrig: (text) => orig = text,
            push: (tokType, text, id) => tokens.push({tokType: tokType, text: text, id: id}),
            getTokens: () => tokens,
            dispTokens: () => dispTokens(),
            dispString: () => dispString()
        };
    })();

    const Err = (() => {
        let errs = [];
        let halt = false;
        
        const reset = () => {
            errs = [];
            halt = false;
        };

        return {
            reset: () => reset(),
            put: (posInfo, errInfo) => errs.push(`At '${posInfo}'', ${errInfo}`),
            setHalt: () => halt = true,
            isHalt: () => halt || errs.length,
            getErrs: () => errs,
            disp: () => errs.length? console.log(errs) : console.log("No errors")
        };
    })();

    const TextItr = (() => {
        let i = 0;
        let text = "";
        
        const setText = (newText) => {
            i = 0;
            AccTokens.setOrig(newText);
            text = newText;
        };
        const setErr = (errInfo) => {
            Err.put(getPosInfo(), errInfo);
            return false;
        };

        const getPosInfo = () => {
            
            let posText;
            if(text.length < POS_INFO_LEN){
                return text;
            }
            else {
                const tok = text.split(/([{}\[\]:,])/g);
                const pos = Math.min(i, text.length - 1);
                const half = POS_INFO_LEN/2;
                let start = pos - half;
                let end = pos + half;

                if(start < 0){
                    start = 0;
                    end = POS_INFO_LEN;
                }
                else if(end >= text.length){
                    end = text.length - 1;
                    start = end - POS_INFO_LEN;
                }
                
                let acc = 0;
                let sliceStart = 0, sliceEnd = tok.length - 1;
                let haveSliceStart = false;
                for(let j = 0; j < tok.length; j++){
                    acc += tok[j].length;
                    if(start < acc && !haveSliceStart){
                        sliceStart = j;
                        haveSliceStart = true;
                    }
                    if(end < acc){
                        sliceEnd = Math.min(j + 1, tok.length);
                        break;
                    }
                }
                //console.log(text.length, i, start, end, sliceStart, sliceEnd)
                return tok.slice(sliceStart, sliceEnd).join("");
                //console.log(posText + " length", posText.length);
            }
        };

        return {
            setText: (newText) => setText(newText),
            substring: (start, end) => text.substring(start, end),
            iCurr: () => i,
            peek: () => (i < text.length)? text[i] : EOI,
            skip: () => i++,      
            setErr: (errInfo) => setErr(errInfo),
            assertEOI: (c) => c !== EOI && Err.put(getPosInfo(), ERR_EARLY1),
            assertNotEOI: (c) => c === EOI && Err.put(getPosInfo(), ERR_EARLY2)
        };
    })();

    const JsonTextUtil = (() => {
//        const EQF = /^\\"/;
//        const EQB = /\\"$/;
        const QF = /^"/;
        const QB = /"$/;

        const classifiers = [
            [VAL_NUM, /^-?\d+(\.\d+)?$/, false],
            [VAL_ISO, /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}?([.][0-9]+)?Z?$/, true],
            [VAL_ISO, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, true],
            [VAL_UNDEF, /^undefined$/, false],
            [VAL_UNDEF, /^null$/, false],
            [VAL_BOOL, /^(true)|(false)$/, false]
        ];

        /* private */ const trimFront = (text) => {
//            if(EQF.exec(text)){
//                return text.substring(2);
//            }
            if(QF.exec(text)){
                return text.substring(1);
            }
            else {
                return text;
            }
        };

        /* private */ const trimBack = (text) => {
//            if(EQB.exec(text)){
//                return text.substring(0, text.length - 2);
//            }
            if(QB.exec(text)){
                return text.substring(0, text.length - 1);
            }
            else {
                return text;
            }
        };

        const handleKey = (text) => {
            text = trimFront(
                trimBack(text)
            );

            return [KEY_TEXT, `"${text}"`];
        };

        const handleValue = (text) => {
            text = trimFront(
                trimBack(text)
            );

            for(let c of classifiers){
                const [tokType, regex, addQuotes] = c;

                if(regex.exec(text)){
                    if(addQuotes){
                        text = `"${text}"`;
                    }
                    return [tokType, text];
                }
            }

            return [VAL_TEXT, `"${text}"`];
        };

        return {
            handleKey: (text) => handleKey(text),
            handleValue: (text) => handleValue(text) 
        };

    })();

    const PComponent = (() => {
        /*
        Nesting,    start/end:      base, object, array
        Flat,       single:         colon, comma
        Flat,       accumulate:     key, value

        Component pushed by prev component but pops self
        Component handles all text within, including skipping opening/closing char
        */

        let uq = 0;

        /*private*/ const getUq = () => {
                return ++uq; // always > 0
        };

        const getBase = () => {
            // Base is a non-rendering nesting obj
            let roots = 0;
            const assertSingleRoot = () => {
                //console.log("assertSingleRoot", roots)
                roots === 1 || TextItr.setErr(ERR_MULTI_ROOT);
            };

            return {
                read: () => {
                    const c = TextItr.peek();
                    switch(c){
                        case "{":
                            //console.log("push obj");
                            roots++;
                            assertSingleRoot();
                            PStack.push(getObj());
                            break;
                        case "[":
                            //console.log("push arr");
                            roots++;
                            assertSingleRoot();
                            PStack.push(getArr());
                            break;
                        default:
                            // console.log("pop base", c, test.length, TextItr.iCurr());
                            if(roots){
                                //assertSingleRoot();
                                TextItr.assertEOI(c);
                            }
                            else {
                                TextItr.setErr("Expected '{' or '['");
                            }
                            Err.setHalt();
                    }
                },
                onPush: () => {
                    // console.log("base onPush");
                    TextItr.skip();// skip '{'
                },
                onPop: () => {
                   //console.log("base onPop");

                },
                name: () => "base"
            };
        };
        const getObj = () => {
            const id = getUq();

            // Object is a rendering nesting obj
            const errs = [
                "Expected a key here",
                "Expected a colon here",
                "Expected a value here",
                "Expected a comma or '}' here",
                "Bad object structure"
            ];

            let step = 0;
            const assertStep = (n, c) => {
                const r = (n === step) || 
                        (c !== false && TextItr.setErr(`${errs[step]}, found ${c}`)) || 
                        TextItr.setErr(`${errs[step]}`);
                step++;
                return r;
            };

            return {
                read: () => {
                    const c = TextItr.peek();
                    TextItr.assertNotEOI(c);
                    // console.log(`obj step ${step}: '${c}'`);
                    switch(c){
                        case ":":
                            if(assertStep(1, c)){
                                // console.log("push colon");
                                PStack.push(getSelfPop(COLON, c));
                            }
                            break;
                        case ",":
                            if(step === 2) {// allow one empty value
                                // console.log("push empty value");
                                PStack.push(getSelfPop(VAL_TEXT, '""'));
                                step++;
                            }
                            if(assertStep(3, c)){
                                // console.log("push comma");
                                PStack.push(getSelfPop(COMMA, c));
                                step = 0;
                            }
                            break;
                        case "}":
                            if(step === 2) {// allow one empty value
                                // console.log("push empty value");
                                PStack.push(getSelfPop(VAL_TEXT, '""'));
                                step++;
                            }
                            if(assertStep(3, c)){
                                // console.log("pop obj");
                                PStack.pop();
                            }
                            break;
                        case "{":
                            if(assertStep(2, c)){
                                // console.log("push obj");
                                PStack.push(getObj());
                            }
                            break;
                        case "[":
                            if(assertStep(2, c)){
                                // console.log("push arr");
                                PStack.push(getArr());
                            }
                            break;
                        default:
                            if(step === 0){
                                // console.log("push acc");
                                step++;
                                PStack.push(getAcc(KEY_TEXT, [":"]));// key
                            }
                            else if(step === 2) {
                                // console.log("push acc");
                                step++;
                                PStack.push(getAcc(VAL_TBD, [",","}"]));// value
                            }
//                            else {
//                                TextItr.setErr("?");
//                            }
                    }
                },
                onPush: () => {
                    // console.log("obj onPush");
                    TextItr.skip();// skip '{' push char
                    AccTokens.push(OBJ_OPEN, "{", id);
                },
                onPop: () => {
                    // console.log("obj onPop");
                    TextItr.skip();// skip '}'
                    AccTokens.push(OBJ_CLOSE, "}", id);
                },
                name: () => "obj"
            };
        };
        const getArr = () => {
            const id = getUq();

            // Array is a rendering nesting obj
            const errs = [
                "Expected a value here",
                "Expected a comma or ']' here",
                "Bad object structure"
            ];

            let step = 0;
            const assertStep = (n, c) => {
                const r = (n === step) || 
                        (c !== false && TextItr.setErr(`${errs[step]}, found ${c}`)) || 
                        TextItr.setErr(`${errs[step]}`);
                step++;
                return r;
            };
            
            let haveValue = false;

            return {
                read: () => {
                    //step = step%2;
                    const c = TextItr.peek();
                    TextItr.assertNotEOI(c);
                    // console.log(`arr step ${step}: '${c}'`);
                    switch(c){
                        case ",":
                            if(step === 0) {// allow empty values
                                // console.log("push empty value");
                                PStack.push(getSelfPop(VAL_TEXT, '""'));
                                step++;
                                haveValue = true
                            }
                            if(assertStep(1, c)){
                                // console.log("push comma");
                                PStack.push(getSelfPop(COMMA, c));
                                step = 0;
                            }
                            break;
                        case "]":
                            if(haveValue && step === 0) {// allow empty array or empty value after comma
                                // console.log("push empty value");
                                PStack.push(getSelfPop(VAL_TEXT, '""'));
                            }
                            PStack.pop();
                            break;
                        case "{":
                            if(assertStep(0, c)){
                                // console.log("push obj");
                                PStack.push(getObj());
                            }
                            break;
                        case "[":
                            if(assertStep(0, c)){
                                // console.log("push arr");
                                PStack.push(getArr());
                            }
                            break;
                        default:
                            if(assertStep(0, c)){
                                // console.log("push acc");
                                PStack.push(getAcc(VAL_TBD, [",","]"]));// value
                            }
                    }
                },
                onPush: () => {
                    // console.log("arr onPush");
                    TextItr.skip();// skip '[' push char
                    AccTokens.push(ARR_OPEN, "[", id);
                },
                onPop: () => {
                    // console.log("arr onPop");
                    TextItr.skip();// skip ']'
                    AccTokens.push(ARR_CLOSE, "]", id);
                }
                ,
                name: () => "arr"
            };
        };
        const getAcc = (tokTypeTBD, popChars) => {
            // acc is a rendering, flat text accumulator for key or value
            let quoted = false;
            let iStart = 0, iEnd = 0;

            return {
                read: () => {
                    const c = TextItr.peek();
                    TextItr.assertNotEOI(c);

                    // console.log("acc:", c);

                    if(!quoted && popChars.includes(c)){
                        // console.log("acc self pop", popChars);
                        PStack.pop();// pop self
                    }
                    else {
                        if(c === '"'){
                            quoted = !quoted;
                        }
                        TextItr.skip();// skip c
                    }
                },
                onPush: () => {
                    // console.log("acc onPush", popChars);
                    iStart = TextItr.iCurr();
                },
                onPop: () => {
                    iEnd = TextItr.iCurr();
                    let substr = TextItr.substring(iStart, iEnd);

                    const handler = (tokTypeTBD === KEY_TEXT)? 
                        JsonTextUtil.handleKey : JsonTextUtil.handleValue;

                    const [tokType, text] = handler(substr);
                    // console.log("acc onPop", tokType, text);
                    AccTokens.push(tokType, text, 0);
                },
                name: () => "acc: " + tokTypeTBD
            };
        };
        const getSelfPop = (tokType, c) => {  
            // connector is a rendering, flat, self-popping obj for colon or comma
            return {
                read: () => {
                    // console.log("connector should never be read");
                },
                onPush: () => {
                    // console.log("onPush", c);
                    TextItr.skip();// skip c
                    PStack.pop();// pop self always
                },
                onPop: () => {
                    // console.log("onPop", c);
                    AccTokens.push(tokType, c, 0);
                },
                name: () => `selfPop: ${tokType} ${c}`
            };
        };

        return {
            getBase: () => getBase()
        };
    })();

    const PStack = (() => {
        let stack = [PComponent.getBase()];
        
        const reset = () => {
            stack = [PComponent.getBase()];
        };

        const top = () => {
            if(stack.length){
                //console.log("top", stack[stack.length - 1].name());
                return stack[stack.length - 1];
            }
            else {
                TextItr.setErr("top");
            } 
        };
        const push = (component) => {
            stack.push(component);
            component.onPush();
        };
        const pop = () => {
            if(stack.length){
                stack[stack.length - 1].onPop();
                stack.pop();
            }
            else {
                TextItr.setErr("pop");
            } 
        };

        return {
            reset: () => reset(),
            read: () => top().read(),
            push: (component) => push(component),
            pop: () => pop()
        };
    })();

    const parse = (text) => {
        AccTokens.reset();
        Err.reset();
        PStack.reset();
        
        TextItr.setText(text);
        const runaway = text.length * 25;
        
        let i = 0;
        while(!Err.isHalt()){
            PStack.read();
            if(++i > runaway){
                TextItr.setErr("runaway");
            }
        }
        //while(!Err.isHalt());
        //Err.disp();
        //AccTokens.dispTokens();
        //console.log(AccTokens.getTokens());
        
        return [AccTokens.getTokens(), Err.getErrs()];
    };
    
//    const test = '{thing:{"id":"file","value":"File","popup":{"menuitem":[{"value":false,"onclick":"doIt()"},{"value":-00033.60000,"onclick":"OpenDoc()"},{"value":true,"onclick":"CloseDoc()"}]}}}';//'{abc:def,ghi:[1,2,3],jkl:"true"}';
//    TextItr.setText(test);
//    for(let i = 0; i < 50; i++){
//        TextItr.skip();
//    }
//    TextItr.setErr("err");
    
    return {
        parse: (text) => parse(text)
    };
})();

//const test = '{abc:25-07-04T16:20:01.123,ghi:[1,2,3],jkl:"true"}';

//JsonParser.parse();

//const classifyValues = [
//    '123',
//    '2025-01-05T02:30:14.321Z',
//    '"2025-01-05T02:30:14.321Z"',
//    '2025-01-05',
//    'true',
//    'false',
//    '\\"true\\"',
//    '"false"',
//    'undefined',
//    'null',
//    '-33.2',
//    'hello',
//    '"hello"'
//];
//classifyValues.forEach(v => {
//    const pair = JsonTextUtil.handleValue(v);
//    console.log(pair);
//});







