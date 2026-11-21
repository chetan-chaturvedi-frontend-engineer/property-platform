package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The password confirms that the account's owner, not someone with an unlocked phone, deletes it. */
@RejectUnknownFields
public record DeleteAccountRequest(@NotBlank @Size(max = 128) String password) {
}
