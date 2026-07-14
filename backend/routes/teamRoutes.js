const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const TeamInvitation = require('../models/TeamInvitation');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const auth = require('../middleware/auth');
const { queueRegistrationSync } = require('../services/sheetsService');

// Helper: Generate unique Team ID (e.g., T10492)
const generateTeamId = async () => {
  let unique = false;
  let teamId = '';
  while (!unique) {
    const rand = Math.floor(10000 + Math.random() * 90000); // 5-digit number
    teamId = `T${rand}`;
    const existing = await Team.findOne({ teamId });
    if (!existing) unique = true;
  }
  return teamId;
};

// @route   POST /api/teams/create
// @desc    Create a team for an event (Leader is added as member 1)
// @access  Private
router.post('/create', auth, async (req, res) => {
  const { eventId } = req.body;
  const leaderId = req.user.registrationId;

  try {
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required.' });
    }

    // 1. Verify Event exists
    const event = await Event.findOne({ eventId, isActive: true });
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (!event.teamAllowed) {
      return res.status(400).json({ message: `"${event.name}" is an individual-only event and does not support teams.` });
    }

    // 2. Check if leader is already registered in this event
    const existingReg = await Registration.findOne({ registrationId: leaderId, eventId });
    if (existingReg) {
      return res.status(400).json({ message: `You are already registered for "${event.name}". You cannot create a team.` });
    }

    // 3. Generate unique teamId
    const teamId = await generateTeamId();

    // 4. Create Team
    const team = new Team({
      teamId,
      eventId,
      leaderId,
      status: 'forming',
      memberCount: 1
    });
    await team.save();

    // 5. Add Leader to Team Members
    const member = new TeamMember({
      teamId,
      userId: leaderId,
      role: 'Leader'
    });
    await member.save();

    // 6. Create Event Registration for Leader (in PENDING status during forming phase)
    const registration = new Registration({
      registrationId: leaderId,
      eventId,
      teamId,
      registrationType: 'TEAM',
      status: 'PENDING'
    });
    await registration.save();

    // Do NOT sync leader registration to Google Sheets yet (only upon Lock/Register Team)

    res.json({
      success: true,
      message: `Team "${teamId}" successfully created for "${event.name}"! You are the Team Leader.`,
      team
    });

  } catch (error) {
    console.error('Create team error:', error.message);
    res.status(500).json({ message: 'Server error while creating team.' });
  }
});

// @route   POST /api/teams/invite
// @desc    Send an invitation to a participant by email
// @access  Private
router.post('/invite', auth, async (req, res) => {
  const { teamId, inviteeEmail } = req.body;
  const leaderId = req.user.registrationId;

  try {
    if (!teamId || !inviteeEmail) {
      return res.status(400).json({ message: 'Team ID and Invitee Email are required.' });
    }

    // 1. Verify Team exists and user is the Leader
    const team = await Team.findOne({ teamId });
    if (!team) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    if (team.leaderId !== leaderId) {
      return res.status(403).json({ message: 'Access denied. Only the team leader can send invitations.' });
    }

    if (team.status === 'registered') {
      return res.status(400).json({ message: 'Registration is already locked for this team. No more invites allowed.' });
    }

    // Fetch Event to check limits
    const event = await Event.findOne({ eventId: team.eventId });

    // 2. Fetch Invitee Details
    const invitee = await User.findOne({ email: inviteeEmail.toLowerCase().trim() });
    if (!invitee) {
      return res.status(400).json({ message: 'Participant not found. The invitee must register on the platform first.' });
    }

    if (invitee.registrationId === leaderId) {
      return res.status(400).json({ message: 'You cannot invite yourself to the team.' });
    }

    // 3. Verify Invitee is not already registered in this event
    const inviteeReg = await Registration.findOne({ registrationId: invitee.registrationId, eventId: team.eventId });
    if (inviteeReg) {
      return res.status(400).json({ message: `"${invitee.name}" is already registered for this event.` });
    }

    // 4. Verify Invitee doesn't have an active pending invitation for this team
    const existingInvite = await TeamInvitation.findOne({
      teamId,
      receiverId: invitee.registrationId,
      status: 'pending'
    });
    if (existingInvite) {
      return res.status(400).json({ message: `An invitation is already pending for "${invitee.name}" in this team.` });
    }

    // 5. Verify team size limit
    const pendingInvitesCount = await TeamInvitation.countDocuments({ teamId, status: 'pending' });
    if (team.memberCount + pendingInvitesCount >= event.maxMembers) {
      return res.status(400).json({
        message: `Invite blocked. You have reached the maximum team size limit of ${event.maxMembers} (including pending invitations).`
      });
    }

    // 6. Create Invitation
    const invitation = new TeamInvitation({
      teamId,
      eventId: team.eventId,
      senderId: leaderId,
      receiverId: invitee.registrationId,
      status: 'pending'
    });
    await invitation.save();

    // 7. Create Notification for Invitee
    const notification = new Notification({
      userId: invitee.registrationId,
      type: 'TEAM_INVITE',
      referenceId: invitation._id,
      message: `${req.user.name} has invited you to join their team (${teamId}) for "${event.name}".`
    });
    await notification.save();

    res.json({
      success: true,
      message: `Invitation successfully sent to "${invitee.name}"!`
    });

  } catch (error) {
    console.error('Invite member error:', error.message);
    res.status(500).json({ message: 'Server error while sending invitation.' });
  }
});

// @route   POST /api/teams/register
// @desc    Finalize team registration (Team Leader locks team)
// @access  Private
router.post('/register', auth, async (req, res) => {
  const { teamId } = req.body;
  const leaderId = req.user.registrationId;

  try {
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required.' });
    }

    const team = await Team.findOne({ teamId });
    if (!team) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    if (team.leaderId !== leaderId) {
      return res.status(403).json({ message: 'Access denied. Only the team leader can lock team registration.' });
    }

    const event = await Event.findOne({ eventId: team.eventId });
    
    // Validate minimum members
    if (team.memberCount < event.minMembers) {
      return res.status(400).json({
        message: `Cannot register. Your team has only ${team.memberCount} accepted members. The minimum required is ${event.minMembers} (including yourself).`
      });
    }

    // IF team has only 1 member (the leader), register them as INDIVIDUAL instead of team!
    if (team.memberCount === 1) {
      // 1. Fetch leader's registration record
      const leaderReg = await Registration.findOne({ teamId: team.teamId, registrationId: leaderId, eventId: team.eventId });
      if (leaderReg) {
        leaderReg.teamId = null;
        leaderReg.registrationType = 'INDIVIDUAL';
        leaderReg.status = 'CONFIRMED';
        await leaderReg.save();
        
        // Sync individual sheets in background
        queueRegistrationSync(leaderReg, event).catch(err => console.error('[SHEETS BACKGROUND ERROR] Failed to sync leader registration:', err.message));
      }

      // 2. Cancel all pending invitations
      await TeamInvitation.updateMany(
        { teamId: team.teamId, status: 'pending' },
        { status: 'cancelled', respondedAt: new Date() }
      );

      // 3. Disband Team and delete memberships
      await TeamMember.deleteMany({ teamId: team.teamId });
      await Team.deleteOne({ teamId: team.teamId });

      console.log(`[TEAM DISBANDED] Team ${teamId} disbanded due to single member registration. Leader registered solo.`);

      return res.json({
        success: true,
        message: `Since no other participants joined your team, you have been registered as an Individual for "${event.name}". The team has been disbanded.`,
        disbanded: true
      });
    }

    // Otherwise, register as team
    team.status = 'registered';
    await team.save();

    // Update all team member registrations to CONFIRMED
    await Registration.updateMany(
      { teamId, eventId: team.eventId },
      { status: 'CONFIRMED' }
    );

    // Sync Google Sheets for all confirmed team registrations in background
    const confirmedRegs = await Registration.find({ teamId, eventId: team.eventId, status: 'CONFIRMED' });
    for (const reg of confirmedRegs) {
      queueRegistrationSync(reg, event).catch(err => console.error('[SHEETS BACKGROUND ERROR] Failed to sync team member registration:', err.message));
    }

    console.log(`[TEAM REGISTERED] Team ${teamId} locked. Registrations confirmed & Google Sheets queue synced.`);

    res.json({
      success: true,
      message: `Registration locked! Your team "${teamId}" is officially enrolled in "${event.name}".`
    });

  } catch (error) {
    console.error('Finalize team registration error:', error.message);
    res.status(500).json({ message: 'Server error while finalising team registration.' });
  }
});

// @route   POST /api/teams/remove-member
// @desc    Remove team member or cancel pending invitation (Leader only, forming stage only)
// @access  Private
router.post('/remove-member', auth, async (req, res) => {
  const { teamId, targetUserId } = req.body;
  const leaderId = req.user.registrationId;

  try {
    if (!teamId || !targetUserId) {
      return res.status(400).json({ message: 'Team ID and Target User ID are required.' });
    }

    const team = await Team.findOne({ teamId });
    if (!team) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    if (team.leaderId !== leaderId) {
      return res.status(403).json({ message: 'Access denied. Only the team leader can modify the team roster.' });
    }

    if (team.status !== 'forming') {
      return res.status(400).json({ message: 'Roster modifications are only allowed while the team is in the forming status.' });
    }

    if (targetUserId === leaderId) {
      return res.status(400).json({ message: 'The team leader cannot be removed from the team.' });
    }

    const event = await Event.findOne({ eventId: team.eventId });

    // 1. Check if they are an accepted Team Member
    const member = await TeamMember.findOne({ teamId, userId: targetUserId });
    if (member) {
      await TeamMember.deleteOne({ _id: member._id });
      
      // Delete their registration record
      await Registration.deleteOne({ registrationId: targetUserId, eventId: team.eventId });
      
      // Decrement member count
      team.memberCount = Math.max(1, team.memberCount - 1);
      await team.save();

      // Find the associated invitation to cancel
      const inv = await TeamInvitation.findOne({ teamId, receiverId: targetUserId });
      let refId = null;
      if (inv) {
        inv.status = 'cancelled';
        await inv.save();
        refId = inv._id;
      }

      // Notify the removed member
      const notif = new Notification({
        userId: targetUserId,
        type: 'INVITE_DECLINED', // reuse type to denote removal
        referenceId: refId || team._id,
        message: `You have been removed from team "${teamId}" for "${event.name}" by the team leader.`
      });
      await notif.save();

      return res.json({
        success: true,
        message: 'Member successfully removed from your team.'
      });
    }

    // 2. Check if they have a pending Invitation
    const invitation = await TeamInvitation.findOne({ teamId, receiverId: targetUserId, status: 'pending' });
    if (invitation) {
      invitation.status = 'cancelled';
      invitation.respondedAt = new Date();
      await invitation.save();

      // Delete associated notifications for the invitee
      await Notification.deleteMany({ referenceId: invitation._id });

      return res.json({
        success: true,
        message: 'Pending invitation successfully cancelled.'
      });
    }

    return res.status(404).json({ message: 'User is not a member and has no pending invitations in this team.' });

  } catch (error) {
    console.error('Remove member error:', error.message);
    res.status(500).json({ message: 'Server error while removing team member.' });
  }
});

// @route   POST /api/teams/convert-from-individual
// @desc    Convert an individual event registration to a team registration
// @access  Private
router.post('/convert-from-individual', auth, async (req, res) => {
  const { eventId } = req.body;
  const leaderId = req.user.registrationId;

  try {
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required.' });
    }

    const event = await Event.findOne({ eventId, isActive: true });
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (!event.teamAllowed) {
      return res.status(400).json({ message: `"${event.name}" is an individual-only event and does not support teams.` });
    }

    const registration = await Registration.findOne({
      registrationId: leaderId,
      eventId,
      teamId: null,
      registrationType: 'INDIVIDUAL',
      status: 'CONFIRMED'
    });

    if (!registration) {
      return res.status(400).json({ message: 'No active individual registration found for this event to convert.' });
    }

    const teamId = await generateTeamId();

    const team = new Team({
      teamId,
      eventId,
      leaderId,
      status: 'forming',
      memberCount: 1
    });
    await team.save();

    const member = new TeamMember({
      teamId,
      userId: leaderId,
      role: 'Leader'
    });
    await member.save();

    registration.teamId = teamId;
    registration.registrationType = 'TEAM';
    registration.status = 'PENDING';
    await registration.save();

    res.json({
      success: true,
      message: `Successfully converted your registration for "${event.name}" into a team. You can now invite friends.`,
      team
    });

  } catch (error) {
    console.error('Convert registration error:', error.message);
    res.status(500).json({ message: 'Server error while converting registration.' });
  }
});

// @route   GET /api/teams/my-teams
// @desc    Get all teams user is part of (as leader or member)
// @access  Private
router.get('/my-teams', auth, async (req, res) => {
  const registrationId = req.user.registrationId;

  try {
    // 1. Get all memberships for the user
    const memberships = await TeamMember.find({ userId: registrationId });
    const teamIds = memberships.map(m => m.teamId);

    // 2. Fetch team details
    const teams = await Team.find({ teamId: { $in: teamIds } });

    const result = [];
    for (const team of teams) {
      const event = await Event.findOne({ eventId: team.eventId });
      
      // Get all joined members
      const membersList = await TeamMember.find({ teamId: team.teamId });
      const membersDetail = [];
      
      for (const m of membersList) {
        const u = await User.findOne({ registrationId: m.userId }).select('name email whatsapp institution registrationId');
        if (u) {
          membersDetail.push({
            registrationId: u.registrationId,
            name: u.name,
            email: u.email,
            whatsapp: u.whatsapp,
            institution: u.institution,
            role: m.role
          });
        }
      }

      // Get pending invites
      const pendingInvites = await TeamInvitation.find({ teamId: team.teamId, status: 'pending' });
      const invitesDetail = [];
      for (const inv of pendingInvites) {
        const u = await User.findOne({ registrationId: inv.receiverId }).select('name email');
        if (u) {
          invitesDetail.push({
            invitationId: inv._id,
            name: u.name,
            email: u.email,
            registrationId: u.registrationId
          });
        }
      }

      result.push({
        teamId: team.teamId,
        eventId: team.eventId,
        eventName: event ? event.name : 'Unknown Event',
        minMembers: event ? event.minMembers : 1,
        maxMembers: event ? event.maxMembers : 1,
        leaderId: team.leaderId,
        status: team.status,
        memberCount: team.memberCount,
        members: membersDetail,
        pendingInvites: invitesDetail,
        isLeader: team.leaderId === registrationId
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Fetch teams error:', error.message);
    res.status(500).json({ message: 'Server error while fetching your teams.' });
  }
});

// @route   POST /api/teams/cancel-registration
// @desc    Cancel team registration (Disband for Leader, Leave for Member) - forming status only
// @access  Private
router.post('/cancel-registration', auth, async (req, res) => {
  const { teamId } = req.body;
  const userId = req.user.registrationId;

  try {
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required.' });
    }

    const team = await Team.findOne({ teamId });
    if (!team) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    if (team.status !== 'forming') {
      return res.status(400).json({ message: 'Registration cannot be cancelled once the team is locked/registered.' });
    }

    const memberRecord = await TeamMember.findOne({ teamId, userId });
    if (!memberRecord) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this team.' });
    }

    const event = await Event.findOne({ eventId: team.eventId });

    if (memberRecord.role === 'Leader') {
      // 1. Leader disbands the team - cancel all memberships and registrations
      const members = await TeamMember.find({ teamId });
      
      // Delete all registrations for this event/team
      await Registration.deleteMany({ teamId, eventId: team.eventId });

      // Notify other members
      for (const m of members) {
        if (m.userId !== userId) {
          const notif = new Notification({
            userId: m.userId,
            type: 'INVITE_DECLINED',
            referenceId: team._id, // team ID
            message: `Team "${teamId}" for "${event.name}" has been disbanded by the Leader. Your registration was cancelled.`
          });
          await notif.save();
        }
      }

      // Cancel pending invitations
      await TeamInvitation.updateMany(
        { teamId, status: 'pending' },
        { status: 'cancelled', respondedAt: new Date() }
      );

      // Delete team and memberships
      await TeamMember.deleteMany({ teamId });
      await Team.deleteOne({ teamId });

      return res.json({
        success: true,
        message: 'Team successfully disbanded. Your registration has been cancelled.'
      });

    } else {
      // 2. Member leaves the team - remove them and delete their registration
      await TeamMember.deleteOne({ _id: memberRecord._id });
      await Registration.deleteOne({ registrationId: userId, eventId: team.eventId });

      // Decrement team member count
      team.memberCount = Math.max(1, team.memberCount - 1);
      await team.save();

      // Find original invitation and set to declined/cancelled
      const inv = await TeamInvitation.findOne({ teamId, receiverId: userId, status: 'accepted' });
      if (inv) {
        inv.status = 'cancelled';
        await inv.save();
      }

      // Notify Team Leader
      const leaderNotif = new Notification({
        userId: team.leaderId,
        type: 'INVITE_DECLINED',
        referenceId: inv ? inv._id : team._id,
        message: `${req.user.name} has left your team "${teamId}" for "${event.name}".`
      });
      await leaderNotif.save();

      return res.json({
        success: true,
        message: 'You have left the team. Your registration has been cancelled.'
      });
    }

  } catch (error) {
    console.error('Cancel registration error:', error.message);
    res.status(500).json({ message: 'Server error while cancelling registration.' });
  }
});

module.exports = router;
