package com.propertypro.property_platform.lead.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.lead.domain.LeadStatus;
import com.propertypro.property_platform.lead.domain.ScheduleStatus;
import org.springframework.http.HttpStatus;

import java.util.Map;

public final class LeadExceptions {

	private LeadExceptions() {
	}

	/** Also for leads that exist but are not visible to the caller, so ids cannot be probed. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "lead_not_found", "Lead not found.");
	}

	public static ApiException scheduleNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "lead_schedule_not_found", "Schedule not found.");
	}

	public static ApiException interactionNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "lead_interaction_not_found", "Interaction not found.");
	}

	/** The caller can see the lead (or has no lead yet) but lacks the permission for this action. */
	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "lead_action_forbidden",
				"You are not allowed to perform this action on this lead.");
	}

	public static ApiException invalidStatusTransition(LeadStatus from, LeadStatus to) {
		return new ApiException(HttpStatus.CONFLICT, "lead_invalid_status_transition",
				"A " + from.getValue().replace('_', ' ') + " lead cannot be moved to " + to.getValue().replace('_', ' ') + ".",
				Map.of("status", from.getValue(), "requestedStatus", to.getValue()));
	}

	public static ApiException scheduleNotEditable(ScheduleStatus status) {
		return new ApiException(HttpStatus.CONFLICT, "lead_schedule_not_editable",
				"The schedule cannot be changed because it is " + status.getValue() + ".",
				Map.of("status", status.getValue()));
	}

}
