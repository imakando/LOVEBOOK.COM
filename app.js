// app.js
import { supabase } from './supabase-config.js';

/* ===================== AUTHENTICATION ===================== */

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
        alert('Registered successfully! Check email to confirm.');
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

// Password Reset (simplified: using security answer + OTP simulation)
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert('Password reset feature will use Supabase Functions for OTP in production.');
});

/* ===================== THEME TOGGLE ===================== */
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
});

/* ===================== PROFILE ===================== */
const userAvatar = document.getElementById('userAvatar');
let currentUser;

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
const postSubmitBtn = document.getElementById('postSubmitBtn');
const postContent = document.getElementById('postContent');
const postMedia = document.getElementById('postMedia');
const postsFeed = document.getElementById('postsFeed');

postSubmitBtn.addEventListener('click', async () => {
    const content = postContent.value;
    if (!content) return alert('Post cannot be empty.');

    // Handle media upload if any
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

// Real-time feed subscription
supabase
    .channel('public:posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
        loadFeed();
    })
    .subscribe();

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

/* ===================== CONNECTIONS & PROPOSALS ===================== */
const connectionsList = document.getElementById('connectionsList');
const proposalsList = document.getElementById('proposalsList');

async function loadConnections() {
    const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`);
    if (error) console.error(error);
    else connectionsList.innerHTML = data.map(c => `<div class="connection-card">${c.status}</div>`).join('');
}

async function loadProposals() {
    const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`);
    if (error) console.error(error);
    else proposalsList.innerHTML = data.map(p => `<div class="proposal-card">${p.status}</div>`).join('');
}

/* ===================== MESSAGING ===================== */
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

chatSendBtn.addEventListener('click', async () => {
    const content = chatInput.value;
    if (!content) return;
    const { data, error } = await supabase.from('messages').insert([
        { from_user_id: currentUser.id, to_user_id: 'TARGET_USER_ID', content }
    ]);
    if (error) console.error(error);
    else chatInput.value = '';
});

supabase
    .channel('public:messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        loadMessages();
    })
    .subscribe();

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

/* ===================== GROUPS ===================== */
const groupsList = document.getElementById('groupsList');
const createGroupBtn = document.getElementById('createGroupBtn');
const newGroupName = document.getElementById('newGroupName');

createGroupBtn.addEventListener('click', async () => {
    const name = newGroupName.value;
    if (!name) return alert('Group name required');
    const { data, error } = await supabase.from('groups').insert([{ name, creator_id: currentUser.id }]);
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

/* ===================== ONLINE STATUS ===================== */
function subscribeToOnlineStatus() {
    // Simulate online status updates for now
    console.log('Subscribed to online status (real-time via Supabase in production)');
}

/* ===================== INITIALIZE APP ===================== */
async function initApp() {
    await initProfile();
    loadFeed();
    loadConnections();
    loadProposals();
    loadMessages();
    loadGroups();
}

// Check if user is logged in on page load
window.addEventListener('load', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) authModal.classList.remove('hidden');
    else initApp();
});

/* ===================== REAL-TIME NOTIFICATIONS ===================== */
const notificationBadge = document.getElementById('notificationBadge');
const messagesBadge = document.getElementById('messagesBadge');

async function updateNotificationCounts() {
    // New proposals or connections
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

    const totalNotifications = (proposals?.length || 0) + (connections?.length || 0);
    notificationBadge.textContent = totalNotifications;
    notificationBadge.style.display = totalNotifications ? 'flex' : 'none';
}

// Real-time subscription to proposals and connections
supabase
    .channel('public:proposals_connections')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, payload => {
        updateNotificationCounts();
        loadProposals(); // refresh UI
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, payload => {
        updateNotificationCounts();
        loadConnections(); // refresh UI
    })
    .subscribe();

/* ===================== REAL-TIME COMMENTS & LIKES ===================== */
async function loadPostReactions(postId) {
    const { data: reactions } = await supabase
        .from('reactions')
        .select('*')
        .eq('post_id', postId);
    return reactions || [];
}

async function loadPostComments(postId) {
    const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId);
    return comments || [];
}

// Subscribe to reactions
supabase
    .channel('public:reactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, payload => {
        loadFeed(); // refresh posts feed to show updated reactions
    })
    .subscribe();

// Subscribe to comments
supabase
    .channel('public:comments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, payload => {
        loadFeed(); // refresh posts feed to show updated comments
    })
    .subscribe();

/* ===================== REAL-TIME MESSAGES ===================== */
supabase
    .channel('public:messagesRealtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        loadMessages();
        messagesBadge.textContent = chatContainer.childElementCount;
        messagesBadge.style.display = chatContainer.childElementCount ? 'flex' : 'none';
    })
    .subscribe();

/* ===================== REAL-TIME GROUP FEED ===================== */
supabase
    .channel('public:groupsPosts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_posts' }, payload => {
        loadGroups(); // refresh group feeds
    })
    .subscribe();

/* ===================== INITIALIZE REAL-TIME UPDATES ===================== */
function initRealtimeUpdates() {
    updateNotificationCounts();
    loadFeed();
    loadConnections();
    loadProposals();
    loadMessages();
    loadGroups();
}

// Call this after initApp
initRealtimeUpdates();

