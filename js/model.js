class LocalMindModel {
  constructor(vocabSize, seqLen) {
    this.vocabSize = vocabSize;
    // Number of timesteps this network is built for (the *input* length,
    // i.e. one less than a full prompt+response token sequence). Trainer
    // sizes this to the actual training data instead of always using the
    // hard CONFIG.model.maxSequenceLength ceiling, so a handful of short
    // Q&A pairs don't force a 200-step LSTM to train on mostly padding.
    this.seqLen = seqLen || (CONFIG.model.maxSequenceLength - 1);
    this.model = null;
  }

  build() {
    this.model = tf.sequential();

    this.model.add(tf.layers.embedding({
      inputDim: this.vocabSize,
      outputDim: CONFIG.model.embeddingSize,
      inputLength: this.seqLen
    }));

    this.model.add(tf.layers.lstm({
      units: CONFIG.model.hiddenUnits,
      returnSequences: true
    }));

    this.model.add(tf.layers.dense({
      units: this.vocabSize,
      activation: 'softmax'
    }));

    this.model.compile({
      optimizer: tf.train.adam(CONFIG.training.learningRate),
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy']
    });
  }

  async train(inputs, targets, onProgress) {
    const seqLen = inputs[0].length;
    const inputTensor = tf.tensor2d(inputs, [inputs.length, seqLen], 'int32');

    // IMPORTANT: with returnSequences:true the Dense/softmax output is 3D
    // ([batch, time, vocabSize]). tfjs's sparseCategoricalCrossentropy needs
    // the labels to match that rank - a 3D tensor shaped [batch, time, 1] -
    // and needs it to be float32, or `model.fit` throws a shape/dtype error
    // before a single epoch runs. A plain 2D int32 target tensor (as you'd
    // reach for first) fails immediately.
    const targetTensor = tf.tensor3d(
      targets.map(seq => seq.map(idx => [idx])),
      [targets.length, seqLen, 1],
      'float32'
    );

    try {
      await this.model.fit(inputTensor, targetTensor, {
        epochs: CONFIG.training.epochs,
        batchSize: CONFIG.training.batchSize,
        validationSplit: CONFIG.training.validationSplit,
        shuffle: true,
        yieldEvery: 'epoch',
        callbacks: {
          onEpochEnd: async (epoch, logs) => {
            if (onProgress) onProgress(epoch, logs);
            await tf.nextFrame(); // Force UI update
          }
        }
      });
    } finally {
      inputTensor.dispose();
      targetTensor.dispose();
    }
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  async generate(promptIndices, tokenizer, temperature = CONFIG.model.temperature, maxLength = CONFIG.model.maxResponseLength) {
    let currentSequence = [...promptIndices];
    const padToken = tokenizer.charToIdx.get(CONFIG.tokens.PAD);
    const endToken = tokenizer.charToIdx.get(CONFIG.tokens.END);

    const seqLength = this.seqLen;

    for (let i = 0; i < maxLength; i++) {
      let inputSeq = [...currentSequence];

      // Pad or truncate
      if (inputSeq.length > seqLength) {
        inputSeq = inputSeq.slice(inputSeq.length - seqLength);
      } else {
        while (inputSeq.length < seqLength) {
          inputSeq.push(padToken);
        }
      }

      const nextToken = tf.tidy(() => {
        const inputTensor = tf.tensor2d([inputSeq], [1, seqLength], 'int32');
        const predictions = this.model.predict(inputTensor);

        // Find position of the last real token
        let lastRealPos = Math.min(currentSequence.length - 1, seqLength - 1);

        const logits = predictions.slice([0, lastRealPos, 0], [1, 1, this.vocabSize]).squeeze();

        const scaledLogits = logits.div(tf.scalar(temperature));
        const probs = tf.softmax(scaledLogits);

        const sampled = tf.multinomial(probs, 1).arraySync()[0];
        return sampled;
      });

      if (nextToken === endToken || nextToken === padToken) {
        break;
      }

      currentSequence.push(nextToken);
    }

    const sepIdx = currentSequence.indexOf(tokenizer.charToIdx.get(CONFIG.tokens.SEP));
    const responseIndices = sepIdx !== -1 ? currentSequence.slice(sepIdx + 1) : currentSequence;

    return tokenizer.decode(responseIndices);
  }

  async save() {
    await this.model.save('indexeddb://localmind-model');
  }

  async load() {
    try {
      this.model = await tf.loadLayersModel('indexeddb://localmind-model');
      this.model.compile({
        optimizer: tf.train.adam(CONFIG.training.learningRate),
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy']
      });
      return true;
    } catch (e) {
      console.warn("Could not load model from IndexedDB", e);
      return false;
    }
  }

  isBuilt() {
    return this.model !== null;
  }
}
