// Global state variables
let token = localStorage.getItem('token');
let currentUser = null;
let registeredEventIds = new Set();
let allEventsList = [];
let myTeamsList = [];

// Check authentication on load
if (!token) {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Tab elements
  const navTabBtns = document.querySelectorAll('.nav-tab-btn');
  const sections = document.querySelectorAll('.dashboard-section');
  const logoutBtn = document.getElementById('logout-btn');

  // Modal elements
  const editProfileBtn = document.getElementById('edit-profile-btn');
  const editProfileModal = document.getElementById('edit-profile-modal');
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
  const editProfileForm = document.getElementById('edit-profile-form');

  // Fetch initial profile and page details
  loadDashboardData();

  // --- 1. Navigation & Tab Switching ---
  navTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSectionId = btn.getAttribute('data-target');
      
      // Update nav button active states
      navTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/Hide section panels
      sections.forEach(sec => {
        if (sec.id === targetSectionId) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      });
    });
  });

  // --- 2. Logout Handler ---
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
  });

  // --- 3. Profile Receipt Download ---
  document.getElementById('download-receipt-btn').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/receipt', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to generate receipt PDF.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_${localStorage.getItem('registrationId') || 'technica'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error downloading receipt. Please try again.');
    }
  });

  // --- 4. Edit Profile Modal Triggers ---
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      if (!currentUser) return;
      
      // Pre-populate details
      document.getElementById('edit-name').value = currentUser.name || '';
      document.getElementById('edit-age').value = currentUser.age || '';
      document.getElementById('edit-gender').value = currentUser.gender || 'Male';
      document.getElementById('edit-whatsapp').value = currentUser.whatsapp || '';
      document.getElementById('edit-institution').value = currentUser.institution || '';
      document.getElementById('edit-course').value = currentUser.course || '';
      document.getElementById('edit-semester').value = currentUser.semester || '';

      editProfileModal.classList.remove('hidden');
    });
  }

  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', () => {
      editProfileModal.classList.add('hidden');
    });
  }

  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        name: document.getElementById('edit-name').value.trim(),
        age: parseInt(document.getElementById('edit-age').value),
        gender: document.getElementById('edit-gender').value,
        whatsapp: document.getElementById('edit-whatsapp').value.trim(),
        institution: document.getElementById('edit-institution').value.trim(),
        course: document.getElementById('edit-course').value.trim(),
        semester: document.getElementById('edit-semester').value.trim()
      };

      try {
        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update profile.');

        alert('Profile updated successfully!');
        editProfileModal.classList.add('hidden');
        loadDashboardData(); // Reload details in dashboard
      } catch (err) {
        console.error(err);
        alert(err.message || 'Error updating profile.');
      }
    });
  }

  // --- 5. Event Search Handler ---
  const searchInput = document.getElementById('event-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderIndividualEnrollment(allEventsList);
        renderTeamEnrollment(allEventsList);
        return;
      }
      const filtered = allEventsList.filter(ev => 
        ev.name.toLowerCase().includes(query) || 
        ev.category.toLowerCase().includes(query)
      );
      renderIndividualEnrollment(filtered);
      renderTeamEnrollment(filtered);
    });
  }
});

// --- 4. Load Profile, Notifications, Events & Teams ---
async function loadDashboardData() {
  token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    // A. Fetch profile details and registered events
    const meResponse = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!meResponse.ok) {
      // Token might be expired
      localStorage.clear();
      window.location.href = 'index.html';
      return;
    }
    
    const meData = await meResponse.json();
    currentUser = meData.user;
    
    // Set global set of registered event IDs
    registeredEventIds = new Set(meData.registeredEvents.map(r => r.eventId));

    // Update Profile UI fields
    document.getElementById('profile-reg-id').textContent = currentUser.registrationId;
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-whatsapp').textContent = currentUser.whatsapp;
    document.getElementById('profile-institution').textContent = currentUser.institution;
    document.getElementById('profile-academic-details').textContent = `${currentUser.course} - Sem ${currentUser.semester}`;
    document.getElementById('profile-utr').textContent = currentUser.paymentUTR;
    document.getElementById('profile-gender').textContent = currentUser.gender;

    // B. Fetch notifications/invites
    await loadNotifications();

    // C. Fetch events and teams details
    await loadEventsAndTeams();

    // D. Render enrolled events in Profile tab
    renderRegisteredEvents(meData.registeredEvents);

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// --- 5. Notifications Handling ---
async function loadNotifications() {
  const notifContainer = document.getElementById('notifications-container');
  const notifBadge = document.getElementById('notif-badge');

  try {
    const response = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to load notifications.');
    
    const notifications = await response.json();
    
    // Count pending invites
    const pendingInvites = notifications.filter(n => n.type === 'TEAM_INVITE' && n.invitation && n.invitation.status === 'pending');
    
    if (pendingInvites.length > 0) {
      notifBadge.textContent = pendingInvites.length;
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }

    if (notifications.length === 0) {
      notifContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-dark); padding: 40px 10px;">
          <i class="fa-solid fa-envelope-open" style="font-size: 2.2rem; margin-bottom: 12px;"></i>
          <p>Your inbox is empty. No notifications or team invites received yet.</p>
        </div>`;
      return;
    }

    let html = '';
    notifications.forEach(notif => {
      const dateStr = new Date(notif.createdAt).toLocaleDateString() + ' ' + new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      if (notif.type === 'TEAM_INVITE' && notif.invitation) {
        const inv = notif.invitation;
        
        if (inv.status === 'pending') {
          html += `
            <div class="notif-card">
              <div class="notif-info">
                <h4>Team Invitation: ${inv.eventName}</h4>
                <p>Leader <strong>${inv.senderName}</strong> (${inv.senderEmail}) invited you to join team <strong>${inv.teamId}</strong>.</p>
                <small style="color: var(--text-dark); font-size: 0.75rem;"><i class="fa-regular fa-clock"></i> ${dateStr}</small>
              </div>
              <div class="notif-actions">
                <button class="notif-btn-accept" onclick="respondToInvite('${notif._id}', 'accept')"><i class="fa-solid fa-check"></i> Accept</button>
                <button class="notif-btn-decline" onclick="respondToInvite('${notif._id}', 'decline')"><i class="fa-solid fa-xmark"></i> Decline</button>
              </div>
            </div>`;
        } else {
          // Invite responded already
          const statusText = inv.status === 'accepted' ? 'Accepted <i class="fa-solid fa-circle-check"></i>' : 'Declined <i class="fa-solid fa-circle-xmark"></i>';
          const statusColor = inv.status === 'accepted' ? 'var(--success)' : 'var(--error)';
          html += `
            <div class="notif-card" style="opacity: 0.65;">
              <div class="notif-info">
                <h4>Team Invitation: ${inv.eventName}</h4>
                <p>Invitation to team <strong>${inv.teamId}</strong> from ${inv.senderName} was <strong>${inv.status}</strong>.</p>
                <small style="color: var(--text-dark); font-size: 0.75rem;"><i class="fa-regular fa-clock"></i> ${dateStr}</small>
              </div>
              <div style="font-size: 0.85rem; font-weight: 600; color: ${statusColor};">${statusText}</div>
            </div>`;
        }
      } else {
        // Normal text message notifications (Invite accept logs, etc.)
        html += `
          <div class="notif-card" style="opacity: 0.85;">
            <div class="notif-info" style="flex: 1;">
              <h4>Notification Log</h4>
              <p>${notif.message}</p>
              <small style="color: var(--text-dark); font-size: 0.75rem;"><i class="fa-regular fa-clock"></i> ${dateStr}</small>
            </div>
            <div style="color: var(--text-dark); font-size: 1.1rem;"><i class="fa-regular fa-bell"></i></div>
          </div>`;
      }
    });

    notifContainer.innerHTML = html;

  } catch (error) {
    console.error('Error fetching notifications:', error);
    notifContainer.innerHTML = '<p class="error-tooltip">Error checking invitations inbox.</p>';
  }
}

async function respondToInvite(notifId, action) {
  try {
    const response = await fetch(`/api/notifications/${notifId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to respond to invitation.');

    alert(data.message);
    // Reload dashboard to update profiles, events, and notifications
    loadDashboardData();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Error updating invitation response.');
  }
}

// --- 6. Load & Render Events / Teams ---
async function loadEventsAndTeams() {
  try {
    // Fetch all active events
    const evResponse = await fetch('/api/events');
    if (!evResponse.ok) throw new Error('Failed to load events.');
    allEventsList = await evResponse.json();

    // Fetch user active team details
    const teamResponse = await fetch('/api/teams/my-teams', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!teamResponse.ok) throw new Error('Failed to load teams.');
    myTeamsList = await teamResponse.json();

    // Render Individual and Team Event Tabs
    renderIndividualEnrollment();
    renderTeamEnrollment();

  } catch (err) {
    console.error('Error loading events or teams:', err);
  }
}

// Render dynamic enrolled events list inside Profile tab
async function renderRegisteredEvents(registrations) {
  const container = document.getElementById('registered-events-container');
  if (registrations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-dark); padding: 30px 10px;">
        <i class="fa-solid fa-receipt" style="font-size: 2rem; margin-bottom: 10px;"></i>
        <p>You have not registered for any events yet. Head over to the "Enroll Events" tab to register!</p>
      </div>`;
    return;
  }

  let html = '';
  registrations.forEach(reg => {
    // Find event name
    const event = allEventsList.find(e => e.eventId === reg.eventId);
    const eventName = event ? event.name : reg.eventId;
    const isTeam = reg.registrationType === 'TEAM';
    const badgeClass = isTeam ? 'badge-team' : 'badge-indiv';
    const typeLabel = isTeam ? `Team (${reg.teamId})` : 'Individual';

    html += `
      <div class="registered-event-item">
        <div>
          <h4>${eventName}</h4>
          <small style="color: var(--text-dark); font-size: 0.75rem;">Event ID: ${reg.eventId}</small>
        </div>
        <span class="${badgeClass}">${typeLabel}</span>
      </div>`;
  });

  container.innerHTML = html;
}

// --- 7. Individual Events Enrollment Tab ---
function renderIndividualEnrollment(events = allEventsList) {
  const container = document.getElementById('indiv-events-list');
  const indivEvents = events.filter(e => e.individualAllowed);
  
  if (indivEvents.length === 0) {
    container.innerHTML = '<p class="help-text">No active individual events found.</p>';
    return;
  }

  // Group by category
  const categories = {};
  indivEvents.forEach(e => {
    if (!categories[e.category]) categories[e.category] = [];
    categories[e.category].push(e);
  });

  let html = '';
  for (const [category, catEvents] of Object.entries(categories)) {
    html += `
      <div class="events-category-group">
        <h4 class="category-title">${category}</h4>
        <div class="events-grid">`;

    catEvents.forEach(event => {
      const isRegistered = registeredEventIds.has(event.eventId);
      const isHybrid = event.teamAllowed;
      const hybridNote = isHybrid ? `<span class="event-badge" style="border: none; background: transparent; padding:0; color: #a5b4fc;"><i class="fa-solid fa-circle-info"></i> To participate with friends, register via the Team Events tab.</span>` : '';
      
      const btnHtml = isRegistered
        ? `<button class="submit-btn" disabled style="background: var(--text-dark); box-shadow: none; padding: 8px 15px; font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> Enrolled</button>`
        : `<button class="submit-btn" style="padding: 8px 15px; font-size: 0.85rem;" onclick="enrollIndividual('${event.eventId}')">Register Solo</button>`;

      html += `
        <div class="event-card" style="cursor: default;">
          <div class="event-card-details" style="flex: 1;">
            <span class="event-card-title">${event.name}</span>
            <span class="event-card-desc">${event.description || ''}</span>
            ${hybridNote}
          </div>
          <div style="margin-left: 15px; display: flex; align-items: center;">
            ${btnHtml}
          </div>
        </div>`;
    });

    html += `</div></div>`;
  }

  container.innerHTML = html;
}

async function enrollIndividual(eventId) {
  showEnrollAlert(null); // Clear alerts
  try {
    const response = await fetch('/api/events/register-individual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ eventId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed.');

    showEnrollAlert(`Successfully registered!`, 'success');
    loadDashboardData();
  } catch (err) {
    console.error(err);
    showEnrollAlert(err.message || 'Error enrolling in event.', 'error');
  }
}

// --- 8. Team Events Enrollment Tab ---
function renderTeamEnrollment(events = allEventsList) {
  const container = document.getElementById('team-events-list');
  const teamEvents = events.filter(e => e.teamAllowed);

  if (teamEvents.length === 0) {
    container.innerHTML = '<p class="help-text">No active team events found.</p>';
    return;
  }

  // Group by category
  const categories = {};
  teamEvents.forEach(e => {
    if (!categories[e.category]) categories[e.category] = [];
    categories[e.category].push(e);
  });

  let html = '';
  for (const [category, catEvents] of Object.entries(categories)) {
    html += `
      <div class="events-category-group">
        <h4 class="category-title">${category}</h4>
        <div class="events-grid">`;

    catEvents.forEach(event => {
      // Check if user is already in a team for this event
      const userTeam = myTeamsList.find(t => t.eventId === event.eventId);
      const isRegisteredSolo = registeredEventIds.has(event.eventId) && !userTeam;

      let innerCardContent = '';

      if (isRegisteredSolo) {
        // Registered individually - can convert to team
        innerCardContent = `
          <div style="margin-top: 10px; font-size: 0.85rem; color: #a5b4fc; background: rgba(99, 102, 241, 0.08); padding: 12px; border-radius: 6px; border: 1px solid rgba(99, 102, 241, 0.15); display: flex; flex-direction: column; gap: 8px;">
            <span><i class="fa-solid fa-circle-exclamation"></i> You have registered for this event individually. Convert your registration into a team to participate with friends.</span>
            <button class="submit-btn" style="width: auto; padding: 6px 12px; font-size: 0.8rem; background: var(--secondary); align-self: flex-end;" onclick="convertToTeam('${event.eventId}')">
              <i class="fa-solid fa-users-gear"></i> Convert to Team
            </button>
          </div>`;
      } else if (!userTeam) {
        // No team, show Create Team button
        innerCardContent = `
          <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
            <button class="submit-btn" style="width: auto; padding: 8px 16px; font-size: 0.85rem;" onclick="createTeam('${event.eventId}')">
              <i class="fa-solid fa-users-plus"></i> Create Team
            </button>
          </div>`;
      } else {
        // Active team panel
        const teamStatusBadge = userTeam.status === 'registered' 
          ? `<span class="team-status-badge status-registered">Registered (Locked)</span>` 
          : `<span class="team-status-badge status-forming">Forming</span>`;

        let membersRows = '';
        userTeam.members.forEach(member => {
          const removeBtn = (userTeam.isLeader && userTeam.status === 'forming' && member.role !== 'Leader')
            ? `&nbsp;&nbsp;<button class="logout-btn" style="padding: 2px 6px; font-size: 0.7rem; border-color: rgba(239, 68, 68, 0.4); margin-left: 10px; display:inline-block;" onclick="removeRosterMember('${userTeam.teamId}', '${member.registrationId}', '${member.name}')"><i class="fa-solid fa-user-minus"></i> Remove</button>`
            : '';
          membersRows += `
            <div class="team-member-row" style="align-items: center;">
              <span><strong>${member.name}</strong> (${member.email})${removeBtn}</span>
              <span style="color: ${member.role === 'Leader' ? 'var(--secondary)' : 'var(--text-muted)'}; font-weight: 500;">${member.role}</span>
            </div>`;
        });

        let pendingRows = '';
        userTeam.pendingInvites.forEach(inv => {
          const cancelBtn = (userTeam.isLeader && userTeam.status === 'forming')
            ? `&nbsp;&nbsp;<button class="logout-btn" style="padding: 2px 6px; font-size: 0.7rem; border-color: rgba(239, 68, 68, 0.4); margin-left: 10px; display:inline-block;" onclick="removeRosterMember('${userTeam.teamId}', '${inv.registrationId}', '${inv.name}', true)"><i class="fa-solid fa-xmark"></i> Cancel</button>`
            : '';
          pendingRows += `
            <div class="team-member-row" style="color: var(--text-dark); align-items: center;">
              <span>${inv.name} (${inv.email})${cancelBtn}</span>
              <span>Pending invite...</span>
            </div>`;
        });

        let leaderControlsHtml = '';
        if (userTeam.isLeader && userTeam.status === 'forming') {
          // Invite block
          leaderControlsHtml = `
            <div class="invite-box">
              <input type="email" id="invite-email-${userTeam.teamId}" class="glassmorphism" style="background: var(--bg-color);" placeholder="Enter friend's Gmail address">
              <button class="action-btn-primary" style="padding: 8px 14px;" onclick="sendInvitation('${userTeam.teamId}')">Invite</button>
            </div>
          `;

          // Lock team button
          const canLock = userTeam.memberCount >= userTeam.minMembers;
          const lockDisabledAttr = canLock ? '' : 'disabled';
          const lockStyle = canLock ? 'box-shadow: 0 0 20px var(--secondary-glow);' : 'background: var(--text-dark); box-shadow: none;';
          
          leaderControlsHtml += `
            <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
              <small class="help-text">Requires min ${userTeam.minMembers} members to lock (current: ${userTeam.memberCount}).</small>
              <button class="submit-btn" style="width: auto; padding: 8px 20px; font-size: 0.85rem; ${lockStyle}" ${lockDisabledAttr} onclick="lockTeam('${userTeam.teamId}')">
                <i class="fa-solid fa-lock"></i> Lock & Register Team
              </button>
            </div>`;
        }

        const cancelBtnHtml = userTeam.status === 'forming'
          ? `<button class="logout-btn" style="padding: 4px 10px; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.5); margin-left: 5px; display: inline-block;" onclick="cancelTeamRegistration('${userTeam.teamId}', ${userTeam.isLeader})">
              ${userTeam.isLeader ? '<i class="fa-solid fa-users-slash"></i> Disband' : '<i class="fa-solid fa-right-from-bracket"></i> Leave'}
             </button>`
          : '';

        innerCardContent = `
          <div class="team-panel-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 6px;">
              <span style="font-family: var(--font-heading); font-size: 0.9rem; font-weight: 700; color: #fff;">Team: ${userTeam.teamId}</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                ${teamStatusBadge}
                ${cancelBtnHtml}
              </div>
            </div>
            
            <div class="team-members-list">
              <span style="font-size: 0.75rem; color: var(--text-dark); font-weight: 600; text-transform: uppercase;">Team Roster</span>
              ${membersRows}
              ${pendingRows}
            </div>

            ${leaderControlsHtml}
          </div>`;
      }

      html += `
        <div class="event-card" style="cursor: default; flex-direction: column; align-items: stretch; gap: 4px;">
          <div class="event-card-details">
            <span class="event-card-title">${event.name}</span>
            <span class="event-card-desc">${event.description || ''}</span>
            <span class="event-badge" style="margin-top: 4px;">Team size: ${event.minMembers} - ${event.maxMembers} members</span>
          </div>
          ${innerCardContent}
        </div>`;
    });

    html += `</div></div>`;
  }

  container.innerHTML = html;
}

async function createTeam(eventId) {
  showEnrollAlert(null);
  try {
    const response = await fetch('/api/teams/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ eventId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create team.');

    showEnrollAlert(`Team successfully created! You are the leader.`, 'success');
    loadDashboardData();
  } catch (err) {
    console.error(err);
    showEnrollAlert(err.message || 'Error creating team.', 'error');
  }
}

async function sendInvitation(teamId) {
  const emailInput = document.getElementById(`invite-email-${teamId}`);
  const inviteeEmail = emailInput.value.trim();
  showEnrollAlert(null);

  if (!inviteeEmail) {
    showEnrollAlert('Please enter an email address to invite.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/teams/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ teamId, inviteeEmail })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send invite.');

    showEnrollAlert(data.message, 'success');
    emailInput.value = '';
    loadDashboardData();
  } catch (err) {
    console.error(err);
    showEnrollAlert(err.message || 'Error sending invite.', 'error');
  }
}

async function lockTeam(teamId) {
  showEnrollAlert(null);
  try {
    const response = await fetch('/api/teams/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ teamId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to lock team.');

    showEnrollAlert(data.message, 'success');
    loadDashboardData();
  } catch (err) {
    console.error(err);
    showEnrollAlert(err.message || 'Error locking team.', 'error');
  }
}

// --- 9. Utility UI Helpers ---
function switchEnrollSubTab(tab) {
  const indivTrigger = document.getElementById('tab-indiv-trigger');
  const teamTrigger = document.getElementById('tab-team-trigger');
  const indivPane = document.getElementById('enroll-indiv-pane');
  const teamPane = document.getElementById('enroll-team-pane');

  if (tab === 'indiv') {
    indivTrigger.classList.add('active');
    teamTrigger.classList.remove('active');
    indivPane.classList.remove('hidden');
    teamPane.classList.add('hidden');
  } else {
    teamTrigger.classList.add('active');
    indivTrigger.classList.remove('active');
    teamPane.classList.remove('hidden');
    indivPane.classList.add('hidden');
  }
  showEnrollAlert(null); // Clear alerts
}

function showEnrollAlert(message, type = 'success') {
  const panel = document.getElementById('enroll-alert');
  const msgText = document.getElementById('enroll-alert-message');
  const icon = document.getElementById('enroll-alert-icon');

  if (!message) {
    panel.classList.add('hidden');
    return;
  }

  msgText.textContent = message;
  panel.classList.remove('hidden');

  if (type === 'success') {
    panel.style.background = 'rgba(16, 185, 129, 0.1)';
    panel.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    panel.style.color = '#a7f3d0';
    icon.className = 'fa-solid fa-circle-check';
    icon.style.color = 'var(--success)';
  } else {
    panel.style.background = 'rgba(239, 68, 68, 0.1)';
    panel.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    panel.style.color = '#fca5a5';
    icon.className = 'fa-solid fa-circle-exclamation';
    icon.style.color = 'var(--error)';
  }
}

async function convertToTeam(eventId) {
  showEnrollAlert(null);
  if (!confirm('Are you sure you want to convert your individual registration into a team? This action cannot be reversed.')) {
    return;
  }

  try {
    const response = await fetch('/api/teams/convert-from-individual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ eventId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to convert registration.');

    showEnrollAlert(`Successfully converted! You are now the Team Leader.`, 'success');
    loadDashboardData();
  } catch (err) {
    console.error(err);
    showEnrollAlert(err.message || 'Error converting registration.', 'error');
  }
}

async function removeRosterMember(teamId, targetId, name, isInvite = false) {
  showEnrollAlert(null);
  const promptMessage = isInvite 
    ? `Are you sure you want to cancel the pending invitation for "${name}"?`
    : `Are you sure you want to remove "${name}" from your team?`;

  if (!confirm(promptMessage)) return;

  try {
    const response = await fetch('/api/teams/remove-member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ teamId, targetUserId: targetId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Operation failed.');

    showEnrollAlert(data.message, 'success');
    loadDashboardData();
  } catch (err) {
    console.error(err);
    showEnrollAlert(err.message || 'Error updating team roster.', 'error');
  }
}

async function cancelTeamRegistration(teamId, isLeader) {
  showEnrollAlert(null);
  const promptMessage = isLeader
    ? "Are you sure you want to disband this team? All members' registrations for this event will be cancelled and the team dissolved."
    : "Are you sure you want to leave this team? Your registration for this event will be cancelled.";

  if (!confirm(promptMessage)) return;

  try {
    const response = await fetch('/api/teams/cancel-registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ teamId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Operation failed.');

    showEnrollAlert(data.message, 'success');
    loadDashboardData();
  } catch (err) {
    console.error(err);
    showEnrollAlert(err.message || 'Error cancelling registration.', 'error');
  }
}
