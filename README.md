# 🧠 LocalMind

**A self-trained AI that runs entirely in your browser.** No API keys, no cloud services — just a neural network trained on data you and your friends provide, hosted for free on GitHub Pages.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-browser-brightgreen.svg)
![AI](https://img.shields.io/badge/AI-TensorFlow.js-orange.svg)

## 🚀 What Is This?

LocalMind is a fully browser-based AI chatbot that:

- **Trains on YOUR data** — you teach it by providing prompt/response pairs
- **Runs in the browser** — the neural network trains and runs client-side using TensorFlow.js
- **Syncs via GitHub** — training data is stored in this repo so everyone shares the same knowledge
- **No API keys needed** — everything is self-contained, there is no call out to OpenAI, Anthropic, or any other AI provider
- **Locked down from the internet** — TensorFlow.js is vendored locally (`vendor/tf.min.js`), not loaded from a CDN, and a strict Content-Security-Policy in `index.html` blocks the page from talking to anything except itself and `api.github.com`. The model can only ever learn from prompt/response pairs you or your friends type into the Train tab — it has no way to browse, scrape, or fetch outside data
- **Free hosting** — runs on GitHub Pages

> **What "training data sync" actually sends over the network:** the only network calls this app ever makes are to `api.github.com`, and only when you explicitly log in or add a training entry while a repo is configured — to read/write `training_data/data.json` in your fork. Nothing else leaves the browser.

## 📋 Quick Start

### 1. Fork This Repository

Click the **Fork** button at the top right of this page.

### 2. Enable GitHub Pages

1. Go to your forked repo → **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Select **main** branch, **/ (root)** folder
4. Click **Save**
5. Wait a minute, then visit `https://YOUR-USERNAME.github.io/localmind`

### 3. Create a GitHub Personal Access Token

This is your "password" for adding training data:

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
2. Give it a name like "LocalMind Training"
3. Set expiration as desired
4. Under **Repository access**, select **Only select repositories** → choose your `localmind` fork
5. Under **Permissions → Repository permissions**, set **Contents** to **Read and write**
6. Click **Generate token**
7. **Copy the token** — you'll need it to log in

### 4. Start Training!

1. Visit your GitHub Pages site
2. Click **🔑 Login** → paste your GitHub token
3. Click **🎓 Train** to open the training panel
4. Add prompt/response pairs to teach the AI
5. Click **🧠 Start Training** to train the model
6. Switch to **💬 Chat** and talk to your AI!

## 👥 Sharing With Friends

Want friends to help train the AI?

1. **To chat only**: Share your GitHub Pages URL — anyone can chat with the trained model
2. **To train**: Share your GitHub token with trusted friends — they can log in and add training data

> ⚠️ **Security Note**: Anyone with the token can add training data and modify the data file. Only share with people you trust, and always create a **fine-grained** token scoped to just this one repo (never a classic all-repo token). The token is stored in your browser's `localStorage`, in plain text — it never leaves your machine except in requests to `api.github.com`, but anyone with access to that browser profile could read it. Log out (🔑 → Logout) on shared computers, and revoke the token from GitHub settings any time you want to cut a friend's access.

## 📝 Training Tips

- **More data = better results** — aim for 200+ prompt/response pairs
- **Be consistent** — use similar styles across responses
- **Add variety** — include different phrasings of similar questions
- **Keep responses focused** — shorter, clearer responses are learned more easily
- **Retrain after adding data** — the model needs to be retrained to learn new entries

### Example Training Data

| Prompt | Response |
|--------|----------|
| What is your name? | I'm LocalMind, trained by my creators! |
| What's the weather like? | I don't have access to real-time data, but I hope it's nice where you are! |
| Tell me about coding | Coding is the process of writing instructions for computers. It's creative and logical! |
| What's your favorite color? | I'd say electric blue — it matches my UI! |

## 🏗️ How It Works

```
You provide text data → Tokenizer learns vocabulary → LSTM neural network trains → Chat generates responses
```

1. **Character-level Tokenizer**: Learns all unique characters from your training data
2. **LSTM Neural Network**: A recurrent neural network that learns patterns in your text
3. **Training**: Happens entirely in your browser using TensorFlow.js (GPU-accelerated via WebGL)
4. **Generation**: Types out responses character-by-character based on learned patterns

The model is deliberately small (~500K parameters) so it trains fast in the browser. The training window (how many characters of context the LSTM sees at once) is sized automatically to your longest training example instead of always maxing out — a dataset of short Q&A pairs trains noticeably faster than one with a couple of long paragraphs mixed in. Quality scales with the amount and quality of training data; expect short, rough, sometimes-garbled responses from a few dozen examples, and much more coherent ones once you're past a couple hundred.

## 📁 Project Structure

```
localmind/
├── index.html              # Main web application
├── css/styles.css           # Dark theme styling
├── js/
│   ├── config.js            # Configuration settings
│   ├── tokenizer.js         # Character-level tokenizer
│   ├── model.js             # TensorFlow.js neural network
│   ├── trainer.js           # Training pipeline
│   ├── storage.js           # GitHub API + local storage
│   ├── auth.js              # Authentication
│   ├── chat.js              # Chat interface
│   └── app.js               # Main controller
├── vendor/
│   └── tf.min.js            # TensorFlow.js, vendored locally (no CDN)
├── training_data/
│   ├── data.json            # Shared training data
│   └── README.md            # Data format documentation
├── README.md                # This file
├── .gitignore               # Git ignore rules
└── .nojekyll                # GitHub Pages config
```

## ⚙️ Configuration

Edit `js/config.js` to adjust:

| Setting | Default | Description |
|---------|---------|-------------|
| `model.embeddingSize` | 64 | Character embedding dimensions |
| `model.hiddenUnits` | 128 | LSTM hidden layer size |
| `model.temperature` | 0.7 | Response creativity (0.1=focused, 1.5=creative) |
| `training.epochs` | 100 | Training iterations |
| `training.learningRate` | 0.005 | How fast the model learns |
| `training.batchSize` | 16 | Samples per training step |

## 🔧 Running Locally

You can also run LocalMind on your own machine:

```bash
# Clone the repo
git clone https://github.com/YOUR-USERNAME/localmind.git
cd localmind

# Start a local server (Python)
python -m http.server 8000

# Or use Node.js
npx serve .

# Open http://localhost:8000 in your browser
```

## 🩹 Troubleshooting

- **"Error during training" toast, or training never seems to finish**: open the browser console (F12). If you see a shape/dtype error, make sure you're running the current code — an earlier version of this project built its training labels with the wrong tensor shape/type, which made TensorFlow.js reject the data before a single epoch could run. That's fixed in `js/model.js`, but if you're diffing against an old copy, that's the tell.
- **Training is slow / tab freezes**: training runs on the main thread. Keep the tab focused, avoid training with hundreds of very long responses at once, and consider lowering `training.epochs` or `model.hiddenUnits` in `js/config.js` if your device is slow.
- **"Not Trained" badge won't go away after training**: make sure you didn't add new training data *during* training — the Add Entry button is disabled while training runs specifically to prevent this.
- **Chat gives garbled/nonsense answers**: this is expected with a small model and little data. Add more varied, consistent examples and retrain — quality scales with data quantity and quality, not model size.

## 📄 License

MIT License — do whatever you want with it.

## 🤝 Contributing

1. Fork the repo
2. Add training data or improve the code
3. Submit a pull request

---

**Built with ❤️ using TensorFlow.js — no cloud, no APIs, just your brain teaching a neural network.**
