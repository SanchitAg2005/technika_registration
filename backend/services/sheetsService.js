const { google } = require('googleapis');
const SheetsQueue = require('../models/SheetsQueue');

let sheetsClient = global.mockSheetsClient || null;
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;

const isConfigured = 
  global.mockSheetsClient ? true : (
  serviceEmail && 
  privateKey && 
  spreadsheetId &&
  !serviceEmail.includes('dummy') &&
  !privateKey.includes('dummy') &&
  !spreadsheetId.includes('dummy')
  );

if (isConfigured && !global.mockSheetsClient) {
  try {
    let cleanKey = privateKey;
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
      cleanKey = cleanKey.substring(1, cleanKey.length - 1);
    }
    const auth = new google.auth.JWT(
      serviceEmail,
      null,
      cleanKey.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    sheetsClient = google.sheets({ version: 'v4', auth });
    console.log('Google Sheets service initialized successfully.');
  } catch (error) {
    console.error('Google Sheets auth initialization failed:', error.message);
  }
} else if (!isConfigured) {
  console.warn('WARNING: Google Sheets API is not configured. Sync tasks will be mocked for local testing.');
}

/**
 * Queue a participant sync task
 * @param {Object} user - User document
 */
const queueParticipantSync = async (user) => {
  try {
    const payload = {
      registrationId: user.registrationId,
      name: user.name,
      age: user.age,
      gender: user.gender,
      email: user.email,
      whatsapp: user.whatsapp,
      institution: user.institution,
      course: user.course,
      semester: user.semester,
      utr: user.paymentUTR,
      screenshotUrl: user.paymentScreenshotUrl,
      registeredAt: user.createdAt,
    };

    const task = new SheetsQueue({
      registrationId: user.registrationId,
      type: 'PARTICIPANT',
      data: payload,
    });
    await task.save();
    
    // Proactively trigger and await processing of this single task to ensure it finishes before function exits
    await processSingleTask(task);
  } catch (error) {
    console.error('Failed to queue participant sync:', error.message);
  }
};

/**
 * Queue a registration (event enrollment) sync task
 * @param {Object} registration - Registration document
 * @param {Object} event - Event details
 */
const queueRegistrationSync = async (registration, event) => {
  try {
    const payload = {
      registrationId: registration.registrationId,
      eventId: registration.eventId,
      eventName: event.name,
      registrationType: registration.registrationType,
      teamId: registration.teamId || 'N/A',
      leaderId: registration.registrationType === 'TEAM' ? (registration.teamId ? 'Invite-only' : 'N/A') : 'N/A',
    };

    const task = new SheetsQueue({
      registrationId: registration.registrationId,
      type: 'REGISTRATION',
      data: payload,
    });
    await task.save();

    // Proactively trigger and await processing of this single task to ensure it finishes before function exits
    await processSingleTask(task);
  } catch (error) {
    console.error('Failed to queue registration sync:', error.message);
  }
};

const creatingSheets = {};

/**
 * Helper to ensure a sheet tab exists in Google Sheets, creating it and adding headers if missing.
 */
const ensureSheetExists = async (sheetName) => {
  if (creatingSheets[sheetName]) {
    await creatingSheets[sheetName];
    return;
  }

  creatingSheets[sheetName] = (async () => {
    try {
      const metadata = await sheetsClient.spreadsheets.get({
        spreadsheetId
      });
      const sheetTitles = (metadata.data.sheets || []).map(s => s.properties.title);
      if (!sheetTitles.includes(sheetName)) {
        console.log(`Sheet "${sheetName}" not found. Creating programmatically...`);
        await sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName
                  }
                }
              }
            ]
          }
        });
        console.log(`Sheet "${sheetName}" created successfully.`);

        let headers;
        if (sheetName === 'Participants') {
          headers = [['Registration ID', 'Name', 'Age', 'Gender', 'Email', 'WhatsApp', 'Institution', 'Course', 'Semester', 'UTR', 'Screenshot URL', 'Registered At']];
        } else if (sheetName === 'Registrations') {
          headers = [['Registration ID', 'Event ID', 'Event Name', 'Registration Type', 'Team ID', 'Leader ID']];
        } else if (sheetName === 'Team Event Details') {
          headers = [['Event Name', 'Team ID', 'Leader Name', 'Member Names']];
        } else if (sheetName === 'Participant Enrollments') {
          headers = [['Registration ID', 'Participant Name', 'Email', 'WhatsApp No', 'Event Name', 'Registration Type', 'Team ID']];
        }

        await sheetsClient.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: headers }
        });
        console.log(`Headers appended to "${sheetName}" sheet.`);
      }
    } catch (err) {
      console.error(`Error checking/creating sheet "${sheetName}":`, err.message);
    }
  })();

  try {
    await creatingSheets[sheetName];
  } finally {
    delete creatingSheets[sheetName];
  }
};

/**
 * Process a single queue task
 * @param {Object} task - SheetsQueue document
 */
const processSingleTask = async (task) => {
  if (!isConfigured || !sheetsClient) {
    // Mock successful sync for testing when API is not configured
    task.status = 'SUCCESS';
    task.processedAt = new Date();
    await task.save();
    console.log(`[MOCK SYNC] Successfully synced ${task.type} for ID: ${task.registrationId} to Google Sheets`);
    return;
  }

  try {
    let range = '';
    let values = [];

    if (task.type === 'PARTICIPANT') {
      range = 'Participants!A:L';
      const d = task.data;
      values = [[
        d.registrationId,
        d.name,
        d.age,
        d.gender,
        d.email,
        d.whatsapp,
        d.institution,
        d.course,
        d.semester,
        d.utr,
        d.screenshotUrl,
        new Date(d.registeredAt).toLocaleString()
      ]];
    } else if (task.type === 'REGISTRATION') {
      range = 'Registrations!A:F';
      const d = task.data;
      values = [[
        d.registrationId,
        d.eventId,
        d.eventName,
        d.registrationType,
        d.teamId,
        d.leaderId
      ]];
    }

    const sheetName = task.type === 'PARTICIPANT' ? 'Participants' : 'Registrations';
    await ensureSheetExists(sheetName);

    // Idempotent search: Check if row already exists to update it rather than appending
    let rowIndex = -1;
    if (task.type === 'PARTICIPANT') {
      try {
        const checkRes = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: 'Participants!A:A'
        });
        const rows = checkRes.data.values || [];
        for (let i = 0; i < rows.length; i++) {
          if (rows[i][0] === task.registrationId) {
            rowIndex = i + 1;
            break;
          }
        }
      } catch (err) {
        console.warn('[SHEETS] Participant check failed, appending instead:', err.message);
      }
      
      if (rowIndex !== -1) {
        range = `Participants!A${rowIndex}:L${rowIndex}`;
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          resource: { values }
        });
        console.log(`[SYNC UPDATE] Updated existing Participant row ${rowIndex} for ID: ${task.registrationId}`);
      } else {
        await sheetsClient.spreadsheets.values.append({
          spreadsheetId,
          range: 'Participants!A:L',
          valueInputOption: 'USER_ENTERED',
          resource: { values }
        });
        console.log(`[SYNC APPEND] Appended new Participant row for ID: ${task.registrationId}`);
      }

    } else if (task.type === 'REGISTRATION') {
      try {
        const checkRes = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: 'Registrations!A:B'
        });
        const rows = checkRes.data.values || [];
        for (let i = 0; i < rows.length; i++) {
          if (rows[i][0] === task.data.registrationId && rows[i][1] === task.data.eventId) {
            rowIndex = i + 1;
            break;
          }
        }
      } catch (err) {
        console.warn('[SHEETS] Registration check failed, appending instead:', err.message);
      }

      if (rowIndex !== -1) {
        range = `Registrations!A${rowIndex}:F${rowIndex}`;
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          resource: { values }
        });
        console.log(`[SYNC UPDATE] Updated existing Registration row ${rowIndex} for ID: ${task.registrationId}`);
      } else {
        await sheetsClient.spreadsheets.values.append({
          spreadsheetId,
          range: 'Registrations!A:F',
          valueInputOption: 'USER_ENTERED',
          resource: { values }
        });
        console.log(`[SYNC APPEND] Appended new Registration row for ID: ${task.registrationId}`);
      }
    }

    // === NEW SHEETS SYNC SECTION ===
    // 1. Participant Enrollments Sync
    if (task.type === 'REGISTRATION') {
      try {
        const User = require('../models/User');
        const user = await User.findOne({ registrationId: task.registrationId });
        if (user) {
          const participantRow = [[
            user.registrationId,
            user.name,
            user.email,
            user.whatsapp,
            task.data.eventName,
            task.data.registrationType,
            task.data.teamId || 'N/A'
          ]];

          await ensureSheetExists('Participant Enrollments');

          // Idempotent search: Check if row already exists based on Registration ID (col A) and Event Name (col E)
          let eRowIndex = -1;
          try {
            const checkERes = await sheetsClient.spreadsheets.values.get({
              spreadsheetId,
              range: 'Participant Enrollments!A:E'
            });
            const eRows = checkERes.data.values || [];
            for (let i = 0; i < eRows.length; i++) {
              if (eRows[i] && eRows[i][0] === user.registrationId && eRows[i][4] === task.data.eventName) {
                eRowIndex = i + 1;
                break;
              }
            }
          } catch (err) {
            console.warn('[SHEETS] Participant Enrollments check failed:', err.message);
          }

          if (eRowIndex !== -1) {
            await sheetsClient.spreadsheets.values.update({
              spreadsheetId,
              range: `Participant Enrollments!A${eRowIndex}:G${eRowIndex}`,
              valueInputOption: 'USER_ENTERED',
              resource: { values: participantRow }
            });
            console.log(`[SYNC UPDATE] Updated Participant Enrollments row ${eRowIndex} for ID: ${user.registrationId}, Event: ${task.data.eventName}`);
          } else {
            await sheetsClient.spreadsheets.values.append({
              spreadsheetId,
              range: 'Participant Enrollments!A:G',
              valueInputOption: 'USER_ENTERED',
              resource: { values: participantRow }
            });
            console.log(`[SYNC APPEND] Appended Participant Enrollments row for ID: ${user.registrationId}, Event: ${task.data.eventName}`);
          }
        }
      } catch (err) {
        console.error('[SHEETS] Failed to sync to Participant Enrollments:', err.message);
      }
    }

    // Update Participant Enrollments when Participant profile changes
    if (task.type === 'PARTICIPANT') {
      try {
        const User = require('../models/User');
        const user = await User.findOne({ registrationId: task.registrationId });
        if (user) {
          await ensureSheetExists('Participant Enrollments');
          let existingRows = [];
          try {
            const checkERes = await sheetsClient.spreadsheets.values.get({
              spreadsheetId,
              range: 'Participant Enrollments!A:G'
            });
            existingRows = checkERes.data.values || [];
          } catch (err) {
            console.warn('[SHEETS] Participant Enrollments check failed during profile sync:', err.message);
          }

          for (let i = 0; i < existingRows.length; i++) {
            if (existingRows[i] && existingRows[i][0] === user.registrationId) {
              const rowIndex = i + 1;
              const updatedRow = [[
                user.registrationId,
                user.name,
                user.email,
                user.whatsapp,
                existingRows[i][4], // Keep original Event Name
                existingRows[i][5], // Keep original Registration Type
                existingRows[i][6]  // Keep original Team ID
              ]];
              await sheetsClient.spreadsheets.values.update({
                spreadsheetId,
                range: `Participant Enrollments!A${rowIndex}:G${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: updatedRow }
              });
              console.log(`[SYNC UPDATE PROFILE] Updated Participant Enrollments row ${rowIndex} profile fields for ID: ${user.registrationId}`);
            }
          }
        }
      } catch (err) {
        console.error('[SHEETS] Failed to sync profile updates to Participant Enrollments:', err.message);
      }
    }

    // 2. Team Event Details Sync
    // This sheet is updated only for REGISTRATION task types if it is a TEAM registration.
    if (task.type === 'REGISTRATION' && task.data && task.data.registrationType === 'TEAM') {
      try {
        const Team = require('../models/Team');
        const TeamMember = require('../models/TeamMember');
        const Event = require('../models/Event');
        const User = require('../models/User');

        const teamId = task.data.teamId;
        if (teamId && teamId !== 'N/A' && teamId !== 'Invite-only') {
          const team = await Team.findOne({ teamId });
          if (team) {
            const members = await TeamMember.find({ teamId });
            const event = await Event.findOne({ eventId: team.eventId });
            const eventName = event ? event.name : task.data.eventName;

            // Fetch Leader Name
            const leaderUser = await User.findOne({ registrationId: team.leaderId });
            const leaderName = leaderUser ? leaderUser.name : 'Unknown';

            // Fetch names of other team members
            const otherMembers = members.filter(m => m.role !== 'Leader');
            const memberNamesList = [];
            for (const m of otherMembers) {
              const u = await User.findOne({ registrationId: m.userId });
              if (u) memberNamesList.push(u.name);
            }
            const memberNamesString = memberNamesList.join(', ');

            const teamRow = [[
              eventName,
              teamId,
              leaderName,
              memberNamesString || 'None'
            ]];

            await ensureSheetExists('Team Event Details');

            let existingRows = [];
            try {
              const checkRes = await sheetsClient.spreadsheets.values.get({
                spreadsheetId,
                range: 'Team Event Details!A:D'
              });
              existingRows = checkRes.data.values || [];
            } catch (err) {
              console.warn('[SHEETS] Team Event Details check failed:', err.message);
            }

            // Search for existing row with teamId in column B (index 1)
            let rowIndex = -1;
            for (let i = 0; i < existingRows.length; i++) {
              if (existingRows[i] && existingRows[i][1] === teamId) {
                rowIndex = i + 1;
                break;
              }
            }

            if (rowIndex !== -1) {
              await sheetsClient.spreadsheets.values.update({
                spreadsheetId,
                range: `Team Event Details!A${rowIndex}:D${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: teamRow }
              });
              console.log(`[SYNC UPDATE] Updated Team Event Details row ${rowIndex} for Team: ${teamId}`);
            } else {
              await sheetsClient.spreadsheets.values.append({
                spreadsheetId,
                range: 'Team Event Details!A:D',
                valueInputOption: 'USER_ENTERED',
                resource: { values: teamRow }
              });
              console.log(`[SYNC APPEND] Appended Team Event Details row for Team: ${teamId}`);
            }
          }
        }
      } catch (err) {
        console.error('[SHEETS] Failed to sync Team Event Details:', err.message);
      }
    }

    task.status = 'SUCCESS';
    task.processedAt = new Date();
    task.errorMessage = null;
    await task.save();
    console.log(`[SYNC] Synced ${task.type} for ID: ${task.registrationId} to Google Sheets`);
  } catch (error) {
    task.status = 'FAILED';
    task.retryCount += 1;
    task.errorMessage = error.message;
    await task.save();
    console.error(`[SYNC FAILED] Error syncing ${task.type} for ID: ${task.registrationId}:`, error.message);
    throw error;
  }
};

/**
 * Periodically process failed or pending sync tasks in the queue (retries)
 */
const startQueueWorker = () => {
  if (process.env.VERCEL) {
    console.log('[SHEETS WORKER] Running in Vercel environment. Background intervals and automatic database reconciliation are disabled.');
    return;
  }

  // On startup, reset all failed tasks back to PENDING so they are retried now that credentials are fixed!
  SheetsQueue.updateMany(
    { status: 'FAILED' },
    { status: 'PENDING', retryCount: 0, errorMessage: null }
  ).then(res => {
    if (res.modifiedCount > 0) {
      console.log(`[SHEETS WORKER] Reset ${res.modifiedCount} failed sync tasks back to PENDING for retry.`);
    }
  }).catch(err => {
    console.error('[SHEETS WORKER] Failed to reset failed tasks:', err.message);
  });

  // Reconcile database to SheetsQueue on boot to sync manual Atlas/Compass modifications
  setTimeout(async () => {
    try {
      console.log('[SHEETS WORKER] Starting database sync reconciliation...');
      const User = require('../models/User');
      const Registration = require('../models/Registration');
      const Event = require('../models/Event');

      // Sync all users
      const users = await User.find({});
      for (const u of users) {
        const existingTask = await SheetsQueue.findOne({ registrationId: u.registrationId, type: 'PARTICIPANT' });
        if (!existingTask) {
          await queueParticipantSync(u);
        } else {
          // Force queue a fresh task to sync manual updates (it will overwrite the sheet row cleanly)
          const task = new SheetsQueue({
            registrationId: u.registrationId,
            type: 'PARTICIPANT',
            data: {
              registrationId: u.registrationId,
              name: u.name,
              age: u.age,
              gender: u.gender,
              email: u.email,
              whatsapp: u.whatsapp,
              institution: u.institution,
              course: u.course,
              semester: u.semester,
              utr: u.paymentUTR,
              screenshotUrl: u.paymentScreenshotUrl,
              registeredAt: u.createdAt
            }
          });
          await task.save();
          processSingleTask(task).catch(err => {});
        }
      }

      // Sync all confirmed registrations
      const regs = await Registration.find({ status: 'CONFIRMED' });
      for (const r of regs) {
        const ev = await Event.findOne({ eventId: r.eventId });
        if (ev) {
          const existingTask = await SheetsQueue.findOne({ 
            registrationId: r.registrationId, 
            type: 'REGISTRATION', 
            'data.eventId': r.eventId 
          });
          if (!existingTask) {
            await queueRegistrationSync(r, ev);
          } else {
            existingTask.status = 'PENDING';
            existingTask.retryCount = 0;
            await existingTask.save();
            await processSingleTask(existingTask).catch(err => {
              console.error(`[SHEETS WORKER] Registration sync failed for ID: ${existingTask.registrationId}:`, err.message);
            });
          }
        }
      }
      console.log(`[SHEETS WORKER] Reconciliation complete. Checked ${users.length} users and ${regs.length} registrations.`);
    } catch (err) {
      console.error('[SHEETS WORKER] Database reconciliation failed:', err.message);
    }
  }, 5000); // 5 seconds delay to allow DB connection to finalize

  // Run every 2 minutes
  setInterval(async () => {
    try {
      const pendingTasks = await SheetsQueue.find({
        status: { $in: ['PENDING', 'FAILED'] },
        retryCount: { $lt: 5 }, // Maximum 5 retries
      }).limit(15); // Process 15 at a time to prevent rate limiting issues

      if (pendingTasks.length > 0) {
        console.log(`Google Sheets worker found ${pendingTasks.length} pending sync tasks.`);
        for (const task of pendingTasks) {
          try {
            await processSingleTask(task);
          } catch (err) {
            // Error logged by processSingleTask, continue to next task
          }
        }
      }
    } catch (error) {
      console.error('Google Sheets worker execution failed:', error.message);
    }
  }, 120000);
};

module.exports = {
  queueParticipantSync,
  queueRegistrationSync,
  startQueueWorker,
};
