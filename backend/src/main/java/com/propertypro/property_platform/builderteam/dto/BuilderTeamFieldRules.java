package com.propertypro.property_platform.builderteam.dto;

import com.propertypro.property_platform.role.domain.Role;

/** Validation rules shared by the builder team request DTOs. */
public final class BuilderTeamFieldRules {

	public static final String ONE_OF = "must be one of {regexp}";
	public static final String ROLE_FORMAT = "must be a role slug (lowercase letters and digits separated by hyphens)";
	public static final String KEY_FORMAT = "must be lowercase snake_case";
	public static final int MAX_MODULES = 20;
	public static final int MAX_ACTIONS_PER_MODULE = Role.MAX_ACTIONS_PER_MODULE;
	public static final int SEARCH_MAX_LENGTH = 100;
	public static final int EMAIL_MAX_LENGTH = 255;
	public static final int PHONE_INPUT_MAX_LENGTH = 32;

	private BuilderTeamFieldRules() {
	}

}
