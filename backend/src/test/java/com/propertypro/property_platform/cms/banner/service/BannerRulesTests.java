package com.propertypro.property_platform.cms.banner.service;

import com.propertypro.property_platform.cms.banner.config.BannerProperties;
import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BannerRulesTests {

	private final BannerRules rules = new BannerRules(new BannerProperties(List.of("promotion"),
			List.of("home_top"), List.of("/", "/offers", "/properties")));

	@ParameterizedTest
	@ValueSource(strings = { "/", "/offers", "/offers/diwali-2026", "/properties/42?ref=banner&utm_source=app",
			"/offers?q=a%20b" })
	void acceptsInternalLinksInsideAllowedRoutes(String link) {
		assertThat(rules.requireValidLink(BannerLinkType.INTERNAL, link)).isEqualTo(link);
	}

	@ParameterizedTest
	@ValueSource(strings = { "offers", "/unknown", "/offersx", "/admin/users", "//evil.example.com", "/offers//x",
			"/offers/../admin", "/offers/./x", "/offers\\x", "/offers#top", "/offers/%2e%2e", "https://example.com",
			"/offers x", "javascript:alert(1)" })
	void rejectsInternalLinksOutsideAllowedRoutes(String link) {
		assertThatThrownBy(() -> rules.requireValidLink(BannerLinkType.INTERNAL, link))
			.isInstanceOfSatisfying(FieldValidationException.class, ex -> assertThat(ex.getField()).isEqualTo("link"));
	}

	@Test
	void homeRouteAllowsOnlyTheHomePage() {
		BannerRules withoutHome = new BannerRules(new BannerProperties(List.of("promotion"), List.of("home_top"),
				List.of("/offers")));
		assertThatThrownBy(() -> withoutHome.requireValidLink(BannerLinkType.INTERNAL, "/"))
			.isInstanceOf(FieldValidationException.class);
		// "/" in the allow-list does not open every path.
		assertThat(rules.requireValidLink(BannerLinkType.INTERNAL, "/")).isEqualTo("/");
	}

	@ParameterizedTest
	@ValueSource(strings = { "https://example.com", "https://shop.example.com/sale?x=1#top",
			"https://example.com:443/path" })
	void acceptsHttpsLinks(String link) {
		assertThat(rules.requireValidLink(BannerLinkType.EXTERNAL, link)).isEqualTo(link);
	}

	@ParameterizedTest
	@ValueSource(strings = { "http://example.com", "HTTPS://example.com", "javascript:alert(1)",
			"data:text/html,<script>alert(1)</script>", "ftp://example.com", "https://", "https://user:pw@example.com",
			"https://example.com:8443", "https://exa mple.com", "https://example.com\\@evil.com", "//example.com",
			"/offers" })
	void rejectsUnsafeExternalLinks(String link) {
		assertThatThrownBy(() -> rules.requireValidLink(BannerLinkType.EXTERNAL, link))
			.isInstanceOfSatisfying(FieldValidationException.class, ex -> assertThat(ex.getField()).isEqualTo("link"));
	}

	@Test
	void requiresBothHalvesOfTheLinkPair() {
		assertThat(rules.requireValidLink(null, null)).isNull();
		assertThat(rules.requireValidLink(null, "  ")).isNull();
		assertThat(rules.requireValidLink(BannerLinkType.INTERNAL, "  /offers ")).isEqualTo("/offers");
		assertThatThrownBy(() -> rules.requireValidLink(null, "/offers"))
			.isInstanceOfSatisfying(FieldValidationException.class, ex -> assertThat(ex.getField()).isEqualTo("linkType"));
		assertThatThrownBy(() -> rules.requireValidLink(BannerLinkType.EXTERNAL, null))
			.isInstanceOfSatisfying(FieldValidationException.class, ex -> assertThat(ex.getField()).isEqualTo("link"));
	}

	@Test
	void scheduleBoundsAreOptionalAndMayBeEqual() {
		Instant start = Instant.parse("2026-11-01T00:00:00Z");
		rules.requireValidSchedule(null, null);
		rules.requireValidSchedule(start, null);
		rules.requireValidSchedule(null, start);
		rules.requireValidSchedule(start, start);
		assertThatThrownBy(() -> rules.requireValidSchedule(start, start.minusNanos(1000)))
			.isInstanceOfSatisfying(FieldValidationException.class, ex -> assertThat(ex.getField()).isEqualTo("endDate"));
	}

	@Test
	void acceptsOnlyConfiguredTypesAndPlacements() {
		assertThat(rules.requireType(" promotion ")).isEqualTo("promotion");
		assertThat(rules.requirePlacement("home_top")).isEqualTo("home_top");
		assertThatThrownBy(() -> rules.requireType("popup")).isInstanceOf(FieldValidationException.class);
		assertThatThrownBy(() -> rules.requirePlacement("sidebar")).isInstanceOf(FieldValidationException.class);
	}

	@Test
	void rejectsInvalidConfiguration() {
		assertThatThrownBy(() -> new BannerProperties(List.of(), List.of("home_top"), List.of("/")))
			.isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> new BannerProperties(List.of("Promo Banner"), List.of("home_top"), List.of("/")))
			.isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> new BannerProperties(List.of("promotion"), List.of("home_top"), List.of("offers")))
			.isInstanceOf(IllegalStateException.class);
	}

}
