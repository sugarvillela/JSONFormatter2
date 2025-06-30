const HASH_EMPTY = 2166136261;

/* Arrange data into row objects and store hashes for quick equality */
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

/* Biterator generates combinations for comparing algorithms */
const newBiterator = (setN) => {
    let n = (setN === undefined)? 0 : setN;
    let m = 1;
    
    const next = () => {
        const temp = (n & m)? 1 : 0;
        m = m << 1;
        return temp;
    };
    
    const inc = () => {
        n++;
        m = 1;
    };
    
    return {
        next: () => next(),
        inc: () => inc(),
        getN: () => n,
        test: () => test()
    };
};

/* Selects the best algorithm by minimizing misses */
const newOptimizer = () => {
    let fewestMisses = Number.MAX_SAFE_INTEGER;
    let bestAlgo;
    let count = 0;
    
    const setAlgo = (misses, algo) => {
        //console.log(`count=${count}, misses=${misses}, algo=${algo}`);
        
        if(misses < fewestMisses){
            fewestMisses = misses;
            bestAlgo = algo;
        }
        
        //console.log(`=> count=${count}, fewestMisses=${fewestMisses}, bestAlgo=${bestAlgo}`);
        count++;
    };
    
    
    
    return {
        setAlgo: (misses, algo) => setAlgo(misses, algo),
        more: () => count <= fewestMisses,
        getBestAlgo: () => bestAlgo
    };
};

/* Functions for comparison and array manipulation */
const newDiffUtil = (addErrClass) => {
    const nullRow = {
        toksRow: [TokenGen.genNullToken()]
    };

    const equalNonEmptyHashes = (a, b) => {
        return a !== HASH_EMPTY && a === b;
    };
    
    const equal = (left, right, i, j) => {
        return (
            i < left.length && j < right.length && 
            left[i].hashRow === right[j].hashRow
        );
    };
    
    const similar = (left, right, i, j) => { 
        if(
            i < left.length && j < right.length && 
            left[i].hashSymb === right[j].hashSymb
        ){           
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
    
    const skip = (skipDest, src, dest, srcIndex, k) => {
        while(srcIndex < k){
            dest.push(src[srcIndex]);
            srcIndex++;
        }
        while(skipDest.length < dest.length){
            skipDest.push(nullRow);
        }
    };
    
    const lookAhead = (skipSrc, skipDest, skipIndex, src, dest, srcIndex, f) => {
        for(let k = srcIndex + 1; k < src.length; k++){
            if(f(skipSrc, src, skipIndex, k)){
                skip(skipDest, src, dest, srcIndex, k);
                return k;
            }
        }

        return -1;
    };
    
    const push = (src, dest, index) => {
        if(index < src.length){
            dest.push(src[index]);
        }
    };
    const mark = (src, index) => {
        if(index < src.length){
            addErrClass(src[index].toksRow);
        }
    };
    
    return {
        equal: (left, right, i, j) => equal(left, right, i, j),
        similar: (left, right, i, j) => similar(left, right, i, j),
        lookAhead: (skipSrc, skipDest, skipIndex, src, dest, srcIndex, f) => lookAhead(skipSrc, skipDest, skipIndex, src, dest, srcIndex, f),
        push: (src, dest, index) => push(src, dest, index),
        mark: (src, index) => mark(src, index)
    };
};

/* A dummy version of newDiffUtil for use during algo selection */
const newCostUtil = () => {
    const ut = newDiffUtil(() => {});
       
    const lookAhead = (skipSrc, skipDest, skipIndex, src, dest, srcIndex, f) => {
        for(let k = srcIndex + 1; k < src.length; k++){
            if(f(skipSrc, src, skipIndex, k)){
                return k;
            }
        }

        return -1;
    };
       
    return {
        equal: (left, right, i, j) => ut.equal(left, right, i, j),
        similar: (left, right, i, j) => ut.similar(left, right, i, j),
        lookAhead: (skipSrc, skipDest, skipIndex, src, dest, srcIndex, f) => lookAhead(skipSrc, skipDest, skipIndex, src, dest, srcIndex, f),
        push: (src, dest, index) => {},
        mark: (src, index) => {}
    };
};

/* Two algorithms for handling misses. One tests extensively; the other gives up quickly.
 * Depending on the data, various combinations of the two may yield a better miss rate  */
const algos = [
    (left, right, i, j, destL, destR, ut) => {// eq sim laEq laSim
        let k = -1;

        if(ut.similar(left, right, i, j)){
            ut.push(left, destL, i);
            ut.push(right, destR, j);
            i++;
            j++;
        }
        else if((k = ut.lookAhead(left, destL, i, right, destR, j, ut.equal)) !== -1){// pause left, advance right
            //console.log("lookAheadR eq", i, j, destL.length, destR.length)
            j = k;
        }
        else if((k = ut.lookAhead(right, destR, j, left, destL, i, ut.equal)) !== -1){// pause right, advance left
            //console.log("lookAheadL eq", i, j, destL.length, destR.length)
            i = k;
        }
        else if((k = ut.lookAhead(left, destL, i, right, destR, j, ut.similar)) !== -1){// pause left, advance right
            //console.log("lookAheadR sim", i, j, destL.length, destR.length)
            j = k;
        }
        else if((k = ut.lookAhead(right, destR, j, left, destL, i, ut.similar)) !== -1){// pause right, advance left
           // console.log("lookAheadL sim", i, j, destL.length, destR.length)
            i = k;
        }
        else {
            //console.log("mark", i, j, destL.length, destR.length)
            ut.mark(left, i);
            ut.mark(right, j);
            ut.push(left, destL, i);
            ut.push(right, destR, j);
            i++;
            j++;
        }

        return [i, j];
},
    (left, right, i, j, destL, destR, ut) => {// eq laEq sim laSim
        if(ut.similar(left, right, i, j)){
            ut.push(left, destL, i);
            ut.push(right, destR, j);
            i++;
            j++;
        }
        else {
            ut.mark(left, i);
            ut.mark(right, j);
            ut.push(left, destL, i);
            ut.push(right, destR, j);
            i++;
            j++;
        }

        return [i, j];
    }
];

const AlgoOptimizer = (() => { 
    /* Cycles through algorithm combinations to find the lowest miss rate */
    const optimize = (diffRows) => {
        const bitr = newBiterator();
        const opt = newOptimizer();

        while(opt.more()){
            const misses = getCost(diffRows, bitr);
            const n = bitr.getN();

            opt.setAlgo(misses, n);
            bitr.inc();
            
            if(n > 32){
                console.log("Samples are not similar");
                break;
            }
        }
        
        return opt.getBestAlgo();
    };
    
    /* Mimics the gen() function in DiffGen, but without modifying data */
    const getCost = (diffRows, bitr) => {
        const mockArr = () => ({
            push: () => {}
        });
        
        // cost util mimics DiffUtil, but without modifying data
        const ut = newCostUtil();
        
        const left = diffRows[0];
        const right = diffRows[1];
        
        const destL = mockArr();
        const destR = mockArr();
        
        let i = 0, j = 0, misses = 0;

        while (i < left.length){
            if(ut.equal(left, right, i, j)){
                i++;
                j++;
            }
            else {
                misses++;
                const bit = bitr.next();

                const algo = algos[bit];
                const r = algo(left, right, i, j, destL, destR, ut);
                i = r[0];
                j = r[1];
            }
        }

        while (i < left.length || j < right.length){// add any remaining r
            misses++;
            i++;
            j++;
        }
        
        return misses;
    };

    return {
        optimize: (diffRows) => optimize(diffRows)
    };
})();

/* Applies the algorithms chosen by AlgoOptimizer to generate diff output */
const DiffGen = (() => {
    const addErrClass = (tokens) => {
        tokens.forEach(t => t.className = "diffToken");
    };
    
    const gen = (diffRows, bestAlgo) => {
        const bitr = newBiterator(bestAlgo);
        
        const ut = newDiffUtil(addErrClass);
        const left = diffRows[0];
        const right = diffRows[1];
        const destL = [];
        const destR = [];
        
        let i = 0, j = 0;

        while (i < left.length){
            if(ut.equal(left, right, i, j)){
                ut.push(left, destL, i);
                ut.push(right, destR, j);
                i++;
                j++;
            }
            else {
                const bit = bitr.next();
                const algo = algos[bit];
                const r = algo(left, right, i, j, destL, destR, ut);
                i = r[0];
                j = r[1];
            }
        }

        while (i < left.length || j < right.length){// add any remaining r
            ut.mark(left, i);
            ut.mark(right, j);
            ut.push(left, destL, i);
            ut.push(right, destR, j);
            i++;
            j++;
        }
        
        return [
            destL.flatMap(d => d.toksRow), 
            destR.flatMap(d => d.toksRow)
        ];
    };

    return {
        gen: (diffRows, bestAlgo) => gen(diffRows, bestAlgo)
    };
})();


