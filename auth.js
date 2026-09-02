class Auth {
  constructor(storage) {
    this.storage = storage;
    this.loggedIn = false;
    this.username = null;
  }
  
  async login(token) {
    const result = await this.storage.validateToken(token);
    if (result.valid) {
      this.storage.saveToken(token);
      this.storage.saveUsername(result.username);
      this.loggedIn = true;
      this.username = result.username;
      return { success: true, username: result.username };
    } else {
      return { success: false, error: 'Invalid token' };
    }
  }
  
  logout() {
    this.storage.clearToken();
    this.storage.clearUsername();
    this.loggedIn = false;
    this.username = null;
  }
  
  checkExisting() {
    const token = this.storage.getToken();
    if (token) {
      this.loggedIn = true;
      this.username = this.storage.getUsername();
    }
    return this.loggedIn;
  }
  
  isLoggedIn() {
    return this.loggedIn;
  }
  
  getToken() {
    return this.storage.getToken();
  }
  
  getUsername() {
    return this.username;
  }
}
