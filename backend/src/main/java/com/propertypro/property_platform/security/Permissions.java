package com.propertypro.property_platform.security;

/**
 * Permission codes used as Spring Security authorities. Authorize with these, never with role names.
 * <p>
 * Roles grant them in {@code roles.permissions} as {@code {"<module>": {"<action>": true}}}; the
 * code is {@code <MODULE>_<ACTION>} in upper case, e.g. {@code subscription_plan.view} grants
 * {@link #SUBSCRIPTION_PLAN_VIEW} (see {@code Role#permissionCode}).
 */
public final class Permissions {

	public static final String ADMIN_PANEL_ACCESS = "ADMIN_PANEL_ACCESS";

	// Role management. No endpoints yet; seeded so the super-admin role can never lose them.
	public static final String ROLE_VIEW = "ROLE_VIEW";
	public static final String ROLE_CREATE = "ROLE_CREATE";
	public static final String ROLE_UPDATE = "ROLE_UPDATE";
	public static final String ROLE_DELETE = "ROLE_DELETE";

	// Leads. Owner-scoped codes cover only the caller's own leads (created by them, or assigned to them
	// with LEAD_ACCESS_ASSIGNED; 404 for others); _ANY codes cover every lead (admin).
	public static final String LEAD_LIST = "LEAD_LIST";
	public static final String LEAD_VIEW = "LEAD_VIEW";
	public static final String LEAD_CREATE = "LEAD_CREATE";
	public static final String LEAD_UPDATE = "LEAD_UPDATE";
	/** Soft delete; owner-scoped like the others, but never for leads that are only assigned. */
	public static final String LEAD_DELETE = "LEAD_DELETE";
	public static final String LEAD_LIST_ANY = "LEAD_LIST_ANY";
	public static final String LEAD_VIEW_ANY = "LEAD_VIEW_ANY";
	public static final String LEAD_UPDATE_ANY = "LEAD_UPDATE_ANY";
	public static final String LEAD_DELETE_ANY = "LEAD_DELETE_ANY";
	/** Set or change the assignee of any lead the caller can see, including on create. */
	public static final String LEAD_ASSIGN = "LEAD_ASSIGN";
	/** Leads assigned to the caller count as their own for list, view, update and nested resources. */
	public static final String LEAD_ACCESS_ASSIGNED = "LEAD_ACCESS_ASSIGNED";

	// Lead schedules and interactions: allowed on the leads the caller can see (see the lead codes above).
	public static final String LEAD_SCHEDULE_VIEW = "LEAD_SCHEDULE_VIEW";
	public static final String LEAD_SCHEDULE_CREATE = "LEAD_SCHEDULE_CREATE";
	/** Editing, completing, cancelling and rescheduling. */
	public static final String LEAD_SCHEDULE_UPDATE = "LEAD_SCHEDULE_UPDATE";
	/** Soft delete. */
	public static final String LEAD_SCHEDULE_DELETE = "LEAD_SCHEDULE_DELETE";
	public static final String LEAD_INTERACTION_VIEW = "LEAD_INTERACTION_VIEW";
	public static final String LEAD_INTERACTION_CREATE = "LEAD_INTERACTION_CREATE";
	public static final String LEAD_INTERACTION_UPDATE = "LEAD_INTERACTION_UPDATE";
	/** Soft delete. */
	public static final String LEAD_INTERACTION_DELETE = "LEAD_INTERACTION_DELETE";

	// Site visits. App codes cover only visits the caller is the builder (property owner), visitor or,
	// with SITE_VISIT_ACCESS_ASSIGNED, the assignee of (404 for others), and never grant admin access;
	// _ANY codes cover every visit on the admin dashboard.
	public static final String SITE_VISIT_LIST = "SITE_VISIT_LIST";
	public static final String SITE_VISIT_VIEW = "SITE_VISIT_VIEW";
	/** Book a visit to a published property, or record one at the caller's own property. */
	public static final String SITE_VISIT_CREATE = "SITE_VISIT_CREATE";
	/** Edit the fields the caller's relation to the visit allows (builder or assignee, never the visitor). */
	public static final String SITE_VISIT_UPDATE = "SITE_VISIT_UPDATE";
	/** Status changes allowed by the caller's relation; a visitor may only cancel. */
	public static final String SITE_VISIT_UPDATE_STATUS = "SITE_VISIT_UPDATE_STATUS";
	/** The report of a completed visit, by its builder or assignee, once; later changes need the _ANY code. */
	public static final String SITE_VISIT_SUBMIT_REPORT = "SITE_VISIT_SUBMIT_REPORT";
	/** Builders assign their own visits. */
	public static final String SITE_VISIT_ASSIGN = "SITE_VISIT_ASSIGN";
	/** Visits assigned to the caller count as their own, and the caller may be chosen as assignee. */
	public static final String SITE_VISIT_ACCESS_ASSIGNED = "SITE_VISIT_ACCESS_ASSIGNED";
	public static final String SITE_VISIT_LIST_ANY = "SITE_VISIT_LIST_ANY";
	public static final String SITE_VISIT_VIEW_ANY = "SITE_VISIT_VIEW_ANY";
	public static final String SITE_VISIT_CREATE_ANY = "SITE_VISIT_CREATE_ANY";
	public static final String SITE_VISIT_UPDATE_ANY = "SITE_VISIT_UPDATE_ANY";
	/** Soft delete. */
	public static final String SITE_VISIT_DELETE_ANY = "SITE_VISIT_DELETE_ANY";
	public static final String SITE_VISIT_ASSIGN_ANY = "SITE_VISIT_ASSIGN_ANY";
	public static final String SITE_VISIT_UPDATE_STATUS_ANY = "SITE_VISIT_UPDATE_STATUS_ANY";
	/** Submit or replace any visit report, including locked ones. */
	public static final String SITE_VISIT_SUBMIT_REPORT_ANY = "SITE_VISIT_SUBMIT_REPORT_ANY";

	// Builder teams. App codes cover only the caller's own team (memberships whose builder is the caller; 404
	// for others) and never grant admin access; _ANY codes cover every builder's team on the admin dashboard.
	// ASSIGN_ROLE, MANAGE_PERMISSIONS and MANAGE_STATUS are capabilities needed next to the scope code
	// (BUILDER_TEAM_CREATE/UPDATE or their _ANY variants) to set those fields.
	public static final String BUILDER_TEAM_LIST = "BUILDER_TEAM_LIST";
	public static final String BUILDER_TEAM_VIEW = "BUILDER_TEAM_VIEW";
	/** Invite a member to the caller's team; needs a subscription that includes team management. */
	public static final String BUILDER_TEAM_CREATE = "BUILDER_TEAM_CREATE";
	/** Edit notes; role, permissions and status also need their capability code. */
	public static final String BUILDER_TEAM_UPDATE = "BUILDER_TEAM_UPDATE";
	/** Remove (revoke and soft delete) a member; allowed without a subscription. */
	public static final String BUILDER_TEAM_DELETE = "BUILDER_TEAM_DELETE";
	/** Change a member's role. */
	public static final String BUILDER_TEAM_ASSIGN_ROLE = "BUILDER_TEAM_ASSIGN_ROLE";
	/** Grant or change a member's permissions, including non-empty permissions on creation. */
	public static final String BUILDER_TEAM_MANAGE_PERMISSIONS = "BUILDER_TEAM_MANAGE_PERMISSIONS";
	/** Activate, deactivate or revoke a member, including a status other than pending on admin creation. */
	public static final String BUILDER_TEAM_MANAGE_STATUS = "BUILDER_TEAM_MANAGE_STATUS";
	public static final String BUILDER_TEAM_LIST_ANY = "BUILDER_TEAM_LIST_ANY";
	public static final String BUILDER_TEAM_VIEW_ANY = "BUILDER_TEAM_VIEW_ANY";
	public static final String BUILDER_TEAM_CREATE_ANY = "BUILDER_TEAM_CREATE_ANY";
	public static final String BUILDER_TEAM_UPDATE_ANY = "BUILDER_TEAM_UPDATE_ANY";
	/** Soft delete. */
	public static final String BUILDER_TEAM_DELETE_ANY = "BUILDER_TEAM_DELETE_ANY";
	/** The caller's own memberships in other builders' teams: list and detail. */
	public static final String BUILDER_TEAM_MEMBERSHIP_VIEW = "BUILDER_TEAM_MEMBERSHIP_VIEW";
	/** Accept or reject an invitation to another builder's team. */
	public static final String BUILDER_TEAM_MEMBERSHIP_RESPOND = "BUILDER_TEAM_MEMBERSHIP_RESPOND";

	// User management (admin dashboard): every account in the users table, admins and app users alike. A caller
	// only manages users whose role permissions they all hold, and only assigns such roles (see AdminUserService).
	/** List users, the status counts and the role options. */
	public static final String USER_LIST = "USER_LIST";
	public static final String USER_VIEW = "USER_VIEW";
	/** Create accounts; a status other than pending also needs {@link #USER_CHANGE_STATUS}. */
	public static final String USER_CREATE = "USER_CREATE";
	/** Edit name, email, phone and role; changing status also needs {@link #USER_CHANGE_STATUS}. */
	public static final String USER_UPDATE = "USER_UPDATE";
	/** Additionally required to set or change an account's status (activate, suspend, ...). */
	public static final String USER_CHANGE_STATUS = "USER_CHANGE_STATUS";
	/** Soft delete. */
	public static final String USER_DELETE = "USER_DELETE";

	// User settings: only the caller's own settings, so there is no _ANY variant.
	public static final String USER_SETTING_VIEW = "USER_SETTING_VIEW";
	public static final String USER_SETTING_CREATE = "USER_SETTING_CREATE";
	public static final String USER_SETTING_UPDATE = "USER_SETTING_UPDATE";

	// The caller's own in-app notifications: always for oneself, so no _ANY variant.
	public static final String NOTIFICATION_LIST = "NOTIFICATION_LIST";
	/** Marking one or all of the caller's notifications read. */
	public static final String NOTIFICATION_UPDATE = "NOTIFICATION_UPDATE";
	public static final String NOTIFICATION_DELETE = "NOTIFICATION_DELETE";

	// The caller's own account (app users): rename, change the password, delete. Always for oneself.
	public static final String PROFILE_UPDATE = "PROFILE_UPDATE";
	public static final String PROFILE_CHANGE_PASSWORD = "PROFILE_CHANGE_PASSWORD";
	public static final String PROFILE_DELETE = "PROFILE_DELETE";

	// The caller's own saved properties and recently viewed list: always for oneself, so no _ANY variant.
	public static final String SAVED_PROPERTY_LIST = "SAVED_PROPERTY_LIST";
	public static final String SAVED_PROPERTY_CREATE = "SAVED_PROPERTY_CREATE";
	public static final String SAVED_PROPERTY_DELETE = "SAVED_PROPERTY_DELETE";
	public static final String RECENTLY_VIEWED_LIST = "RECENTLY_VIEWED_LIST";
	public static final String RECENTLY_VIEWED_CREATE = "RECENTLY_VIEWED_CREATE";
	public static final String RECENTLY_VIEWED_DELETE = "RECENTLY_VIEWED_DELETE";

	// The caller's own subscription: plans are public, subscribing and viewing are always for oneself.
	public static final String SUBSCRIPTION_VIEW = "SUBSCRIPTION_VIEW";
	public static final String SUBSCRIPTION_CREATE = "SUBSCRIPTION_CREATE";

	// Subscription plan catalog (admin dashboard). Plans have no owner, so there is no _ANY variant.
	public static final String SUBSCRIPTION_PLAN_LIST = "SUBSCRIPTION_PLAN_LIST";
	public static final String SUBSCRIPTION_PLAN_VIEW = "SUBSCRIPTION_PLAN_VIEW";
	public static final String SUBSCRIPTION_PLAN_CREATE = "SUBSCRIPTION_PLAN_CREATE";
	/** Editing plan fields, including status through the edit endpoint. */
	public static final String SUBSCRIPTION_PLAN_UPDATE = "SUBSCRIPTION_PLAN_UPDATE";
	/** The dedicated status endpoint only. */
	public static final String SUBSCRIPTION_PLAN_CHANGE_STATUS = "SUBSCRIPTION_PLAN_CHANGE_STATUS";

	// Banners (admin dashboard). Global content with no owner, so there is no _ANY variant.
	public static final String BANNER_LIST = "BANNER_LIST";
	public static final String BANNER_VIEW = "BANNER_VIEW";
	public static final String BANNER_CREATE = "BANNER_CREATE";
	public static final String BANNER_UPDATE = "BANNER_UPDATE";
	/** Additionally required to set or change a banner's status (activate or deactivate it). */
	public static final String BANNER_CHANGE_STATUS = "BANNER_CHANGE_STATUS";
	/** Soft delete only. */
	public static final String BANNER_DELETE = "BANNER_DELETE";

	// Blog categories (admin dashboard). Global content with no owner, so there is no _ANY variant.
	/** List and detail. */
	public static final String BLOG_CATEGORY_VIEW = "BLOG_CATEGORY_VIEW";
	public static final String BLOG_CATEGORY_CREATE = "BLOG_CATEGORY_CREATE";
	/** Editing fields, including status and slug, and replacing or removing the image. */
	public static final String BLOG_CATEGORY_UPDATE = "BLOG_CATEGORY_UPDATE";
	/** Soft delete only, and only while no blog uses the category. */
	public static final String BLOG_CATEGORY_DELETE = "BLOG_CATEGORY_DELETE";

	// Blogs (admin dashboard). Public blog endpoints need no permission and show published blogs only.
	/** Admin list and detail, drafts and scheduled blogs included. */
	public static final String BLOG_VIEW = "BLOG_VIEW";
	public static final String BLOG_CREATE = "BLOG_CREATE";
	/** Editing fields, including status, publication date and slug, and the feature image. */
	public static final String BLOG_UPDATE = "BLOG_UPDATE";
	/** Soft delete only. */
	public static final String BLOG_DELETE = "BLOG_DELETE";

	// FAQs (admin dashboard). Public FAQ endpoints need no permission and show published FAQs only.
	/** Admin list and detail, drafts included. */
	public static final String FAQ_VIEW = "FAQ_VIEW";
	/** Creating drafts; creating a published FAQ also needs {@link #FAQ_PUBLISH}. */
	public static final String FAQ_CREATE = "FAQ_CREATE";
	/** Editing question, answer, category and sort order; changing status also needs {@link #FAQ_PUBLISH}. */
	public static final String FAQ_UPDATE = "FAQ_UPDATE";
	/** Additionally required to publish or unpublish (any status change, on create or update). */
	public static final String FAQ_PUBLISH = "FAQ_PUBLISH";
	/** Permanent delete. */
	public static final String FAQ_DELETE = "FAQ_DELETE";

	// Content pages (admin dashboard). Public page endpoints need no permission and show published pages only.
	/** Admin list and detail, drafts included. */
	public static final String PAGE_VIEW = "PAGE_VIEW";
	/** Creating drafts; creating a published page also needs {@link #PAGE_PUBLISH}. */
	public static final String PAGE_CREATE = "PAGE_CREATE";
	/** Editing every field except status; changing status also needs {@link #PAGE_PUBLISH}. */
	public static final String PAGE_UPDATE = "PAGE_UPDATE";
	/** Additionally required to publish or unpublish (any status change, on create or update). */
	public static final String PAGE_PUBLISH = "PAGE_PUBLISH";
	/** Permanent delete. */
	public static final String PAGE_DELETE = "PAGE_DELETE";

	// System logs (admin dashboard). Append-only, so there is no update or delete code.
	public static final String SYSTEM_LOG_LIST = "SYSTEM_LOG_LIST";
	public static final String SYSTEM_LOG_VIEW = "SYSTEM_LOG_VIEW";
	public static final String SYSTEM_LOG_CREATE = "SYSTEM_LOG_CREATE";

	// Property projects. Owner-scoped codes cover only the current user's properties (404 for others);
	// _ANY codes cover every owner's properties (admin).
	public static final String PROPERTY_CREATE = "PROPERTY_CREATE";
	/** Create properties without a subscription or property limit (admin). */
	public static final String PROPERTY_CREATE_WITHOUT_SUBSCRIPTION = "PROPERTY_CREATE_WITHOUT_SUBSCRIPTION";
	public static final String PROPERTY_LIST = "PROPERTY_LIST";
	public static final String PROPERTY_VIEW = "PROPERTY_VIEW";
	public static final String PROPERTY_UPDATE = "PROPERTY_UPDATE";
	public static final String PROPERTY_DELETE = "PROPERTY_DELETE";
	public static final String PROPERTY_LIST_ANY = "PROPERTY_LIST_ANY";
	public static final String PROPERTY_VIEW_ANY = "PROPERTY_VIEW_ANY";
	public static final String PROPERTY_UPDATE_ANY = "PROPERTY_UPDATE_ANY";
	public static final String PROPERTY_DELETE_ANY = "PROPERTY_DELETE_ANY";
	public static final String PROPERTY_RESTORE_ANY = "PROPERTY_RESTORE_ANY";
	/** Approve or reject a property submitted for review. */
	public static final String PROPERTY_REVIEW = "PROPERTY_REVIEW";
	/** Publish an approved property or unpublish a published one. */
	public static final String PROPERTY_PUBLISH = "PROPERTY_PUBLISH";
	/** Suspend or resume a listing. */
	public static final String PROPERTY_SUSPEND = "PROPERTY_SUSPEND";
	/** Change the legal approval status. */
	public static final String PROPERTY_LEGAL_REVIEW = "PROPERTY_LEGAL_REVIEW";

	private Permissions() {
	}

}
