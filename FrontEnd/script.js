// ====================== INITIALIZATION ======================
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on login page
    if (document.getElementById('loginForm')) {
        setupLoginPage();
    }
    // Check if we're on registration page
    else if (document.getElementById('registerForm')) {
        setupRegisterPage();
    }
    // Check if we're on profile page
    if (document.querySelector('.profile-page')) {
        checkAuth();
        setupProfileSection();
    }
    // Check if we're on dashboard
    if (document.querySelector('.dashboard')) {
        checkAuth();
        const userRole = sessionStorage.getItem('user_role');
        if (userRole !== 'ADMIN') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            showSystemMessage('Access denied: Admins only', 'error');
            window.location.href = 'profile.html';
            return;
        }
        setupDashboard();
    }

    if (document.querySelector('.profile-page')) {
        checkAuth();
        const userRole = sessionStorage.getItem('user_role');
        if (userRole !== 'ADMIN') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            return;
        }
    }
});

// ====================== LOGIN PAGE ======================
function setupLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate inputs
        if (!loginEmail.value || !loginPassword.value) {
            showSystemMessage('Please fill in all fields', 'error');
            return;
        }

        // Start authentication process
        authenticateUser(loginEmail.value, loginPassword.value);
    });
}

// ====================== REGISTRATION PAGE ======================
function setupRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    const registerName = document.getElementById('registerName');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate inputs
        if (!registerName.value || !registerEmail.value || !registerPassword.value) {
            showSystemMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: registerName.value,
                    email: registerEmail.value,
                    password: registerPassword.value
                })
            });
            const data = await response.json();
            if (response.ok) {
                showSystemMessage('Registration successful! Please check your email for verification.', 'success');
                setTimeout(() => {
                    createPortalEffect('login.html');
                }, 1500);
            } else {
                showSystemMessage(data.message || 'Registration failed', 'error');
            }
        } catch (err) {
            showSystemMessage('Registration error', 'error');
        }
    });
}

// ====================== AUTHENTICATION ======================
async function authenticateUser(email, password) {
    const loginBtn = document.querySelector('#loginForm button');

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<div class="spinner"></div> SYSTEM PROCESSING';

    // Add spinner styles
    const style = document.createElement('style');
    style.textContent = `
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #00ffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    try {
        const response = await fetch('http://localhost:3000/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            // Store tokens and user info as needed
            sessionStorage.setItem('access_token', data.access_token);
            sessionStorage.setItem('refresh_token', data.refresh_token);

            // Decode JWT to get user role
            const payload = JSON.parse(atob(data.access_token.split('.')[1]));
            sessionStorage.setItem('user_role', payload.role); // or payload.isAdmin

            // Optionally fetch user profile here and store it
            showSystemMessage('Welcome!', 'success');
            createPortalEffect('index.html');
        } else {
            showSystemMessage(data.message || 'Invalid credentials', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    } catch (err) {
        showSystemMessage('Login error', 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    } finally {
        style.remove();
    }
}

// ====================== DASHBOARD ======================
function checkAuth() {
    const accessToken = sessionStorage.getItem('access_token');
        if (!accessToken) {
            showSystemMessage('Please login first', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);
            return;
    }
}

function setupDashboard() {
    // Setup logout functionality
    const logoutBtn = document.querySelector('[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Always setup camera (for testing)
    setupCamera();

    // Fetch and display users in the dashboard
    const accessToken = sessionStorage.getItem('access_token');
    fetch('http://localhost:3000/face/users', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
        .then(res => res.json())
        .then(data => {
            const attendanceList = document.getElementById('attendanceList');
            if (!attendanceList) return;

            attendanceList.innerHTML = ''; // Clear any existing entries

            data.forEach(user => {
                const userItem = document.createElement('li');
                userItem.setAttribute('data-user-id', user.id);  // Store user ID for easy reference

                userItem.innerHTML = `
                    <span class="name">${user.name}</span>
                    <span class="status">✗</span>
                    <span class="time"></span>
                    <span class="confidence"></span>
                `;

                attendanceList.appendChild(userItem);
            });
        })
        .catch(err => {
            console.error("Failed to fetch users:", err);
        });
}

// ====================== REAL-TIME FACE RECOGNITION ======================
function setupCamera() {
    console.log("Setting up camera...");
    const cameraSection = document.querySelector('.camera-section');

    if (!cameraSection) {
        console.error("Camera section not found!");
        return;
    }
    cameraSection.innerHTML = `
        <h2>Face Recognition</h2>
        <div class="video-container">
            <video autoplay playsinline></video>
            <canvas style="display:none;"></canvas>
        </div>
        <button id="startRecognition">Start Recognition</button>
        <div class="recognition-result"></div>
    `;

    const video = cameraSection.querySelector('video');
    const canvas = cameraSection.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const resultDiv = cameraSection.querySelector('.recognition-result');
    const startBtn = cameraSection.querySelector('#startRecognition');

    // Set canvas size
    video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    });
    // Start camera
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            cameraSection.innerHTML += `
                <p class="error">Camera Error: ${err.message}</p>
                <p>Make sure you've granted camera permissions</p>
            `;
        });

    let isRecognizing = false;
    let interval;

    startBtn.addEventListener('click', () => {
        if (isRecognizing) {
            clearInterval(interval);
            startBtn.textContent = 'Start Recognition';
            resultDiv.innerHTML = '';
        } else {
            startBtn.textContent = 'Stop Recognition';
            resultDiv.innerHTML = '<div class="spinner">Processing...</div>';

            interval = setInterval(async () => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    formData.append('image', blob, 'frame.jpg');
                    const accessToken = sessionStorage.getItem('access_token');
                    try {
                        const response = await fetch('http://localhost:3000/face/recognize', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`
                            },
                            body: formData
                        });

                        const data = await response.json();
                        if (data.success) {
                            resultDiv.innerHTML = `
                                <h3>✅ RECOGNIZED: ${data.user.name}</h3>
                                <p>⏱️ Time: ${data.attendance.formattedDateTime}</p>
                                <p>🔒 Confidence: ${Math.round(100 - data.confidence)}%</p>
                            `;

                            // Now, update the user's status in the attendance list
                            const userItem = document.querySelector(`li[data-user-id="${data.user.id}"]`);
                            if (userItem) {
                                const statusSpan = userItem.querySelector('.status');
                                const timeSpan = userItem.querySelector('.time');
                                const confidenceSpan = userItem.querySelector('.confidence');

                                // Update the status to '✓', time, and confidence
                                statusSpan.textContent = '✓';
                                timeSpan.textContent = `⏱️ ${data.attendance.formattedDateTime}`;
                                confidenceSpan.textContent = `🔒 Confidence: ${Math.round(100 - data.confidence)}%`;
                            }
                        } else {
                            resultDiv.innerHTML = `<p class="error">❌ ${data.error || 'Recognition failed'}</p>`;
                        }
                    } catch (error) {
                        resultDiv.innerHTML = `<p class="error">🚨 Error: ${error.message}</p>`;
                    }
                }, 'image/jpeg', 0.8);
            }, 2000);
        }
        isRecognizing = !isRecognizing;
    });
}

function logout() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    createPortalEffect('login.html');
}

// ====================== UI EFFECTS ======================
function createPortalEffect(destination) {
    document.body.innerHTML = `
        <div class="portal-transition">
            <div class="portal-gate"></div>
            <p class="portal-text">${destination === 'index.html' ? 'ENTERING SHADOW REALM' : 'RETURNING TO LOGIN'}</p>
        </div>
    `;

    // Add portal styles
    const style = document.createElement('style');
    style.textContent = `
        .portal-transition {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #0f0c29;
            z-index: 1000;
        }
        .portal-gate {
            width: 100px;
            height: 100px;
            border: 3px solid #00ffff;
            border-radius: 50%;
            box-shadow: 0 0 30px #00ffff, inset 0 0 20px #00ffff;
            animation: gateExpand 1.5s forwards;
            position: relative;
        }
        .portal-gate::before {
            content: "";
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border: 2px dashed #7b2cbf;
            border-radius: 50%;
            animation: rotate 10s linear infinite;
        }
        .portal-text {
            margin-top: 30px;
            color: #00ffff;
            font-family: 'Orbitron', sans-serif;
            text-shadow: 0 0 10px #00ffff;
            letter-spacing: 2px;
            animation: textPulse 1.5s infinite;
        }
        @keyframes gateExpand {
            0% { transform: scale(0.1); opacity: 0; }
            50% { transform: scale(1); opacity: 1; }
            100% { transform: scale(30); opacity: 0; }
        }
        @keyframes rotate {
            to { transform: rotate(360deg); }
        }
        @keyframes textPulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    window.location.href = destination;
    
}

function showSystemMessage(message, type) {
    const messageBox = document.createElement('div');
    messageBox.className = `system-message ${type}`;
    messageBox.textContent = message;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .system-message {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 4px;
            font-weight: bold;
            z-index: 100;
            animation: messageFade 3s forwards;
            font-family: 'Orbitron', sans-serif;
            letter-spacing: 1px;
        }
        .system-message.success {
            background: rgba(0, 255, 255, 0.2);
            border: 1px solid #00ffff;
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }
        .system-message.error {
            background: rgba(255, 0, 100, 0.2);
            border: 1px solid #ff0064;
            color: #ff0064;
            text-shadow: 0 0 10px #ff0064;
            box-shadow: 0 0 20px rgba(255, 0, 100, 0.3);
        }
        @keyframes messageFade {
            0% { opacity: 0; top: 0; }
            10% { opacity: 1; top: 20px; }
            90% { opacity: 1; top: 20px; }
            100% { opacity: 0; top: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(messageBox);

    // Remove after animation
    setTimeout(() => {
        messageBox.remove();
        style.remove();
    }, 3000);
}

// ====================== PROFILE SECTION ======================
function setupProfileSection() {
    const accessToken = sessionStorage.getItem('access_token');
    fetch('http://localhost:3000/auth/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(res => res.json())
    .then(user => {
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;
        const profilePhoto = document.getElementById('profilePhoto');
        const faceUploadForm = document.getElementById('faceUploadForm');
        const photoUrl = `http://localhost:3000/faces/${user.id}.jpg`;
        // Check if the photo exists before showing
        fetch(photoUrl, { method: 'HEAD' })
            .then(res => {
                if (res.ok) {
                    profilePhoto.src = photoUrl;
                    profilePhoto.style.display = 'block';
                    faceUploadForm.style.display = 'none'; // Hide upload form if photo exists
                } else {
                    profilePhoto.style.display = 'none';
                    faceUploadForm.style.display = 'block'; // Show upload form if no photo
                }
            });
    })
    .catch(() => {
        document.getElementById('profileName').textContent = 'Error';
        document.getElementById('profileEmail').textContent = 'Error';
    });

    const faceUploadForm = document.getElementById('faceUploadForm');
    const facePhoto = document.getElementById('facePhoto');
    const faceUploadStatus = document.getElementById('faceUploadStatus');

    faceUploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!facePhoto.files[0]) {
            faceUploadStatus.textContent = 'Please select a photo.';
            return;
        }
        const formData = new FormData();
        formData.append('image', facePhoto.files[0]);
        faceUploadStatus.textContent = 'Uploading...';

        try {
            const response = await fetch('http://localhost:3000/face/register', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                faceUploadStatus.textContent = 'Face registered successfully!';
                setupProfileSection(); // <--- Add this line
            } else {
                faceUploadStatus.textContent = data.message || 'Registration failed.';
            }
        } catch (err) {
            faceUploadStatus.textContent = 'Error uploading photo.';
        }
    });
}