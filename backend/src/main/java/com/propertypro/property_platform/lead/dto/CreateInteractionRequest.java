package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.lead.domain.InteractionOutcome;
import com.propertypro.property_platform.lead.domain.InteractionType;
import com.propertypro.property_platform.lead.domain.LeadInteraction;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/**
 * A past interaction. The actor is always the authenticated user, so {@code interactedBy} is rejected.
 *
 * @param interactionAt  when it happened; not in the future
 * @param note           required for type note
 * @param nextFollowUpAt not before {@code interactionAt}; also becomes the lead's next follow-up
 */
@RejectUnknownFields
public record CreateInteractionRequest(
		@NotNull @Pattern(regexp = InteractionType.VALUES, message = ONE_OF) String type,
		@Size(max = LeadInteraction.NOTE_MAX_LENGTH) String note,
		@NotNull Instant interactionAt,
		@Pattern(regexp = InteractionOutcome.VALUES, message = ONE_OF) String outcome,
		Instant nextFollowUpAt,
		@PositiveOrZero @Max(LeadFieldRules.MAX_DURATION_SECONDS) Integer durationSeconds) {
}
