# Saved Properties, Recently Viewed and Engagement API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

The app's shortlist ("Saved"), "Recently viewed" list, and the numbers a seller sees about their own properties.
Everything is about the caller: there is no user id in any path or body, the owner always comes from the token.

## Authentication and authorization

Every endpoint needs `Authorization: Bearer <accessToken>` (otherwise **401**). Permissions come from the caller's
role, granted to the app `user` role by `V202611211220`:

| Permission (`roles.permissions` key) | Allows |
|---|---|
| `SAVED_PROPERTY_LIST` (`saved_property.list`) | `GET /saved-properties`, `GET /saved-properties/ids` |
| `SAVED_PROPERTY_CREATE` / `SAVED_PROPERTY_DELETE` | save / unsave |
| `RECENTLY_VIEWED_LIST` / `_CREATE` / `_DELETE` (`recently_viewed.*`) | list, record a view, clear |
| `PROPERTY_LIST` / `PROPERTY_VIEW` | the engagement totals / of one own property (see `properties.md`) |

A missing permission is **403** `saved_property_action_forbidden`, `recently_viewed_action_forbidden` or
`property_action_forbidden`. A non-positive id in the path is **400**.

## Saved properties — `/saved-properties`

| Method | Path | Description |
|---|---|---|
| GET | `/saved-properties` | the shortlist as public property cards, newest saved first; `page` (zero-based), `size` (max 100) |
| GET | `/saved-properties/ids` | property ids, newest saved first (at most 500): which cards to show as saved |
| PUT | `/saved-properties/{propertyId}` | save, **204**; idempotent; **404** unless the property is published |
| DELETE | `/saved-properties/{propertyId}` | unsave, **204**; idempotent |

Cards have the shape of `GET /public/properties` items (see `properties.md`). A property that stops being public
(unpublished, suspended, deleted) is skipped when the list is read but keeps its row, so it reappears if it is
published again. Because of that, a page can hold fewer cards than `size`. One row per user and property; writes are
rate limited (600 per hour per user, **429**).

## Recently viewed — `/recently-viewed`

| Method | Path | Description |
|---|---|---|
| GET | `/recently-viewed` | up to 50 public property cards, most recently viewed first; a plain array |
| POST | `/recently-viewed/{propertyId}` | count one view and move it to the top, **204**; **404** unless published |
| DELETE | `/recently-viewed` | clear the caller's history, **204** |

The app records a view when a property detail opens. One row per user and property: `view_count` increases and
`last_viewed_at` moves, so the table never grows per view. Clearing the history does not remove views already counted
for sellers. Rate limit: 1200 per hour per user.

## Seller engagement — `/properties/engagement`, `/properties/{id}/engagement`

```json
{ "views": 3, "uniqueViewers": 2, "saves": 1 }
```

`GET /properties/{id}/engagement` is for one of the caller's own properties (**404** for anyone else's, never 403),
`GET /properties/engagement` sums all the caller's own, non-deleted properties. Counts only, never who viewed or saved.
