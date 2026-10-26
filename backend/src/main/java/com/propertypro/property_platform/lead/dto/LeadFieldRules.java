package com.propertypro.property_platform.lead.dto;

/** Request validation rules shared by the lead DTOs; the entities and migrations enforce the same. */
public final class LeadFieldRules {

	/** Bean Validation message for {@code @Pattern} enum checks; lists the accepted values. */
	public static final String ONE_OF = "must be one of {regexp}";
	public static final String CURRENCY = "^[A-Z]{3}$";
	/** Accepted phone input (any common format) before normalization to E.164. */
	public static final int PHONE_INPUT_MAX_LENGTH = 32;
	/** One day; longer calls are data-entry mistakes. */
	public static final int MAX_DURATION_SECONDS = 86_400;

	private LeadFieldRules() {
	}

}
