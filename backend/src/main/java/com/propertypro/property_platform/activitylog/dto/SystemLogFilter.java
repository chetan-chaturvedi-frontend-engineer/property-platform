package com.propertypro.property_platform.activitylog.dto;

import com.propertypro.property_platform.activitylog.domain.SystemLogLevel;
import com.propertypro.property_platform.common.validation.ValidIpAddress;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;

import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.MODULE;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.MODULE_MESSAGE;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.ONE_OF;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.SINGLE_LINE;
import static com.propertypro.property_platform.activitylog.dto.SystemLogFieldRules.SINGLE_LINE_MESSAGE;

/**
 * Optional list filters from query parameters; all given filters must match. {@code action} is a
 * case-insensitive keyword and {@code ipAddress} an exact address; date bounds are inclusive.
 * {@code page} and {@code size} are bound here too so bad values are rejected: {@code Pageable} alone
 * would silently fall back to the defaults. The {@code page} limit keeps the offset inside an int.
 */
public record SystemLogFilter(
		@PositiveOrZero @Max(1_000_000) Integer page,
		@Min(1) @Max(100) Integer size,
		@Positive Long userId,
		@Size(max = 50) @Pattern(regexp = MODULE, message = MODULE_MESSAGE) String module,
		@Pattern(regexp = SystemLogLevel.VALUES, message = ONE_OF) String logLevel,
		@ValidIpAddress String ipAddress,
		@Size(max = 100) @Pattern(regexp = SINGLE_LINE, message = SINGLE_LINE_MESSAGE) String action,
		@Positive Long referenceId,
		Instant createdFrom,
		Instant createdTo) {
}
