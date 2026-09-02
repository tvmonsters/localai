class App {
  constructor() {
    this.storage = new Storage();
    this.auth = new Auth(this.storage);
    this.trainer = new Trainer();
    this.chat = null; 
    this.trainingData = { version: 1, entries: [] };
    this.dataSha = null; 
    this.repoConfig = null;
  }
  
  async init() {
    this.showLoading();
    this.updateLoadingText('Initializing LocalMind...');
    
    this.chat = new Chat(this.trainer);
    this.setupEventListeners();
    
    this.repoConfig = this.storage.getRepoConfig();
    
    if (!this.repoConfig) {
      if (window.location.hostname.endsWith('github.io')) {
        const parts = window.location.pathname.split('/').filter(p => p);
        const owner = window.location.hostname.split('.')[0];
        const repo = parts[0];
        if (owner && repo) {
          this.repoConfig = { owner, repo };
          this.storage.saveRepoConfig(owner, repo);
        }
      }
      
      if (!this.repoConfig && window.location.hostname.endsWith('github.io')) {
        document.getElementById('setup-modal').classList.remove('hidden');
      }
    }
    
    this.auth.checkExisting();
    this.updateLoginButtonText();
    
    await this.loadTrainingData();
    this.refreshDataDisplay();
    
    const stateLoaded = await this.trainer.loadState();
    if (stateLoaded) {
      if (this.trainer.needsRetrain(this.trainingData.entries)) {
        this.updateModelStatus('untrained');
      } else {
        this.updateModelStatus('trained');
      }
    } else {
      this.updateModelStatus('untrained');
    }
    
    this.hideLoading();
  }
  
  setupEventListeners() {
    const navChatBtn = document.getElementById('nav-chat-btn');
    const navTrainBtn = document.getElementById('nav-train-btn');
    const navLoginBtn = document.getElementById('nav-login-btn');
    
    navChatBtn.addEventListener('click', () => this.showView('chat'));
    navTrainBtn.addEventListener('click', () => {
      if (this.auth.isLoggedIn() || !this.repoConfig) {
        this.showView('train');
      } else {
        this.showLoginModal();
      }
    });
    
    navLoginBtn.addEventListener('click', () => {
      if (this.auth.isLoggedIn()) {
        this.handleLogout();
      } else {
        this.showLoginModal();
      }
    });
    
    const setupSaveBtn = document.getElementById('setup-save-btn');
    const setupSkipBtn = document.getElementById('setup-skip-btn');
    
    setupSaveBtn?.addEventListener('click', () => {
      const owner = document.getElementById('setup-owner-input').value.trim();
      const repo = document.getElementById('setup-repo-input').value.trim();
      if (owner && repo) {
        this.repoConfig = { owner, repo };
        this.storage.saveRepoConfig(owner, repo);
        document.getElementById('setup-modal').classList.add('hidden');
        this.loadTrainingData();
      } else {
        document.getElementById('setup-error').textContent = 'Please enter both owner and repo.';
      }
    });
    
    setupSkipBtn?.addEventListener('click', () => {
      document.getElementById('setup-modal').classList.add('hidden');
    });
    
    const loginBtn = document.getElementById('login-btn');
    const loginCloseBtn = document.getElementById('login-close-btn');
    const loginTokenInput = document.getElementById('login-token-input');
    
    loginBtn?.addEventListener('click', () => this.handleLogin());
    loginCloseBtn?.addEventListener('click', () => {
      document.getElementById('login-modal').classList.add('hidden');
    });
    loginTokenInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    const trainAddBtn = document.getElementById('train-add-btn');
    const trainStartBtn = document.getElementById('train-start-btn');
    const trainPromptInput = document.getElementById('train-prompt-input');
    const trainResponseInput = document.getElementById('train-response-input');
    
    trainAddBtn?.addEventListener('click', () => this.addTrainingEntry());
    trainStartBtn?.addEventListener('click', () => this.startTraining());
    
    const handleCtrlEnter = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.addTrainingEntry();
      }
    };
    
    trainPromptInput?.addEventListener('keydown', handleCtrlEnter);
    trainResponseInput?.addEventListener('keydown', handleCtrlEnter);
  }
  
  showView(viewName) {
    const chatView = document.getElementById('chat-view');
    const trainView = document.getElementById('train-view');
    const navChatBtn = document.getElementById('nav-chat-btn');
    const navTrainBtn = document.getElementById('nav-train-btn');
    
    if (viewName === 'chat') {
      chatView.classList.add('active');
      chatView.classList.remove('hidden');
      trainView.classList.remove('active');
      trainView.classList.add('hidden');
      navChatBtn.classList.add('active');
      navTrainBtn.classList.remove('active');
    } else if (viewName === 'train') {
      trainView.classList.add('active');
      trainView.classList.remove('hidden');
      chatView.classList.remove('active');
      chatView.classList.add('hidden');
      navTrainBtn.classList.add('active');
      navChatBtn.classList.remove('active');
      this.refreshDataDisplay();
    }
  }
  
  showLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.remove('hidden');
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-token-input').focus();
  }
  
  async handleLogin() {
    const tokenInput = document.getElementById('login-token-input');
    const token = tokenInput.value.trim();
    if (!token) return;
    
    const loginBtn = document.getElementById('login-btn');
    const errorEl = document.getElementById('login-error');
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    errorEl.textContent = '';
    
    try {
      const result = await this.auth.login(token);
      if (result.success) {
        document.getElementById('login-modal').classList.add('hidden');
        this.updateLoginButtonText();
        this.showView('train');
        this.showToast('Logged in successfully!');
        this.loadTrainingData();
      } else {
        errorEl.textContent = result.error || 'Failed to login';
      }
    } catch (e) {
      errorEl.textContent = 'An error occurred';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
      tokenInput.value = '';
    }
  }
  
  handleLogout() {
    this.auth.logout();
    this.updateLoginButtonText();
    this.showView('chat');
    this.showToast('Logged out');
  }
  
  updateLoginButtonText() {
    const btn = document.getElementById('nav-login-btn');
    if (this.auth.isLoggedIn()) {
      btn.textContent = `Logout (${this.auth.getUsername()})`;
    } else {
      btn.textContent = 'Login';
    }
  }
  
  async loadTrainingData() {
    const statusEl = document.getElementById('data-status');
    
    if (this.repoConfig) {
      const result = await this.storage.fetchTrainingData(this.repoConfig.owner, this.repoConfig.repo, this.auth.getToken());
      if (result.data) {
        this.trainingData = result.data;
        this.dataSha = result.sha;
        localStorage.setItem('localmind-training-data', JSON.stringify(this.trainingData));
        if (statusEl) statusEl.textContent = 'Synced with GitHub';
      } else {
        this.loadLocalData();
        if (statusEl) statusEl.textContent = 'Local only (GitHub fetch failed)';
      }
    } else {
      this.loadLocalData();
      if (statusEl) statusEl.textContent = 'Local only';
    }
    
    this.refreshDataDisplay();
  }
  
  loadLocalData() {
    const local = localStorage.getItem('localmind-training-data');
    if (local) {
      try {
        this.trainingData = JSON.parse(local);
      } catch (e) {
        this.trainingData = { version: 1, entries: [] };
      }
    } else {
      this.trainingData = { version: 1, entries: [] };
    }
  }
  
  async addTrainingEntry() {
    const promptInput = document.getElementById('train-prompt-input');
    const responseInput = document.getElementById('train-response-input');
    
    const prompt = promptInput.value.trim();
    const response = responseInput.value.trim();
    
    if (!prompt || !response) {
      this.showToast('Both prompt and response are required', 'error');
      return;
    }
    
    const entry = {
      prompt,
      response,
      added_by: this.auth.getUsername() || 'anonymous',
      timestamp: new Date().toISOString()
    };
    
    if (!this.trainingData.entries) this.trainingData.entries = [];
    this.trainingData.entries.push(entry);
    
    localStorage.setItem('localmind-training-data', JSON.stringify(this.trainingData));
    
    let githubSuccess = false;
    if (this.repoConfig && this.auth.isLoggedIn()) {
      let success = await this.storage.saveTrainingData(
        this.repoConfig.owner, 
        this.repoConfig.repo, 
        this.auth.getToken(), 
        this.trainingData, 
        this.dataSha
      );
      
      if (!success) {
        const result = await this.storage.fetchTrainingData(this.repoConfig.owner, this.repoConfig.repo, this.auth.getToken());
        if (result.data && result.sha) {
          this.dataSha = result.sha;
          this.trainingData.entries = result.data.entries || [];
          this.trainingData.entries.push(entry);
          success = await this.storage.saveTrainingData(
            this.repoConfig.owner, 
            this.repoConfig.repo, 
            this.auth.getToken(), 
            this.trainingData, 
            this.dataSha
          );
        }
      }
      
      if (success) {
        githubSuccess = true;
        const finalResult = await this.storage.fetchTrainingData(this.repoConfig.owner, this.repoConfig.repo, this.auth.getToken());
        this.dataSha = finalResult.sha;
      } else {
        this.showToast('Failed to save to GitHub, saved locally', 'error');
      }
    }
    
    promptInput.value = '';
    responseInput.value = '';
    
    this.refreshDataDisplay();
    if (githubSuccess || !this.repoConfig) {
      this.showToast('Training data added successfully!');
    }
    
    this.updateModelStatus('untrained');
  }
  
  async startTraining() {
    if (!this.trainingData.entries || this.trainingData.entries.length === 0) {
      this.showToast('No training data available', 'error');
      return;
    }
    
    const startBtn = document.getElementById('train-start-btn');
    const addBtn = document.getElementById('train-add-btn');
    const progContainer = document.getElementById('train-progress-container');
    const progBar = document.getElementById('train-progress');
    const progText = document.getElementById('train-progress-text');
    
    startBtn.disabled = true;
    if (addBtn) addBtn.disabled = true;
    progContainer.classList.remove('hidden');
    this.updateModelStatus('training');
    
    // Give the browser a moment to paint the UI changes before TF.js locks the thread
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const totalEpochs = (typeof CONFIG !== 'undefined' && CONFIG.training && CONFIG.training.epochs) || 100;

      const result = await this.trainer.train(this.trainingData.entries, (epoch, logs) => {
        // tfjs's onEpochEnd fires with a 0-indexed epoch number.
        const percent = Math.min(100, Math.round(((epoch + 1) / totalEpochs) * 100));

        progBar.style.width = `${percent}%`;
        const lossStr = logs && logs.loss !== undefined ? logs.loss.toFixed(4) : '?';
        progText.textContent = `Epoch ${epoch + 1}/${totalEpochs} - Loss: ${lossStr}`;
      });

      this.updateModelStatus('trained');
      if (result && result.skippedCount > 0) {
        this.showToast(`Trained, but skipped ${result.skippedCount} entr${result.skippedCount === 1 ? 'y' : 'ies'} with a missing prompt or response.`, 'error');
      } else {
        this.showToast('Training complete!');
      }
    } catch (e) {
      console.error('Training error:', e);
      // Show the real message (e.g. "No valid training entries found...",
      // or the wrapped tf.js error) instead of a generic, undiagnosable toast -
      // most users can't easily get to the browser console, especially on mobile.
      this.showToast(e.message || 'Error during training', 'error');
      this.updateModelStatus('untrained');
    } finally {
      progContainer.classList.add('hidden');
      startBtn.disabled = false;
      if (addBtn) addBtn.disabled = false;
    }
  }
  
  refreshDataDisplay() {
    const listEl = document.getElementById('train-data-list');
    const countEl = document.getElementById('train-data-count');
    const totalEl = document.getElementById('train-data-total');
    
    const entries = this.trainingData.entries || [];
    if (countEl) countEl.textContent = entries.length;
    if (totalEl) totalEl.textContent = entries.length;
    
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No training data yet. Add some below!';
      listEl.appendChild(empty);
      return;
    }
    
    entries.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'data-entry';
      
      const prompt = document.createElement('div');
      prompt.className = 'data-prompt';
      prompt.style.color = '#3b82f6'; // blue
      prompt.textContent = `Q: ${entry.prompt}`;
      
      const response = document.createElement('div');
      response.className = 'data-response';
      response.style.color = 'white';
      response.textContent = `A: ${entry.response}`;
      
      const meta = document.createElement('div');
      meta.className = 'data-meta';
      meta.style.color = 'grey';
      meta.style.fontSize = '0.8em';
      meta.style.marginTop = '4px';
      meta.textContent = `Added by ${entry.added_by || 'anonymous'} on ${new Date(entry.timestamp || Date.now()).toLocaleString()}`;
      
      div.appendChild(prompt);
      div.appendChild(response);
      div.appendChild(meta);
      
      div.style.padding = '10px';
      div.style.borderBottom = '1px solid #333';
      
      listEl.appendChild(div);
    });
  }
  
  updateModelStatus(status) {
    const badge = document.getElementById('model-status');
    if (!badge) return;
    
    badge.className = 'status-badge';
    badge.classList.add(`status-${status}`);
    
    if (status === 'untrained') {
      badge.textContent = 'Not Trained';
    } else if (status === 'training') {
      badge.textContent = 'Training...';
    } else if (status === 'trained') {
      badge.textContent = 'Trained';
    }
  }
  
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.maxWidth = '360px';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '4px';
    toast.style.color = 'white';
    toast.style.zIndex = '9999';
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.animation = 'slideIn 0.3s ease-out';
    
    document.body.appendChild(toast);
    
    // Errors get more time on screen since they now carry real diagnostic
    // detail (e.g. "No valid training entries found...") instead of a
    // generic message - worth reading before it disappears.
    const displayMs = type === 'error' ? 7000 : 3000;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, displayMs);
  }
  
  updateLoadingText(text) {
    const el = document.getElementById('loading-text');
    if (el) el.textContent = text;
  }
  
  hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('hidden');
  }
  
  showLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => {
    console.error('Failed to initialize LocalMind:', err);
    const el = document.getElementById('loading-text');
    if (el) el.textContent = 'Failed to initialize. Check console for errors.';
  });
});
