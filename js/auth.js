// ============================================
// AUTH.JS — Authentication for AI/ML Tracker
// Supabase Auth with username-based login
// NOTE: Disable "Email Confirmation" in your
// Supabase Dashboard → Auth → Settings
// ============================================

const SUPABASE_URL = 'https://keqxbgccsgnoosxldtns.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcXhiZ2Njc2dub29zeGxkdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzgzMTksImV4cCI6MjA4OTc1NDMxOX0.6NPjCev_ceX97McfzJXt3WUnJPYQpOoB5U4zTIOjAM4';
const EMAIL_DOMAIN = '@aitracker.app';
const SESSION_KEY = 'auth_session_v1';

function getClient() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return null;
}

const Auth = {
  _client: null,

  client() {
    if (!this._client) this._client = getClient();
    return this._client;
  },

  toEmail(username) {
    return `${String(username).toLowerCase().trim()}${EMAIL_DOMAIN}`;
  },

  saveSession(user) {
    const meta = user.user_metadata || {};
    const session = {
      id: user.id,
      username: meta.username || user.email.replace(EMAIL_DOMAIN, ''),
      fullName: meta.full_name || meta.username || 'User',
      age: meta.age || null
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
    return session;
  },

  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  },

  async signUp(username, password, fullName, age) {
    const client = this.client();
    if (!client) throw new Error('Supabase unavailable. Check your connection.');

    const email = this.toEmail(username);
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
          full_name: fullName.trim(),
          age: parseInt(age) || null
        }
      }
    });

    if (error) throw error;

    // If email confirmation is required, data.user.identities will be empty
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('This username is already taken. Please choose a different one.');
    }

    if (data.user) return this.saveSession(data.user);
    throw new Error('Sign up failed. Try again.');
  },

  async signIn(username, password) {
    const client = this.client();
    if (!client) throw new Error('Supabase unavailable. Check your connection.');

    const email = this.toEmail(username);
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Invalid login')) {
        throw new Error('Incorrect username or password.');
      }
      throw error;
    }

    if (data.user) return this.saveSession(data.user);
    throw new Error('Login failed. Try again.');
  },

  async signOut() {
    const client = this.client();
    if (client) {
      try { await client.auth.signOut(); } catch (e) {}
    }
    this.clearSession();
    window.location.href = 'login.html';
  },

  async requireAuth() {
    // First try to restore from Supabase session
    const client = this.client();
    if (client) {
      try {
        const { data } = await client.auth.getUser();
        if (data?.user) {
          return this.saveSession(data.user);
        }
      } catch (e) {
        // Fall through to localStorage
      }
    }

    // Check localStorage session
    const session = this.getSession();
    if (session && session.id) return session;

    // No session — redirect to login
    window.location.href = 'login.html';
    return null;
  },

  getUser() {
    return this.getSession();
  }
};

window.Auth = Auth;
