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
        //console.log(textArr)
        const diffRows = [
            parse(0, textArr[0]),
            parse(1, textArr[1])
        ];
        
        const bestAlgo = AlgoOptimizer.optimize(diffRows);
        
        const newDiffRows = DiffGen.gen(diffRows, bestAlgo);
 
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
            return `${i + 1}: ${trunc}`;
        });
    };
    
    /* private */ const initOne = (index, options, value) => {
        const e = document.getElementById(`select${index}`);
        e.innerHTML = "";

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
