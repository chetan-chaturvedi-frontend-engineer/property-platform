package com.propertypro.property_platform.role.dto;

import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.service.PermissionCatalog;

import java.util.List;

/**
 * A module of the permission catalog.
 *
 * @param key     the {@code roles.permissions} module key
 * @param actions in display order
 */
public record PermissionModuleResponse(String key, String label, List<Action> actions) {

	/**
	 * @param key  the {@code roles.permissions} action key
	 * @param code the permission code it grants, e.g. {@code SITE_VISIT_LIST_ANY}
	 */
	public record Action(String key, String code) {
	}

	public static PermissionModuleResponse from(PermissionCatalog.Module module) {
		return new PermissionModuleResponse(module.key(), module.label(), module.actions().stream()
			.map(action -> new Action(action, Role.permissionCode(module.key(), action)))
			.toList());
	}

}
