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

	// Leads. No module yet. App users get the owner-scoped codes, so the lead service must restrict
	// them to the current user's leads (404 otherwise); _ANY codes cover every lead (admin).
	public static final String LEAD_LIST = "LEAD_LIST";
	public static final String LEAD_VIEW = "LEAD_VIEW";
	public static final String LEAD_CREATE = "LEAD_CREATE";
	public static final String LEAD_UPDATE = "LEAD_UPDATE";
	public static final String LEAD_DELETE = "LEAD_DELETE";
	public static final String LEAD_LIST_ANY = "LEAD_LIST_ANY";
	public static final String LEAD_VIEW_ANY = "LEAD_VIEW_ANY";
	public static final String LEAD_UPDATE_ANY = "LEAD_UPDATE_ANY";
	public static final String LEAD_DELETE_ANY = "LEAD_DELETE_ANY";

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
