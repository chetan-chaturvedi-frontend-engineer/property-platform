package com.propertypro.property_platform.cms.faq.dto;

import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.domain.FaqStatus;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Optional;

/**
 * Partial update (PATCH), same rules as {@link CreateFaqRequest}. Omitted ({@code null} here) keeps the
 * saved value; an explicit JSON {@code null} is rejected, since every field is required. Changing
 * {@code status} also needs {@code FAQ_PUBLISH}. Any other field (id, createdAt, ...) is rejected.
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateFaqRequest {

	private Optional<@NotBlank @Size(max = Faq.QUESTION_MAX_LENGTH) String> question;

	private Optional<@NotBlank @Size(max = Faq.ANSWER_MAX_LENGTH) String> answer;

	private Optional<@NotBlank @Size(max = Faq.CATEGORY_MAX_LENGTH) String> category;

	private Optional<@NotNull @Pattern(regexp = FaqStatus.VALUES, message = "must be draft or publish") String> status;

	private Optional<@NotNull @Min(0) @Max(Faq.MAX_SORT_ORDER) Integer> sortOrder;

}
