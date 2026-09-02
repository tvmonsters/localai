class Chat {
  constructor(trainer) {
    this.trainer = trainer;
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send-btn');
    this.history = [];
    this.isGenerating = false;
    
    this.setupEvents();
  }
  
  setupEvents() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.inputEl.addEventListener('input', () => {
      this.inputEl.style.height = 'auto';
      this.inputEl.style.height = (this.inputEl.scrollHeight) + 'px';
    });
  }
  
  async sendMessage() {
    const text = this.inputEl.value.trim();
    if (!text || this.isGenerating) return;
    
    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';
    this.isGenerating = true;
    this.sendBtn.disabled = true;
    
    this.displayMessage('user', text);
    this.showTypingIndicator();
    
    try {
      if (!this.trainer.isTrained) {
        this.removeTypingIndicator();
        this.displayMessage('ai', "I haven't been trained yet! Go to the Train tab to teach me.");
      } else {
        // Wait a small delay to simulate thinking so UI updates
        await new Promise(resolve => setTimeout(resolve, 50));
        const temperature = (typeof CONFIG !== 'undefined' && CONFIG.model) ? CONFIG.model.temperature : 0.7;
        const response = await this.trainer.generate(text, temperature);
        this.removeTypingIndicator();
        this.displayMessage('ai', response);
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.removeTypingIndicator();
      this.displayMessage('ai', "An error occurred while generating a response.");
    } finally {
      this.isGenerating = false;
      this.sendBtn.disabled = false;
      this.inputEl.focus();
    }
  }
  
  displayMessage(role, text) {
    const welcome = document.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    
    const label = document.createElement('div');
    label.className = 'chat-label';
    label.textContent = role === 'user' ? 'You' : 'LocalMind';
    
    const content = document.createElement('div');
    content.className = 'chat-content';
    content.textContent = text;
    
    bubble.appendChild(label);
    bubble.appendChild(content);
    
    this.messagesEl.appendChild(bubble);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    
    this.history.push({ role, text });
  }
  
  showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot';
      indicator.appendChild(dot);
    }
    this.messagesEl.appendChild(indicator);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
  
  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  clearChat() {
    this.messagesEl.innerHTML = '';
    
    const welcome = document.createElement('div');
    welcome.className = 'welcome-message';
    welcome.textContent = 'Welcome to LocalMind! Say hello to start chatting.';
    this.messagesEl.appendChild(welcome);
    
    this.history = [];
  }
}
