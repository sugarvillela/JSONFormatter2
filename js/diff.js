//console.log("diff js");

//const testData = {
//	"pointer":1,
//	"stack":[
//            "{\"f0\":[1,2,\"a\"],\"f1\":{\"f2\":true}}",
//            "{\"f0\":[1,2,\"b\"],\"f1\":{\"f2\":true}}",
//            "{\"f0\":[1,2,\"b\"],\"f1\":{\"f2\":false}}",
//            "{\"f0\":[1,3,\"b\"],\"f1\":{\"f2\":false}}"
//	]
//};

const DiffGen = (() => {
    const disp = (label, toks) => {
        console.log("==" + label+"==")
        toks.forEach(t => console.log(t.className + " " + t.value))
    }
    const getSymbols = (diffRow) => {
        return diffRow.tokens.filter(t => !t.isValue && t.className !== "charKey")
                .map(t => t.value).join("");
    };
    const getKeys = (diffRow) => {
        return diffRow.tokens.filter(t => t.isKey);
    };
    const getValues = (diffRow) => {
        return diffRow.tokens.filter(t => t.isValue);
    };
    const compareEqualLengths = (tokensL, tokensR) => {
        for(let i = 0; i < tokensL.length; i++){
            if(tokensL[i].value !== tokensR[i].value){
                //console.log(`${tokensL[i].value} !== ${tokensR[i].value}`)
                return false;
            }
        }
        //console.log(`${tokensL[0].value} === ${tokensR[0].value}`)
        return true;
    };
    const compare = (tokensL, tokensR) => {
        return (tokensL.length === tokensR.length) && compareEqualLengths(tokensL, tokensR);  
    };
    const addErrClass = (tokens) => {
        tokens.forEach(t => t.className = "diffToken");
    };

    const similar = (tokL, tokR) => {
        //console.log(`${getSymbols(tokL)} ?== ${getSymbols(tokR)}`)
        if(tokL.hash === tokR.hash){
            return true;
        }
        
        if(getSymbols(tokL) !== getSymbols(tokR)){
            return false;
        }
        const keysL = getKeys(tokL);
        const keysR = getKeys(tokR);
        const valuesL = getValues(tokL);
        const valuesR = getValues(tokR);

//        disp("keysL", keysL)
//        disp("keysR", keysR)
        //console.log("keysMatch?", keysL, keysR)
        if(compare(keysL, keysR)){
            //console.log("yes", keysL, keysR)
            if(!compare(valuesL, valuesR)){
                addErrClass(valuesL);
                addErrClass(valuesR);
            }
            return true;
        }
        if(compare(valuesL, valuesR)){
            if(!compare(keysL, keysR)){
                addErrClass(keysL);
                addErrClass(keysR);
            }
            return true;
        }
        return false;
    };

    const find = (list, tokL, k) => {
        if(k < list.length){
//        disp("tokL", tokL.tokens)
//        disp("tokR", list[k].tokens)
            return similar(tokL, list[k]);
        }
        return false;
    };


    const lookAhead = (list, tokL, start) => {
        for(let k = start; k < list.length; k++){
            if(similar(tokL, list[k])){
                //console.log(`lookAhead ${} == ${}`)
                return true;
            }
        }

        return false;
    };
    const nullRow = {
        tokens: [TokenGen.genNullToken()],
        value: "_",
        hash: 0
    };
    let l = [];
    let r = [];

    const gen = (diffRows) => {
        l = diffRows[0];
        r = diffRows[1];
        
        const destL = [];
        const destR = [];
        let i = 0, j = 0;

        while (i < l.length){
            let tokL = l[i];

            if(find(r, tokL, j)){
                destL.push(tokL);//merge l and r elements
                destR.push(r[j]);//merge l and r elements
                i++;
                j++;
            }
            else if(lookAhead(r, tokL, j)){// pause l, advance r
                //console.log("a", tokL.value, r[j].value )
                destL.push(nullRow);
                destR.push(r[j]);
                j++;
            }
            else {// pause r, advance l
                //console.log("b", tokL.value, r[j].value )
                destL.push(tokL);
                destR.push(nullRow);
                i++;
                //j++;
            }
        }

        while (j < r.length){// add any remaining r
            //console.log("c", r[j].value )
            destL.push(nullRow);
            destR.push(r[j]);
            j++;
        }
        
        //console.log(destL, destR);
        return [
            destL.flatMap(d => d.tokens), 
            destR.flatMap(d => d.tokens)
        ];
    };

    return {
            //setData: (left, right) => { l = left; r = right; },
            gen: (diffTokens) => gen(diffTokens)
    };
})();

const PlainTextFormatter = getPlainTextFormatter();

const DualFormatter = (() => {
    const formatters = [
        getHtmlFormatter("diff0"),
        getHtmlFormatter("diff1")
    ];
    
    return {
        //drawFormattedHtml: (i, tokens, jsonErrs, warnings) => formatters[i].drawFormattedHtml(tokens, jsonErrs, warnings),
        getFormatter: (i) => formatters[i]
    };
})();

const DualTokenSource = (() => {
    const tokenSources = [
        getTokenSource(DualFormatter.getFormatter(0)),
        getTokenSource(DualFormatter.getFormatter(1))
    ];
    
//    const getTokensForDiff = () => {
//        return [
//            tokenSources[0].getTokens(),
//            tokenSources[1].getTokens()
//        ];
//    }
    
    return {
        setTokens: (i, jsonTokens) => tokenSources[i].setTokens(jsonTokens),
        haveTokens: (i) => tokenSources[i].haveTokens(),
        getTokens: (i) => tokenSources[i].getTokens(),
        //getTokensForDiff: () => getTokensForDiff(),
        formattedToArray: (i) => tokenSources[i].formattedToArray()
    };
})();

const DualParser = (() => {
    /* private */ const parse = (i, origText) => {
        let text = PreParser.preParse(origText);

        const [jsonTokens, jsonErrs] = JsonParser.parse(text);

        //console.log("jsonErrs 1", jsonErrs);
        //console.log(jsonTokens);
        DualTokenSource.setTokens(i, jsonTokens);
        
        let tokens = DualTokenSource.getTokens(i);
        return PlainTextFormatter.toDiffRows(tokens);
        //let formatted = DualTokenSource.formattedToArray(i);
        //console.log("tokens", tokens);
        
        //DualFormatter.getFormatter(i).drawFormattedHtml(tokens, jsonErrs, PreParser.getWarnings());
        //return formatted;
    };
    const parseArr = (textArr) => {
        const diffRows = [
            parse(0, textArr[0]),
            parse(1, textArr[1])
        ];
        
        //console.log(formatted)
        
//        let diffToks = DualTokenSource.getTokensForDiff();
        const newDiffRows = DiffGen.gen(diffRows);
//        
        DualFormatter.getFormatter(0).drawFormattedHtml(newDiffRows[0], [], []);
        DualFormatter.getFormatter(1).drawFormattedHtml(newDiffRows[1], [], []);
    };
    
    return {
        parseArr: (textArr) => parseArr(textArr)
    };
})();

const SelectUtil = (() => {
    const OPTION_LEN = 70;
    
    const selected = [0, 0];
    
    /* private */ const getSelectOptions = (stack) => {
        return stack.map((s, i) => {
            const trunc = (s.length > OPTION_LEN)? 
                s.substring(0, OPTION_LEN) + "..." : 
                s;
            return `${i}: ${trunc}`;
        });
    };
    
    /* private */ const initOne = (index, options, value) => {
        const e = document.getElementById(`select${index}`);

        options.forEach((option, i) => {
            const o = document.createElement('option');
            o.value = i;
            o.text = option;
            o.selected = (i === value);
            e.add(o);
        });
    };
    
    const init = (state) => {
        const {pointer, stack} = state;
        const options = getSelectOptions(stack);
        
        selected[1] = Math.min(pointer + 1, options.length - 1);
        selected[0] = Math.max(selected[1] - 1, 0);
        initOne(0, options, selected[0] );
        initOne(1, options, selected[1]);
        
        const strings = DiffState.getStrings(selected);
        //console.log("strings", strings);
        DualParser.parseArr(strings);
    };
    
    const onChange = (index) => {
        const value = document.getElementById(`select${index}`).value;
        selected[index] = value;
        //console.log("change", index, value);
        const strings = DiffState.getStrings(selected);
        //console.log("strings", strings);
        DualParser.parseArr(strings);
    };

    return {
        onChange: (index) => onChange(index),
        init: (state) => init(state)
    };
})();

const DiffState = (() => {// for diff.html state
    /* import common.StorageDiff */
    /* interface {pointer: number; stack: string[]} */
    
    const state = {pointer: 0, stack: []};
      
    const initFromStorage = () => {
        //console.log("init a")
        let {pointer, stack} = Storage.getState();
        if(stack.length){
            pointer = Math.min(pointer, stack.length - 1);
        }
        else{
            pointer = 0;
        }
        
        state.pointer = pointer;
        state.stack = stack;
    };

    const initDiffFromStorage = () => {
        initFromStorage();
        //console.log("init d", state)
        //DomProxy.renderState(state);
        //DomProxy.renderDiffButton(state.stack.length < 2);
        
        if(state.stack.length > 1){
            SelectUtil.init(state);
//            DomProxy.setOrigTextValue(state.stack[state.pointer]);
//            Parser.parse();
        }
    };
    
    return {
        haveState: () => !!state.stack.length,
        initDiffFromStorage: () => initDiffFromStorage(),
        getStrings: (selected) => [state.stack[selected[0]],state.stack[selected[1]]]
    };
})();




//const testGen = () => {
//    const dLeft1 = ['a','b','e','f'];
//    const dRight1 = ['a','b','c','d','e','f'];
//    // ['a','b','c','d','e','f']
//
//    const dLeft2 = ['a','b','c','d','e','f'];
//    const dRight2 = ['a','b','e','f'];
//    // ['a','b','c','d','e','f']
//
//    const dLeft3 = ['a','b','c','d'];
//    const dRight3 = ['e','f','g','h'];
//    // ['a','b','c','d','e','f','g','h']
//
//    const dLeft4 = ['e','f','g','h'];
//    const dRight4 = ['a','b','c','d'];
//    // ['e','f','g','h', 'a','b','c','d'] // oops, left side wins
//
//    const dLeft5 = ['a','b','c','d'];
//    const dRight5 = ['c','x','d','z'];
//    // ['a','b','c','x','d','z']
//
//    DiffGen.setData(dLeft1, dRight1);
//    DiffGen.gen();
//    DiffGen.setData(dLeft2, dRight2);
//    DiffGen.gen();
//    DiffGen.setData(dLeft3, dRight3);
//    DiffGen.gen();
//    DiffGen.setData(dLeft4, dRight4);
//    DiffGen.gen();
//    DiffGen.setData(dLeft5, dRight5);
//    DiffGen.gen();
//};
//
//testGen();


