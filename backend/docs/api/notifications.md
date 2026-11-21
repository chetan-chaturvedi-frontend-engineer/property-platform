# Notifications API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

The caller's in-app notifications (the app's bell). Clients only read, mark read and delete: the server creates them
from domain events. The owner always comes from the token; there is no user id in any path or body.

## Authentication and authorization

Every endpoint needs `Authorization: Bearer <accessToken>` (otherwise **401**). Permissions come from the caller's
role, granted to the app `user` role by `V202611211310`:

| Permission (`roles.permissions` key) | Allows |
|---|---|
| `NOTIFICATION_LIST` (`notification.list`) | `GET /notifications`, `GET /notifications/unread-count` |
| `NOTIFICATION_UPDATE` (`notification.update`) | mark one or all read |
| `NOTIFICATION_DELETE` (`notification.delete`) | delete one |

A missing permission is **403** `notification_action_forbidden`. Someone else's, deleted or unknown notification is
**404** `notification_not_found` (never 403, so ids cannot be probed). A non-positive id is **400**. Writes are rate
limited (600 per hour per user, **429**).

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | newest first; `unread=true` for unread only; `page` (zero-based), `size` (max 100) |
| GET | `/notifications/unread-count` | `{ "unread": 3 }`, for the badge |
| PATCH | `/notifications/{id}/read` | mark read; idempotent (the first read time stays); returns the notification |
| POST | `/notifications/read-all` | mark every unread one read, **204**; idempotent |
| DELETE | `/notifications/{id}` | delete, **204** |

```json
{ "content": [ { "id": 12, "type": "site_visit_booked", "title": "New site visit booked",
    "body": "Alice Kumar booked a visit to Green Acres on 24 Nov 2026 at 2:00 PM.",
    "data": { "propertyId": 25, "visitId": 7 }, "read": false, "createdAt": "2026-11-21T10:00:00Z" } ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }
```

`data` holds ids for deep links, never personal details; it is `null` when empty.

## What creates a notification

| Event | `type` | Who is notified |
|---|---|---|
| A visitor books a site visit on a published property | `site_visit_booked` | the builder ("New site visit booked") and the visitor ("Site visit booked") |
| Someone other than the owner approves, rejects, publishes or suspends a property | `property_status_changed` | the owner; the body names the property and the reason, if any |
| A message arrives for someone with no unread messages in that conversation | `new_message` | the recipient; the body is "Sender (Property): preview" and `data` has `conversationId` and `propertyId`. Further messages in the same unread stretch add no notification |

Creation runs after the originating transaction committed (`@TransactionalEventListener` `AFTER_COMMIT`) and off the
request thread, so a notification failure can never undo a booking or a review decision. A user who switched
notifications off in their settings (`notificationEnabled = false`) receives none. Adding a type needs the Java enum
value, the `chk_notifications_type` constraint and a producer.
