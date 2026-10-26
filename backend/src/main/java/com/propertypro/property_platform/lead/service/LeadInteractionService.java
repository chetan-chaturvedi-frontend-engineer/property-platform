package com.propertypro.property_platform.lead.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.lead.domain.InteractionOutcome;
import com.propertypro.property_platform.lead.domain.InteractionType;
import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.lead.domain.LeadInteraction;
import com.propertypro.property_platform.lead.dto.CreateInteractionRequest;
import com.propertypro.property_platform.lead.dto.InteractionResponse;
import com.propertypro.property_platform.lead.dto.UpdateInteractionRequest;
import com.propertypro.property_platform.lead.exception.LeadExceptions;
import com.propertypro.property_platform.lead.mapper.LeadResponseMapper;
import com.propertypro.property_platform.lead.repository.LeadInteractionRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static com.propertypro.property_platform.lead.service.LeadService.apply;
import static com.propertypro.property_platform.lead.service.LeadService.stripToNull;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_VIEW;

/**
 * Communication history of a lead. Writes lock the lead row and, in the same transaction, keep the
 * lead's {@code lastContactedAt} equal to the latest non-note interaction; a {@code nextFollowUpAt}
 * given with an interaction becomes the lead's next follow-up. Outcomes never change the lead status.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeadInteractionService {

	static final List<String> SORTABLE_FIELDS = List.of("interactionAt", "createdAt");
	/** Tolerated clock difference between the client and the server. */
	private static final Duration FUTURE_TOLERANCE = Duration.ofMinutes(5);

	private final LeadInteractionRepository interactionRepository;
	private final LeadAccessService access;
	private final LeadResponseMapper mapper;
	private final Clock clock;

	@Transactional(readOnly = true)
	public PageResponse<InteractionResponse> list(Long leadId, CurrentActor actor, String type, Pageable pageable) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_INTERACTION_VIEW, false);
		PageRequest page = LeadPaging.of(pageable, SORTABLE_FIELDS);
		Page<LeadInteraction> interactions = type == null ? interactionRepository.findByLeadId(lead.getId(), page)
				: interactionRepository.findByLeadIdAndType(lead.getId(), InteractionType.fromValue(type), page);
		return PageResponse.of(interactions, mapper.interactions(interactions.getContent()));
	}

	@Transactional(readOnly = true)
	public InteractionResponse get(Long leadId, Long interactionId, CurrentActor actor) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_INTERACTION_VIEW, false);
		return mapper.toResponse(find(lead, interactionId));
	}

	@Transactional
	public InteractionResponse create(Long leadId, CurrentActor actor, CreateInteractionRequest request) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_INTERACTION_CREATE, true);
		LeadInteraction interaction = new LeadInteraction(lead.getId(), actor.userId(),
				InteractionType.fromValue(request.type()), request.interactionAt());
		interaction.setNote(stripToNull(request.note()));
		interaction.setOutcome(request.outcome() == null ? null : InteractionOutcome.fromValue(request.outcome()));
		interaction.setNextFollowUpAt(request.nextFollowUpAt());
		interaction.setDurationSeconds(request.durationSeconds());
		validate(interaction);
		interactionRepository.saveAndFlush(interaction);
		refreshLead(lead, interaction.getNextFollowUpAt());
		return mapper.toResponse(interaction);
	}

	@Transactional
	public InteractionResponse update(Long leadId, Long interactionId, CurrentActor actor,
			UpdateInteractionRequest request) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_INTERACTION_UPDATE, true);
		LeadInteraction interaction = find(lead, interactionId);
		apply(request.getType(), value -> interaction.setType(InteractionType.fromValue(value)));
		apply(request.getNote(), value -> interaction.setNote(stripToNull(value)));
		apply(request.getInteractionAt(), interaction::setInteractionAt);
		apply(request.getOutcome(), value -> interaction.setOutcome(
				value == null ? null : InteractionOutcome.fromValue(value)));
		apply(request.getNextFollowUpAt(), interaction::setNextFollowUpAt);
		apply(request.getDurationSeconds(), interaction::setDurationSeconds);
		validate(interaction);
		interactionRepository.flush();
		refreshLead(lead, request.getNextFollowUpAt() == null ? null : interaction.getNextFollowUpAt());
		return mapper.toResponse(interaction);
	}

	/** Soft delete; the lead's {@code lastContactedAt} is recomputed from the remaining interactions. */
	@Transactional
	public void delete(Long leadId, Long interactionId, CurrentActor actor) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_INTERACTION_DELETE, true);
		interactionRepository.delete(find(lead, interactionId));
		interactionRepository.flush();
		refreshLead(lead, null);
		log.info("Lead interaction deleted leadId={} interactionId={} by={}", lead.getId(), interactionId,
				actor.userId());
	}

	private LeadInteraction find(Lead lead, Long interactionId) {
		return interactionRepository.findByIdAndLeadId(interactionId, lead.getId())
			.orElseThrow(LeadExceptions::interactionNotFound);
	}

	/** Called with the lead row locked, after the interaction change was flushed. */
	private void refreshLead(Lead lead, Instant nextFollowUpAt) {
		lead.setLastContactedAt(interactionRepository
			.findLatestInteractionAtExcluding(lead.getId(), InteractionType.NOTE).orElse(null));
		if (nextFollowUpAt != null) {
			lead.setNextFollowUpAt(nextFollowUpAt);
		}
	}

	private void validate(LeadInteraction interaction) {
		if (interaction.getInteractionAt().isAfter(clock.instant().plus(FUTURE_TOLERANCE))) {
			throw new FieldValidationException("interactionAt", "must not be in the future");
		}
		if (interaction.getNextFollowUpAt() != null
				&& interaction.getNextFollowUpAt().isBefore(interaction.getInteractionAt())) {
			throw new FieldValidationException("nextFollowUpAt", "must not be before interactionAt");
		}
		if (interaction.getType() == InteractionType.NOTE && interaction.getNote() == null) {
			throw new FieldValidationException("note", "is required for a note");
		}
	}

}
