// --- SETUP KONFIGURASI ---
const API_URL = 'https://chat-app-api-puce.vercel.app';
const CLOUD_NAME = 'drbujyon1';
const UPLOAD_PRESET = 'chat_preset';

// --- ELEMEN DOM ---
const usernameModal = document.getElementById('username-modal');
const usernameForm = document.getElementById('username-form');
const usernameInput = document.getElementById('username-input');
const userDisplay = document.getElementById('user-display');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const mediaInput = document.getElementById('media-input');
const mediaPreviewContainer = document.getElementById('media-preview-container');
const messagesList = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');

let myUsername = '';
let selectedMediaFile = null;
let lastMessageCount = 0;

// --- FUNGSI USERNAME ---
if (localStorage.getItem('chatUsername')) {
    myUsername = localStorage.getItem('chatUsername');
    setUsername(myUsername);
}
usernameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) {
        myUsername = username;
        localStorage.setItem('chatUsername', myUsername);
        setUsername(myUsername);
    }
});
function setUsername(username) {
    userDisplay.innerHTML = `<i class="fas fa-circle" style="color: #4caf50; font-size: 0.5rem;"></i> ${username}`;
    usernameModal.style.display = 'none';
    fetchMessages(); // Ambil pesan saat pertama login
}

// --- FUNGSI MEDIA ---
mediaInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedMediaFile = file;
        showMediaPreview(file);
    } else {
        selectedMediaFile = null;
        clearMediaPreview();
    }
});
function showMediaPreview(file) {
    clearMediaPreview();
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.createElement(file.type.startsWith('image/') ? 'img' : 'video');
        preview.src = e.target.result;
        if (preview.tagName === 'VIDEO') preview.controls = true;
        mediaPreviewContainer.appendChild(preview);
    };
    reader.readAsDataURL(file);
}
function clearMediaPreview() {
    mediaPreviewContainer.innerHTML = '';
}

// --- FUNGSI CHAT UTAMA ---
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();
    if (!myUsername || (!messageText && !selectedMediaFile)) return;

    // --- OPTIMISTIC UI: Tampilkan pesan langsung ---
    const tempId = Date.now();
    const tempMessage = {
        id: tempId,
        username: myUsername,
        text: messageText,
        media_url: null, // Akan diisi nanti
        media_type: null,
        created_at: new Date().toISOString(),
        isSending: true // Tandai sebagai sedang dikirim
    };
    addMessageToList(tempMessage);
    messageInput.value = '';
    clearMediaPreview();
    selectedMediaFile = null;
    sendButton.classList.add('sending');

    let mediaUrl = null;
    let mediaType = null;

    if (selectedMediaFile) {
        try {
            const formData = new FormData();
            formData.append('file', selectedMediaFile);
            formData.append('upload_preset', UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Gagal upload ke Cloudinary');
            const data = await response.json();
            mediaUrl = data.secure_url;
            mediaType = data.resource_type;
        } catch (error) {
            console.error('Error uploading media:', error);
            alert('Gagal mengupload media. Coba lagi.');
            sendButton.classList.remove('sending');
            removeMessageFromList(tempId); // Hapus pesan sementara jika gagal
            return;
        }
    }

    try {
        const response = await fetch(`${API_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: myUsername, text: messageText, mediaUrl, mediaType }),
        });
        if (!response.ok) throw new Error('Gagal mengirim pesan');
        
        // Update pesan sementara dengan status sukses
        updateMessageStatus(tempId, 'sent');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal mengirim pesan, coba lagi.');
        updateMessageStatus(tempId, 'failed');
    } finally {
        sendButton.classList.remove('sending');
    }
});

// --- FUNGSI MENAMBAH/MENGHAPUS/MEMPERBARUI PESAN DI LIST ---
function addMessageToList(message) {
    const li = document.createElement('li');
    li.dataset.id = message.id;
    if (message.username === myUsername) li.classList.add('own');
    
    const content = document.createElement('div');
    content.classList.add('message-content');

    const meta = document.createElement('div');
    meta.classList.add('message-meta');
    meta.innerHTML = `<span class="username">${message.username}</span><span class="time">${new Date(message.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>`;
    
    const text = document.createElement('div');
    text.classList.add('message-text');
    if (message.text) text.innerHTML = message.text;
    if (message.media_url) {
        if (message.media_type === 'image') {
            text.innerHTML += `<img src="${message.media_url}" alt="Image" loading="lazy">`;
        } else if (message.media_type === 'video') {
            text.innerHTML += `<video src="${message.media_url}" controls></video>`;
        }
    }

    content.appendChild(meta);
    content.appendChild(text);
    
    // Tambahkan status pengiriman untuk pesan sendiri
    if (message.isSending) {
        const status = document.createElement('span');
        status.classList.add('message-status');
        status.innerHTML = '<i class="fas fa-clock"></i> Mengirim...';
        content.appendChild(status);
    }
    if (message.status === 'sent') {
        const status = content.querySelector('.message-status');
        if(status) status.innerHTML = '<i class="fas fa-check-double"></i> Terkirim';
    }
    if (message.status === 'failed') {
        const status = content.querySelector('.message-status');
        if(status) status.innerHTML = '<i class="fas fa-exclamation-circle"></i> Gagal';
    }

    li.appendChild(content);
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
}

function removeMessageFromList(id) {
    const messageElement = document.querySelector(`li[data-id="${id}"]`);
    if (messageElement) {
        messageElement.remove();
    }
}

function updateMessageStatus(id, status) {
    const messageElement = document.querySelector(`li[data-id="${id}"]`);
    if (messageElement) {
        const statusEl = messageElement.querySelector('.message-status');
        if (status === 'sent') {
            statusEl.innerHTML = '<i class="fas fa-check-double"></i> Terkirim';
        } else if (status === 'failed') {
            statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Gagal';
        }
    }
}

// --- FUNGSI MENGAMBIL PESAN (DIOPTIMASI) ---
async function fetchMessages() {
    try {
        const response = await fetch(`${API_URL}/api/messages`);
        if (!response.ok) throw new Error('Gagal mengambil pesan');
        const messages = await response.json();
        
        // Optimasi: Hanya render jika ada pesan baru
        if (messages.length !== lastMessageCount) {
            messagesList.innerHTML = ''; // Kosongkan dulu
            messages.forEach(msg => addMessageToList(msg));
            lastMessageCount = messages.length;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// --- POLLING ---
setInterval(fetchMessages, 3000);