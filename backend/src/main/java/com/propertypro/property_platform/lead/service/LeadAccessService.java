package com.propertypro.property_platform.lead.service;

import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.lead.exception.LeadExceptions;
import com.propertypro.property_platform.lead.repository.LeadRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Set;

import static com.propertypro.property_platform.security.Permissions.LEAD_ACCESS_ASSIGNED;
import static com.propertypro.property_platform.security.Permissions.LEAD_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.LEAD_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.LEAD_VIEW;
import static com.propertypro.property_platform.security.Permissions.LEAD_VIEW_ANY;

/**
 * The single authorization point for existing leads and everything below them. A lead is the
 * caller's own when they created it, or when it is assigned to them and they hold
 * {@code LEAD_ACCESS_ASSIGNED}. Own leads and, with {@code LEAD_VIEW_ANY}, all leads are visible;
 * anyone else gets 404, so ids cannot be probed. A visible lead without the permission for the action
 * gets 403. Schedules and interactions are only ever loaded through their visible parent lead.
 */
@Service
@RequiredArgsConstructor
public class LeadAccessService {

	private final LeadRepository leadRepository;

	/** The lead, if the actor may view it. */
	@Transactional(readOnly = true)
	public Lead requireViewable(Long leadId, CurrentActor actor) {
		Lead lead = leadRepository.findById(leadId).orElseThrow(LeadExceptions::notFound);
		requireAllowed(lead, actor, LEAD_VIEW, LEAD_VIEW_ANY);
		return lead;
	}

	/** The lead, row-locked until the transaction ends, if the actor may edit it. */
	@Transactional(propagation = Propagation.MANDATORY)
	public Lead requireEditable(Long leadId, CurrentActor actor) {
		Lead lead = lockVisible(leadId, actor);
		requireAllowed(lead, actor, LEAD_UPDATE, LEAD_UPDATE_ANY);
		return lead;
	}

	/** Only the creator deletes with {@code LEAD_DELETE}; an assignee needs {@code LEAD_DELETE_ANY}. */
	@Transactional(propagation = Propagation.MANDATORY)
	public Lead requireDeletable(Long leadId, CurrentActor actor) {
		Lead lead = lockVisible(leadId, actor);
		if (!actor.has(LEAD_DELETE_ANY) && !(isCreator(lead, actor.userId()) && actor.has(LEAD_DELETE))) {
			throw LeadExceptions.actionForbidden();
		}
		return lead;
	}

	/** The lead, row-locked, if visible to the actor; the caller checks the action's own permission. */
	@Transactional(propagation = Propagation.MANDATORY)
	public Lead lockVisible(Long leadId, CurrentActor actor) {
		Lead lead = leadRepository.findByIdForUpdate(leadId).orElseThrow(LeadExceptions::notFound);
		if (!isVisible(lead, actor)) {
			throw LeadExceptions.notFound();
		}
		return lead;
	}

	/**
	 * The lead for a schedule or interaction action: the actor must be able to view the lead and hold
	 * {@code permission}. Row-locked when {@code forUpdate}, so writes to one lead run one after another.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public Lead requireForNested(Long leadId, CurrentActor actor, String permission, boolean forUpdate) {
		Lead lead = forUpdate ? lockVisible(leadId, actor)
				: leadRepository.findById(leadId).orElseThrow(LeadExceptions::notFound);
		requireAllowed(lead, actor, LEAD_VIEW, LEAD_VIEW_ANY);
		if (!actor.has(permission)) {
			throw LeadExceptions.actionForbidden();
		}
		return lead;
	}

	/** List restriction to the actor's own leads (see the class comment). */
	public Specification<Lead> ownLeads(CurrentActor actor) {
		boolean assigned = actor.has(LEAD_ACCESS_ASSIGNED);
		return (root, query, cb) -> assigned
				? cb.or(cb.equal(root.get("createdBy"), actor.userId()), cb.equal(root.get("assignedTo"), actor.userId()))
				: cb.equal(root.get("createdBy"), actor.userId());
	}

	/**
	 * Whether a user holding {@code permissions} could view {@code lead} if it were assigned to
	 * {@code assignedTo}; used to check that assignees can actually work on the lead.
	 */
	public static boolean couldView(Long userId, Set<String> permissions, Long createdBy, Long assignedTo) {
		if (permissions.contains(LEAD_VIEW_ANY)) {
			return true;
		}
		boolean own = Objects.equals(createdBy, userId)
				|| (Objects.equals(assignedTo, userId) && permissions.contains(LEAD_ACCESS_ASSIGNED));
		return own && permissions.contains(LEAD_VIEW);
	}

	private void requireAllowed(Lead lead, CurrentActor actor, String own, String any) {
		if (!isVisible(lead, actor)) {
			throw LeadExceptions.notFound();
		}
		if (!actor.has(any) && !(isOwn(lead, actor) && actor.has(own))) {
			throw LeadExceptions.actionForbidden();
		}
	}

	private static boolean isVisible(Lead lead, CurrentActor actor) {
		return isOwn(lead, actor) || actor.has(LEAD_VIEW_ANY);
	}

	private static boolean isOwn(Lead lead, CurrentActor actor) {
		return isCreator(lead, actor.userId())
				|| (Objects.equals(lead.getAssignedTo(), actor.userId()) && actor.has(LEAD_ACCESS_ASSIGNED));
	}

	private static boolean isCreator(Lead lead, Long userId) {
		return Objects.equals(lead.getCreatedBy(), userId);
	}

}
