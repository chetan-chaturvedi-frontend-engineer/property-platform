package com.propertypro.property_platform.transaction.api;

import com.propertypro.property_platform.transaction.service.PaymentService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Razorpay webhook: no login, authenticated only by the HMAC signature over the raw body. Answers 200 for any
 * correctly signed event (even ones it ignores) so Razorpay does not keep retrying them.
 */
@Hidden
@RestController
@RequestMapping("/api/v1/public/payments/razorpay")
@RequiredArgsConstructor
public class RazorpayWebhookController {

	private final PaymentService paymentService;

	@PostMapping("/webhook")
	public ResponseEntity<Void> webhook(@RequestBody byte[] body,
			@RequestHeader(name = "X-Razorpay-Signature", required = false) String signature) {
		return paymentService.handleWebhook(body, signature) ? ResponseEntity.ok().build()
				: ResponseEntity.badRequest().build();
	}

}
