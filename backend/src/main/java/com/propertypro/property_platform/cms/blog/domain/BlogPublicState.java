package com.propertypro.property_platform.cms.blog.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.Instant;

/**
 * Whether a blog is publicly visible right now and why not; derived, never stored. Same rule as
 * {@code PublicBlogs.visible}, which public queries must use.
 */
@Getter
@RequiredArgsConstructor
public enum BlogPublicState implements PersistableEnum {

	DRAFT("draft"),
	/** Published, but the publication time is still in the future. */
	SCHEDULED("scheduled"),
	/** Shown by the public endpoints. */
	LIVE("live"),
	/** Published and due, but without an active category, so hidden from the public endpoints. */
	CATEGORY_HIDDEN("category_hidden");

	private final String value;

	/**
	 * @param category the blog's category, or null when it has none or it is soft-deleted
	 */
	public static BlogPublicState of(Blog blog, BlogCategory category, Instant now) {
		if (blog.getStatus() != BlogStatus.PUBLISH) {
			return DRAFT;
		}
		if (!blog.isPublishedAt(now)) {
			return SCHEDULED;
		}
		return category != null && category.isActive() ? LIVE : CATEGORY_HIDDEN;
	}

}
