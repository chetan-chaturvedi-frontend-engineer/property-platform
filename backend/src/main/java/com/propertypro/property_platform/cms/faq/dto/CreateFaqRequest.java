package com.propertypro.property_platform.cms.faq.dto;

import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.domain.FaqStatus;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * New FAQ. Only these fields are accepted; any other (id, createdAt, ...) is rejected.
 *
 * @param question  plain text, trimmed
 * @param answer    HTML; sanitized with an allow-list before it is stored
 * @param category  a key of {@code app.faq.categories}, checked by {@code FaqRules}
 * @param status    defaults to draft; publish also needs {@code FAQ_PUBLISH}
 * @param sortOrder defaults to 0; equal values are allowed
 */
@RejectUnknownFields
public record CreateFaqRequest(
		@NotBlank @Size(max = Faq.QUESTION_MAX_LENGTH) String question,
		@NotBlank @Size(max = Faq.ANSWER_MAX_LENGTH) String answer,
		@NotBlank @Size(max = Faq.CATEGORY_MAX_LENGTH) String category,
		@Pattern(regexp = FaqStatus.VALUES, message = "must be draft or publish") String status,
		@Min(0) @Max(Faq.MAX_SORT_ORDER) Integer sortOrder) {
}
