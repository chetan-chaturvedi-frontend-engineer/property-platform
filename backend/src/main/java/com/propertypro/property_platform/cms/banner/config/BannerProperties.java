package com.propertypro.property_platform.cms.banner.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Banner values accepted from admins ({@code app.banner.*}). Adding a type, placement or link route
 * needs only a configuration change; the database checks the format, not the list.
 *
 * @param types                 accepted {@code banners.type} values
 * @param placements            accepted {@code banners.placement} values (also the mobile filter)
 * @param internalLinkPrefixes  app/website routes an internal link may open: the route itself or any
 *                              path below it; {@code /} allows only the home page itself
 */
@ConfigurationProperties("app.banner")
public record BannerProperties(List<String> types, List<String> placements, List<String> internalLinkPrefixes) {

	/** Same rule as {@code chk_banners_type_format} and {@code chk_banners_placement_format}. */
	private static final Pattern KEY = Pattern.compile("^[a-z][a-z0-9_]*$");
	private static final Pattern ROUTE = Pattern.compile("^/([a-z0-9-]+(/[a-z0-9-]+)*)?$");

	public BannerProperties {
		types = requireAll(types, KEY, "app.banner.types");
		placements = requireAll(placements, KEY, "app.banner.placements");
		internalLinkPrefixes = requireAll(internalLinkPrefixes, ROUTE, "app.banner.internal-link-prefixes");
	}

	private static List<String> requireAll(List<String> values, Pattern pattern, String property) {
		if (values == null || values.isEmpty()) {
			throw new IllegalStateException(property + " must not be empty");
		}
		for (String value : values) {
			if (value == null || !pattern.matcher(value).matches()) {
				throw new IllegalStateException(property + " has an invalid value: " + value);
			}
		}
		return List.copyOf(values);
	}

}
