package com.propertypro.property_platform.lead.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.lead.domain.SiteVisitStatus;
import org.springframework.http.HttpStatus;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public final class SiteVisitExceptions {

	private SiteVisitExceptions() {
	}

	/** Also for visits that exist but are not visible to the caller, so ids cannot be probed. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "site_visit_not_found", "Site visit not found.");
	}

	/** The caller can see the visit (or has none yet) but lacks the permission or relation for this action. */
	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "site_visit_action_forbidden",
				"You are not allowed to perform this action on this site visit.");
	}

	/** Fields the caller's relation to the visit does not let them change. */
	public static ApiException fieldsForbidden(Collection<String> fields) {
		List<String> sorted = fields.stream().sorted().toList();
		return new ApiException(HttpStatus.FORBIDDEN, "site_visit_fields_forbidden",
				"You are not allowed to change: " + String.join(", ", sorted) + ".", Map.of("fields", sorted));
	}

	public static ApiException invalidStatusTransition(SiteVisitStatus from, SiteVisitStatus to) {
		return new ApiException(HttpStatus.CONFLICT, "site_visit_invalid_status_transition",
				"A " + label(from) + " visit cannot be moved to " + label(to) + ".",
				Map.of("status", from.getValue(), "requestedStatus", to.getValue()));
	}

	/** Schedule or visitor details of a visit that is no longer upcoming. */
	public static ApiException notEditable(SiteVisitStatus status) {
		return new ApiException(HttpStatus.CONFLICT, "site_visit_not_editable",
				"The visit cannot be changed because it is " + label(status) + ".", Map.of("status", status.getValue()));
	}

	/** The visit has not taken place yet, so it cannot be completed or marked no-show. */
	public static ApiException notDueYet() {
		return new ApiException(HttpStatus.CONFLICT, "site_visit_not_due",
				"The visit date has not been reached yet.");
	}

	public static ApiException reportNotAllowed(SiteVisitStatus status) {
		return new ApiException(HttpStatus.CONFLICT, "site_visit_report_not_allowed",
				"Only completed visits have a report; this visit is " + label(status) + ".",
				Map.of("status", status.getValue()));
	}

	/** A report was already submitted; only holders of {@code SITE_VISIT_SUBMIT_REPORT_ANY} replace it. */
	public static ApiException reportLocked() {
		return new ApiException(HttpStatus.CONFLICT, "site_visit_report_locked",
				"The visit report has already been submitted.");
	}

	/** The visitor already has an upcoming booking for this property at this date and time. */
	public static ApiException duplicateBooking() {
		return new ApiException(HttpStatus.CONFLICT, "site_visit_duplicate",
				"A visit to this property is already booked for this date and time.");
	}

	private static String label(SiteVisitStatus status) {
		return status.getValue().replace('_', '-');
	}

}
