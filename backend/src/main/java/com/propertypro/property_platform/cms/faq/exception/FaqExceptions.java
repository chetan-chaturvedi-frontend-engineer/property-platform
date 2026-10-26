package com.propertypro.property_platform.cms.faq.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class FaqExceptions {

	private FaqExceptions() {
	}

	/** Also for public requests on FAQs that are not published or whose category is not configured. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "faq_not_found", "FAQ not found.");
	}

	public static ApiException publishForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "faq_publish_forbidden",
				"You are not allowed to publish or unpublish FAQs.");
	}

}
