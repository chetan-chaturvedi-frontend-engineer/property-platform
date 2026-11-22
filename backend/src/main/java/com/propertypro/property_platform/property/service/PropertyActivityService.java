package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.PropertyStatusChange;
import com.propertypro.property_platform.property.dto.PropertyActivityResponse;
import com.propertypro.property_platform.property.repository.PropertyProjectSummaryRepository;
import com.propertypro.property_platform.property.repository.PropertyStatusChangeRepository;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** The admin activity feed: every property's status history, newest first. */
@Service
@RequiredArgsConstructor
public class PropertyActivityService {

	private final PropertyStatusChangeRepository statusChangeRepository;
	private final PropertyProjectSummaryRepository summaryRepository;
	private final UserAccountService userAccountService;

	/** Requires {@code PROPERTY_LIST_ANY} (checked by the controller). Names are read in batch per page. */
	@Transactional(readOnly = true)
	public PageResponse<PropertyActivityResponse> recent(Pageable pageable) {
		// The order is fixed (newest first); a requested sort is ignored.
		Page<PropertyStatusChange> page = statusChangeRepository
			.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
		Map<Long, String> names = summaryRepository
			.findAllByIdIn(page.getContent().stream().map(PropertyStatusChange::getPropertyProjectId).distinct().toList())
			.stream()
			.collect(Collectors.toMap(PropertyProjectSummary::getId, PropertyProjectSummary::getProjectName));
		Map<Long, UserSummary> actors = userAccountService
			.findSummaries(page.getContent().stream().map(PropertyStatusChange::getActorUserId).distinct().toList());
		Function<PropertyStatusChange, PropertyActivityResponse> toResponse = c -> {
			UserSummary actor = actors.get(c.getActorUserId());
			return new PropertyActivityResponse(c.getId(), c.getPropertyProjectId(),
					names.get(c.getPropertyProjectId()), c.getAction(), c.getFromStatus(), c.getToStatus(),
					c.getReason(), actor == null ? null : actor.fullName(), c.getCreatedAt());
		};
		return PageResponse.of(page, toResponse);
	}

}
