import {Console, Process} from "as-wasi";
import {Lexer, Recognition} from "./lexer";

function processText(lexer: Lexer, text: string, start: boolean = true) : void {
  if (start) {
    Console.log(`\nProcessing "${text}"`)
  }
  let nextToken = lexer.nextToken(text)
  if (nextToken == null) {
    Console.error(` - No token recognized at "${text}"`)
    Console.log("")
    return
  }
  const r = nextToken as Recognition
  Console.log(`  - Token recognized: ${r.describe()}`)
  if (text.length == r.text.length) {
    // end of text reached
    Console.log("")
  } else {
    this.processText(lexer, text.substr(r.text.length), false)
  }
}

const lexer = new Lexer();
lexer.recognizeKeyword("foo")
lexer.recognizeKeyword("bar")
lexer.recognizeKeyword("barrumba")
lexer.recognizeKeyword("zum")

let done = false
while (!done) {
  Console.log("insert input to process:")
  let input = Console.readLine();
  if (input != null && (input as string).length > 0) {
    processText(lexer, input as string)
  } else {
    Console.log("no input specified, terminating")
    done = true
  }
}


