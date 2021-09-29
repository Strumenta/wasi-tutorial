class Transition {
    symbol: string
    destination: State
    constructor(symbol: string, destination: State) {
        this.symbol = symbol
        this.destination = destination
    }
}

class State {
    automata: Automata
    name: string
    transitions: Transition[]
    epsilonTransitions: State[] = []
    constructor(automata: Automata, name: string) {
        this.automata = automata
        this.name = name
        this.transitions = []
    }

    createEpsilonTransition(destination: State) : void {
        this.epsilonTransitions.push(destination)
    }

    createTransition(symbol: string, destination: State) : void {
        const newTransition = new Transition(symbol, destination)
        this.transitions.push(newTransition)
    }

    tryToProcessSymbol(symbol: string) : State | null {
        let foundTransition : Transition | null = null
        for (let i=0;i<this.transitions.length && foundTransition == null;i++) {
            const t = this.transitions[i]
            if (t.symbol == symbol) {
                foundTransition = t
            }
        }
        if (foundTransition == null) {
            return null
        }
        return foundTransition.destination
    }

    processSymbol(symbol: string) : State {
        let nextState = this.tryToProcessSymbol(symbol)
        if (nextState == null) {
            throw new Error(`no transition from ${this.name} on symbol ${symbol}`)
        }
        return nextState as State
    }

    getTransition(symbol: string) : State | null {
        let foundTransition : Transition | null = null
        for (let i=0;i<this.transitions.length && foundTransition == null;i++) {
            const t = this.transitions[i]
            if (t.symbol == symbol) {
                foundTransition = t
            }
        }
        if (foundTransition == null) {
            return null
        }
        return (foundTransition as Transition).destination
    }
}

class Automata {
    states: State[]
    currentState: State | null

    constructor() {
        this.states = []
    }

    clone(startState: State) : Automata {
        const newAutomata = new Automata()
        newAutomata.states = this.states
        newAutomata.currentState = startState
        return newAutomata
    }

    createState(name: string | null = null) : State {
        let goodName : string
        if (name == null) {
            goodName = `state_${this.states.length + 1}`
        } else {
            goodName = name as string
        }
        const newState = new State(this, goodName)
        this.states.push(newState)
        return newState
    }

    processSymbols(symbols: string[]) : void {
        for (let i=0;i<symbols.length;i++) {
            this.processSymbol(symbols[i])
        }
    }

    processSymbol(symbol: string) : void {
        if (this.currentState == null) {
            throw new Error("No current state")
        } else {
            this.currentState = (this.currentState as State).processSymbol(symbol)
        }
    }

    tryToProcessSymbol(symbol: string) : State | null {
        if (this.currentState == null) {
            throw new Error("No current state")
        } else {
            const nextState = (this.currentState as State).tryToProcessSymbol(symbol)
            if (nextState != null) {
                this.currentState = nextState as State
            }
            return nextState
        }
    }

    processString(string: string) : void {
        for (let i=0;i<string.length;i++) {
            this.processSymbol(string.charAt(i).toString())
        }
    }

    describe() : string {
        if (this.currentState == null) {
            return "<NULL>"
        } else {
            return (this.currentState as State).name
        }
    }

}

export class Lexer {
    automata: Automata;
    startState: State;
    recognitionMap: Map<State, string> = new Map<State, string>()

    constructor() {
        this.automata = new Automata();
        this.startState = this.automata.createState("start_state")
    }

    recognizeKeyword(keyword: string) : State {
        if (keyword.length == 0) {
            return this.startState
        }
        let currentState: State = this.startState
        for (let i=0;i<keyword.length;i++) {
            let name = `recognize_${keyword}_step_${i}`
            if (i == keyword.length - 1) {
                name = `keyword_${keyword}_recognized`
            }
            const symbol = keyword.charAt(i).toString()
            let existingState = currentState.getTransition(symbol)
            if (existingState == null) {
                let nextState = currentState.automata.createState(name)
                currentState.createTransition(symbol, nextState)
                currentState = nextState
            } else {
                currentState = existingState as State
            }
        }
        this.recognitionMap.set(currentState, `keyword_${keyword}`)
        return currentState
    }

    private explodeEpsilonBranches(branch: Automata) : Automata[] {
        let branches = [branch]
        for (let i=0;i<(branch.currentState as State).epsilonTransitions.length;i++) {
            const et = (branch.currentState as State).epsilonTransitions[i]
            const newState = branch.clone(et)
            branches = branches.concat(this.explodeEpsilonBranches(newState))
        }
        return branches
    }

    private processSymbolWithBranch(branch: Automata, symbol: string) : Automata[] {
        const nextState = branch.tryToProcessSymbol(symbol)
        if (nextState == null) {
            return []
        } else {
            return this.explodeEpsilonBranches(branch.clone(nextState as State))
        }
    }

    nextToken(text: string): Recognition | null {
        this.automata.currentState = this.startState
        let branches : Automata[] = [this.automata.clone(this.startState)]
        let recognized : Recognition[] = []
        for (let i=0;i<text.length && branches.length > 0 ;i++) {
            let newBranches : Automata[] = []
            const symbol = text.charAt(i).toString();
            for (let j=0;j<branches.length;j++) {
                newBranches = newBranches.concat(this.processSymbolWithBranch(branches[j], symbol))
            }
            for (let k=0;k<newBranches.length;k++) {
                const state = newBranches[k].currentState as State
                if (this.recognitionMap.has(state)) {
                    const token = this.recognitionMap.get(state)
                    if (token != null) {
                        recognized.push(new Recognition(text.substr(0, i+1), token))
                    }
                }
            }
            branches = newBranches;
        }
        // It should explore all paths, branching and then see which ones bring to recognize the longest character
        let maxLength = 0;
        let selectedRecognition: Recognition | null = null
        for (let i=0;i<recognized.length;i++) {
            const length = recognized[i].text.length
            if (length > maxLength) {
                maxLength = length
                selectedRecognition = recognized[i]
            } else if (length == maxLength) {
                throw new Error("Ambiguous")
            }
        }
        return selectedRecognition
    }

}

export class Recognition {
    text: string;
    token: string;

    constructor(text: string, token: string) {
        this.text = text;
        this.token = token;
    }

    describe() : string {
        return `Recognition(text:${this.text}, token:${this.token})`
    }
}

export function createLexerForKeywords(keywords: string[]) : Lexer {
    const lexer = new Lexer();
    for (let i=0;i<keywords.length;i++) {
        lexer.recognizeKeyword(keywords[i])
    }
    return lexer
}

export function createArray(a: string) : string[] {
    return [a]
}
