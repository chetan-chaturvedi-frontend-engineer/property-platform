package com.propertypro.property_platform.transaction.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The three values the Razorpay checkout returns after a successful payment. */
@RejectUnknownFields
public record VerifyPaymentRequest(
		@NotBlank @Size(max = 64) @Pattern(regexp = "^[A-Za-z0-9_]+$") String razorpayOrderId,
		@NotBlank @Size(max = 64) @Pattern(regexp = "^[A-Za-z0-9_]+$") String razorpayPaymentId,
		@NotBlank @Size(max = 128) @Pattern(regexp = "^[A-Fa-f0-9]+$") String razorpaySignature) {
}
