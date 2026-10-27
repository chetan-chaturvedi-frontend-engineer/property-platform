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

import java.time.LocalDate;
import java.time.LocalTime;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;
import static com.propertypro.property_platform.lead.dto.LeadFieldRules.PHONE_INPUT_MAX_LENGTH;

/**
 * A visit booked from the app. Builder, visitor account, scheduler and status are set by the server;
 * every other field (assignee, report, follow-up) is rejected.
 *
 * @param propertyId a published property, or one the caller owns (recording a walk-in)
 * @param visitDate  today or later, within {@code app.site-visit.max-advance-days}, at the property
 * @param visitTime  local time at the property; not already past when the date is today
 * @param mobile     any common format; stored in E.164 (default region India)
 */
@RejectUnknownFields
public record CreateSiteVisitRequest(
		@NotNull @Positive Long propertyId,
		@Pattern(regexp = SiteVisitType.VALUES, message = ONE_OF) String visitType,
		@NotNull LocalDate visitDate,
		@NotNull LocalTime visitTime,
		@NotBlank @Size(max = SiteVisit.NAME_MAX_LENGTH) String name,
		@NotBlank @Size(max = PHONE_INPUT_MAX_LENGTH) @ValidPhone String mobile,
		@Email @Size(max = SiteVisit.EMAIL_MAX_LENGTH) String email,
		@Min(1) @Max(SiteVisit.MAX_PEOPLE) Integer numberOfPeople,
		@Size(max = SiteVisit.NOTE_MAX_LENGTH) String note) {
}
