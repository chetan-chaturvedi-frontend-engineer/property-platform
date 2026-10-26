package com.propertypro.property_platform.lead.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.role.service.RolePermissionService;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Checks users named in {@code assignedTo} fields. Only an active account whose role lets it view the
 * lead is eligible, so a lead is never handed to someone who cannot open it, and customer details are
 * never pushed to arbitrary accounts. Unknown, deleted and ineligible users get the same message.
 */
@Service
@RequiredArgsConstructor
public class LeadAssigneeService {

	private static final String NOT_ELIGIBLE = "must be an active user who can work on this lead";

	private final UserAccountService userAccountService;
	private final RolePermissionService rolePermissionService;

	/** The lead's assignee: must be able to view the lead once assigned. */
	@Transactional(readOnly = true)
	public void requireEligibleLeadAssignee(Long userId, Long createdBy, String field) {
		requireEligible(userId, createdBy, userId, field);
	}

	/** A schedule's assignee: must be able to view the lead as it is now assigned. */
	@Transactional(readOnly = true)
	public void requireEligibleScheduleAssignee(Long userId, Lead lead, String field) {
		requireEligible(userId, lead.getCreatedBy(), lead.getAssignedTo(), field);
	}

	private void requireEligible(Long userId, Long createdBy, Long assignedTo, String field) {
		boolean active = userAccountService.findAccountState(userId)
			.map(UserAccountService.AccountState::isActive)
			.orElse(false);
		Set<String> permissions = active ? rolePermissionService.permissionsOfUser(userId) : Set.of();
		if (!active || !LeadAccessService.couldView(userId, permissions, createdBy, assignedTo)) {
			throw new FieldValidationException(field, NOT_ELIGIBLE);
		}
	}

}
