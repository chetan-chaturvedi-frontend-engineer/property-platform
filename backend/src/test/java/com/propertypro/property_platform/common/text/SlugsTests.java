package com.propertypro.property_platform.common.text;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SlugsTests {

	@Test
	void normalizesSpacesCaseAndSpecialCharacters() {
		assertThat(Slugs.slugify("  Green Valley   Residency!! ", 100)).isEqualTo("green-valley-residency");
		assertThat(Slugs.slugify("Sai_Krupa / Phase-II (2026)", 100)).isEqualTo("sai-krupa-phase-ii-2026");
		assertThat(Slugs.slugify("Children's Park & Garden", 100)).isEqualTo("childrens-park-and-garden");
		assertThat(Slugs.slugify("Résidence Élégante", 100)).isEqualTo("residence-elegante");
	}

	@Test
	void returnsEmptyWhenNothingUsableRemains() {
		assertThat(Slugs.slugify("गृह प्रकल्प", 100)).isEmpty();
		assertThat(Slugs.slugify("---", 100)).isEmpty();
		assertThat(Slugs.slugify(null, 100)).isEmpty();
	}

	@Test
	void truncatesWithoutTrailingHyphen() {
		assertThat(Slugs.slugify("abc def", 4)).isEqualTo("abc");
	}

	@Test
	void validatesFormat() {
		assertThat(Slugs.isValid("green-valley-2")).isTrue();
		assertThat(Slugs.isValid("Green-Valley")).isFalse();
		assertThat(Slugs.isValid("green--valley")).isFalse();
		assertThat(Slugs.isValid("-green")).isFalse();
		assertThat(Slugs.isValid("../etc")).isFalse();
		assertThat(Slugs.isValid(null)).isFalse();
	}

}
