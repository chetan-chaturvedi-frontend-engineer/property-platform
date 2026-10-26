package com.propertypro.property_platform.property.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.property.domain.PublicationAction;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

public final class PropertyExceptions {

	private PropertyExceptions() {
	}

	/** Also for properties that exist but are not the caller's, so ids cannot be probed. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "property_not_found", "Property not found.");
	}

	public static ApiException apartmentNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "property_apartment_not_found", "Apartment configuration not found.");
	}

	public static ApiException mediaNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "property_media_not_found", "Media not found.");
	}

	/** The caller can see the property but lacks the permission for this action. */
	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "property_action_forbidden",
				"You are not allowed to perform this action on this property.");
	}

	public static ApiException accountVerificationRequired() {
		return new ApiException(HttpStatus.FORBIDDEN, "account_verification_required",
				"Verify your email or phone before adding properties.");
	}

	public static ApiException accountInactive() {
		return new ApiException(HttpStatus.FORBIDDEN, "account_inactive",
				"Your account is not active, so you cannot add properties.");
	}

	public static ApiException versionConflict(long currentVersion) {
		return new ApiException(HttpStatus.CONFLICT, "property_version_conflict",
				"The property was changed by someone else. Reload it and try again.",
				Map.of("currentVersion", currentVersion));
	}

	public static ApiException notEditable(PublicationStatus status) {
		return new ApiException(HttpStatus.CONFLICT, "property_not_editable",
				"The property cannot be changed while it is " + status.getValue().replace('_', ' ') + ".",
				Map.of("publicationStatus", status.getValue()));
	}

	public static ApiException invalidTransition(PublicationAction action, PublicationStatus status) {
		return new ApiException(HttpStatus.CONFLICT, "property_invalid_status_transition",
				"Cannot " + action.getValue() + " a property that is " + status.getValue().replace('_', ' ') + ".",
				Map.of("action", action.getValue(), "publicationStatus", status.getValue()));
	}

	/** Submission of a property with missing mandatory data, listed per wizard step. */
	public static ApiException incomplete(Map<Integer, List<String>> missingByStep) {
		return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "property_incomplete",
				"Complete all required steps before submitting the property.", Map.of("missing", missingByStep));
	}

	public static ApiException mediaLimitReached(String mediaType, int limit) {
		return new ApiException(HttpStatus.CONFLICT, "property_media_limit_reached",
				"At most " + limit + " " + mediaType.replace('_', ' ') + " item(s) are allowed.",
				Map.of("mediaType", mediaType, "limit", limit));
	}

	public static ApiException apartmentLimitReached(int limit) {
		return new ApiException(HttpStatus.CONFLICT, "property_apartment_limit_reached",
				"At most " + limit + " apartment configurations are allowed per property.", Map.of("limit", limit));
	}

	public static ApiException idempotencyKeyReused() {
		return new ApiException(HttpStatus.CONFLICT, "idempotency_key_reused",
				"This Idempotency-Key was already used for a property that has been deleted.");
	}

}
