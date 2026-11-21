# Conversations API (enquiry chat)

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

A buyer asks the owner of a published property ("Enquire now") and the two exchange text messages. One conversation
per buyer and property. Only the two participants can see or write to it; everyone else gets **404**
`conversation_not_found` (never 403, so ids cannot be probed). Other users are only ever `{ id, fullName }`: no email,
no phone. The app polls for new messages (`after=<id>`); there is no push channel.

## Authentication and authorization

Every endpoint needs `Authorization: Bearer <accessToken>` (otherwise **401**). Permissions come from the caller's
role, granted to the app `user` role by `V202611221020`:

| Permission (`roles.permissions` key) | Allows |
|---|---|
| `CONVERSATION_LIST` (`conversation.list`) | inbox, unread count |
| `CONVERSATION_CREATE` (`conversation.create`) | start a conversation (together with `MESSAGE_CREATE`) |
| `CONVERSATION_UPDATE` (`conversation.update`) | mark read |
| `MESSAGE_LIST` / `MESSAGE_CREATE` (`message.*`) | read messages / send them |

A missing permission is **403** `conversation_action_forbidden`. A non-positive id is **400**. Starting is limited to
30 per hour and sending or marking read to 600 per hour per user (**429**).

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/conversations` | Enquire now: `{ "propertyId": 25, "message": "Is it available?" }`. **201** when new, **200** when the caller already had a conversation about that property (the message is added to it). Returns the conversation |
| GET | `/conversations` | the caller's inbox as buyer or owner, most recently active first; `page` (zero-based), `size` (max 100) |
| GET | `/conversations/unread-count` | `{ "unread": 3 }` across all conversations, for the Chats badge |
| GET | `/conversations/{id}/messages` | oldest first; see below |
| POST | `/conversations/{id}/messages` | `{ "body": "..." }`, **201** with the message |
| POST | `/conversations/{id}/read` | everything counts as read by the caller, **204**; idempotent, never moves the marker back |

`POST /conversations` is **400** (with `errors.propertyId`) for an unknown or unpublished property and for the caller's own
property. Messages are 1 to 2000 characters, trimmed, never edited or deleted. Unknown fields are **400**.

### Messages cursor

`GET /conversations/{id}/messages?size=50` returns the newest `size` (default 50, max 100) oldest first.
`after=<messageId>` returns the messages newer than that id: what polling asks for, usually an empty array.
`before=<messageId>` returns the `size` messages older than it, for scrolling back.

```json
[ { "id": 31, "conversationId": 4, "mine": false, "body": "Is it still available?", "createdAt": "2026-11-22T09:00:00Z" } ]
```

`mine` is the caller's point of view; sender ids are never exposed.

### Conversation

```json
{ "id": 4, "property": { "id": 25, "projectName": "Green Acres", "slug": "green-acres" },
  "otherParty": { "id": 9, "fullName": "Olivia Owner" }, "role": "buyer",
  "lastMessage": { "id": 31, "body": "Yes, come by on Saturday.", "mine": false, "createdAt": "2026-11-22T09:05:00Z" },
  "unread": 1, "lastMessageAt": "2026-11-22T09:05:00Z" }
```

`role` is the caller's side (`buyer` asked about the property, `seller` owns it). `unread` counts the other side's messages
newer than the caller's read marker: the highest message id each side has seen is kept per conversation, so counts are
exact and need no per-message flags.

## Notifications

A message sent to someone with no unread messages in that conversation creates a `new_message` notification for them
(see `notifications.md`); further messages in the same unread stretch do not, so a busy chat does not flood the bell.
