
const { executeTrigger } = require('./utils');
const { handleOutgoingMessage, enqueueMessage } = require('./outgoing-messages');

const peers = {}; // TODO: keep state about what triggers then last triggered for each peer

const triggers = [
  require('./triggers/acquaintance').trigger,
  require('./triggers/attachments').trigger,
  require('./triggers/goal').trigger,
  require('./triggers/gratitude').trigger,
  require('./triggers/greeting').trigger,
  require('./triggers/undefined-question').trigger,
  require('./triggers/well-being').trigger,
  require('./triggers/who-multiple').trigger,
  require('./triggers/who-singular').trigger,
];

const token = require('fs').readFileSync('token', 'utf-8').trim();
const { VK } = require('vk-io');
const vk = new VK({ token });

vk.updates.on(['message_new'], async (request) => {
  let peerState;
  const peerId = request?.peerId;
  if (peers && peerId) {
    peerState = peers[peerId] ??= {};
  }

  if (peerState && !peerState.history) {
    // Load the last 100 messages for the first time
    try {
      const response = await vk.api.messages.getHistory({
        peer_id: peerId,
        count: 100
      });
      // Store the loaded history in the peers object
      peerState.history = response.items;

      console.log(`History for peer ${peerId} (loaded from server): `, JSON.stringify(peerState.history, null, 2));
    } catch (error) {
      console.error(`An error occurred while loading message history for peer ${peerId}:`, error);
    }
  } else if (peerState) {
    // Add the incoming message to the history
    // You may need to adjust the message structure below based on the actual VK API response structure
    peerState.history.unshift({
      id: context.id,
      date: context.date,
      peer_id: peerId,
      from_id: context.senderId,
      text: context.text,
      attachments: context.attachments,
      important: context.important,
      random_id: context.randomId,
      // ... Add other fields you need from the message object
      // Make sure to maintain consistency with the format returned by messages.getHistory
    });

    // Ensure we only keep the last 100 messages
    peerState.history = peerState.history.slice(0, 100);

    console.log(`History for peer ${peerId}: (updated by message event)`, JSON.stringify(peerState.history, null, 2));
  }

  for (const trigger of triggers) {
    await executeTrigger(trigger, { vk, request, states: peers });
  }
});

vk.updates.start().catch(console.error);

const ms = 1;
const second = 1000 * ms;
const minute = 60 * second;

const messagesHandlerInterval = setInterval(handleOutgoingMessage, second);

const { trigger: setOnlineStatusTrigger } = require('./triggers/set-online-status');
const setOnlineStatusInterval = setInterval(async () => {
  await executeTrigger(setOnlineStatusTrigger, { vk });
}, 14 * minute);

const { trigger: acceptFriendRequestsTrigger } = require('./triggers/accept-friend-requests');
const acceptFriendRequestsInterval = setInterval(async () => {
  await executeTrigger(acceptFriendRequestsTrigger, { vk });
}, 5 * minute);

const { trigger: deleteDeactivatedFriendsTrigger } = require('./triggers/delete-deactivated-friends');
const deleteDeactivatedFriendsInterval = setInterval(async () => {
  await executeTrigger(deleteDeactivatedFriendsTrigger, { vk });
}, 20 * minute);

const { trigger: reactToCancelledFriendships } = require('./triggers/react-to-cancelled-friendships');
const reactToCancelledFriendshipsInterval = setInterval(async () => {
  await executeTrigger(reactToCancelledFriendships, { vk, options: { maxRequests: 20 }, states: peers });
}, 2 * minute);

// const { trigger: deleteOutgoingFriendRequestsTrigger } = require('./triggers/delete-outgoing-requests');
// const deleteOutgoingFriendRequestsInterval = setInterval(async () => {
//   await executeTrigger(deleteOutgoingFriendRequestsTrigger, { vk, options: { maxRequests: 20 } });
// }, 8 * minute);

const { trigger: sendInvitationPostsForFriendsTrigger } = require('./triggers/send-invitation-posts-for-friends');
const sendInvitationPostsForFriendsInterval = setInterval(async () => {
  await executeTrigger(sendInvitationPostsForFriendsTrigger, { vk });
}, 1 * 60 * minute);

let lastBirthday;
const { trigger: sendBirthDayCongratulationsTrigger } = require('./triggers/send-birthday-congratulations');
const sendBirthDayCongratulationsInterval = setInterval(async () => {
  const now = new Date();
  const currentDay = now.getDate();
  if (currentDay != lastBirthday) {
    lastBirthday = currentDay;
    await executeTrigger(sendBirthDayCongratulationsTrigger, { vk });
  }
}, 14 * 60 * minute);
