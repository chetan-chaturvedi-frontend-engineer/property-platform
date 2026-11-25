package com.propertypro.property_platform.transaction;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import com.propertypro.property_platform.transaction.service.RazorpayGateway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Razorpay checkout, verification and webhook; the gateway is replaced so no request leaves the test. */
@TestPropertySource(properties = { "app.razorpay.key-id=rzp_test_key", "app.razorpay.key-secret=test_key_secret",
		"app.razorpay.webhook-secret=test_webhook_secret" })
class PaymentApiTests extends AbstractIntegrationTest {

	private static final String CHECKOUT = "/api/v1/subscriptions/checkout";
	private static final String VERIFY = "/api/v1/subscriptions/verify";
	private static final String WEBHOOK = "/api/v1/public/payments/razorpay/webhook";
	private static final String ORDER = "order_TEST1";
	private static final String PAYMENT = "pay_TEST1";

	@Autowired
	private PasswordEncoder passwordEncoder;

	@MockitoBean
	private RazorpayGateway gateway;

	private String alice;
	private long freePlan;
	private long paidPlan;

	@BeforeEach
	void setUp() throws Exception {
		jdbc.execute("TRUNCATE subscription_plans RESTART IDENTITY CASCADE");
		freePlan = plan("Free", "free", 0);
		paidPlan = plan("Premium", "premium", 999);
		account("alice@example.com");
		alice = accessToken(postJson("/api/v1/auth/login",
				"{\"identifier\":\"alice@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)));
		when(gateway.createOrder(anyLong(), anyString(), anyString(), anyMap())).thenReturn(ORDER);
	}

	@AfterEach
	void cleanUp() {
		jdbc.execute("TRUNCATE system_logs, users RESTART IDENTITY CASCADE");
	}

	@Test
	void checkoutCreatesAnOrderForThePlanPriceInPaise() throws Exception {
		send(post(CHECKOUT), alice, "{\"planId\": %d}".formatted(paidPlan))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.keyId").value("rzp_test_key"))
			.andExpect(jsonPath("$.orderId").value(ORDER))
			.andExpect(jsonPath("$.amount").value(99900))
			.andExpect(jsonPath("$.currency").value("INR"))
			.andExpect(jsonPath("$.keySecret").doesNotExist());

		org.mockito.Mockito.verify(gateway).createOrder(eq(99900L), eq("INR"), anyString(), anyMap());
		assertThat(payments("created")).isOne();
		assertThat(subscriptions()).isZero();
	}

	@Test
	void checkoutRejectsFreeUnknownAndUnauthenticatedRequests() throws Exception {
		send(post(CHECKOUT), alice, "{\"planId\": %d}".formatted(freePlan))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("payment_not_required"));
		send(post(CHECKOUT), alice, "{\"planId\": 99999}").andExpect(status().isNotFound());
		send(post(CHECKOUT), alice, "{\"planId\": %d, \"amount\": 1}".formatted(paidPlan))
			.andExpect(status().isBadRequest());
		mvc.perform(post(CHECKOUT).contentType(MediaType.APPLICATION_JSON).content("{\"planId\": 1}"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void aValidSignatureActivatesThePlanOnceEvenWhenRepeated() throws Exception {
		checkout();

		send(post(VERIFY), alice, verifyBody(PAYMENT, hmac(ORDER + "|" + PAYMENT, "test_key_secret")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("paid"))
			.andExpect(jsonPath("$.subscription.planTitle").value("Premium"))
			.andExpect(jsonPath("$.subscription.status").value("active"));
		send(post(VERIFY), alice, verifyBody(PAYMENT, hmac(ORDER + "|" + PAYMENT, "test_key_secret")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.subscription.planTitle").value("Premium"));

		assertThat(subscriptions()).isOne();
		assertThat(payments("paid")).isOne();
	}

	@Test
	void aWrongSignatureActivatesNothing() throws Exception {
		checkout();

		send(post(VERIFY), alice, verifyBody(PAYMENT, hmac(ORDER + "|" + PAYMENT, "wrong_secret")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("payment_signature_invalid"));

		assertThat(subscriptions()).isZero();
		assertThat(payments("created")).isOne();
	}

	@Test
	void anotherUsersOrderCannotBeVerified() throws Exception {
		checkout();
		account("bob@example.com");
		String bob = accessToken(postJson("/api/v1/auth/login",
				"{\"identifier\":\"bob@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)));

		send(post(VERIFY), bob, verifyBody(PAYMENT, hmac(ORDER + "|" + PAYMENT, "test_key_secret")))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("payment_not_found"));
		assertThat(subscriptions()).isZero();
	}

	@Test
	void aSignedWebhookActivatesThePlanWhenTheAppNeverConfirmed() throws Exception {
		checkout();
		String body = webhookBody("payment.captured", 99900);

		webhook(body, hmac(body, "test_webhook_secret")).andExpect(status().isOk());
		webhook(body, hmac(body, "test_webhook_secret")).andExpect(status().isOk());

		assertThat(subscriptions()).isOne();
		assertThat(payments("paid")).isOne();
	}

	@Test
	void webhooksWithABadSignatureOrWrongAmountDoNothing() throws Exception {
		checkout();
		String body = webhookBody("payment.captured", 99900);

		webhook(body, hmac(body, "not_the_secret")).andExpect(status().isBadRequest());
		webhook(body, null).andExpect(status().isBadRequest());
		String cheap = webhookBody("payment.captured", 100);
		webhook(cheap, hmac(cheap, "test_webhook_secret")).andExpect(status().isOk());

		assertThat(subscriptions()).isZero();
		assertThat(payments("created")).isOne();
	}

	@Test
	void alreadySubscribedUsersCannotStartAPayment() throws Exception {
		jdbc.update("""
				INSERT INTO user_subscriptions (user_id, subscription_plan_id, status, plan_title, price, currency,
				    billing_interval, billing_interval_count, no_of_properties, starts_at, ends_at)
				SELECT u.id, ?, 'active', 'Free', 0, 'INR', 'month', 1, 3, now(), now() + interval '30 days'
				FROM users u WHERE u.email = 'alice@example.com'""", freePlan);

		send(post(CHECKOUT), alice, "{\"planId\": %d}".formatted(paidPlan))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("subscription_already_active"));
	}

	private void checkout() throws Exception {
		send(post(CHECKOUT), alice, "{\"planId\": %d}".formatted(paidPlan)).andExpect(status().isOk());
	}

	private ResultActions webhook(String body, String signature) throws Exception {
		MockHttpServletRequestBuilder request = post(WEBHOOK).contentType(MediaType.APPLICATION_JSON).content(body);
		if (signature != null) {
			request.header("X-Razorpay-Signature", signature);
		}
		return mvc.perform(request);
	}

	private static String webhookBody(String event, long amountPaise) {
		return """
				{"event":"%s","payload":{"payment":{"entity":{"id":"%s","order_id":"%s","amount":%d,\
				"currency":"INR","status":"captured"}}}}""".formatted(event, PAYMENT, ORDER, amountPaise);
	}

	private static String verifyBody(String paymentId, String signature) {
		return "{\"razorpayOrderId\":\"%s\",\"razorpayPaymentId\":\"%s\",\"razorpaySignature\":\"%s\"}"
			.formatted(ORDER, paymentId, signature);
	}

	private static String hmac(String data, String secret) throws Exception {
		Mac mac = Mac.getInstance("HmacSHA256");
		mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
		return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
	}

	private long plan(String title, String slug, int price) {
		return jdbc.queryForObject("""
				INSERT INTO subscription_plans (title, slug, price, status, no_of_properties, sort_order)
				VALUES (?, ?, ?, 'active', 3, 1) RETURNING id""", Long.class, title, slug, price);
	}

	private void account(String email) {
		jdbc.update("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Test', 'active', 'user', now())""", email, passwordEncoder.encode(PASSWORD));
	}

	private ResultActions send(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private int subscriptions() {
		return jdbc.queryForObject("SELECT count(*) FROM user_subscriptions", Integer.class);
	}

	private int payments(String status) {
		return jdbc.queryForObject("SELECT count(*) FROM payments WHERE status = ?", Integer.class, status);
	}

}
