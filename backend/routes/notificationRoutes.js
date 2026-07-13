const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const TeamInvitation = require('../models/TeamInvitation');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const auth = require('../middleware/auth');
const { queueRegistrationSync } = require('../services/sheetsService');

// @route   GET /api/notifications
// @desc    Get all notifications for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  const userId = req.user.registrationId;

  try {
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    const result = [];
    for (const notif of notifications) {
      let inviteDetails = null;

      // If it's a team invite, pull the sender, team and event details
      if (notif.type === 'TEAM_INVITE') {
        const invite = await TeamInvitation.findById(notif.referenceId);
        if (invite) {
          const sender = await User.findOne({ registrationId: invite.senderId }).select('name email');
          const event = await Event.findOne({ eventId: invite.eventId }).select('name');
          inviteDetails = {
            invitationId: invite._id,
            teamId: invite.teamId,
            eventId: invite.eventId,
            eventName: event ? event.name : 'Unknown Event',
            senderName: sender ? sender.name : 'Unknown Leader',
            senderEmail: sender ? sender.email : '',
            status: invite.status
          };
        }
      }

      result.push({
        _id: notif._id,
        type: notif.type,
        message: notif.message,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        invitation: inviteDetails
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Fetch notifications error:', error.message);
    res.status(500).json({ message: 'Server error while fetching notifications.' });
  }
});

// @route   POST /api/notifications/:id/respond
// @desc    Respond to an invitation (Accept or Decline)
// @access  Private
router.post('/:id/respond', auth, async (req, res) => {
  const notificationId = req.params.id;
  const { action } = req.body; // 'accept' or 'decline'
  const receiverId = req.user.registrationId;

  try {
    if (!action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Valid action ("accept" or "decline") is required.' });
    }

    // 1. Find and verify notification
    const notification = await Notification.findOne({ _id: notificationId, userId: receiverId });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // 2. Find associated invitation
    const invitation = await TeamInvitation.findById(notification.referenceId);
    if (!invitation) {
      return res.status(404).json({ message: 'Associated invitation not found.' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `This invitation has already been ${invitation.status}.` });
    }

    const team = await Team.findOne({ teamId: invitation.teamId });
    if (!team) {
      return res.status(404).json({ message: 'Associated team not found or deleted.' });
    }

    if (team.status === 'registered') {
      return res.status(400).json({ message: 'The team registration has already been locked by the leader. You cannot join now.' });
    }

    const event = await Event.findOne({ eventId: invitation.eventId });
    const inviteeUser = await User.findOne({ registrationId: receiverId });

    if (action === 'accept') {
      // 3. Double-check if user is already registered for this event
      const alreadyRegistered = await Registration.findOne({ registrationId: receiverId, eventId: invitation.eventId });
      if (alreadyRegistered) {
        invitation.status = 'expired';
        await invitation.save();
        notification.isRead = true;
        await notification.save();
        return res.status(400).json({ message: 'You are already registered for this event. Invitation expired.' });
      }

      // 4. Verify team size limit has not been exceeded
      if (team.memberCount >= event.maxMembers) {
        return res.status(400).json({ message: 'This team is already full. You cannot accept this invite.' });
      }

      // 5. Update invitation
      invitation.status = 'accepted';
      invitation.respondedAt = new Date();
      await invitation.save();

      // 6. Add Invitee as Team Member
      const member = new TeamMember({
        teamId: team.teamId,
        userId: receiverId,
        role: 'Member'
      });
      await member.save();

      // 7. Increment Team Member Count
      team.memberCount += 1;
      await team.save();

      // 8. Create Event Registration for Invitee (in PENDING status during forming phase)
      const registration = new Registration({
        registrationId: receiverId,
        eventId: invitation.eventId,
        teamId: team.teamId,
        registrationType: 'TEAM',
        status: 'PENDING'
      });
      await registration.save();

      // Note: Do NOT sync member registration to sheets yet (only upon Lock/Register Team)

      // 10. Notify Team Leader
      const leaderNotif = new Notification({
        userId: team.leaderId,
        type: 'INVITE_ACCEPTED',
        referenceId: invitation._id,
        message: `${inviteeUser.name} has accepted your invitation to join team "${team.teamId}" for "${event.name}".`
      });
      await leaderNotif.save();

    } else {
      // action === 'decline'
      invitation.status = 'declined';
      invitation.respondedAt = new Date();
      await invitation.save();

      // Notify Team Leader
      const leaderNotif = new Notification({
        userId: team.leaderId,
        type: 'INVITE_DECLINED',
        referenceId: invitation._id,
        message: `${inviteeUser.name} has declined your invitation to join team "${team.teamId}" for "${event.name}".`
      });
      await leaderNotif.save();
    }

    // Mark current user notification as read
    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: action === 'accept' ? 'Invitation accepted! You have joined the team.' : 'Invitation declined.'
    });

  } catch (error) {
    console.error('Respond to invitation error:', error.message);
    res.status(500).json({ message: 'Server error while responding to invitation.' });
  }
});

module.exports = router;
