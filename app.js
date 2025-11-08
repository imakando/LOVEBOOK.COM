// app.js
document.addEventListener('DOMContentLoaded', async () => {

  /* ===================== ELEMENTS ===================== */
  const authModal = document.getElementById('authModal');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const resetForm = document.getElementById('resetForm');
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const showResetBtn = document.getElementById('showResetBtn');
  const backToLoginBtn = document.getElementById('backToLoginBtn');
  const themeToggle = document.getElementById('themeToggle');
  const postSubmitBtn = document.getElementById('postSubmitBtn');
  const postContent = document.getElementById('postContent');
  const postMedia = document.getElementById('postMedia');
  const postsFeed = document.getElementById('postsFeed');
  const connectionsList = document.getElementById('connectionsList');
  const proposalsList = document.getElementById('proposalsList');
  const chatContainer = document.getElementById('chatContainer');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const groupsList = document.getElementById('groupsList');
  const createGroupBtn = document.getElementById('createGroupBtn');
  const newGroupName = document.getElementById('newGroupName');
  const userAvatar = document.getElementById('userAvatar');
  const notificationBadge = document.getElementById('notificationBadge');
  const messagesBadge = document.getElementById('messagesBadge');

  let currentUser = null;

  /* ===================== AUTHENTICATION ===================== */

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

  // Register
  registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('registerEmail').value;
      const display_name = document.getElementById('registerDisplayName').value;
      const password = document.getElementById('registerPassword').value;
      const security_question = document.getElementById('registerSecurityQ').value;
      const security_answer = document.getElementById('registerSecurityA').value;

      const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: { display_name, security_question, security_answer }
          }
      });
      if (error) alert(error.message);
      else {
          alert('Registered successfully! Check your email to confirm.');
          registerForm.reset();
          registerForm.classList.add('hidden');
          loginForm.classList.remove('hidden');
      }
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else {
          authModal.classList.add('hidden');
          initApp();
      }
  });

  // Password Reset
  resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alert('Password reset feature requires Supabase Functions for OTP in production.');
  });

  /* ===================== THEME TOGGLE ===================== */
  themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
  });

  /* ===================== PROFILE ===================== */
  async function initProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser = user;
      if (!user) authModal.classList.remove('hidden');
      else {
          userAvatar.src = user.user_metadata.avatar_url || 'https://via.placeholder.com/40';
          subscribeToOnlineStatus();
      }
  }

  /* ===================== FEED & POSTS ===================== */
  postSubmitBtn.addEventListener('click', async () => {
      const content = postContent.value;
      if (!content) return alert('Post cannot be empty.');
      let media_urls = [];
      if (postMedia.files.length > 0) {
          for (let file of postMedia.files) {
              const { data, error } = await supabase.storage
                  .from('post_media')
                  .upload(`public/${currentUser.id}/${Date.now()}_${file.name}`, file);
              if (error) console.error(error);
              else media_urls.push(data.path);
          }
      }
      const { data, error } = await supabase
          .from('posts')
          .insert([{ user_id: currentUser.id, content, media_urls }]);
      if (error) alert(error.message);
      else {
          postContent.value = '';
          postMedia.value = '';
          alert('Post created!');
      }
  });

  async function loadFeed() {
      const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
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

  // Real-time posts
  supabase.channel('public:posts').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => loadFeed()).subscribe();

  /* ===================== CONNECTIONS & PROPOSALS ===================== */
  async function loadConnections() {
      const { data } = await supabase
          .from('connections')
          .select('*')
          .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`);
      connectionsList.innerHTML = data.map(c => `<div class="connection-card">${c.status}</div>`).join('');
  }

  async function loadProposals() {
      const { data } = await supabase
          .from('proposals')
          .select('*')
          .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`);
      proposalsList.innerHTML = data.map(p => `<div class="proposal-card">${p.status}</div>`).join('');
  }

  // Real-time connections/proposals
  supabase.channel('public:proposals_connections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, payload => {
          updateNotificationCounts(); loadProposals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, payload => {
          updateNotificationCounts(); loadConnections();
      })
      .subscribe();

  /* ===================== MESSAGING ===================== */
  chatSendBtn.addEventListener('click', async () => {
      const content = chatInput.value;
      if (!content) return;
      const { data, error } = await supabase.from('messages').insert([
          { from_user_id: currentUser.id, to_user_id: 'TARGET_USER_ID', content }
      ]);
      if (error) console.error(error);
      else chatInput.value = '';
  });

  async function loadMessages() {
      const { data } = await supabase.from('messages')
          .select('*')
          .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`);
      chatContainer.innerHTML = data.map(m => `
          <div class="chat-message ${m.from_user_id === currentUser.id ? 'self' : ''}">${m.content}</div>
      `).join('');
  }

  supabase.channel('public:messagesRealtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => loadMessages())
      .subscribe();

  /* ===================== GROUPS ===================== */
  createGroupBtn.addEventListener('click', async () => {
      const name = newGroupName.value;
      if (!name) return alert('Group name required');
      const { data, error } = await supabase.from('groups').insert([{ name, creator_id: currentUser.id }]);
      if (error) console.error(error);
      else { newGroupName.value = ''; loadGroups(); }
  });

  async function loadGroups() {
      const { data } = await supabase.from('groups').select('*');
      groupsList.innerHTML = data.map(g => `<div class="group-card">${g.name}</div>`).join('');
  }

  /* ===================== ONLINE STATUS ===================== */
  function subscribeToOnlineStatus() {
      console.log('Subscribed to online status');
  }

  /* ===================== NOTIFICATIONS ===================== */
  async function updateNotificationCounts() {
      const { data: proposals } = await supabase
          .from('proposals')
          .select('*')
          .eq('to_user_id', currentUser.id)
          .eq('status', 'pending');
      const { data: connections } = await supabase
          .from('connections')
          .select('*')
          .eq('to_user_id', currentUser.id)
          .eq('status', 'pending');
      const total = (proposals?.length || 0) + (connections?.length || 0);
      notificationBadge.textContent = total;
      notificationBadge.style.display = total ? 'flex' : 'none';
  }

  /* ===================== INITIALIZE APP ===================== */
  async function initApp() {
      await initProfile();
      loadFeed();
      loadConnections();
      loadProposals();
      loadMessages();
      loadGroups();
      updateNotificationCounts();
  }

  // Check session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) authModal.classList.remove('hidden');
  else initApp();

});
