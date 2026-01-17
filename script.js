// Security: Disable right-click and developer tools
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

document.addEventListener('keydown', function(e) {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        return false;
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Only trigger if not in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    if (e.ctrlKey) {
        switch(e.key.toLowerCase()) {
            case 'h':
                e.preventDefault();
                showShortcutHelp();
                break;
            case 't':
                e.preventDefault();
                // Focus on tasks
                break;
            case 'm':
                e.preventDefault();
                toggleMessages();
                break;
            case 'c':
                e.preventDefault();
                // Show coin details
                break;
            case 'p':
                e.preventDefault();
                // Show profile
                break;
        }
    }
});

// Global state
let userData = {
    approved: false,
    name: '',
    email: '',
    coins: 0,
    tasks: [],
    messages: []
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already registered
    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
        userData = JSON.parse(savedUser);
        
        if (userData.approved) {
            showDashboard();
        } else {
            showWaitingSection();
        }
    }
    
    // Setup form submission
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }
    
    // Setup password strength
    const passwordInput = document.getElementById('userPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', updatePasswordStrength);
    }
    
    // Check for approval periodically
    if (!userData.approved) {
        checkApprovalStatus();
    }
});

// Registration handler
function handleRegistration(e) {
    e.preventDefault();
    
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('userRole').value;
    
    // Basic validation
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    if (!document.getElementById('agreeTerms').checked) {
        alert('You must agree to the terms!');
        return;
    }
    
    // Save user data
    userData = {
        approved: false,
        name: name,
        email: email,
        role: role,
        coins: 0,
        tasks: [],
        messages: [],
        registrationDate: new Date().toISOString()
    };
    
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Simulate sending data to admin panel
    sendDataToAdminPanel(userData);
    
    // Show waiting section
    showWaitingSection();
}

// Show waiting section
function showWaitingSection() {
    document.getElementById('registrationSection').classList.remove('active');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('waitingSection').classList.remove('hidden');
    document.getElementById('waitingSection').classList.add('active');
    
    // Update user name in waiting section
    document.querySelector('.waiting-message').innerHTML = 
        `Hello <strong>${userData.name}</strong>! Your account information has been submitted and is pending review.`;
}

// Show dashboard
function showDashboard() {
    document.getElementById('registrationSection').classList.remove('active');
    document.getElementById('waitingSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('active');
    
    // Update dashboard with user data
    updateDashboard();
}
// بعد سطر 154 (بعد localStorage.setItem('userData', JSON.stringify(userData));)

// ================ إضافة هذا الكود ================
// حفظ المستخدم في قائمة المسؤول
function saveUserToAdminPanel(userData) {
    // 1. حفظ في قائمة المستخدمين العامة
    const allUsers = JSON.parse(localStorage.getItem('adminUsers') || '[]');
    
    // التحقق إذا كان المستخدم موجود بالفعل
    const existingUser = allUsers.find(user => user.email === userData.email);
    
    if (!existingUser) {
        const newUser = {
            id: 'user_' + Date.now(),
            name: userData.name,
            email: userData.email,
            role: userData.role,
            profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=2c3e50&color=fff`,
            registrationDate: new Date().toISOString(),
            status: 'pending',
            coins: 0,
            tasks: [],
            messages: []
        };
        
        allUsers.push(newUser);
        localStorage.setItem('adminUsers', JSON.stringify(allUsers));
        
        // 2. حفظ في التسجيلات الجديدة
        const newRegistrations = JSON.parse(localStorage.getItem('userRegistrations') || '[]');
        newRegistrations.push(newUser);
        localStorage.setItem('userRegistrations', JSON.stringify(newRegistrations));
        
        // 3. إضافة إشعار للمسؤول
        addAdminNotification(userData);
        
        console.log('✅ تم حفظ المستخدم في لوحة الإدارة:', newUser);
    }
}

// إضافة إشعار للمسؤول
function addAdminNotification(userData) {
    const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
    
    notifications.push({
        id: 'notif_' + Date.now(),
        type: 'new_user',
        title: 'مستخدم جديد مسجل',
        message: `المستخدم ${userData.name} (${userData.email}) قام بالتسجيل و ينتظر الموافقة`,
        timestamp: new Date().toISOString(),
        read: false,
        userEmail: userData.email
    });
    
    localStorage.setItem('adminNotifications', JSON.stringify(notifications));
}
// ================ نهاية الكود المضاف ================

// ثم استدع الدالة بعد حفظ بيانات المستخدم
saveUserToAdminPanel(userData);

// Update dashboard
function updateDashboard() {
    document.getElementById('dashboardName').textContent = userData.name;
    document.getElementById('dashboardProfile').src = 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=2c3e50&color=fff&size=40`;
    document.getElementById('coinCount').textContent = userData.coins;
    
    // Update tasks
    updateTasksDisplay();
    
    // Update messages
    updateMessagesDisplay();
    
    // Update progress
    updateProgress();
}

// Password strength
function updatePasswordStrength() {
    const password = document.getElementById('userPassword').value;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let color = '#e74c3c';
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const width = (strength / 4) * 100;
    
    if (strength === 1) {
        strengthText.textContent = 'Weak';
        color = '#e74c3c';
    } else if (strength === 2) {
        strengthText.textContent = 'Fair';
        color = '#f39c12';
    } else if (strength === 3) {
        strengthText.textContent = 'Good';
        color = '#3498db';
    } else if (strength === 4) {
        strengthText.textContent = 'Strong';
        color = '#27ae60';
    } else {
        strengthText.textContent = 'None';
        color = '#e0e0e0';
    }
    
    strengthBar.style.background = `linear-gradient(to right, ${color} ${width}%, #e0e0e0 ${width}%)`;
}

// Simulate data sending to admin
function sendDataToAdminPanel(userData) {
    // In a real application, this would be an API call
    console.log('Sending user data to admin panel:', userData);
    
    // Simulate API call
    setTimeout(() => {
        console.log('User data received by admin panel');
        // Admin would review and approve/reject
    }, 1000);
}

// Check approval status (simulated)
function checkApprovalStatus() {
    // In a real app, this would check with server
    // For demo, we'll simulate approval after 10 seconds
    setTimeout(() => {
        // Check localStorage for admin approval
        const adminData = localStorage.getItem('adminApprovals');
        if (adminData) {
            const approvals = JSON.parse(adminData);
            const userEmail = userData.email;
            
            if (approvals[userEmail] === 'approved') {
                userData.approved = true;
                localStorage.setItem('userData', JSON.stringify(userData));
                showDashboard();
            }
        }
    }, 10000);
}

// Update tasks display
function updateTasksDisplay() {
    const tasksContainer = document.getElementById('tasksContainer');
    const noTasksMessage = document.getElementById('noTasksMessage');
    
    if (userData.tasks && userData.tasks.length > 0) {
        noTasksMessage.style.display = 'none';
        
        tasksContainer.innerHTML = userData.tasks.map(task => `
            <div class="task-item">
                <div class="task-header">
                    <div class="task-title">${task.title}</div>
                    <div class="task-priority priority-${task.priority}">${task.priority}</div>
                </div>
                <p>${task.description}</p>
                <div class="task-due">
                    <i class="fas fa-calendar-alt"></i>
                    Due: ${new Date(task.dueDate).toLocaleString()}
                </div>
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                    </div>
                    <div class="progress-text">${task.progress || 0}% complete</div>
                </div>
                ${task.completed ? 
                    '<div class="task-completed"><i class="fas fa-check-circle"></i> Completed</div>' :
                    '<button class="btn-sm" onclick="updateTaskProgress(\'' + task.id + '\')">Update Progress</button>'
                }
            </div>
        `).join('');
    } else {
        noTasksMessage.style.display = 'block';
    }
    
    // Update task stats
    const totalTasks = userData.tasks ? userData.tasks.length : 0;
    const completedTasks = userData.tasks ? userData.tasks.filter(t => t.completed).length : 0;
    
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('pendingTasks').textContent = totalTasks - completedTasks;
}

// Update messages display
function updateMessagesDisplay() {
    const messagesList = document.getElementById('messagesList');
    const messageBadge = document.getElementById('messageBadge');
    
    if (userData.messages && userData.messages.length > 0) {
        const unreadCount = userData.messages.filter(m => !m.read).length;
        messageBadge.textContent = unreadCount;
        
        messagesList.innerHTML = userData.messages.map(message => `
            <div class="message-item ${message.read ? '' : 'unread'}" onclick="markMessageAsRead('${message.id}')">
                <div class="message-sender">
                    <i class="fas fa-user-shield"></i> Administrator
                </div>
                <div class="message-time">${new Date(message.timestamp).toLocaleString()}</div>
                <div class="message-content">
                    <strong>${message.subject}</strong>
                    <p>${message.content}</p>
                </div>
            </div>
        `).join('');
    } else {
        messageBadge.textContent = '0';
        messagesList.innerHTML = '<p>No messages yet.</p>';
    }
}

// Update progress
function updateProgress() {
    const totalTasks = userData.tasks ? userData.tasks.length : 0;
    const completedTasks = userData.tasks ? userData.tasks.filter(t => t.completed).length : 0;
    
    const dailyProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overallProgress = userData.coins > 0 ? Math.min(userData.coins / 1000 * 100, 100) : 0;
    
    document.getElementById('dailyProgress').style.width = dailyProgress + '%';
    document.getElementById('dailyProgressText').textContent = Math.round(dailyProgress) + '%';
    
    document.getElementById('overallProgress').style.width = overallProgress + '%';
    document.getElementById('overallProgressText').textContent = Math.round(overallProgress) + '%';
}

// Toggle messages panel
function toggleMessages() {
    const panel = document.getElementById('messagesPanel');
    panel.classList.toggle('hidden');
}

// Mark message as read
function markMessageAsRead(messageId) {
    const message = userData.messages.find(m => m.id === messageId);
    if (message && !message.read) {
        message.read = true;
        localStorage.setItem('userData', JSON.stringify(userData));
        updateMessagesDisplay();
    }
}

// Update task progress
function updateTaskProgress(taskId) {
    const task = userData.tasks.find(t => t.id === taskId);
    if (task) {
        const newProgress = prompt('Enter progress percentage (0-100):', task.progress || 0);
        if (newProgress !== null) {
            const progress = parseInt(newProgress);
            if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                task.progress = progress;
                if (progress === 100) {
                    task.completed = true;
                    // Simulate admin notification
                    simulateAdminNotification(task);
                }
                localStorage.setItem('userData', JSON.stringify(userData));
                updateTasksDisplay();
                updateProgress();
            }
        }
    }
}

// Simulate admin notification
function simulateAdminNotification(task) {
    console.log('Task completed! Notifying admin...', task);
    
    // In real app, this would notify the admin
    // For demo, we'll add to admin notifications in localStorage
    const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
    adminNotifications.push({
        id: Date.now(),
        type: 'task_completed',
        userId: userData.email,
        taskId: task.id,
        taskTitle: task.title,
        timestamp: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('adminNotifications', JSON.stringify(adminNotifications));
}

// Keyboard shortcuts help
function showShortcutHelp() {
    document.getElementById('shortcutHelp').style.display = 'block';
}

function hideShortcutHelp() {
    document.getElementById('shortcutHelp').style.display = 'none';
}

// Simulate receiving messages from admin
function simulateMessageFromAdmin(subject, content) {
    if (!userData.messages) userData.messages = [];
    
    userData.messages.push({
        id: 'msg_' + Date.now(),
        subject: subject,
        content: content,
        timestamp: new Date().toISOString(),
        read: false
    });
    
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Update UI if on dashboard
    if (document.getElementById('dashboardSection').classList.contains('active')) {
        updateMessagesDisplay();
    }
}

// Simulate receiving tasks from admin
function simulateTaskFromAdmin(task) {
    if (!userData.tasks) userData.tasks = [];
    
    userData.tasks.push({
        id: 'task_' + Date.now(),
        ...task,
        progress: 0,
        completed: false
    });
    
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Update UI if on dashboard
    if (document.getElementById('dashboardSection').classList.contains('active')) {
        updateTasksDisplay();
    }
}

// Simulate receiving coins from admin
function simulateCoinsFromAdmin(amount, reason) {
    userData.coins = (userData.coins || 0) + amount;
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Show notification
    showNotification(`Received ${amount} coins for: ${reason}`);
    
    // Update UI if on dashboard
    if (document.getElementById('dashboardSection').classList.contains('active')) {
        document.getElementById('coinCount').textContent = userData.coins;
        updateProgress();
    }
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-bell"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = 
        `Last updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
}

// Update timestamp every minute
setInterval(updateLastUpdated, 60000);
updateLastUpdated();

// ============================================
// نظام صفحة المستخدم - مرتبط بلوحة التحكم
// ============================================

// التحقق من حالة الحساب
function checkAccountStatus() {
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) {
        // ليس لديه حساب
        return 'no_account';
    }
    
    // التحقق من الموافقات
    const approvals = JSON.parse(localStorage.getItem('adminApprovals') || '{}');
    const userApproval = approvals[userEmail];
    
    if (userApproval) {
        if (userApproval.status === 'approved') {
            // الحساب معتمد
            return 'approved';
        } else if (userApproval.status === 'rejected') {
            // الحساب مرفوض
            return 'rejected';
        }
    }
    
    // التحقق من الحذف
    const deletionNotice = JSON.parse(localStorage.getItem('accountDeletionNotice') || '{}');
    if (deletionNotice.email === userEmail) {
        return 'deleted';
    }
    
    // بانتظار الموافقة
    return 'pending';
}

// التحقق من الرفض
function checkRejection() {
    const rejectionData = JSON.parse(localStorage.getItem('userRejection') || '{}');
    
    if (rejectionData.showRejection && rejectionData.email === localStorage.getItem('userEmail')) {
        // إظهار رسالة الرفض
        showRejectionMessage(rejectionData.reason);
        
        // حذف بيانات الرفض
        localStorage.removeItem('userRejection');
        
        return true;
    }
    
    return false;
}

// التحقق من الحذف
function checkDeletion() {
    const deletionNotice = JSON.parse(localStorage.getItem('accountDeletionNotice') || '{}');
    const userEmail = localStorage.getItem('userEmail');
    
    if (deletionNotice.email === userEmail && deletionNotice.type === 'account_deleted') {
        // إظهار رسالة الحذف
        showAccountDeletedMessage();
        
        // حذف البيانات
        clearUserData();
        
        // حذف الإشعار
        localStorage.removeItem('accountDeletionNotice');
        
        return true;
    }
    
    return false;
}

// تحديث Dashboard بناءً على حالة الموافقة
function updateDashboardFromApproval() {
    const userEmail = localStorage.getItem('userEmail');
    const approvals = JSON.parse(localStorage.getItem('adminApprovals') || '{}');
    const userApproval = approvals[userEmail];
    
    if (userApproval && userApproval.status === 'approved') {
        // تحديث بيانات Dashboard
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        if (userApproval.coins) {
            userData.coins = userApproval.coins;
        }
        
        if (userApproval.date) {
            userData.approvalDate = userApproval.date;
        }
        
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // إظهار Dashboard
        showDashboard();
    }
}

// عرض رسالة الحساب المحذوف
function showAccountDeletedMessage() {
    // حذف جميع الأقسام
    hideAllSections();
    
    // إظهار رسالة الحذف
    document.body.innerHTML = `
        <div class="deleted-account-container">
            <div class="deleted-icon">
                <i class="fas fa-user-slash"></i>
            </div>
            <h2><i class="fas fa-trash-alt"></i> تم حذف حسابك</h2>
            <p class="deleted-message">تم حذف حسابك من قبل المسؤول. جميع بياناتك تم حذفها بشكل نهائي.</p>
            
            <div class="deleted-actions">
                <button onclick="goToRegistrationPage()" class="submit-btn">
                    <i class="fas fa-user-plus"></i> إنشاء حساب جديد
                </button>
            </div>
            
            <div class="deleted-note">
                <i class="fas fa-info-circle"></i> يمكنك إنشاء حساب جديد إذا كنت ترغب في الانضمام مرة أخرى.
            </div>
        </div>
    `;
    
    // إضافة الأنماط
    const style = document.createElement('style');
    style.textContent = `
        .deleted-account-container {
            max-width: 500px;
            margin: 100px auto;
            padding: 40px;
            text-align: center;
            background: linear-gradient(135deg, #2c3e50, #34495e);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            color: white;
        }
        
        .deleted-icon {
            font-size: 4rem;
            color: #e74c3c;
            margin-bottom: 20px;
        }
        
        .deleted-message {
            margin: 20px 0;
            line-height: 1.6;
            color: #ecf0f1;
        }
        
        .deleted-actions {
            margin: 30px 0;
        }
        
        .deleted-note {
            padding: 15px;
            background: rgba(231, 76, 60, 0.2);
            border-radius: 8px;
            color: #f1c40f;
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(style);
}

// الذهاب لصفحة التسجيل
function goToRegistrationPage() {
    clearUserData();
    window.location.reload();
}

// مسح بيانات المستخدم
function clearUserData() {
    const keysToRemove = [
        'userData',
        'userEmail',
        'userRegistered',
        'accountApproved',
        'userRejection',
        'accountDeletionNotice'
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
}

// تحديث تهيئة صفحة المستخدم
function initializeUserPage() {
    // التحقق من الحذف أولاً
    if (checkDeletion()) {
        return;
    }
    
    // التحقق من الرفض
    if (checkRejection()) {
        return;
    }
    
    // التحقق من حالة الحساب
    const status = checkAccountStatus();
    
    switch(status) {
        case 'approved':
            updateDashboardFromApproval();
            break;
        case 'rejected':
            // الرفض تم التعامل معه في checkRejection
            break;
        case 'deleted':
            // الحذف تم التعامل معه في checkDeletion
            break;
        case 'pending':
            // بانتظار الموافقة
            const isRegistered = localStorage.getItem('userRegistered');
            if (isRegistered === 'true') {
                showWaitingSection();
            } else {
                showRegistrationSection();
            }
            break;
        default:
            showRegistrationSection();
    }
}

// استبدل تهيئة الصفحة الأصلية بهذه
document.addEventListener('DOMContentLoaded', function() {
    initializeUserPage();
    // ... باقي الكود
});

// مسح جميع بيانات localStorage
localStorage.removeItem('userData');
localStorage.removeItem('userEmail');
localStorage.removeItem('userRegistered');
localStorage.removeItem('adminUsers');
localStorage.removeItem('adminNotifications');
localStorage.removeItem('adminApprovals');
localStorage.removeItem('adminRejections');
localStorage.removeItem('pendingUsers');
localStorage.removeItem('userRegistrations');
localStorage.removeItem('accountDeletionNotice');
localStorage.removeItem('userRejection');

// تأكيد المسح
console.log('✅ تم مسح جميع المستخدمين والبيانات');
console.log('📊 حالة النظام الآن:');
console.log('- userData:', localStorage.getItem('userData'));
console.log('- adminUsers:', localStorage.getItem('adminUsers'));
