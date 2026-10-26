package com.propertypro.property_platform.property.dto;

/** Shared validation patterns of property requests; the same rules as the entities and database. */
public final class PropertyFieldRules {

	/** Indian GSTIN, upper case. */
	public static final String GSTIN = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$";
	/** RERA registration numbers vary by state, e.g. P52100012345 or PRM/KA/RERA/1251/309/PR/171014/000123. */
	public static final String RERA = "^[A-Za-z0-9][A-Za-z0-9/._ -]*$";
	/** Indian PIN code. */
	public static final String PINCODE = "^[1-9][0-9]{5}$";
	public static final String CURRENCY = "^[A-Z]{3}$";
	/** Apartment areas are in square feet or square metres only. */
	public static final String APARTMENT_AREA_UNIT = "sq_ft|sq_m";
	public static final int MAX_HIGHLIGHTS = 20;
	public static final int HIGHLIGHT_MAX_LENGTH = 200;
	public static final int DESCRIPTION_MAX_LENGTH = 10_000;

	private PropertyFieldRules() {
	}

}
