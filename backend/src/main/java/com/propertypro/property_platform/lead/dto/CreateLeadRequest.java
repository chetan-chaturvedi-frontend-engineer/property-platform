package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.validation.ValidPhone;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.lead.domain.Facing;
import com.propertypro.property_platform.lead.domain.Furnishing;
import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.lead.domain.LeadPriority;
import com.propertypro.property_platform.lead.domain.LeadPropertyType;
import com.propertypro.property_platform.lead.domain.LeadPurpose;
import com.propertypro.property_platform.lead.domain.LeadSource;
import com.propertypro.property_platform.lead.domain.LeadStatus;
import com.propertypro.property_platform.lead.domain.ParkingPreference;
import com.propertypro.property_platform.lead.domain.PossessionTimeline;
import com.propertypro.property_platform.property.domain.AreaUnit;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;
import static com.propertypro.property_platform.lead.dto.LeadFieldRules.PHONE_INPUT_MAX_LENGTH;

/**
 * A new lead. The creator is always the authenticated user and {@code lastContactedAt} comes from
 * interactions, so fields such as {@code createdBy} are rejected. {@code assignedTo} needs
 * {@code LEAD_ASSIGN}. Omitted source, status and priority default to other, new and medium.
 *
 * @param phone          any common format; stored in E.164 (default region India)
 * @param amenities      slugs of active amenities from {@code GET /api/v1/amenities}
 * @param lostReason     required when {@code status} is lost
 */
@RejectUnknownFields
public record CreateLeadRequest(
		@NotBlank @Size(max = Lead.LEAD_NAME_MAX_LENGTH) String leadName,
		@NotBlank @Size(max = PHONE_INPUT_MAX_LENGTH) @ValidPhone String phone,
		@Size(max = PHONE_INPUT_MAX_LENGTH) @ValidPhone String alternatePhone,
		@Email @Size(max = 255) String email,
		@Pattern(regexp = LeadSource.VALUES, message = ONE_OF) String source,
		@Pattern(regexp = LeadStatus.VALUES, message = ONE_OF) String status,
		@Pattern(regexp = LeadPriority.VALUES, message = ONE_OF) String priority,
		@NotNull @Pattern(regexp = LeadPurpose.VALUES, message = ONE_OF) String purpose,
		@Pattern(regexp = LeadPropertyType.VALUES, message = ONE_OF) String propertyType,
		@Pattern(regexp = Lead.BHK_PATTERN, message = "must be studio, 1rk or a number of bedrooms such as 2 or 2.5") String bhk,
		@PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal budgetMin,
		@PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal budgetMax,
		@Pattern(regexp = LeadFieldRules.CURRENCY, message = "must be a 3-letter ISO 4217 code") String budgetCurrency,
		@Positive @Digits(integer = 10, fraction = 2) BigDecimal area,
		@Pattern(regexp = AreaUnit.VALUES, message = ONE_OF) String areaUnit,
		@Size(max = Lead.PREFERRED_LOCATION_MAX_LENGTH) String preferredLocation,
		@Size(max = Lead.LOCATION_MAX_LENGTH) String location,
		@Pattern(regexp = PossessionTimeline.VALUES, message = ONE_OF) String possession,
		LocalDate moveInDate,
		@Size(max = Lead.FLOOR_PREFERENCE_MAX_LENGTH) String floorPreference,
		@Pattern(regexp = Facing.VALUES, message = ONE_OF) String facing,
		@Pattern(regexp = Furnishing.VALUES, message = ONE_OF) String furnishing,
		@Pattern(regexp = ParkingPreference.VALUES, message = ONE_OF) String parking,
		@Size(max = Lead.AMENITIES_MAX_SIZE) List<@NotBlank @Size(max = 120) String> amenities,
		Boolean loanRequired,
		@Size(max = Lead.ADDITIONAL_NOTE_MAX_LENGTH) String additionalNote,
		Instant nextFollowUpAt,
		@Size(max = Lead.LOST_REASON_MAX_LENGTH) String lostReason,
		@Positive Long assignedTo) {
}
