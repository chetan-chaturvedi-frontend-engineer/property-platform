package com.propertypro.property_platform.lead.mapper;

import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.lead.domain.LeadInteraction;
import com.propertypro.property_platform.lead.domain.LeadSchedule;
import com.propertypro.property_platform.lead.dto.InteractionResponse;
import com.propertypro.property_platform.lead.dto.LeadResponse;
import com.propertypro.property_platform.lead.dto.LeadSummaryResponse;
import com.propertypro.property_platform.lead.dto.LeadUserResponse;
import com.propertypro.property_platform.lead.dto.ScheduleResponse;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Stream;

/**
 * Entity to DTO mapping. User names are loaded with one query per response or page, never per row.
 * Call inside the service transaction.
 */
@Component
@RequiredArgsConstructor
public class LeadResponseMapper {

	private final UserAccountService userAccountService;

	public LeadResponse toResponse(Lead lead) {
		Map<Long, UserSummary> users = users(Stream.of(lead.getCreatedBy(), lead.getAssignedTo()));
		return new LeadResponse(lead.getId(), user(users, lead.getCreatedBy()), user(users, lead.getAssignedTo()),
				lead.getSource(), lead.getStatus(), lead.getPriority(), lead.getPurpose(), lead.getLeadName(),
				lead.getPhone(), lead.getAlternatePhone(), lead.getEmail(), lead.getPropertyType(), lead.getBhk(),
				lead.getBudgetMin(), lead.getBudgetMax(), lead.getBudgetCurrency(), lead.getArea(), lead.getAreaUnit(),
				lead.getPreferredLocation(), lead.getLocation(), lead.getPossession(), lead.getMoveInDate(),
				lead.getFloorPreference(), lead.getFacing(), lead.getFurnishing(), lead.getParking(),
				lead.getAmenities() == null ? List.of() : List.copyOf(lead.getAmenities()), lead.isLoanRequired(),
				lead.getAdditionalNote(), lead.getLastContactedAt(), lead.getNextFollowUpAt(), lead.getLostReason(),
				lead.getCreatedAt(), lead.getUpdatedAt());
	}

	/** Maps a page of leads with one user lookup for the whole page. */
	public Function<Lead, LeadSummaryResponse> summaries(Collection<Lead> leads) {
		Map<Long, UserSummary> users = users(leads.stream()
			.flatMap(lead -> Stream.of(lead.getCreatedBy(), lead.getAssignedTo())));
		return lead -> new LeadSummaryResponse(lead.getId(), user(users, lead.getCreatedBy()),
				user(users, lead.getAssignedTo()), lead.getSource(), lead.getStatus(), lead.getPriority(),
				lead.getPurpose(), lead.getLeadName(), lead.getPhone(), lead.getEmail(), lead.getPropertyType(),
				lead.getBhk(), lead.getBudgetMin(), lead.getBudgetMax(), lead.getBudgetCurrency(),
				lead.getPreferredLocation(), lead.getLastContactedAt(), lead.getNextFollowUpAt(), lead.getCreatedAt(),
				lead.getUpdatedAt());
	}

	public ScheduleResponse toResponse(LeadSchedule schedule) {
		return schedules(List.of(schedule)).apply(schedule);
	}

	public Function<LeadSchedule, ScheduleResponse> schedules(Collection<LeadSchedule> schedules) {
		Map<Long, UserSummary> users = users(schedules.stream()
			.flatMap(schedule -> Stream.of(schedule.getAssignedTo(), schedule.getCreatedBy())));
		return schedule -> new ScheduleResponse(schedule.getId(), schedule.getLeadId(), schedule.getScheduleType(),
				schedule.getTitle(), schedule.getDescription(), schedule.getScheduledAt(),
				schedule.getDurationMinutes(), schedule.getLocation(), user(users, schedule.getAssignedTo()),
				user(users, schedule.getCreatedBy()), schedule.getStatus(), schedule.getReminderAt(),
				schedule.getCompletedAt(), schedule.getCompletionNote(), schedule.getRescheduledFromId(),
				schedule.getCreatedAt(), schedule.getUpdatedAt());
	}

	public InteractionResponse toResponse(LeadInteraction interaction) {
		return interactions(List.of(interaction)).apply(interaction);
	}

	public Function<LeadInteraction, InteractionResponse> interactions(Collection<LeadInteraction> interactions) {
		Map<Long, UserSummary> users = users(interactions.stream().map(LeadInteraction::getInteractedBy));
		return interaction -> new InteractionResponse(interaction.getId(), interaction.getLeadId(),
				interaction.getType(), interaction.getNote(), user(users, interaction.getInteractedBy()),
				interaction.getInteractionAt(), interaction.getOutcome(), interaction.getNextFollowUpAt(),
				interaction.getDurationSeconds(), interaction.getCreatedAt(), interaction.getUpdatedAt());
	}

	private Map<Long, UserSummary> users(Stream<Long> ids) {
		List<Long> distinct = ids.filter(Objects::nonNull).distinct().toList();
		return distinct.isEmpty() ? Map.of() : userAccountService.findSummaries(distinct);
	}

	private static LeadUserResponse user(Map<Long, UserSummary> users, Long id) {
		if (id == null) {
			return null;
		}
		UserSummary summary = users.get(id);
		return new LeadUserResponse(id, summary == null ? null : summary.fullName());
	}

}
