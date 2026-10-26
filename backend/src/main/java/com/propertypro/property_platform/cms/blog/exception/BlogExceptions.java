package com.propertypro.property_platform.cms.blog.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Map;

public final class BlogExceptions {

	private BlogExceptions() {
	}

	/** Also for soft-deleted blogs, and for public requests on blogs that are not publicly visible. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "blog_not_found", "Blog not found.");
	}

	public static ApiException imageNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "blog_image_not_found", "Blog image not found.");
	}

	/** Slugs of soft-deleted blogs stay reserved, so this does not reveal anything visible elsewhere. */
	public static ApiException slugTaken() {
		return new ApiException(HttpStatus.CONFLICT, "blog_slug_taken", "Another blog already uses this slug.",
				Map.of("field", "slug"));
	}

}
