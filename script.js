// --- SETUP KONFIGURASI ---
const API_URL = 'chat-app-api-puce.vercel.app'; // Ganti dengan URL API Vercel kamu
const CLOUD_NAME = 'drbujyon1'; // Sudah diisi dengan Cloud Name kamu
const UPLOAD_PRESET = 'chat_preset'; // Pastikan nama ini sama dengan yang di Cloudinary

// Dapatkan elemen-elemen dari DOM
const usernameModal = document.getElementById('username-modal');
const usernameForm = document.getElementById('username-form');
const usernameInput = document.getElementById('username-input');
const userDisplay = document.getElementById('user-display');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const mediaInput = document.getElementById('media-input');
const mediaPreviewContainer = document.getElementById('media-preview-container');
const messagesList = document.getElementById('messages');

let myUsername = '';
let selectedMediaFile = null;

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
    userDisplay.textContent = `Kamu login sebagai: ${username}`;
    usernameModal.style.display = 'none';
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

// --- FUNGSI CHAT ---
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();
    if (!myUsername) return;

    let mediaUrl = null;
    let mediaType = null;

    // Jika ada file, upload dulu ke Cloudinary
    if (selectedMediaFile) {
        try {
            const formData = new FormData();
            formData.append('file', selectedMediaFile);
            formData.append('upload_preset', UPLOAD_PRESET);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Gagal upload ke Cloudinary');
            
            const data = await response.json();
            mediaUrl = data.secure_url;
            mediaType = data.resource_type;

        } catch (error) {
            console.error('Error uploading media:', error);
            alert('Gagal mengupload media. Coba lagi.');
            return;
        }
    }

    // Kirim pesan ke API kita
    if (messageText || mediaUrl) {
        try {
            const response = await fetch(`${API_URL}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: myUsername,
                    text: messageText,
                    mediaUrl: mediaUrl,
                    mediaType: mediaType
                }),
            });

            if (!response.ok) throw new Error('Gagal mengirim pesan');
            
            // Reset form
            messageInput.value = '';
            mediaInput.value = '';
            selectedMediaFile = null;
            clearMediaPreview();
            fetchMessages();

        } catch (error) {
            console.error('Error:', error);
            alert('Gagal mengirim pesan, coba lagi.');
        }
    }
});

// Fungsi untuk mengambil pesan
async function fetchMessages() {
    try {
        const response = await fetch(`${API_URL}/api/messages`);
        if (!response.ok) throw new Error('Gagal mengambil pesan');
        const messages = await response.json();
        
        messagesList.innerHTML = '';
        
        messages.forEach(msg => {
            const li = document.createElement('li');
            if (msg.username === myUsername) li.classList.add('own');
            
            const time = new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            let content = `<strong>${msg.username} - ${time}</strong>`;
            
            if (msg.text) content += msg.text;
            if (msg.media_url) {
                if (msg.media_type === 'image') {
                    content += `<img src="${msg.media_url}" alt="Image">`;
                } else if (msg.media_type === 'video') {
                    content += `<video src="${msg.media_url}" controls></video>`;
                }
            }
            
            li.innerHTML = content;
            messagesList.appendChild(li);
        });
        messagesList.scrollTop = messagesList.scrollHeight;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Polling setiap 3 detik
setInterval(fetchMessages, 3000);
if (myUsername) fetchMessages();