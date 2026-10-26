package com.propertypro.property_platform.property.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectSlugGeneratorTests {

	@Test
	void baseSlugCombinesNameAndCity() {
		assertThat(ProjectSlugGenerator.baseSlug("Green Valley Residency", "Pune"))
				.isEqualTo("green-valley-residency-pune");
	}

	@Test
	void baseSlugDoesNotRepeatCity() {
		assertThat(ProjectSlugGenerator.baseSlug("Pune Heights Pune", "Pune")).isEqualTo("pune-heights-pune");
		assertThat(ProjectSlugGenerator.baseSlug("Pune", "Pune")).isEqualTo("pune");
	}

	@Test
	void baseSlugFallsBackWhenNameHasNoLatinCharacters() {
		assertThat(ProjectSlugGenerator.baseSlug("गृह प्रकल्प", "Pune")).isEqualTo("project-pune");
		assertThat(ProjectSlugGenerator.baseSlug("गृह", "")).isEqualTo("project");
	}

	@Test
	void baseSlugLeavesRoomForSuffix() {
		String base = ProjectSlugGenerator.baseSlug("x".repeat(300), "Pune");
		assertThat(base).hasSizeLessThanOrEqualTo(ProjectSlugGenerator.MAX_BASE_LENGTH);
		assertThat(base + "-999999").hasSizeLessThanOrEqualTo(ProjectSlugGenerator.MAX_LENGTH);
	}

}
