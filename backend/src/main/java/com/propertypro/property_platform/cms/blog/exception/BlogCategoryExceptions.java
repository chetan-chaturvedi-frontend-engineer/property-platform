package com.propertypro.property_platform.cms.blog.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Map;

public final class BlogCategoryExceptions {

	private BlogCategoryExceptions() {
	}

	/** Also for soft-deleted categories. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "blog_category_not_found", "Blog category not found.");
	}

	public static ApiException imageNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "blog_category_image_not_found", "Blog category image not found.");
	}

	/** Slugs of soft-deleted categories stay reserved, so this does not reveal anything visible elsewhere. */
	public static ApiException slugTaken() {
		return new ApiException(HttpStatus.CONFLICT, "blog_category_slug_taken",
				"Another blog category already uses this slug.", Map.of("field", "slug"));
	}

	public static ApiException inUse(long blogCount) {
		return new ApiException(HttpStatus.CONFLICT, "blog_category_in_use",
				"The blog category is used by blogs. Move or delete them first.", Map.of("blogCount", blogCount));
	}

}
