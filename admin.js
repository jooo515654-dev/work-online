// ============================================
// نظام إدارة المستخدمين - لوحة التحكم
// مرتبط مع صفحة المستخدم
// ============================================

// البيانات المخزنة في localStorage
const STORAGE_KEYS = {
    USERS: 'adminUsers',
    USER_REGISTRATIONS: 'userRegistrations',
    TASKS: 'adminTasks',
    MESSAGES: 'adminMessages',
    PAYMENTS: 'adminPayments',
    USER_DASHBOARDS: 'userDashboards'
};

// بيانات إدارة الحسابات
let adminAccounts = {
    approvedAccounts: {},
    rejectedAccounts: {},
    pendingAccounts: {},
    deletedAccounts: {}
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
    loadAdminAccounts();
    checkNewRegistrations();
    setupEventListeners();
});

// تهيئة لوحة التحكم
function initializeAdminPanel() {
    // إعداد التنقل بين الأقسام
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
            
            // تحديث الحالة النشطة
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // زر تحديث البيانات
    document.getElementById('refreshData').addEventListener('click', function() {
        checkNewRegistrations();
        loadUsersData();
        showToast('تم تحديث البيانات بنجاح', 'success');
    });
    
    // فلتر المستخدمين
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('change', function() {
            filterUsersTable(this.value);
        });
    }
    
    // تحميل الإحصائيات
    updateDashboardStats();
}

// إعداد المستمعين للأحداث
function setupEventListeners() {
    // البحث عن المستخدمين
    const adminSearch = document.getElementById('adminSearch');
    if (adminSearch) {
        adminSearch.addEventListener('input', function(e) {
            searchUsers(e.target.value);
        });
    }
    
    // نموذج المهام
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskAssignment);
    }
    
    // نموذج الرسائل
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', handleSendMessage);
    }
    
    // نموذج توزيع العملات
    const coinForm = document.getElementById('coinDistributionForm');
    if (coinForm) {
        coinForm.addEventListener('submit', handleCoinDistribution);
    }
}

// تحميل حسابات الإدارة
function loadAdminAccounts() {
    // تحميل الحسابات المحفوظة
    const savedAccounts = localStorage.getItem('adminAccounts');
    if (savedAccounts) {
        adminAccounts = JSON.parse(savedAccounts);
    }
    
    // تحميل المستخدمين من localStorage
    loadUsersData();
}

// التحقق من تسجيلات جديدة
function checkNewRegistrations() {
    // التحقق من تسجيلات المستخدمين الجدد
    const userRegistrations = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_REGISTRATIONS) || '[]');
    const existingUsers = getAllUsers();
    
    let newRegistrations = 0;
    
    userRegistrations.forEach(registration => {
        // التحقق إذا كان المستخدم موجوداً مسبقاً
        const existingUser = existingUsers.find(u => u.email === registration.email);
        
        if (!existingUser) {
            // إضافة مستخدم جديد
            addUserFromRegistration(registration);
            newRegistrations++;
        }
    });
    
    if (newRegistrations > 0) {
        showToast(`تم اكتشاف ${newRegistrations} تسجيل جديد`, 'info');
        updateUsersTable();
    }
}

// إضافة مستخدم من التسجيل
function addUserFromRegistration(registration) {
    const users = getAllUsers();
    
    const newUser = {
        id: 'user_' + Date.now(),
        name: registration.name || 'مستخدم جديد',
        email: registration.email || '',
        role: registration.role || 'user',
        profilePic: registration.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(registration.name || 'User')}&background=2c3e50&color=fff`,
        registrationDate: new Date().toISOString(),
        status: 'pending',
        coins: 0,
        tasks: [],
        messages: [],
        activity: [{
            type: 'registration',
            message: 'تم تسجيل الحساب',
            timestamp: new Date().toISOString()
        }]
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // حفظ في حسابات الإدارة
    adminAccounts.pendingAccounts[newUser.email] = newUser;
    saveAdminAccounts();
    
    return newUser;
}

// حفظ حسابات الإدارة
function saveAdminAccounts() {
    localStorage.setItem('adminAccounts', JSON.stringify(adminAccounts));
}

// ============================================
// نظام إدارة المستخدمين
// ============================================

// الحصول على جميع المستخدمين
function getAllUsers() {
    const usersJSON = localStorage.getItem(STORAGE_KEYS.USERS);
    return usersJSON ? JSON.parse(usersJSON) : [];
}

// حفظ بيانات المستخدمين
function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

// تحميل بيانات المستخدمين
function loadUsersData() {
    const users = getAllUsers();
    updateUsersTable(users);
    updateDashboardStats(users);
    return users;
}

// تحديث جدول المستخدمين
function updateUsersTable(users = null) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    const allUsers = users || getAllUsers();
    
    if (allUsers.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data">
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-user-slash"></i>
                        <h4>لا توجد بيانات مستخدمين</h4>
                        <p>سيظهر المستخدمون هنا بمجرد تسجيلهم</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allUsers.map((user, index) => `
        <tr data-user-id="${user.id}" class="user-row status-${user.status}" data-email="${user.email}">
            <td class="text-center serial-number">
                <div class="serial-box">${index + 1}</div>
            </td>
            
            <td class="profile-cell">
                <div class="user-profile-compact">
                    <div class="profile-img-admin">
                        <img src="${user.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2c3e50&color=fff'}" 
                             alt="${user.name}" class="profile-avatar">
                        ${getStatusBadge(user.status)}
                    </div>
                    <div class="profile-info-mini">
                        <div class="user-id">ID: ${user.id.substring(0, 8)}...</div>
                    </div>
                </div>
            </td>
            
            <td class="info-cell">
                <div class="user-info-admin">
                    <h4 class="user-name">
                        <i class="fas fa-user"></i> ${user.name}
                        ${user.role ? `<span class="user-role-badge">${getRoleName(user.role)}</span>` : ''}
                    </h4>
                    <div class="user-details-grid">
                        <div class="detail-item">
                            <i class="fas fa-envelope"></i>
                            <div>
                                <span class="detail-label">البريد الإلكتروني</span>
                                <span class="detail-value">${user.email}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-coins"></i>
                            <div>
                                <span class="detail-label">العملات</span>
                                <span class="detail-value coins-count">${user.coins || 0}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-tasks"></i>
                            <div>
                                <span class="detail-label">المهام</span>
                                <span class="detail-value">${user.tasks?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            
            <td class="registration-cell">
                <div class="registration-details">
                    <div class="detail-card">
                        <div class="detail-header">
                            <i class="fas fa-calendar-alt"></i>
                            <span>تاريخ التسجيل</span>
                        </div>
                        <div class="detail-content">
                            ${formatDateTime(user.registrationDate)}
                        </div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-header">
                            <i class="fas fa-history"></i>
                            <span>آخر نشاط</span>
                        </div>
                        <div class="detail-content">
                            ${getLastActivity(user.activity)}
                        </div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-header">
                            <i class="fas fa-info-circle"></i>
                            <span>الحالة الحالية</span>
                        </div>
                        <div class="detail-content">
                            <span class="status-display status-${user.status}">
                                ${getStatusName(user.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </td>
            
            <td class="approval-cell">
                <div class="approval-details">
                    ${user.approvalDate ? `
                        <div class="approval-card approved">
                            <div class="approval-header">
                                <i class="fas fa-user-check"></i>
                                <span>تمت الموافقة</span>
                            </div>
                            <div class="approval-content">
                                <p><strong>التاريخ:</strong> ${formatDate(user.approvalDate)}</p>
                                <p><strong>الوقت:</strong> ${formatTime(user.approvalDate)}</p>
                                ${user.approvedBy ? `<p><strong>بواسطة:</strong> ${user.approvedBy}</p>` : ''}
                                ${user.approvalNotes ? `<p><strong>ملاحظات:</strong> ${user.approvalNotes}</p>` : ''}
                            </div>
                        </div>
                    ` : user.rejectionDate ? `
                        <div class="approval-card rejected">
                            <div class="approval-header">
                                <i class="fas fa-user-slash"></i>
                                <span>تم الرفض</span>
                            </div>
                            <div class="approval-content">
                                <p><strong>التاريخ:</strong> ${formatDate(user.rejectionDate)}</p>
                                <p><strong>السبب:</strong> ${user.rejectionReason || 'غير محدد'}</p>
                            </div>
                        </div>
                    ` : `
                        <div class="approval-card pending">
                            <div class="approval-header">
                                <i class="fas fa-clock"></i>
                                <span>بانتظار المراجعة</span>
                            </div>
                            <div class="approval-content">
                                <p>تم التسجيل: ${formatDate(user.registrationDate)}</p>
                                <p>المرحلة: قيد المراجعة</p>
                            </div>
                        </div>
                    `}
                </div>
            </td>
            
            <td class="actions-cell">
                <div class="action-panel">
                    ${user.status === 'pending' ? `
                        <div class="action-group">
                            <button class="btn-action success" onclick="showApprovalModal('${user.id}')" title="مراجعة الطلب">
                                <i class="fas fa-user-check"></i>
                                <span>مراجعة</span>
                            </button>
                            <button class="btn-action danger" onclick="rejectUserFromTable('${user.id}')" title="رفض الطلب">
                                <i class="fas fa-times"></i>
                                <span>رفض</span>
                            </button>
                        </div>
                    ` : ''}
                    
                    ${user.status === 'active' ? `
                        <div class="action-group">
                            <button class="btn-action primary" onclick="viewUserDetails('${user.id}')" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                                <span>عرض</span>
                            </button>
                            <button class="btn-action warning" onclick="manageUserAccount('${user.id}')" title="إدارة الحساب">
                                <i class="fas fa-cog"></i>
                                <span>إدارة</span>
                            </button>
                            <button class="btn-action danger" onclick="deleteUserAccount('${user.id}')" title="حذف الحساب">
                                <i class="fas fa-trash"></i>
                                <span>حذف</span>
                            </button>
                        </div>
                    ` : ''}
                    
                    ${user.status === 'rejected' ? `
                        <div class="action-group">
                            <button class="btn-action info" onclick="viewRejectionDetails('${user.id}')" title="عرض تفاصيل الرفض">
                                <i class="fas fa-info-circle"></i>
                                <span>تفاصيل</span>
                            </button>
                            <button class="btn-action danger" onclick="permanentlyDeleteUser('${user.id}')" title="حذف نهائي">
                                <i class="fas fa-trash-alt"></i>
                                <span>حذف</span>
                            </button>
                        </div>
                    ` : ''}
                    
                    <div class="quick-actions">
                        <button class="btn-action small" onclick="sendQuickMessage('${user.id}')" title="رسالة سريعة">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="btn-action small" onclick="assignQuickTask('${user.id}')" title="مهمة سريعة">
                            <i class="fas fa-tasks"></i>
                        </button>
                        <button class="btn-action small" onclick="addCoinsToUser('${user.id}')" title="إضافة عملات">
                            <i class="fas fa-coins"></i>
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}


// ============================================
// وظائف الموافقة والرفض
// ============================================

// عرض نافذة الموافقة
function showApprovalModal(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        showToast('المستخدم غير موجود', 'error');
        return;
    }
    
    // ملء بيانات المعاينة
    const modalContent = `
        <div class="approval-modal-content">
            <div class="user-approval-preview">
                <div class="user-avatar-large">
                    <img src="${user.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=2c3e50&color=fff'}" 
                         alt="${user.name}">
                </div>
                <div class="user-approval-details">
                    <h3>${user.name}</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <i class="fas fa-envelope"></i>
                            <span>${user.email}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-briefcase"></i>
                            <span>${getRoleName(user.role)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>مسجل منذ: ${formatDate(user.registrationDate)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>${formatTime(user.registrationDate)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="approval-form-section">
                <div class="form-group">
                    <label for="approvalNotes"><i class="fas fa-sticky-note"></i> ملاحظات الموافقة (اختياري)</label>
                    <textarea id="approvalNotes" rows="3" placeholder="أضف أي ملاحظات للمستخدم..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="initialCoins"><i class="fas fa-coins"></i> عدد العملات الابتدائية</label>
                    <div class="coins-input-group">
                        <input type="number" id="initialCoins" min="0" value="100" required>
                        <span class="coins-suffix">عملة</span>
                    </div>
                </div>
                
                <div class="warning-section hidden" id="rejectionWarning">
                    <div class="warning-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="warning-content">
                        <h5>تنبيه: رفض المستخدم</h5>
                        <p>سيتم إعلام المستخدم برفض طلبه وعودته لصفحة التسجيل</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // إنشاء نافذة الموافقة
    createModal('موافقة على المستخدم', modalContent, [
        {
            text: 'رفض الطلب',
            type: 'danger',
            icon: 'fas fa-times',
            onClick: () => rejectUserWithReason(userId)
        },
        {
            text: 'إلغاء',
            type: 'secondary',
            icon: 'fas fa-ban',
            onClick: () => closeCurrentModal()
        },
        {
            text: 'الموافقة',
            type: 'success',
            icon: 'fas fa-check',
            onClick: () => approveUserNow(userId)
        }
    ]);
}

// الموافقة على المستخدم (الربط مع صفحة المستخدم)
function approveUserNow(userId) {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        showToast('المستخدم غير موجود', 'error');
        return;
    }
    
    const approvalNotes = document.getElementById('approvalNotes')?.value || '';
    const initialCoins = parseInt(document.getElementById('initialCoins')?.value) || 100;
    
    // تحديث بيانات المستخدم
    users[userIndex].status = 'active';
    users[userIndex].approvalDate = new Date().toISOString();
    users[userIndex].approvedBy = 'المسؤول';
    users[userIndex].approvalNotes = approvalNotes;
    users[userIndex].coins = initialCoins;
    
    // إضافة نشاط الموافقة
    if (!users[userIndex].activity) users[userIndex].activity = [];
    users[userIndex].activity.push({
        type: 'approval',
        message: 'تمت الموافقة على الحساب',
        timestamp: new Date().toISOString(),
        notes: approvalNotes
    });
    
    // حفظ التغييرات
    saveUsers(users);
    
    // ✅ تحديث حالة المستخدم في صفحة المستخدم
    updateUserDashboardStatus(userId, 'approved', {
        coins: initialCoins,
        approvalDate: users[userIndex].approvalDate,
        notes: approvalNotes
    });
    
    // ✅ إرسال رسالة موافقة للمستخدم
    sendApprovalMessageToUser(userId, approvalNotes, initialCoins);
    
    // ✅ تحديث حسابات الإدارة
    adminAccounts.approvedAccounts[users[userIndex].email] = users[userIndex];
    delete adminAccounts.pendingAccounts[users[userIndex].email];
    saveAdminAccounts();
    
    // إغلاق النافذة وتحديث البيانات
    closeCurrentModal();
    loadUsersData();
    
    showToast('تمت الموافقة على المستخدم بنجاح', 'success');
}

// رفض المستخدم (مع إرجاعه لصفحة التسجيل)
function rejectUserWithReason(userId) {
    const reason = prompt('الرجاء إدخال سبب الرفض:', 'لم تستوفي متطلبات المنصة');
    
    if (!reason) {
        showToast('الرجاء إدخال سبب الرفض', 'warning');
        return;
    }
    
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        showToast('المستخدم غير موجود', 'error');
        return;
    }
    
    // تحديث حالة المستخدم إلى مرفوض
    users[userIndex].status = 'rejected';
    users[userIndex].rejectionDate = new Date().toISOString();
    users[userIndex].rejectionReason = reason;
    
    // إضافة نشاط الرفض
    if (!users[userIndex].activity) users[userIndex].activity = [];
    users[userIndex].activity.push({
        type: 'rejection',
        message: 'تم رفض الحساب',
        timestamp: new Date().toISOString(),
        reason: reason
    });
    
    // حفظ التغييرات
    saveUsers(users);
    
    // ✅ إرسال رسالة رفض للمستخدم وإرجاعه لصفحة التسجيل
    rejectUserAndRedirect(users[userIndex].email, reason);
    
    // ✅ تحديث حسابات الإدارة
    adminAccounts.rejectedAccounts[users[userIndex].email] = users[userIndex];
    delete adminAccounts.pendingAccounts[users[userIndex].email];
    saveAdminAccounts();
    
    // تحديث البيانات
    loadUsersData();
    
    showToast('تم رفض المستخدم وإرجاعه لصفحة التسجيل', 'warning');
}

// رفض مستخدم من الجدول
function rejectUserFromTable(userId) {
    if (confirm('هل أنت متأكد من رفض هذا المستخدم؟ سيتم إرجاعه لصفحة التسجيل.')) {
        rejectUserWithReason(userId);
    }
}

// ============================================
// نظام ربط صفحة المستخدم
// ============================================

// تحديث حالة المستخدم في صفحة المستخدم
function updateUserDashboardStatus(userId, status, data = {}) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) return;
    
    // تحديث حالة المستخدم في لوحة التحكم
    const userDashboard = {
        userId: user.id,
        email: user.email,
        name: user.name,
        status: status,
        coins: data.coins || 0,
        approvalDate: data.approvalDate || null,
        rejectionDate: data.rejectionDate || null,
        rejectionReason: data.rejectionReason || null,
        lastUpdated: new Date().toISOString()
    };
    
    // حفظ في localStorage للمستخدم
    localStorage.setItem(`userDashboard_${user.email}`, JSON.stringify(userDashboard));
    
    // إذا كان المستخدم لديه صفحة مفتوحة، تحديثها
    if (status === 'approved') {
        // تمكين صفحة Dashboard للمستخدم
        enableUserDashboard(user.email, userDashboard);
    } else if (status === 'rejected') {
        // إرجاع المستخدم لصفحة التسجيل
        redirectUserToRegistration(user.email);
    }
}

// تمكين صفحة Dashboard للمستخدم
function enableUserDashboard(email, dashboardData) {
    // حفظ بيانات الموافقة
    const approvals = JSON.parse(localStorage.getItem('adminApprovals') || '{}');
    approvals[email] = {
        status: 'approved',
        date: dashboardData.approvalDate,
        coins: dashboardData.coins,
        notes: dashboardData.notes
    };
    localStorage.setItem('adminApprovals', JSON.stringify(approvals));
    
    // تحديث حالة المستخدم في بيانات التسجيل
    const userRegistrations = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_REGISTRATIONS) || '[]');
    const userIndex = userRegistrations.findIndex(r => r.email === email);
    
    if (userIndex !== -1) {
        userRegistrations[userIndex].approved = true;
        userRegistrations[userIndex].approvalDate = dashboardData.approvalDate;
        userRegistrations[userIndex].coins = dashboardData.coins;
        localStorage.setItem(STORAGE_KEYS.USER_REGISTRATIONS, JSON.stringify(userRegistrations));
    }
}

// إرجاع المستخدم لصفحة التسجيل
function redirectUserToRegistration(email, reason = '') {
    // حفظ سبب الرفض
    const rejections = JSON.parse(localStorage.getItem('adminRejections') || '{}');
    rejections[email] = {
        status: 'rejected',
        date: new Date().toISOString(),
        reason: reason
    };
    localStorage.setItem('adminRejections', JSON.stringify(rejections));
    
    // حذف بيانات تسجيل المستخدم لإجباره على إعادة التسجيل
    const userRegistrations = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_REGISTRATIONS) || '[]');
    const filteredRegistrations = userRegistrations.filter(r => r.email !== email);
    localStorage.setItem(STORAGE_KEYS.USER_REGISTRATIONS, JSON.stringify(filteredRegistrations));
    
    // إظهار رسالة الرفض للمستخدم
    showUserRejectionMessage(email, reason);
}

// إرسال رسالة موافقة للمستخدم
function sendApprovalMessageToUser(userId, notes = '', coins = 0) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) return;
    
    const message = {
        id: 'msg_' + Date.now(),
        to: user.email,
        subject: 'تهانينا! تمت الموافقة على حسابك',
        content: `
            <h3>مرحباً ${user.name}!</h3>
            <p>تمت الموافقة على حسابك في منصتنا المهنية.</p>
            ${notes ? `<p><strong>ملاحظات المسؤول:</strong> ${notes}</p>` : ''}
            ${coins > 0 ? `<p><strong>تم منحك:</strong> ${coins} عملة كرصيد ابتدائي</p>` : ''}
            <p>يمكنك الآن تسجيل الدخول والبدء في استخدام جميع المزايا.</p>
            <p>شكراً لانضمامك إلينا!</p>
        `,
        type: 'approval',
        timestamp: new Date().toISOString(),
        read: false
    };
    
    // إضافة الرسالة إلى النظام
    const messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    messages.push(message);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    
    // إضافة الرسالة للمستخدم
    if (!user.messages) user.messages = [];
    user.messages.push({
        id: message.id,
        subject: message.subject,
        preview: 'تمت الموافقة على حسابك',
        timestamp: message.timestamp,
        read: false
    });
    
    saveUsers(users);
}

// رفض المستخدم وإرجاعه
function rejectUserAndRedirect(email, reason) {
    const rejectionMessage = {
        id: 'reject_' + Date.now(),
        to: email,
        subject: 'إشعار رفض الحساب',
        content: `
            <h3>عذراً...</h3>
            <p>تم رفض طلب التسجيل الخاص بك في منصتنا.</p>
            <p><strong>سبب الرفض:</strong> ${reason}</p>
            <p>يمكنك محاولة التسجيل مرة أخرى بعد مراجعة المعلومات المقدمة.</p>
            <p>شكراً لاهتمامك.</p>
        `,
        type: 'rejection',
        timestamp: new Date().toISOString()
    };
    
    // حفظ رسالة الرفض
    const messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    messages.push(rejectionMessage);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    
    // إرجاع المستخدم لصفحة التسجيل
    redirectUserToRegistration(email, reason);
}

// إظهار رسالة الرفض للمستخدم
function showUserRejectionMessage(email, reason) {
    // هذه الوظيفة ستُستدعى في صفحة المستخدم
    const rejectionData = {
        email: email,
        reason: reason,
        date: new Date().toISOString(),
        showRejection: true
    };
    
    localStorage.setItem('userRejection', JSON.stringify(rejectionData));
}

// ============================================
// إدارة الحسابات والحذف
// ============================================

// حذف حساب المستخدم
function deleteUserAccount(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟ سيتم حذف جميع بيانات المستخدم بشكل نهائي.')) {
        return;
    }
    
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        showToast('المستخدم غير موجود', 'error');
        return;
    }
    
    const user = users[userIndex];
    
    // نقل إلى الحسابات المحذوفة
    adminAccounts.deletedAccounts[user.email] = {
        ...user,
        deletedDate: new Date().toISOString(),
        deletedBy: 'المسؤول'
    };
    
    // حذف من القائمة الرئيسية
    users.splice(userIndex, 1);
    
    // حفظ التغييرات
    saveUsers(users);
    saveAdminAccounts();
    
    // ✅ إرجاع المستخدم لصفحة البداية
    forceUserToStartPage(user.email);
    
    showToast('تم حذف الحساب بنجاح', 'success');
    loadUsersData();
}

// حذف نهائي للمستخدم المرفوض
function permanentlyDeleteUser(userId) {
    if (!confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        showToast('المستخدم غير موجود', 'error');
        return;
    }
    
    const user = users[userIndex];
    
    // حذف نهائي
    users.splice(userIndex, 1);
    delete adminAccounts.rejectedAccounts[user.email];
    
    saveUsers(users);
    saveAdminAccounts();
    
    showToast('تم الحذف النهائي للمستخدم', 'success');
    loadUsersData();
}

// إجبار المستخدم للعودة لصفحة البداية
function forceUserToStartPage(email) {
    // حذف جميع بيانات المستخدم
    localStorage.removeItem(`userDashboard_${email}`);
    
    // حذف من الموافقات
    const approvals = JSON.parse(localStorage.getItem('adminApprovals') || '{}');
    delete approvals[email];
    localStorage.setItem('adminApprovals', JSON.stringify(approvals));
    
    // حذف من التسجيلات
    const registrations = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_REGISTRATIONS) || '[]');
    const filtered = registrations.filter(r => r.email !== email);
    localStorage.setItem(STORAGE_KEYS.USER_REGISTRATIONS, JSON.stringify(filtered));
    
    // إظهار رسالة للمستخدم
    const deletionMessage = {
        type: 'account_deleted',
        email: email,
        timestamp: new Date().toISOString(),
        message: 'تم حذف حسابك من قبل المسؤول'
    };
    
    localStorage.setItem('accountDeletionNotice', JSON.stringify(deletionMessage));
}

// ============================================
// وظائف المساعدة
// ============================================

// تحديث إحصائيات لوحة التحكم
function updateDashboardStats(users = null) {
    const allUsers = users || getAllUsers();
    
    const totalUsers = allUsers.length;
    const pendingUsers = allUsers.filter(u => u.status === 'pending').length;
    const activeUsers = allUsers.filter(u => u.status === 'active').length;
    const rejectedUsers = allUsers.filter(u => u.status === 'rejected').length;
    
    // تحديث العدادات
    const totalCount = document.getElementById('totalUsersCount');
    const pendingCount = document.getElementById('pendingApprovalsCount');
    const navPending = document.getElementById('pendingUsersCount');
    const sidebarPending = document.getElementById('sidebarPending');
    
    if (totalCount) totalCount.textContent = totalUsers;
    if (pendingCount) pendingCount.textContent = pendingUsers;
    if (navPending) navPending.textContent = pendingUsers;
    if (sidebarPending) sidebarPending.textContent = `${pendingUsers} بانتظار`;
    
    // تحديث العملات
    const totalCoins = allUsers.reduce((sum, user) => sum + (user.coins || 0), 0);
    const sidebarCoins = document.getElementById('sidebarCoins');
    if (sidebarCoins) sidebarCoins.textContent = `${totalCoins} عملة`;
}

// الحصول على شارة الحالة
function getStatusBadge(status) {
    const badges = {
        pending: '<span class="status-badge pending"><i class="fas fa-clock"></i> قيد المراجعة</span>',
        active: '<span class="status-badge active"><i class="fas fa-check-circle"></i> نشط</span>',
        rejected: '<span class="status-badge rejected"><i class="fas fa-times-circle"></i> مرفوض</span>',
        suspended: '<span class="status-badge suspended"><i class="fas fa-pause-circle"></i> موقوف</span>'
    };
    
    return badges[status] || '';
}

// الحصول على اسم الحالة
function getStatusName(status) {
    const names = {
        pending: 'قيد المراجعة',
        active: 'نشط',
        rejected: 'مرفوض',
        suspended: 'موقوف'
    };
    
    return names[status] || status;
}

// الحصول على اسم الدور
function getRoleName(role) {
    const roles = {
        developer: 'مطور',
        designer: 'مصمم',
        writer: 'كاتب',
        analyst: 'محلل',
        manager: 'مدير',
        user: 'جرافيك ديزاينر'
    };
    
    return roles[role] || role;
}

// تنسيق التاريخ
function formatDate(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
}

// تنسيق الوقت
function formatTime(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

// تنسيق التاريخ والوقت
function formatDateTime(dateString) {
    return `${formatDate(dateString)} - ${formatTime(dateString)}`;
}

// الحصول على آخر نشاط
function getLastActivity(activities) {
    if (!activities || activities.length === 0) return 'لا يوجد نشاط';
    
    const lastActivity = activities[activities.length - 1];
    const timeAgo = getTimeAgo(lastActivity.timestamp);
    
    return `${lastActivity.message} (${timeAgo})`;
}

// الحصول على الوقت المنقضي
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = now - past;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `قبل ${days} يوم`;
    if (hours > 0) return `قبل ${hours} ساعة`;
    if (minutes > 0) return `قبل ${minutes} دقيقة`;
    return 'الآن';
}

// إنشاء نافذة منبثقة
function createModal(title, content, buttons = []) {
    // إزالة أي نافذة سابقة
    const existingModal = document.querySelector('.custom-modal');
    if (existingModal) existingModal.remove();
    
    // إنشاء النافذة
    const modal = document.createElement('div');
    modal.className = 'custom-modal active';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeCurrentModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${buttons.map(btn => `
                    <button class="btn btn-${btn.type}" onclick="${btn.onClick}">
                        <i class="${btn.icon}"></i> ${btn.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// إغلاق النافذة الحالية
function closeCurrentModal() {
    const modal = document.querySelector('.custom-modal');
    if (modal) modal.remove();
}

// إظهار رسالة
function showToast(message, type = 'info') {
    // إنشاء عنصر الرسالة
    const toast = document.createElement('div');
    toast.className = `admin-toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // إظهار الرسالة
    setTimeout(() => toast.classList.add('show'), 10);
    
    // إخفاء الرسالة بعد 5 ثواني
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// الحصول على أيقونة الرسالة
function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    return icons[type] || 'info-circle';
}

// فلتر جدول المستخدمين
function filterUsersTable(filter) {
    const rows = document.querySelectorAll('.user-row');
    
    rows.forEach(row => {
        const status = row.classList.contains(`status-${filter}`);
        const showAll = filter === 'all';
        
        row.style.display = showAll || status ? '' : 'none';
    });
}

// البحث عن المستخدمين
function searchUsers(query) {
    const rows = document.querySelectorAll('.user-row');
    query = query.toLowerCase();
    
    rows.forEach(row => {
        const userName = row.querySelector('.user-name')?.textContent.toLowerCase() || '';
        const userEmail = row.getAttribute('data-email')?.toLowerCase() || '';
        const userRole = row.querySelector('.user-role-badge')?.textContent.toLowerCase() || '';
        
        const matches = userName.includes(query) || 
                       userEmail.includes(query) || 
                       userRole.includes(query);
        
        row.style.display = matches ? '' : 'none';
    });
}

// عرض قسم
function showSection(sectionId) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // إظهار القسم المحدد
    const targetSection = document.getElementById(sectionId + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
        
        // تحديث العنوان
        const title = document.getElementById('adminSectionTitle');
        const currentSection = document.getElementById('currentSection');
        
        if (title && currentSection) {
            const sectionTitle = targetSection.querySelector('h2')?.textContent || sectionId;
            title.textContent = sectionTitle;
            currentSection.textContent = sectionTitle;
        }
    }
}

// ============================================
// وظائف إضافية
// ============================================

// إدارة حساب المستخدم
function manageUserAccount(userId) {
    showToast('ميزة إدارة الحساب قيد التطوير', 'info');
}

// عرض تفاصيل المستخدم
function viewUserDetails(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        showToast('المستخدم غير موجود', 'error');
        return;
    }
    
    const details = `
        <div class="user-details-full">
            <div class="user-header">
                <div class="user-avatar-xlarge">
                    <img src="${user.profilePic}" alt="${user.name}">
                </div>
                <div class="user-header-info">
                    <h2>${user.name}</h2>
                    <p class="user-email">${user.email}</p>
                    <div class="user-status-display">
                        <span class="status-badge large status-${user.status}">
                            ${getStatusName(user.status)}
                        </span>
                        <span class="user-role">${getRoleName(user.role)}</span>
                    </div>
                </div>
            </div>
            
            <div class="user-stats-grid">
                <div class="stat-card">
                    <i class="fas fa-coins"></i>
                    <div>
                        <h4>${user.coins || 0}</h4>
                        <p>العملات</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-tasks"></i>
                    <div>
                        <h4>${user.tasks?.length || 0}</h4>
                        <p>المهام</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-envelope"></i>
                    <div>
                        <h4>${user.messages?.length || 0}</h4>
                        <p>الرسائل</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-calendar-alt"></i>
                    <div>
                        <h4>${formatDate(user.registrationDate)}</h4>
                        <p>تاريخ التسجيل</p>
                    </div>
                </div>
            </div>
            
            <div class="user-timeline">
                <h3><i class="fas fa-history"></i> سجل النشاط</h3>
                <div class="timeline">
                    ${user.activity?.map(activity => `
                        <div class="timeline-item">
                            <div class="timeline-icon">
                                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                            </div>
                            <div class="timeline-content">
                                <h4>${activity.message}</h4>
                                <p>${formatDateTime(activity.timestamp)}</p>
                                ${activity.notes ? `<p class="timeline-notes">${activity.notes}</p>` : ''}
                            </div>
                        </div>
                    `).join('') || '<p class="no-activity">لا يوجد نشاط مسجل</p>'}
                </div>
            </div>
        </div>
    `;
    
    createModal('تفاصيل المستخدم', details, [
        {
            text: 'إغلاق',
            type: 'secondary',
            icon: 'fas fa-times',
            onClick: 'closeCurrentModal()'
        }
    ]);
}

// الحصول على أيقونة النشاط
function getActivityIcon(type) {
    const icons = {
        registration: 'user-plus',
        approval: 'user-check',
        rejection: 'user-times',
        task: 'tasks',
        message: 'envelope',
        payment: 'coins',
        update: 'sync'
    };
    
    return icons[type] || 'circle';
}

// عرض تفاصيل الرفض
function viewRejectionDetails(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user || user.status !== 'rejected') {
        showToast('لا توجد تفاصيل رفض', 'warning');
        return;
    }
    
    const details = `
        <div class="rejection-details">
            <div class="warning-header">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>تفاصيل رفض الحساب</h3>
            </div>
            
            <div class="rejection-info">
                <div class="info-row">
                    <strong>المستخدم:</strong>
                    <span>${user.name}</span>
                </div>
                <div class="info-row">
                    <strong>البريد الإلكتروني:</strong>
                    <span>${user.email}</span>
                </div>
                <div class="info-row">
                    <strong>تاريخ الرفض:</strong>
                    <span>${formatDateTime(user.rejectionDate)}</span>
                </div>
                <div class="info-row">
                    <strong>سبب الرفض:</strong>
                    <span class="rejection-reason">${user.rejectionReason || 'غير محدد'}</span>
                </div>
            </div>
            
            <div class="rejection-actions">
                <p><i class="fas fa-info-circle"></i> تم إرجاع المستخدم لصفحة التسجيل.</p>
            </div>
        </div>
    `;
    
    createModal('تفاصيل الرفض', details, [
        {
            text: 'حذف نهائي',
            type: 'danger',
            icon: 'fas fa-trash-alt',
            onClick: `permanentlyDeleteUser('${userId}')`
        },
        {
            text: 'إغلاق',
            type: 'secondary',
            icon: 'fas fa-times',
            onClick: 'closeCurrentModal()'
        }
    ]);
}

// رسالة سريعة
function sendQuickMessage(userId) {
    const message = prompt('أدخل الرسالة السريعة:');
    if (message) {
        showToast('تم إرسال الرسالة', 'success');
    }
}

// مهمة سريعة
function assignQuickTask(userId) {
    showToast('ميزة المهمة السريعة قيد التطوير', 'info');
}

// إضافة عملات
function addCoinsToUser(userId) {
    const amount = prompt('أدخل عدد العملات:');
    if (amount && !isNaN(amount)) {
        showToast(`تم إضافة ${amount} عملة`, 'success');
    }
}