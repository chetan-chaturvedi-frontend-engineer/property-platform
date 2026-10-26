package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.property.domain.PublicationAction;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * A publication workflow action; the target status follows from the action and the current status,
 * never from the client.
 *
 * @param reason required for reject and suspend; shown to the owner
 */
@RejectUnknownFields
public record StatusChangeRequest(
		@NotNull @Pattern(regexp = PublicationAction.VALUES,
				message = "must be submit, approve, reject, publish, unpublish, suspend, resume or archive") String action,
		@Size(max = 1000) String reason) {
}
