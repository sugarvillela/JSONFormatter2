const DiffRow = (() => {
    /* private */ const fnv1a32 = (str) => {
        let hash = 2166136261; // FNV_prime_32
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return hash;
    };
    
    /* private */ const rowProto = () => ({
        toksRow: [],
        toksKeys: [],
        toksVals: [],
        value: "",
        hashRow: 0,
        hashSymb: 0,
        hashKey: 0,
        hashVal: 0
    });
    
    const setHashesOne = (row) => {
        row.value = row.toksRow.map(t => t.value).join("");
        row.hashRow = fnv1a32(row.value);
        
        row.hashSymb = fnv1a32(
            row.toksRow
                .filter(t => !t.isValue && !t.isKey && t.value !== ",")
                .map(t => t.value)
                .join("")  
        );
    
        row.toksKeys = row.toksRow
            .filter(t => t.isKey);
    
        row.hashKey = fnv1a32(
            row.toksKeys
                .map(t => t.value)
                .join("")    
        );
        
        row.toksVals = row.toksRow
            .filter(t => t.isValue);
    
        row.hashVal = fnv1a32(
            row.toksVals
                .map(t => t.value)
                .join("")    
        );
    };
    
    const toDiffRows = (tokens) => {       
        let isEndline = false;
        let diffRows = [];
        let row = rowProto();

        tokens.forEach(t => {          
            if(t.checkEndline && isEndline){
                if(row.toksRow.length){
                    diffRows.push(row);
                }
                row = rowProto();
            }
            row.toksRow.push(t);

            isEndline = t.isEndline;
        });
        
        if(row.toksRow.length){//push remaining
            diffRows.push(row);
        }
        
        diffRows.forEach(row => {
            setHashesOne(row);
        });
        
        return diffRows;
    };
    
    return {
        toDiffRows: (tokens) => toDiffRows(tokens)
    };
})();

const DiffGen = (() => {
    const HASH_EMPTY = 2166136261;
    
    let left = [];
    let right = [];
    let destL = [];
    let destR = [];
    
    const nullRow = {
        toksRow: [TokenGen.genNullToken()]
    };
    
    const addErrClass = (tokens) => {
        tokens.forEach(t => t.className = "diffToken");
    };
    
    const equalNonEmptyHashes = (a, b) => {
        return a !== HASH_EMPTY && a === b
    };
    
    const equal = (i, j) => {
        return (
            i < left.length && 
            j < right.length && 
            left[i].hashRow === right[j].hashRow
        );
    };

    const similar = (i, j) => { 
        if(i < left.length && j < right.length){
            if(left[i].hashRow === right[j].hashRow){
                return true;
            }
            
            if(left[i].hashSymb !== right[j].hashSymb){
                return false;
            }

            if(equalNonEmptyHashes(left[i].hashKey, right[j].hashKey)){
                if(left[i].hashVal !== right[j].hashVal){
                    addErrClass(left[i].toksVals);
                    addErrClass(right[j].toksVals);
                }
                return true;
            }

            if(equalNonEmptyHashes(left[i].hashVal, right[j].hashVal)){
                if(left[i].hashKey !== right[j].hashKey){
                    addErrClass(left[i].toksKeys);
                    addErrClass(right[j].toksKeys);
                }
                return true;
            }
        }

        return false;
    };

    const lookAheadR = (i, j) => {
        for(let k = j + 1; k < right.length; k++){
            if(similar(i, k)){
                return true;
            }
        }
        
        return false;
    };
    
    const lookAheadL = (i, j) => {
        for(let k = i + 1; k < left.length; k++){
            if(similar(k, j)){
                return true;
            }
        }
        return false;
    };
    
    const pushL = (i) => {
        if(i < left.length){
            destL.push(left[i]);
        }
    };
    const pushR = (j) => {
        if(j < right.length){
            destR.push(right[j]);
        }
    };
    const skipL = (i) => {
        destL.push(nullRow);
    };
    const skipR = (j) => {
        destR.push(nullRow);
    };
    const pushErrL = (i) => {
        if(i < left.length){
            addErrClass(left[i].toksRow);
            destL.push(left[i]);
        }
    };
    const pushErrR = (j) => {
        if(j < right.length){
            addErrClass(right[j].toksRow);
            destR.push(right[j]);
        }
    };

    const gen = (diffRows) => {
        left = diffRows[0];
        right = diffRows[1];
        destL = [];
        destR = [];
        
        let i = 0, j = 0;

        while (i < left.length){
            if(equal(i, j)){
                //console.log(`a ${left[i]?.value} ${right[j]?.value}`)
                pushL(i);//merge left and right elements
                pushR(j);//merge left and right elements
                i++;
                j++;
            }
            else if(lookAheadR(i, j)){// pause left, advance right
                //console.log(`b ${left[i]?.value} ${right[j]?.value}`)
                skipL(i);
                pushR(j);
                j++;
            }
            else if(lookAheadL(i, j)){// pause right, advance left
                //console.log(`c ${left[i]?.value} ${right[j]?.value}`)
                pushL(i);;
                skipR(j);
                i++;
            }
            else if(similar(i, j)){
                //console.log(`d ${left[i]?.value} ${right[j]?.value}`)
                pushL(i);//merge left and right elements
                pushR(j);//merge left and right elements
                i++;
                j++;
            }
            else{
                //console.log(`e ${left[i]?.value} ${right[j]?.value}`)
                pushErrL(i);//merge left and right elements
                pushErrR(j);//merge left and right elements
                i++;
                j++;
            }
        }

        while (i < left.length || j < right.length){// add any remaining r
            pushErrL(i);
            pushErrR(j);
            i++;
            j++;
        }
        
        return [
            destL.flatMap(d => d.toksRow), 
            destR.flatMap(d => d.toksRow)
        ];
    };

    return {
        gen: (diffRows) => gen(diffRows)
    };
})();

const DualFormatter = (() => {
    const formatters = [
        getHtmlFormatter("diff0"),
        getHtmlFormatter("diff1")
    ];
    
    return {
        getFormatter: (i) => formatters[i]
    };
})();

const DualTokenSource = (() => {
    const tokenSources = [
        getTokenSource(DualFormatter.getFormatter(0)),
        getTokenSource(DualFormatter.getFormatter(1))
    ];
    
    DualFormatter.getFormatter(0).setTokenSource(tokenSources[0]);
    DualFormatter.getFormatter(1).setTokenSource(tokenSources[1]);
    
    return {
        setTokens: (i, jsonTokens) => tokenSources[i].setTokens(jsonTokens),
        getTokens: (i) => tokenSources[i].getTokens()
    };
})();

const DualParser = (() => {
    /* private */ const parse = (i, origText) => {
        let text = PreParser.preParse(origText);

        const [jsonTokens, jsonErrs] = JsonParser.parse(text);
        DualTokenSource.setTokens(i, jsonTokens);
        
        let tokens = DualTokenSource.getTokens(i);
        return DiffRow.toDiffRows(tokens);
    };
    const parseArr = (textArr) => {
        const diffRows = [
            parse(0, textArr[0]),
            parse(1, textArr[1])
        ];
        
        const newDiffRows = DiffGen.gen(diffRows);
 
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
        DualParser.parseArr(strings);
    };
    
    const onChange = (index) => {
        const value = document.getElementById(`select${index}`).value;
        selected[index] = value;
        const strings = DiffState.getStrings(selected);
        DualParser.parseArr(strings);
    };

    return {
        onChange: (index) => onChange(index),
        init: (state) => init(state)
    };
})();

const DiffState = (() => {// for diff.html state
    /* import common.Storage */
    /* interface {pointer: number; stack: string[]} */
    
    const state = {pointer: 0, stack: []};
      
    const initFromStorage = () => {
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
        
        if(state.stack.length > 1){
            SelectUtil.init(state);
        }
        else {
            const diff0 = document.getElementById("diff0");
            const diff1 = document.getElementById("diff1");

            DualFormatter.getFormatter(0).appendWarn(diff0, "Need two or more items for diff...");
            DualFormatter.getFormatter(1).appendWarn(diff1, "Add content in JSONFormatter and refresh this page");
        }
    };
    
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        initDiffFromStorage();
      }
    });
    
    return {
        haveState: () => !!state.stack.length,
        initDiffFromStorage: () => initDiffFromStorage(),
        getStrings: (selected) => [state.stack[selected[0]],state.stack[selected[1]]]
    };
})();
