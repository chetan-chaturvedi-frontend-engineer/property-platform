package com.propertypro.property_platform.activitylog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

/** One logged activity. Append-only: never changed after insert (see the triggers on the table). */
@Entity
@Table(name = "system_logs")
@Immutable
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SystemLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id")
	private Long userId;

	@Column(nullable = false, length = 50)
	private String module;

	@Column(nullable = false)
	private String action;

	@Column(name = "log_level", nullable = false, length = 10)
	private SystemLogLevel logLevel;

	@JdbcTypeCode(SqlTypes.INET)
	@Column(name = "ip_address", columnDefinition = "inet")
	private String ipAddress;

	@Column(name = "user_agent", length = 512)
	private String userAgent;

	@Column(name = "request_method", length = 10)
	private String requestMethod;

	@Column(name = "request_url", length = 2048)
	private String requestUrl;

	@Column(name = "reference_id")
	private Long referenceId;

	@Column(name = "reference_type", length = 50)
	private String referenceType;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "additional_data", columnDefinition = "jsonb")
	private Map<String, Object> additionalData;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

}
