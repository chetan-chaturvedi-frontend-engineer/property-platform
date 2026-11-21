package com.propertypro.property_platform.conversation.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.conversation.domain.Message;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RejectUnknownFields
public record SendMessageRequest(@NotBlank @Size(max = Message.BODY_MAX_LENGTH) String body) {
}
