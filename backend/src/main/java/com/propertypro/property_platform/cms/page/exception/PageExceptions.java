package com.propertypro.property_platform.cms.page.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Map;

public final class PageExceptions {

	private PageExceptions() {
	}

	/** Also for public requests on pages that are not published. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "page_not_found", "Page not found.");
	}

	public static ApiException slugTaken() {
		return new ApiException(HttpStatus.CONFLICT, "page_slug_taken", "Another page already uses this slug.",
				Map.of("field", "slug"));
	}

	public static ApiException publishForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "page_publish_forbidden",
				"You are not allowed to publish or unpublish pages.");
	}

}
