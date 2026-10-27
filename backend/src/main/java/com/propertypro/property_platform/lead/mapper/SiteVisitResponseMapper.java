package com.propertypro.property_platform.lead.mapper;

import com.propertypro.property_platform.lead.domain.SiteVisit;
import com.propertypro.property_platform.lead.dto.LeadUserResponse;
import com.propertypro.property_platform.lead.dto.SiteVisitPropertyResponse;
import com.propertypro.property_platform.lead.dto.SiteVisitReportResponse;
import com.propertypro.property_platform.lead.dto.SiteVisitResponse;
import com.propertypro.property_platform.lead.dto.SiteVisitSummaryResponse;
import com.propertypro.property_platform.property.dto.PropertyReference;
import com.propertypro.property_platform.property.service.PropertyReferenceService;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Stream;

/**
 * Entity to DTO mapping. Users and properties are loaded with one query each per response or page,
 * never per row. Call inside the service transaction.
 */
@Component
@RequiredArgsConstructor
public class SiteVisitResponseMapper {

	private final UserAccountService userAccountService;
	private final PropertyReferenceService propertyReferenceService;

	/** @param internal include the sales fields; false when the caller is only the visitor */
	public SiteVisitResponse toResponse(SiteVisit visit, boolean internal) {
		Map<Long, UserSummary> users = users(Stream.of(visit.getBuilderId(), visit.getUserId(), visit.getAssignId(),
				visit.getScheduledBy(), visit.getReportSubmittedBy()));
		Map<Long, PropertyReference> properties = propertyReferenceService.findAll(List.of(visit.getPropertyId()));
		SiteVisitReportResponse report = internal && visit.hasReport()
				? new SiteVisitReportResponse(visit.getInterest(), visit.getVisitNote(), visit.getDuration(),
						visit.getVisitedWith(), visit.getFeedback(), toInteger(visit.getRating()),
						user(users, visit.getReportSubmittedBy()))
				: null;
		return new SiteVisitResponse(visit.getId(), visit.getVisitCode(), property(properties, visit.getPropertyId()),
				user(users, visit.getBuilderId()), user(users, visit.getUserId()), user(users, visit.getAssignId()),
				visit.getAssignedAt(), user(users, visit.getScheduledBy()), internal ? visit.getLeadId() : null,
				visit.getVisitType(), visit.getVisitDate(), visit.getVisitTime(), visit.getStatus(), visit.getName(),
				visit.getMobile(), visit.getEmail(), visit.getNumberOfPeople(), visit.getNote(),
				visit.getActualVisitDate(), visit.getCancelledAt(), visit.getCancellationReason(), report,
				internal ? visit.getNextFollowUp() : null, internal ? visit.getFollowUpNote() : null,
				visit.getCreatedAt(), visit.getUpdatedAt());
	}

	/** Maps a page of visits with one user and one property lookup for the whole page. */
	public Function<SiteVisit, SiteVisitSummaryResponse> summaries(Collection<SiteVisit> visits,
			Predicate<SiteVisit> internal) {
		Map<Long, UserSummary> users = users(visits.stream()
			.flatMap(visit -> Stream.of(visit.getBuilderId(), visit.getUserId(), visit.getAssignId())));
		Map<Long, PropertyReference> properties = propertyReferenceService.findAll(
				visits.stream().map(SiteVisit::getPropertyId).distinct().toList());
		return visit -> {
			boolean showInternal = internal.test(visit);
			return new SiteVisitSummaryResponse(visit.getId(), visit.getVisitCode(),
					property(properties, visit.getPropertyId()), user(users, visit.getBuilderId()),
					user(users, visit.getUserId()), user(users, visit.getAssignId()), visit.getVisitType(),
					visit.getVisitDate(), visit.getVisitTime(), visit.getStatus(), visit.getName(), visit.getMobile(),
					visit.getNumberOfPeople(), showInternal ? visit.getInterest() : null,
					showInternal ? visit.getNextFollowUp() : null, visit.getCreatedAt(), visit.getUpdatedAt());
		};
	}

	private Map<Long, UserSummary> users(Stream<Long> ids) {
		List<Long> distinct = ids.filter(Objects::nonNull).distinct().toList();
		return distinct.isEmpty() ? Map.of() : userAccountService.findSummaries(distinct);
	}

	private static SiteVisitPropertyResponse property(Map<Long, PropertyReference> properties, Long id) {
		PropertyReference property = properties.get(id);
		return property == null ? new SiteVisitPropertyResponse(id, null, null, null, null)
				: new SiteVisitPropertyResponse(id, property.projectName(), property.slug(), property.city(),
						property.locality());
	}

	private static LeadUserResponse user(Map<Long, UserSummary> users, Long id) {
		if (id == null) {
			return null;
		}
		UserSummary summary = users.get(id);
		return new LeadUserResponse(id, summary == null ? null : summary.fullName());
	}

	private static Integer toInteger(Short value) {
		return value == null ? null : value.intValue();
	}

}
