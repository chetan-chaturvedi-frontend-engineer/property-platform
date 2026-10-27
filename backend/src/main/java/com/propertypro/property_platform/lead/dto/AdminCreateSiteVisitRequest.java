package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.validation.ValidPhone;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.lead.domain.SiteVisit;
import com.propertypro.property_platform.lead.domain.SiteVisitType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;
import static com.propertypro.property_platform.lead.dto.LeadFieldRules.PHONE_INPUT_MAX_LENGTH;

/**
 * A visit created on the admin dashboard. The builder always comes from the property; scheduler and
 * status are set by the server. Same scheduling rules as {@link CreateSiteVisitRequest}.
 *
 * @param propertyId any property that is not deleted
 * @param userId     the visitor's account: an active user
 * @param assignId   also requires {@code SITE_VISIT_ASSIGN_ANY}; an eligible assignee
 * @param leadId     a lead the caller can view
 */
@RejectUnknownFields
public record AdminCreateSiteVisitRequest(
		@NotNull @Positive Long propertyId,
		@Positive Long userId,
		@Positive Long assignId,
		@Positive Long leadId,
		@Pattern(regexp = SiteVisitType.VALUES, message = ONE_OF) String visitType,
		@NotNull LocalDate visitDate,
		@NotNull LocalTime visitTime,
		@NotBlank @Size(max = SiteVisit.NAME_MAX_LENGTH) String name,
		@NotBlank @Size(max = PHONE_INPUT_MAX_LENGTH) @ValidPhone String mobile,
		@Email @Size(max = SiteVisit.EMAIL_MAX_LENGTH) String email,
		@Min(1) @Max(SiteVisit.MAX_PEOPLE) Integer numberOfPeople,
		@Size(max = SiteVisit.NOTE_MAX_LENGTH) String note,
		Instant nextFollowUp,
		@Size(max = SiteVisit.NOTE_MAX_LENGTH) String followUpNote) {
}
