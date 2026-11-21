package com.propertypro.property_platform.role.service;

import com.propertypro.property_platform.role.domain.Role;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Every permission a role can grant, as the {@code roles.permissions} module and action keys. Mirrors
 * {@code security/Permissions} exactly ({@code PermissionCatalogTests} fails when they differ), so adding a
 * permission constant means adding its action here. Roles may only be given permissions from this catalog.
 */
public final class PermissionCatalog {

	/** @param actions action keys in display order */
	public record Module(String key, String label, List<String> actions) {

		public Module {
			actions = List.copyOf(actions);
		}

	}

	public static final List<Module> MODULES = List.of(
			new Module("admin_panel", "Admin Panel", List.of("access")),
			new Module("role", "Roles & Permissions", List.of("view", "create", "update", "delete")),
			new Module("user", "Users", List.of("list", "view", "create", "update", "change_status", "delete")),
			new Module("user_setting", "User Settings", List.of("view", "create", "update")),
			new Module("property", "Properties", List.of("list", "view", "create", "update", "delete", "list_any",
					"view_any", "update_any", "delete_any", "restore_any", "create_without_subscription", "review",
					"publish", "suspend", "legal_review")),
			new Module("lead", "Leads / Enquiries", List.of("list", "view", "create", "update", "delete", "list_any",
					"view_any", "update_any", "delete_any", "assign", "access_assigned")),
			new Module("lead_schedule", "Lead Schedules", List.of("view", "create", "update", "delete")),
			new Module("lead_interaction", "Lead Interactions", List.of("view", "create", "update", "delete")),
			new Module("site_visit", "Site Visits", List.of("list", "view", "create", "update", "update_status",
					"submit_report", "assign", "access_assigned", "list_any", "view_any", "create_any", "update_any",
					"delete_any", "assign_any", "update_status_any", "submit_report_any")),
			new Module("builder_team", "Builder Teams", List.of("list", "view", "create", "update", "delete",
					"assign_role", "manage_permissions", "manage_status", "list_any", "view_any", "create_any",
					"update_any", "delete_any")),
			new Module("builder_team_membership", "Team Memberships", List.of("view", "respond")),
			new Module("subscription", "My Subscription", List.of("view", "create")),
			new Module("conversation", "Conversations", List.of("list", "create", "update")),
			new Module("message", "Messages", List.of("list", "create")),
			new Module("notification", "Notifications", List.of("list", "update", "delete")),
			new Module("profile", "My Account", List.of("update", "change_password", "delete")),
			new Module("saved_property", "Saved Properties", List.of("list", "create", "delete")),
			new Module("recently_viewed", "Recently Viewed", List.of("list", "create", "delete")),
			new Module("subscription_plan", "Packages & Plans",
					List.of("list", "view", "create", "update", "change_status")),
			new Module("banner", "Banners", List.of("list", "view", "create", "update", "change_status", "delete")),
			new Module("blog_category", "Blog Categories", List.of("view", "create", "update", "delete")),
			new Module("blog", "Blogs", List.of("view", "create", "update", "delete")),
			new Module("faq", "FAQs", List.of("view", "create", "update", "publish", "delete")),
			new Module("page", "Pages", List.of("view", "create", "update", "publish", "delete")),
			new Module("system_log", "System Logs", List.of("list", "view", "create")));

	private static final Map<String, Set<String>> ACTIONS_BY_MODULE = MODULES.stream()
		.collect(Collectors.toUnmodifiableMap(Module::key, module -> Set.copyOf(module.actions())));

	private PermissionCatalog() {
	}

	public static boolean contains(String module, String action) {
		Set<String> actions = ACTIONS_BY_MODULE.get(module);
		return actions != null && actions.contains(action);
	}

	/** Every permission code, e.g. {@code SITE_VISIT_LIST_ANY}. */
	public static Set<String> codes() {
		Set<String> codes = new LinkedHashSet<>();
		MODULES.forEach(module -> module.actions().forEach(action -> codes.add(Role.permissionCode(module.key(), action))));
		return codes;
	}

}
