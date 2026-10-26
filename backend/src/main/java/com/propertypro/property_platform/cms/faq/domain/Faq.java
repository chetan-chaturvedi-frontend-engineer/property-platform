package com.propertypro.property_platform.cms.faq.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Frequently asked question. {@code category} is a key from {@code app.faq.categories}; validate it
 * with {@code FaqRules.requireCategory} before saving. Public queries must use {@code PublicFaqs}.
 */
@Entity
@Table(name = "faqs")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Faq {

	public static final int QUESTION_MAX_LENGTH = 500;
	/** Plain text or simple markup; bounded by request validation, TEXT in the database. */
	public static final int ANSWER_MAX_LENGTH = 10_000;
	public static final int CATEGORY_MAX_LENGTH = 50;
	/** Same rule as {@code chk_faqs_category_format}. */
	public static final String CATEGORY_PATTERN = "^[a-z][a-z0-9_]*$";
	/** Accepted by requests; same range as subscription plan sort orders. */
	public static final int MAX_SORT_ORDER = 100_000;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@Column(nullable = false, length = QUESTION_MAX_LENGTH)
	private String question;

	@Column(nullable = false)
	private String answer;

	@Column(nullable = false, length = CATEGORY_MAX_LENGTH)
	private String category;

	@Column(nullable = false, length = 20)
	private FaqStatus status = FaqStatus.DRAFT;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public Faq(String question, String answer, String category) {
		this.question = question;
		this.answer = answer;
		this.category = category;
	}

}
