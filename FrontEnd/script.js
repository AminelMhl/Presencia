// ====================== USER DATABASE ======================
let userDatabase = JSON.parse(localStorage.getItem('userDatabase')) || [
    // Default admin account
    {
        name: "Shadow Monarch",
        email: "admin@presencia.com",
        password: "admin123",
        isAdmin: false //Changed from true to false to be able to test camera for non-admin users until the authentication flow is set in the frontend
    }
];

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
    // Check if we're on dashboard
    else if (document.querySelector('.dashboard')) {
        checkAuth();
        setupDashboard();
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

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate inputs
        if (!registerName.value || !registerEmail.value || !registerPassword.value) {
            showSystemMessage('Please fill in all fields', 'error');
            return;
        }

        // Check if user already exists
        if (userDatabase.some(user => user.email === registerEmail.value)) {
            showSystemMessage('User already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            name: registerName.value,
            email: registerEmail.value,
            password: registerPassword.value,
            isAdmin: false
        };

        // Add to database
        userDatabase.push(newUser);
        localStorage.setItem('userDatabase', JSON.stringify(userDatabase));

        // Store session and redirect
        sessionStorage.setItem('currentUser', JSON.stringify({
            name: newUser.name,
            email: newUser.email,
            isAdmin: newUser.isAdmin,
            lastLogin: new Date().toISOString()
        }));

        showSystemMessage('Registration successful!', 'success');
        setTimeout(() => {
            createPortalEffect('index.html');
        }, 1500);
    });
}

// ====================== AUTHENTICATION ======================
function authenticateUser(email, password) {
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

    // Simulate server delay
    setTimeout(() => {
        const user = userDatabase.find(u => u.email === email && u.password === password);
        
        if (user) {
            // Store user session
            sessionStorage.setItem('currentUser', JSON.stringify({
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                lastLogin: new Date().toISOString()
            }));
            sessionStorage.setItem('access_token', 'simulated_token'); // For demo purposes

            showSystemMessage(`Welcome back, ${user.name}`, 'success');
            createPortalEffect('index.html');
        } else {
            showSystemMessage('Invalid credentials', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }

        // Remove spinner styles
        style.remove();
    }, 1500);
}

// ====================== DASHBOARD ======================
function checkAuth() {
    const currentUser = sessionStorage.getItem('currentUser');
    
    if (!currentUser) {
        showSystemMessage('Please login first', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    // Show admin elements if user is admin
    const user = JSON.parse(currentUser);
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = user.isAdmin ? 'block' : 'none';
    });
}

function setupDashboard() {
    // Setup logout functionality
    const logoutBtn = document.querySelector('[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Get current user
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // Always setup camera (for testing)
    setupCamera();
    // Setup camera for non-admin users
    if (!currentUser.isAdmin) {
        setupCamera();
    } else {
        // Admin gets the simulation button
        const simulateBtn = document.querySelector('.camera-section button');
        if (simulateBtn) {
            simulateBtn.addEventListener('click', simulateCheckIn);
        }
    }

    // Fetch and display users in the dashboard
fetch('http://localhost:3000/face/users')
    .then(res => {
        console.log('Fetch response:', res);
        return res.json();
    })
    .then(data => {
        console.log(data);
        const attendanceList = document.getElementById('attendanceList');
        if (!attendanceList) return;

        attendanceList.innerHTML = ''; // Clear any existing entries

        data.forEach(user => {
            const userItem = document.createElement('li');
            userItem.setAttribute('data-user-id', user.id);  // Store user ID for easy reference

            userItem.innerHTML = `
                <span class="name">${user.name}</span>
                <span class="status">✗</span> <!-- Initially marked as '✗' (not present) -->
                <span class="time"></span> <!-- Empty time, will be filled after recognition -->
                <span class="confidence"></span> <!-- Empty confidence, will be filled after recognition -->
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
            console.log("Camera access granted");
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                console.log(`Video ready: ${video.videoWidth}x${video.videoHeight}`);
            };
        })
        .catch(err => {
            console.error("Camera error:", err);
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
                    
                    try {
                        const response = await fetch('http://localhost:3000/face/recognize', {
                            method: 'POST',
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
                                statusSpan.textContent = '✓';  // Mark as present
                                timeSpan.textContent = `⏱️ ${data.attendance.formattedDateTime}`;  // Display time
                                confidenceSpan.textContent = `🔒 Confidence: ${Math.round(100 - data.confidence)}%`;  // Display confidence
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

function simulateCheckIn() {
    const attendanceList = document.getElementById('attendanceList');
    const uncheckedItems = Array.from(attendanceList.children)
        .filter(item => !item.querySelector('.status').classList.contains('checked'));

    if (uncheckedItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * uncheckedItems.length);
        const userItem = uncheckedItems[randomIndex];
        const status = userItem.querySelector('.status');
        
        // Animate check-in
        status.textContent = '...';
        status.style.color = '#4361ee';

        setTimeout(() => {
            status.textContent = '✓';
            status.classList.add('checked');
            status.style.color = '#4cc9f0';
            showSystemMessage('Check-in confirmed', 'success');
        }, 500);
    } else {
        showSystemMessage('All users checked in', 'success');
    }
}

function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('access_token');
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

    setTimeout(() => {
        window.location.href = destination;
    }, 2000);
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