package com.propertypro.property_platform.activitylog.dto;

/** Request validation rules shared by the system log DTOs; the migration enforces the lengths. */
final class SystemLogFieldRules {

	static final String ONE_OF = "must be one of {regexp}";
	static final String MODULE = "^[a-z][a-z0-9_]*$";
	static final String MODULE_MESSAGE = "must be lowercase letters, digits and underscores";
	static final String REFERENCE_TYPE = "^[A-Za-z][A-Za-z0-9_]*$";
	static final String REFERENCE_TYPE_MESSAGE = "must be letters, digits and underscores";
	/** PostgreSQL text cannot hold a NUL, and control characters have no place in a one-line heading. */
	static final String SINGLE_LINE = "^[^\\p{Cntrl}]*$";
	static final String SINGLE_LINE_MESSAGE = "must not contain control characters";

	private SystemLogFieldRules() {
	}

}
