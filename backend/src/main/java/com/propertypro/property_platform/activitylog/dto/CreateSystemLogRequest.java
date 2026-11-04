package com.propertypro.property_platform.activitylog.dto;

import com.propertypro.property_platform.activitylog.domain.SystemLogLevel;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.common.web.StrictJson;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.annotation.JsonDeserialize;

import java.util.Map;

import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.MODULE;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.MODULE_MESSAGE;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.ONE_OF;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.REFERENCE_TYPE;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.REFERENCE_TYPE_MESSAGE;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.SINGLE_LINE;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.SINGLE_LINE_MESSAGE;

/**
 * A manually added log. {@code action} is required; {@code module} defaults to {@code system} and
 * {@code logLevel} is derived from the action when omitted. The user, IP address, user agent, method, URL
 * and timestamp always come from the request itself, so those fields are unknown here (400).
 */
@RejectUnknownFields
public record CreateSystemLogRequest(
		@JsonDeserialize(using = StrictJson.Text.class)
		@Size(max = 50) @Pattern(regexp = MODULE, message = MODULE_MESSAGE) String module,
		@JsonDeserialize(using = StrictJson.Text.class)
		@NotBlank @Size(max = 255) @Pattern(regexp = SINGLE_LINE, message = SINGLE_LINE_MESSAGE) String action,
		@JsonDeserialize(using = StrictJson.Text.class)
		@Pattern(regexp = SystemLogLevel.VALUES, message = ONE_OF) String logLevel,
		@Positive Long referenceId,
		@JsonDeserialize(using = StrictJson.Text.class)
		@Size(max = 50) @Pattern(regexp = REFERENCE_TYPE, message = REFERENCE_TYPE_MESSAGE) String referenceType,
		Map<String, Object> additionalData) {
}
