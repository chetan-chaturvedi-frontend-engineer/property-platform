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
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;
import static com.propertypro.property_platform.lead.dto.LeadFieldRules.PHONE_INPUT_MAX_LENGTH;

/**
 * Partial update. Per field: omitted ({@code null} here) keeps the saved value; an explicit JSON
 * {@code null} clears an optional field and is rejected for required ones. The assignee changes only
 * through {@code PATCH /leads/{id}/assign}; creator and timestamps never change.
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateLeadRequest {

	private Optional<@NotBlank @Size(max = Lead.LEAD_NAME_MAX_LENGTH) String> leadName;

	private Optional<@NotBlank @Size(max = PHONE_INPUT_MAX_LENGTH) @ValidPhone String> phone;

	private Optional<@Size(max = PHONE_INPUT_MAX_LENGTH) @ValidPhone String> alternatePhone;

	private Optional<@Email @Size(max = 255) String> email;

	private Optional<@NotNull @Pattern(regexp = LeadSource.VALUES, message = ONE_OF) String> source;

	private Optional<@NotNull @Pattern(regexp = LeadStatus.VALUES, message = ONE_OF) String> status;

	private Optional<@NotNull @Pattern(regexp = LeadPriority.VALUES, message = ONE_OF) String> priority;

	private Optional<@NotNull @Pattern(regexp = LeadPurpose.VALUES, message = ONE_OF) String> purpose;

	private Optional<@Pattern(regexp = LeadPropertyType.VALUES, message = ONE_OF) String> propertyType;

	private Optional<@Pattern(regexp = Lead.BHK_PATTERN, message = "must be studio, 1rk or a number of bedrooms such as 2 or 2.5") String> bhk;

	private Optional<@PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal> budgetMin;

	private Optional<@PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal> budgetMax;

	private Optional<@NotNull @Pattern(regexp = LeadFieldRules.CURRENCY, message = "must be a 3-letter ISO 4217 code") String> budgetCurrency;

	private Optional<@Positive @Digits(integer = 10, fraction = 2) BigDecimal> area;

	private Optional<@Pattern(regexp = AreaUnit.VALUES, message = ONE_OF) String> areaUnit;

	private Optional<@Size(max = Lead.PREFERRED_LOCATION_MAX_LENGTH) String> preferredLocation;

	private Optional<@Size(max = Lead.LOCATION_MAX_LENGTH) String> location;

	private Optional<@Pattern(regexp = PossessionTimeline.VALUES, message = ONE_OF) String> possession;

	private Optional<LocalDate> moveInDate;

	private Optional<@Size(max = Lead.FLOOR_PREFERENCE_MAX_LENGTH) String> floorPreference;

	private Optional<@Pattern(regexp = Facing.VALUES, message = ONE_OF) String> facing;

	private Optional<@Pattern(regexp = Furnishing.VALUES, message = ONE_OF) String> furnishing;

	private Optional<@Pattern(regexp = ParkingPreference.VALUES, message = ONE_OF) String> parking;

	private Optional<@Size(max = Lead.AMENITIES_MAX_SIZE) List<@NotBlank @Size(max = 120) String>> amenities;

	private Optional<@NotNull Boolean> loanRequired;

	private Optional<@Size(max = Lead.ADDITIONAL_NOTE_MAX_LENGTH) String> additionalNote;

	private Optional<Instant> nextFollowUpAt;

	private Optional<@Size(max = Lead.LOST_REASON_MAX_LENGTH) String> lostReason;

}
