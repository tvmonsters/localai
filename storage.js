class Storage {
  // === GitHub API Methods ===
  
  async fetchTrainingData(owner, repo, token = null) {
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${CONFIG.github.dataPath}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 404) {
            return { data: null, sha: null };
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const result = await response.json();
      const content = this.base64Decode(result.content);
      const parsedData = JSON.parse(content);
      return { data: parsedData, sha: result.sha };
    } catch (error) {
      console.error('Error fetching training data:', error);
      return { data: null, sha: null };
    }
  }
  
  async saveTrainingData(owner, repo, token, data, sha) {
    try {
      const body = {
        message: 'Update training data',
        content: this.base64Encode(JSON.stringify(data, null, 2)),
        branch: CONFIG.github.branch
      };
      if (sha) {
        body.sha = sha;
      }

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${CONFIG.github.dataPath}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error(`GitHub API error: ${response.statusText}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving training data:', error);
      return false;
    }
  }
  
  async validateToken(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return { valid: false, username: null };
      }

      const data = await response.json();
      return { valid: true, username: data.login };
    } catch (error) {
      console.error('Error validating token:', error);
      return { valid: false, username: null };
    }
  }
  
  // === Local Storage Methods ===
  
  saveRepoConfig(owner, repo) {
    localStorage.setItem('localmind-repo', JSON.stringify({ owner, repo }));
  }
  
  getRepoConfig() {
    const data = localStorage.getItem('localmind-repo');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  
  saveToken(token) {
    localStorage.setItem('localmind-token', token);
  }
  
  getToken() {
    return localStorage.getItem('localmind-token');
  }
  
  clearToken() {
    localStorage.removeItem('localmind-token');
  }
  
  saveUsername(username) {
    localStorage.setItem('localmind-username', username);
  }
  
  getUsername() {
    return localStorage.getItem('localmind-username');
  }
  
  clearUsername() {
    localStorage.removeItem('localmind-username');
  }
  
  // Helper: base64 encode that handles unicode
  base64Encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  
  // Helper: base64 decode that handles unicode  
  base64Decode(str) {
    return decodeURIComponent(escape(atob(str)));
  }
}
