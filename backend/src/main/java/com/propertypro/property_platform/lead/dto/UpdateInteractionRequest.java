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
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.Optional;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/** Partial update, same rules as creation; the actor ({@code interactedBy}) never changes. */
@Getter
@Setter
@RejectUnknownFields
public class UpdateInteractionRequest {

	private Optional<@NotNull @Pattern(regexp = InteractionType.VALUES, message = ONE_OF) String> type;

	private Optional<@Size(max = LeadInteraction.NOTE_MAX_LENGTH) String> note;

	private Optional<@NotNull Instant> interactionAt;

	private Optional<@Pattern(regexp = InteractionOutcome.VALUES, message = ONE_OF) String> outcome;

	private Optional<Instant> nextFollowUpAt;

	private Optional<@PositiveOrZero @Max(LeadFieldRules.MAX_DURATION_SECONDS) Integer> durationSeconds;

}
