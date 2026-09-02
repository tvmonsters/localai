class Tokenizer {
  constructor() {
    this.charToIdx = new Map();
    this.idxToChar = new Map();
    
    // Add special tokens first
    this.charToIdx.set(CONFIG.tokens.PAD, 0);
    this.idxToChar.set(0, CONFIG.tokens.PAD);
    
    this.charToIdx.set(CONFIG.tokens.START, 1);
    this.idxToChar.set(1, CONFIG.tokens.START);
    
    this.charToIdx.set(CONFIG.tokens.SEP, 2);
    this.idxToChar.set(2, CONFIG.tokens.SEP);
    
    this.charToIdx.set(CONFIG.tokens.END, 3);
    this.idxToChar.set(3, CONFIG.tokens.END);
  }
  
  buildVocabulary(texts) {
    let nextIdx = Math.max(4, this.charToIdx.size);
    const uniqueChars = new Set();
    
    for (const text of texts) {
      for (const char of text) {
        uniqueChars.add(char);
      }
    }
    
    for (const char of uniqueChars) {
      if (!this.charToIdx.has(char)) {
        this.charToIdx.set(char, nextIdx);
        this.idxToChar.set(nextIdx, char);
        nextIdx++;
      }
    }
  }
  
  encode(text) {
    const indices = [];
    for (const char of text) {
      if (this.charToIdx.has(char)) {
        indices.push(this.charToIdx.get(char));
      }
    }
    return indices;
  }
  
  decode(indices) {
    let text = '';
    for (const idx of indices) {
      const char = this.idxToChar.get(idx);
      if (char === CONFIG.tokens.END) {
        break;
      }
      if (char !== CONFIG.tokens.START && char !== CONFIG.tokens.SEP && char !== CONFIG.tokens.PAD) {
        text += char;
      }
    }
    return text;
  }
  
  encodeTrainingPair(prompt, response) {
    const startIdx = this.charToIdx.get(CONFIG.tokens.START);
    const sepIdx = this.charToIdx.get(CONFIG.tokens.SEP);
    const endIdx = this.charToIdx.get(CONFIG.tokens.END);
    
    const promptIndices = this.encode(prompt);
    const responseIndices = this.encode(response);
    
    let sequence = [startIdx, ...promptIndices, sepIdx, ...responseIndices, endIdx];
    
    if (sequence.length > CONFIG.model.maxSequenceLength) {
      sequence = sequence.slice(0, CONFIG.model.maxSequenceLength);
      // Ensure END token is present if truncated
      sequence[sequence.length - 1] = endIdx;
    }
    
    return sequence;
  }
  
  padSequence(sequence, maxLen) {
    const padIdx = this.charToIdx.get(CONFIG.tokens.PAD);
    const padded = [...sequence];
    while (padded.length < maxLen) {
      padded.push(padIdx);
    }
    return padded;
  }
  
  get vocabSize() {
    return this.charToIdx.size;
  }
  
  toJSON() {
    return JSON.stringify({
      charToIdx: Array.from(this.charToIdx.entries()),
      idxToChar: Array.from(this.idxToChar.entries())
    });
  }
  
  static fromJSON(json) {
    const data = JSON.parse(json);
    const tokenizer = new Tokenizer();
    tokenizer.charToIdx = new Map(data.charToIdx);
    tokenizer.idxToChar = new Map(data.idxToChar);
    return tokenizer;
  }
}
