package com.propertypro.property_platform.cms.blog.dto;

/** Validation messages shared by the blog and blog category requests. */
final class BlogValidation {

	static final String SLUG_MESSAGE = "must be lowercase letters and digits separated by single hyphens";
	static final String ICON_MESSAGE = "must be an icon name: letters, digits, '_', ':' and '-'";

	private BlogValidation() {
	}

}
