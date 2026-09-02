const CONFIG = {
  model: {
    embeddingSize: 64,
    hiddenUnits: 128,
    numLayers: 1,
    maxSequenceLength: 200,
    // Floor for the dynamic training window (see trainer.js). Keeps very
    // small/short datasets from getting an unusably tiny context window.
    minSequenceLength: 24,
    temperature: 0.7,
    maxResponseLength: 150
  },
  training: {
    epochs: 100,
    learningRate: 0.005,
    batchSize: 16,
    validationSplit: 0
  },
  tokens: {
    START: '\x02',
    SEP: '\x03',
    END: '\x04',
    PAD: '\x00'
  },
  github: {
    apiBase: 'https://api.github.com',
    dataPath: 'training_data/data.json',
    branch: 'main'
  }
};
