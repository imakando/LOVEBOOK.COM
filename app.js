// ===================== SUPABASE CLIENT =====================
import { supabase } from './supabase-config.js';

// ===================== GLOBAL VARIABLES =====================
let currentUser = null;

// ===================== AUTH MODAL & FORM ELEMENTS =====================
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const showResetBtn = document.getElementById('showResetBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');

// Show/hide forms
showRegisterBtn.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

showResetBtn.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  resetForm.classList.remove('hidden');
});

backToLoginBtn.addEventListener('click', () => {
  resetForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

// ===================== AUTH FUNCTIONS =====================

// Helper: hash string (simple SHA256)
async function hashString(str) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// REGISTER
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value;
  const display_name = document.getElementById('registerDisplayName').value;
  const password = document.getElementById('registerPassword').value;
  const security_question = document.getElementById('registerSecurityQ').value;
  const security_answer = document.getElementById('registerSecurityA').value;

  const security_answer_hash = await hashString(security_answer);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name, security_question, security_answer_hash } }
  });

  if (error) alert(error.message);
  else {
    alert('Registered! Check your email for confirmation.');
    registerForm.reset();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  }
});

// LOGIN
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) alert(error.message);
  else {
    authModal.classList.add('hidden');
    currentUser = data.user;
    initApp();
  }
});

// PASSWORD RESET (simulated OTP)
resetForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value;
  // Fetch user metadata to get security question
  const { data: users } = await supabase.from('users').select('*').eq('email', email).single();
  if (!users) return alert('Email not found.');

  const answer = prompt(`Security Question: ${users.security_question}`);
  const answerHash = await hashString(answer);
  if (answerHash !== users.security_answer_hash) return alert('Incorrect answer.');

  // Simulate OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  alert(`Simulated OTP: ${otp}`);
  const enteredOtp = prompt('Enter OTP sent to your email');
  if (parseInt(enteredOtp) !== otp) return alert('Invalid OTP.');

  const newPassword = prompt('Enter new password');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) alert(error.message);
  else alert('Password updated successfully!');
});

// ===================== THEME TOGGLE =====================
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

// ===================== PROFILE =====================
const userAvatar = document.getElementById('userAvatar');

async function loadProfile() {
  if (!currentUser) return;
  userAvatar.src = currentUser.user_metadata.avatar_url || 'https://via.placeholder.com/40';
}

// ===================== POSTS & FEED =====================
const postSubmitBtn = document.getElementById('postSubmitBtn');
const postContent = document.getElementById('postContent');
const postMedia = document.getElementById('postMedia');
const postsFeed = document.getElementById('postsFeed');
const postVisibility = document.getElementById('postVisibility');

postSubmitBtn.addEventListener('click', async () => {
  const content = postContent.value;
  if (!content) return alert('Post cannot be empty.');

  let media_urls = [];
  if (postMedia.files.length > 0) {
    for (let file of postMedia.files) {
      const { data, error } = await supabase.storage.from('post_media')
        .upload(`public/${currentUser.id}/${Date.now()}_${file.name}`, file);
      if (error) console.error(error);
      else media_urls.push(data.path);
    }
  }

  const { error } = await supabase.from('posts').insert([{
    user_id: currentUser.id,
    content,
    media_urls,
    visibility: postVisibility.value
  }]);

  if (error) alert(error.message);
  else {
    postContent.value = '';
    postMedia.value = '';
    loadFeed();
  }
});

// Real-time feed
async function loadFeed() {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (error) console.error(error);
  else {
    postsFeed.innerHTML = '';
    data.forEach(post => {
      const div = document.createElement('div');
      div.classList.add('post');
      div.innerHTML = `
        <div class="post-header">
          <img src="${currentUser.user_metadata.avatar_url || 'https://via.placeholder.com/40'}">
          <strong>${currentUser.user_metadata.display_name}</strong>
        </div>
        <div class="post-content">${post.content}</div>
      `;
      postsFeed.appendChild(div);
    });
  }
}

// ===================== CONNECTIONS & PROPOSALS =====================
const connectionsList = document.getElementById('connectionsList');
const proposalsList = document.getElementById('proposalsList');

async function loadConnections() {
  const { data, error } = await supabase.from('connections')
    .select('*')
    .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`);
  if (error) console.error(error);
  else connectionsList.innerHTML = data.map(c => `<div class="connection-card">${c.status}</div>`).join('');
}

async function loadProposals() {
  const { data, error } = await supabase.from('proposals')
    .select('*')
    .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`);
  if (error) console.error(error);
  else proposalsList.innerHTML = data.map(p => `<div class="proposal-card">${p.status}</div>`).join('');
}

// ===================== MESSAGING =====================
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

chatSendBtn.addEventListener('click', async () => {
  const content = chatInput.value;
  if (!content) return;
  const { error } = await supabase.from('messages').insert([{
    from_user_id: currentUser.id,
    to_user_id: 'TARGET_USER_ID', // Replace with actual recipient logic
    content
  }]);
  if (error) console.error(error);
  else chatInput.value = '';
  loadMessages();
});

async function loadMessages() {
  const { data, error } = await supabase.from('messages')
    .select('*')
    .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`);
  if (error) console.error(error);
  else {
    chatContainer.innerHTML = data.map(m => `
      <div class="chat-message ${m.from_user_id === currentUser.id ? 'self' : ''}">
        ${m.content}
      </div>
    `).join('');
  }
}

// ===================== GROUPS =====================
const groupsList = document.getElementById('groupsList');
const createGroupBtn = document.getElementById('createGroupBtn');
const newGroupName = document.getElementById('newGroupName');

createGroupBtn.addEventListener('click', async () => {
  const name = newGroupName.value;
  if (!name) return alert('Group name required');
  const { error } = await supabase.from('groups').insert([{ name, creator_id: currentUser.id }]);
  if (error) console.error(error);
  else {
    newGroupName.value = '';
    loadGroups();
  }
});

async function loadGroups() {
  const { data, error } = await supabase.from('groups').select('*');
  if (error) console.error(error);
  else groupsList.innerHTML = data.map(g => `<div class="group-card">${g.name}</div>`).join('');
}

// ===================== INITIALIZE APP =====================
async function initApp() {
  await loadProfile();
  loadFeed();
  loadConnections();
  loadProposals();
  loadMessages();
  loadGroups();
}

// ===================== CHECK SESSION =====================
window.addEventListener('load', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) authModal.classList.remove('hidden');
  else {
    currentUser = session.user;
    initApp();
  }
});
