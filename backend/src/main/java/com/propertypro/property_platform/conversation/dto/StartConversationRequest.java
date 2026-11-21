package com.propertypro.property_platform.conversation.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.conversation.domain.Message;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * "Enquire now": the first message of a buyer to the owner of a published property. Asking again about the same
 * property adds the message to the existing conversation.
 */
@RejectUnknownFields
public record StartConversationRequest(
		@NotNull @Positive Long propertyId,
		@NotBlank @Size(max = Message.BODY_MAX_LENGTH) String message) {
}
