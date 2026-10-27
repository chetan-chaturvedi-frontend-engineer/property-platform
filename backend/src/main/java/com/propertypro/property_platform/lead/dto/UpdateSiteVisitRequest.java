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
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;
import static com.propertypro.property_platform.lead.dto.LeadFieldRules.PHONE_INPUT_MAX_LENGTH;

/**
 * Partial update; omitted fields keep their value, explicit {@code null} clears optional ones. Which
 * fields a caller may send depends on their relation to the visit (see {@code SiteVisitService}); any
 * other field is rejected with 403, and unknown fields (owner, status, report, ...) with 400. Status,
 * assignment and the report change only through their own endpoints.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateSiteVisitRequest {

	private Optional<@NotNull @Pattern(regexp = SiteVisitType.VALUES, message = ONE_OF) String> visitType;

	/** Moving an upcoming visit makes it rescheduled. */
	private Optional<@NotNull LocalDate> visitDate;

	private Optional<@NotNull LocalTime> visitTime;

	private Optional<@NotBlank @Size(max = SiteVisit.NAME_MAX_LENGTH) String> name;

	private Optional<@NotBlank @Size(max = PHONE_INPUT_MAX_LENGTH) @ValidPhone String> mobile;

	private Optional<@Email @Size(max = SiteVisit.EMAIL_MAX_LENGTH) String> email;

	private Optional<@NotNull @Min(1) @Max(SiteVisit.MAX_PEOPLE) Integer> numberOfPeople;

	private Optional<@Size(max = SiteVisit.NOTE_MAX_LENGTH) String> note;

	private Optional<Instant> nextFollowUp;

	private Optional<@Size(max = SiteVisit.NOTE_MAX_LENGTH) String> followUpNote;

	/** Admin only: the visitor's account. */
	private Optional<@Positive Long> userId;

	/** Admin only: a lead the caller can view. */
	private Optional<@Positive Long> leadId;

	/** Names of the fields present in the request, in declaration order. */
	public Set<String> presentFields() {
		Map<String, Optional<?>> fields = new LinkedHashMap<>();
		fields.put("visitType", visitType);
		fields.put("visitDate", visitDate);
		fields.put("visitTime", visitTime);
		fields.put("name", name);
		fields.put("mobile", mobile);
		fields.put("email", email);
		fields.put("numberOfPeople", numberOfPeople);
		fields.put("note", note);
		fields.put("nextFollowUp", nextFollowUp);
		fields.put("followUpNote", followUpNote);
		fields.put("userId", userId);
		fields.put("leadId", leadId);
		fields.values().removeIf(value -> value == null);
		return fields.keySet();
	}

}
