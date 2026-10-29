package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.common.validation.ValidTimeZone;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.common.web.StrictJson;
import com.propertypro.property_platform.user.domain.UserSettings;
import com.propertypro.property_platform.user.domain.UserTheme;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonDeserialize;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Settings fields for create (POST) and partial update (PATCH). Omitted fields keep their value (on create:
 * the default); explicit {@code null} clears {@code location} and is rejected for the others. Values must have
 * the right JSON type: {@code "true"} or {@code 1} is not a boolean, {@code 5} is not a string. The owner
 * always comes from the token, so {@code id}, {@code userId} and timestamps are unknown fields here (400).
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UserSettingsRequest {

	@JsonDeserialize(contentUsing = StrictJson.Text.class)
	private Optional<@Size(max = UserSettings.LOCATION_MAX_LENGTH)
			@Pattern(regexp = "(?s).*\\S.*", message = "must not be blank; send null to clear it") String> location;

	@JsonDeserialize(contentUsing = StrictJson.Text.class)
	private Optional<@NotNull @Pattern(regexp = UserTheme.VALUES, message = "must be one of light, dark or system")
			String> theme;

	@JsonDeserialize(contentUsing = StrictJson.Text.class)
	private Optional<@NotNull @Size(max = UserSettings.LANGUAGE_MAX_LENGTH)
			@Pattern(regexp = UserSettings.LANGUAGE_PATTERN, message = "must be a language code such as en, hi or en-US")
			String> language;

	@JsonDeserialize(contentUsing = StrictJson.Bool.class)
	private Optional<@NotNull Boolean> notificationEnabled;

	@JsonDeserialize(contentUsing = StrictJson.Bool.class)
	private Optional<@NotNull Boolean> emailNotifications;

	@JsonDeserialize(contentUsing = StrictJson.Bool.class)
	private Optional<@NotNull Boolean> pushNotifications;

	@JsonDeserialize(contentUsing = StrictJson.Bool.class)
	private Optional<@NotNull Boolean> smsNotifications;

	@JsonDeserialize(contentUsing = StrictJson.Text.class)
	private Optional<@NotNull @Size(max = UserSettings.TIMEZONE_MAX_LENGTH) @ValidTimeZone String> timezone;

	/** Names of the fields present in the request, in declaration order. */
	public Set<String> presentFields() {
		Map<String, Optional<?>> fields = new LinkedHashMap<>();
		fields.put("location", location);
		fields.put("theme", theme);
		fields.put("language", language);
		fields.put("notificationEnabled", notificationEnabled);
		fields.put("emailNotifications", emailNotifications);
		fields.put("pushNotifications", pushNotifications);
		fields.put("smsNotifications", smsNotifications);
		fields.put("timezone", timezone);
		fields.values().removeIf(value -> value == null);
		return fields.keySet();
	}

}
