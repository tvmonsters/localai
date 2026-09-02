class Trainer {
  constructor() {
    this.tokenizer = new Tokenizer();
    this.model = null;
    this.isTrained = false;
    this.seqLen = CONFIG.model.maxSequenceLength - 1;
  }

  prepareData(entries) {
    const { valid, skipped } = this.sanitizeEntries(entries);
    if (skipped.length > 0) {
      console.warn(`Skipping ${skipped.length} invalid training entr${skipped.length === 1 ? 'y' : 'ies'}:`, skipped);
    }
    if (valid.length === 0) {
      throw new Error('No valid training entries found (every entry was missing a prompt or response).');
    }

    const allTexts = valid.flatMap(entry => [entry.prompt, entry.response]);
    this.tokenizer.buildVocabulary(allTexts);

    const rawSequences = valid.map(entry =>
      this.tokenizer.encodeTrainingPair(entry.prompt, entry.response)
    );

    // Size the training window to the data instead of always using the
    // full CONFIG.model.maxSequenceLength ceiling. A handful of short
    // "What is your name?" style pairs don't need a 200-step LSTM - sizing
    // down to what's actually there makes in-browser training much faster.
    const longest = rawSequences.reduce((max, seq) => Math.max(max, seq.length), 0);
    const seqLen = Math.min(
      CONFIG.model.maxSequenceLength,
      Math.max(CONFIG.model.minSequenceLength, longest)
    ) - 1;
    this.seqLen = seqLen;

    const inputs = [];
    const targets = [];

    for (const sequence of rawSequences) {
      const trimmed = sequence.length > seqLen + 1 ? sequence.slice(0, seqLen + 1) : sequence;

      const input = trimmed.slice(0, -1);
      const target = trimmed.slice(1);

      inputs.push(this.tokenizer.padSequence(input, seqLen));
      targets.push(this.tokenizer.padSequence(target, seqLen));
    }

    return { inputs, targets, skippedCount: skipped.length };
  }

  // Guards against exactly the kind of entry a manually-edited data.json can
  // introduce: missing fields, null values, non-string values, or blank
  // strings. Without this, a single bad entry throws a low-level tf.js/JS
  // error ("text is not iterable") deep inside training with no indication
  // of which entry (or that an entry, rather than the model, is the problem).
  sanitizeEntries(entries) {
    const valid = [];
    const skipped = [];
    (entries || []).forEach((entry, i) => {
      const prompt = entry && typeof entry.prompt === 'string' ? entry.prompt.trim() : '';
      const response = entry && typeof entry.response === 'string' ? entry.response.trim() : '';
      if (prompt.length === 0 || response.length === 0) {
        skipped.push({ index: i, entry });
      } else {
        valid.push({ ...entry, prompt, response });
      }
    });
    return { valid, skipped };
  }

  async train(entries, onProgress) {
    const { inputs, targets, skippedCount } = this.prepareData(entries);

    if (this.model) {
      this.model.dispose();
    }
    this.model = new LocalMindModel(this.tokenizer.vocabSize, this.seqLen);
    this.model.build();

    try {
      await this.model.train(inputs, targets, onProgress);
    } catch (e) {
      // Re-throw with the original error attached but a clearer top-level
      // message, since tf.js's own messages (e.g. "text is not iterable",
      // shape mismatches) are meaningless to someone who isn't reading the
      // model code.
      const wrapped = new Error(`Training failed: ${e.message}`);
      wrapped.cause = e;
      throw wrapped;
    }

    await this.saveState(entries);
    this.isTrained = true;
    return { skippedCount };
  }

  async generate(prompt, temperature = CONFIG.model.temperature) {
    if (!this.model || !this.model.isBuilt()) {
      throw new Error("Model is not trained or loaded yet.");
    }

    const startIdx = this.tokenizer.charToIdx.get(CONFIG.tokens.START);
    const sepIdx = this.tokenizer.charToIdx.get(CONFIG.tokens.SEP);
    const promptIndices = [startIdx, ...this.tokenizer.encode(prompt), sepIdx];

    return await this.model.generate(promptIndices, this.tokenizer, temperature, CONFIG.model.maxResponseLength);
  }

  async saveState(entries) {
    if (this.model) {
      await this.model.save();
    }
    localStorage.setItem('localmind-tokenizer', this.tokenizer.toJSON());
    localStorage.setItem('localmind-seqlen', String(this.seqLen));
    if (entries) {
      localStorage.setItem('localmind-data-hash', this.getDataHash(entries));
    }
  }

  async loadState() {
    const tokenizerJson = localStorage.getItem('localmind-tokenizer');
    if (!tokenizerJson) return false;

    this.tokenizer = Tokenizer.fromJSON(tokenizerJson);

    const storedSeqLen = parseInt(localStorage.getItem('localmind-seqlen'), 10);
    this.seqLen = Number.isFinite(storedSeqLen) && storedSeqLen > 0
      ? storedSeqLen
      : CONFIG.model.maxSequenceLength - 1;

    this.model = new LocalMindModel(this.tokenizer.vocabSize, this.seqLen);

    const loaded = await this.model.load();
    if (loaded) {
      this.isTrained = true;
      return true;
    }
    return false;
  }

  getDataHash(entries) {
    return JSON.stringify(entries).length + '_' + entries.length;
  }

  needsRetrain(entries) {
    const currentHash = this.getDataHash(entries);
    const storedHash = localStorage.getItem('localmind-data-hash');
    return currentHash !== storedHash;
  }
}
