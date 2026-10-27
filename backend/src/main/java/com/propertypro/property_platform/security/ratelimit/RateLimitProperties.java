package com.propertypro.property_platform.security.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Request limits ({@code app.rate-limit.*}): per IP for public authentication endpoints, per user for property actions. */
@ConfigurationProperties("app.rate-limit")
public record RateLimitProperties(
		RateLimit loginIp,
		/** Failed logins per identifier; a temporary window, so it cannot lock an account permanently. */
		RateLimit loginIdentifier,
		RateLimit registerIp,
		RateLimit otpVerifyIp,
		RateLimit otpVerifyIdentifier,
		RateLimit otpSendIp,
		/** Across all destinations; caps SMS/email cost if an attacker rotates identifiers. */
		RateLimit otpSendGlobal,
		RateLimit refreshIp,
		RateLimit adminLoginIp,
		/** Failed admin logins per identifier; a temporary window, so it cannot lock an account permanently. */
		RateLimit adminLoginIdentifier,
		RateLimit propertyCreateUser,
		RateLimit propertyUploadUser,
		/** Workflow actions: submit, review, publish, suspend, archive, legal status, delete, restore. */
		RateLimit propertyStatusUser,
		RateLimit propertyPreviewUser,
		/** Banner writes: create, update, image replacement and delete. */
		RateLimit bannerWriteUser,
		/** Blog category writes: create, update, image replacement or removal and delete. */
		RateLimit blogCategoryWriteUser,
		/** Blog writes: create, update, feature image replacement or removal and delete. */
		RateLimit blogWriteUser,
		/** FAQ writes: create, update and delete. */
		RateLimit faqWriteUser,
		/** Page writes: create, update and delete. */
		RateLimit pageWriteUser,
		/** Lead creation; separate so a flood of new leads cannot use up the write budget. */
		RateLimit leadCreateUser,
		/** Lead, schedule and interaction writes other than lead creation. */
		RateLimit leadWriteUser,
		/** Site visit bookings; separate so retries and floods cannot use up the write budget. */
		RateLimit siteVisitCreateUser,
		/** Site visit writes other than creation: update, assign, status, report, delete. */
		RateLimit siteVisitWriteUser) {
}
