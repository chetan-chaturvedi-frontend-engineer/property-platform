# Subscription Plans API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

The plan catalog (`subscription_plans`). A plan is the package a user subscribes to: price, billing
period, limits and a display-only feature list. Plans are global (no owner) and are **never deleted**:
they are retired with status `inactive`. There is no separate packages or features table.

User subscriptions (`user_subscriptions`) copy the plan's terms when they are created, so editing a plan
or changing its status never affects existing subscribers. There is no admin endpoint for subscriptions.

## Authentication and authorization

Every endpoint needs a staff session (`POST /api/v1/admin/login`); otherwise **401**.
`/api/v1/admin/**` also requires `ADMIN_PANEL_ACCESS`; each endpoint adds its own permission, otherwise
**403**.

| Permission (`roles.permissions` key)                                  | Allows                                        |
| --------------------------------------------------------------------- | --------------------------------------------- |
| `SUBSCRIPTION_PLAN_LIST` (`subscription_plan.list`)                   | `GET /admin/subscription-plans`               |
| `SUBSCRIPTION_PLAN_VIEW` (`subscription_plan.view`)                   | `GET /admin/subscription-plans/{id}`          |
| `SUBSCRIPTION_PLAN_CREATE` (`subscription_plan.create`)               | `POST /admin/subscription-plans`              |
| `SUBSCRIPTION_PLAN_UPDATE` (`subscription_plan.update`)               | `PATCH /admin/subscription-plans/{id}`        |
| `SUBSCRIPTION_PLAN_CHANGE_STATUS` (`subscription_plan.change_status`) | `PATCH /admin/subscription-plans/{id}/status` |

## Plan (response)

Every endpoint returns this shape (the list wraps it in the page envelope).

| Field                    | Type                              | Notes                                                   |
| ------------------------ | --------------------------------- | ------------------------------------------------------- |
| `id`                     | number                            |                                                         |
| `icon`                   | string \| null                    | UI icon identifier, e.g. `crown` or `mdi:star-outline`  |
| `photo`                  | string \| null                    | object storage key or `https://` URL                    |
| `title`                  | string                            |                                                         |
| `slug`                   | string                            | unique                                                  |
| `price`                  | number                            | two decimals, `>= 0`                                    |
| `currency`               | string                            | ISO 4217, default `INR`                                 |
| `billingInterval`        | `month` \| `year` \| `lifetime`   |                                                         |
| `billingIntervalCount`   | number                            | 1-36; always 1 for `lifetime` (3 x `month` = quarterly) |
| `description`            | string \| null                    |                                                         |
| `noOfProperties`         | number \| null                    | active listing limit; `null` = unlimited                |
| `noOfTeamMembers`        | number                            | builder team seats; `0` = team management not included  |
| `features`               | string[]                          | display only, not used for gating                       |
| `status`                 | `draft` \| `active` \| `inactive` | only `active` plans can be subscribed to                |
| `popular`                | boolean                           | highlighted plan                                        |
| `sortOrder`              | number                            | display order, ascending                                |
| `trialDays`              | number                            |                                                         |
| `createdAt`, `updatedAt` | ISO-8601 UTC                      |                                                         |

## Endpoints

### `GET /admin/subscription-plans`

Paged list (`PageResponse`: `content`, `page`, `size`, `totalElements`, `totalPages`).

| Query                      | Notes                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page`, `size`             | zero-based page; size max 100                                                                                                                          |
| `sort`                     | `field,asc\|desc`; fields `sortOrder`, `title`, `price`, `createdAt`, `updatedAt`, otherwise 400 `sort`. Default `sortOrder,asc` then `createdAt,desc` |
| `search`                   | max 100; title or slug, case-insensitive substring                                                                                                     |
| `status`                   | `draft`, `active` or `inactive`                                                                                                                        |
| `billingInterval`          | `month`, `year` or `lifetime`                                                                                                                          |
| `popular`                  | `true` / `false`                                                                                                                                       |
| `minPrice`, `maxPrice`     | inclusive; `maxPrice < minPrice` is 400 `maxPrice`                                                                                                     |
| `createdFrom`, `createdTo` | ISO-8601 instants, inclusive; `createdTo < createdFrom` is 400 `createdTo`                                                                             |

All given filters must match.

### `GET /admin/subscription-plans/{id}`

**404** `subscription_plan_not_found`.

### `POST /admin/subscription-plans` → 201

| Field                  | Rules                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `title`                | required, max 100                                                                                  |
| `price`                | required, `>= 0`, max 12 integer digits and 2 decimals                                             |
| `slug`                 | optional, max 120, `^[a-z0-9]+(-[a-z0-9]+)*$`; generated from the title when omitted               |
| `icon`                 | max 100, `^[A-Za-z0-9][A-Za-z0-9_.:-]*$`                                                           |
| `photo`                | max 2048, storage key without `..` or `https://` URL                                               |
| `currency`             | 3 uppercase letters, a valid ISO 4217 code; default `INR`                                          |
| `billingInterval`      | default `month`                                                                                    |
| `billingIntervalCount` | 1-36, default 1; must be 1 for `lifetime`                                                          |
| `description`          | max 5000                                                                                           |
| `noOfProperties`       | 0-1,000,000; omitted or `null` = unlimited                                                         |
| `noOfTeamMembers`      | 0-10,000, default 0                                                                                |
| `features`             | max 50 entries, each non-blank and max 200; trimmed; duplicates (ignoring case) are 400 `features` |
| `status`               | default `draft`                                                                                    |
| `popular`              | default `false`                                                                                    |
| `sortOrder`            | 0-100,000, default 0                                                                               |
| `trialDays`            | 0-365, default 0                                                                                   |

**409** `subscription_plan_slug_taken` when the slug is in use (or a generated slug could not be found).

### `PATCH /admin/subscription-plans/{id}`

Partial update with the same rules. An omitted field keeps its value; an explicit `null` clears `icon`,
`photo`, `description` and `noOfProperties` (= unlimited) and is rejected for every other field.
**404**, **409** as above.

### `PATCH /admin/subscription-plans/{id}/status`

`{"status": "draft" | "active" | "inactive"}`. Never touches user subscriptions. **404** as above.

## Errors

RFC 9457 problem details with `code`; validation errors are **400** `validation_failed` with an
`errors` map of field to message.

## App users: public plans and my subscription

Base path `/api/v1`. These endpoints are for the mobile app; plan management stays under
`/api/v1/admin/subscription-plans`.

### `GET /public/subscription-plans` — active plans (no login)

Active plans only, ordered by `sortOrder` then `id`. A plain array (a short, fixed list), not paginated. Status and audit
fields are left out. `noOfProperties` `null` means unlimited; `noOfTeamMembers` `0` means team management is not included.

```json
[
  { "id": 2, "icon": "crown", "title": "Premium", "slug": "premium", "price": 999.00, "currency": "INR",
    "billingInterval": "month", "billingIntervalCount": 1, "description": "Best value",
    "noOfProperties": null, "noOfTeamMembers": 3, "features": ["Verified badge"], "popular": true, "trialDays": 0 }
]
```

### Permissions

Granted to the app `user` role by `V202611211100`:

| Permission (`roles.permissions` key) | Allows |
|---|---|
| `SUBSCRIPTION_VIEW` (`subscription.view`) | `GET /subscriptions/me` |
| `SUBSCRIPTION_CREATE` (`subscription.create`) | `POST /subscriptions` |

A missing permission is **403** `subscription_action_forbidden`. Both endpoints need `Authorization: Bearer <accessToken>`
(otherwise **401**) and only ever act on the caller: there is no user id in the path or body.

### `GET /subscriptions/me` — my subscription

The subscription in force now (status `active`, started, not ended). **404** `subscription_not_found` when there is none.
The terms are the copy taken from the plan when the subscription started.

```json
{ "id": 7, "planId": 2, "planTitle": "Premium", "status": "active", "price": 999.00, "currency": "INR",
  "billingInterval": "month", "billingIntervalCount": 1, "noOfProperties": null, "noOfTeamMembers": 3,
  "startsAt": "2026-11-21T10:00:00Z", "endsAt": "2026-12-21T10:00:00Z" }
```

### `POST /subscriptions` — take a plan (201)

```json
{ "planId": 2 }
```

Starts now for one billing period (`endsAt` `null` for a lifetime plan). Unknown fields are **400**.

| Status | Code | When |
|---|---|---|
| 400 | `validation_failed` | missing or non-positive `planId`, unknown fields |
| 403 | `payment_required` | the plan costs money and payment is not waived (see below) |
| 404 | `subscription_plan_not_found` | unknown plan |
| 409 | `subscription_plan_unavailable` | the plan is not active |
| 409 | `subscription_already_active` | one subscription in force per user (also for parallel requests) |
| 429 | | rate limit: 30 per hour per user |

**Payment.** No payment gateway is integrated yet. Free plans (price 0) activate at once. A paid plan is **403**
`payment_required` unless `app.subscription.allow-unpaid-activation` is `true`, which only `application-dev.yml` sets.
When a gateway is added, it creates the subscription as pending and activates it after the payment succeeds.

Creating a property is gated by the subscription in force (see `properties.md`): without one it is **403**
`subscription_required`, and past the plan's `noOfProperties` it is **403** `property_limit_reached`.
