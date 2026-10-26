package com.propertypro.property_platform.cms.blog.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class BlogEnumConverters {

	private BlogEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class BlogStatusConverter extends PersistableEnumConverter<BlogStatus> {

		public BlogStatusConverter() {
			super(BlogStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class BlogCategoryStatusConverter extends PersistableEnumConverter<BlogCategoryStatus> {

		public BlogCategoryStatusConverter() {
			super(BlogCategoryStatus.class);
		}

	}

}
