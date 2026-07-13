document.addEventListener('DOMContentLoaded', () => {
  const formCard = document.getElementById('form-card');
  const successCard = document.getElementById('success-card');
  const form = document.getElementById('registration-form');
  const eventsContainer = document.getElementById('events-container');
  const eventsLoader = document.getElementById('events-loader');
  
  // Password matching elements
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const passwordMatchError = document.getElementById('password-match-error');

  // File upload drag & drop elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('paymentScreenshot');
  const filePreview = document.getElementById('file-preview');
  const previewFilename = document.getElementById('preview-filename');
  const previewFilesize = document.getElementById('preview-filesize');
  const removeFileBtn = document.getElementById('remove-file');
  const uploadPrompt = document.querySelector('.upload-prompt');

  // Submission controls
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');
  const errorPanel = document.getElementById('error-panel');
  const errorMessage = document.getElementById('error-message');

  // Success screen elements
  const successName = document.getElementById('success-name');
  const successRegId = document.getElementById('success-reg-id');

  // Selected file tracker
  let selectedFile = null;

  // --- 1. Dynamic Events Fetching ---
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to load events.');
      const events = await response.json();
      
      eventsLoader.classList.add('hidden');
      
      if (events.length === 0) {
        eventsContainer.innerHTML = '<p class="help-text">No active events found in the database. Please contact the administrator.</p>';
        return;
      }

      // Group events by category
      const categories = {};
      events.forEach(event => {
        if (!categories[event.category]) {
          categories[event.category] = [];
        }
        categories[event.category].push(event);
      });

      // Render grouped events
      for (const [category, catEvents] of Object.entries(categories)) {
        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'events-category-group';

        const title = document.createElement('h4');
        title.className = 'category-title';
        title.textContent = category;
        categoryGroup.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'events-grid';

        catEvents.forEach(event => {
          const card = document.createElement('div');
          card.className = 'event-card';
          
          // Badge text (individual vs team)
          let typeBadge = '';
          if (event.individualAllowed && event.teamAllowed) {
            typeBadge = `Individual / Team (Max ${event.maxMembers})`;
          } else if (event.teamAllowed) {
            typeBadge = `Team Event (Size: ${event.minMembers}-${event.maxMembers})`;
          } else {
            typeBadge = 'Individual Event';
          }

          card.innerHTML = `
            <input type="checkbox" class="event-checkbox" value="${event.eventId}" data-name="${event.name}">
            <div class="event-card-details">
              <span class="event-card-title">${event.name}</span>
              <span class="event-card-desc">${event.description || ''}</span>
              <span class="event-badge">${typeBadge}</span>
            </div>
          `;

          // Card click helper
          card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
              const checkbox = card.querySelector('input');
              checkbox.checked = !checkbox.checked;
              checkbox.dispatchEvent(new Event('change'));
            }
          });

          // Checkbox toggle class helper
          const checkbox = card.querySelector('input');
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
              card.classList.add('checked');
            } else {
              card.classList.remove('checked');
            }
          });

          grid.appendChild(card);
        });

        categoryGroup.appendChild(grid);
        eventsContainer.appendChild(categoryGroup);
      }
    } catch (error) {
      console.error(error);
      eventsLoader.innerHTML = '<span style="color: var(--error);"><i class="fa-solid fa-circle-exclamation"></i> Failed to load events list. Please reload the page.</span>';
    }
  };

  fetchEvents();

  // --- 2. Password Matching Validation ---
  const validatePasswords = () => {
    if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
      passwordMatchError.classList.remove('hidden');
      return false;
    } else {
      passwordMatchError.classList.add('hidden');
      return true;
    }
  };

  passwordInput.addEventListener('input', validatePasswords);
  confirmPasswordInput.addEventListener('input', validatePasswords);

  // --- 3. Drag & Drop File Upload Logic ---
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleFileSelected = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Invalid file type! Only image files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showError('File is too large! Maximum allowed size before upload is 5MB.');
      return;
    }

    selectedFile = file;
    previewFilename.textContent = file.name;
    previewFilesize.textContent = formatBytes(file.size);

    uploadPrompt.classList.add('hidden');
    filePreview.classList.remove('hidden');
    errorPanel.classList.add('hidden');
  };

  // Trigger file selection via browse click
  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && !e.target.closest('#remove-file') && !e.target.closest('#file-preview')) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  // Drag & drop zones
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFileSelected(files[0]);
      // Sync file input files
      fileInput.files = files;
    }
  });

  // Remove selected file
  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
  });

  // --- 4. Error Display helper ---
  const showError = (message) => {
    errorMessage.textContent = message;
    errorPanel.classList.remove('hidden');
    errorPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // --- 5. Form Submission ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorPanel.classList.add('hidden');

    // Double check password validation
    if (!validatePasswords()) {
      showError('Password mismatch. Please check your password fields.');
      return;
    }

    // Gmail Check
    const emailInput = document.getElementById('email').value.trim();
    if (!emailInput.endsWith('@gmail.com')) {
      showError('Registration requires a valid Gmail account (must end with @gmail.com).');
      return;
    }

    // Screenshot check
    if (!selectedFile) {
      showError('Please upload a payment verification screenshot.');
      return;
    }

    // Gather selected events
    const checkedEvents = Array.from(document.querySelectorAll('.event-checkbox:checked'))
      .map(checkbox => checkbox.value);
    
    if (checkedEvents.length === 0) {
      showError('Please select at least one event to register.');
      return;
    }

    // Setup FormData
    const formData = new FormData(form);
    
    // Explicitly add events as JSON array string
    formData.set('events', JSON.stringify(checkedEvents));
    
    // Set file manually in case drop was used
    formData.set('paymentScreenshot', selectedFile);

    // Disable button & show spinner
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        // Try parsing JSON error response
        let errMsg = 'Registration failed. Please verify your inputs.';
        try {
          const jsonError = await response.json();
          errMsg = jsonError.message || errMsg;
        } catch (jsonErr) {
          // Response was not JSON
        }
        throw new Error(errMsg);
      }

      // Successful Registration - Response contains PDF Receipt
      const registrationId = response.headers.get('X-Registration-ID');
      const participantName = response.headers.get('X-Participant-Name');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Auto-trigger PDF receipt download
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `receipt_${registrationId || 'technica'}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Display success card
      successName.textContent = participantName || document.getElementById('name').value;
      successRegId.textContent = registrationId || '------';
      
      formCard.classList.add('hidden');
      successCard.classList.remove('hidden');
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error(error);
      showError(error.message || 'An error occurred while connecting to the server. Please try again.');
      
      // Re-enable button & hide spinner
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  });
});
