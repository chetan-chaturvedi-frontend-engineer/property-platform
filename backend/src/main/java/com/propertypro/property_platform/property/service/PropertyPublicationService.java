package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PublicationAction;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import com.propertypro.property_platform.property.domain.StatusChangeAction;
import com.propertypro.property_platform.property.dto.PropertyResponse;
import com.propertypro.property_platform.property.exception.PropertyExceptions;
import com.propertypro.property_platform.property.mapper.PropertyResponseMapper;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.propertypro.property_platform.security.Permissions.PROPERTY_LEGAL_REVIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_PUBLISH;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_REVIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_SUSPEND;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE_ANY;

/**
 * Publication workflow ({@link PublicationAction}) and legal approval. Who may do what:
 * <ul>
 * <li>submit, archive: the owner ({@code PROPERTY_UPDATE}) or {@code PROPERTY_UPDATE_ANY};</li>
 * <li>approve, reject: {@code PROPERTY_REVIEW};</li>
 * <li>publish, unpublish: {@code PROPERTY_PUBLISH};</li>
 * <li>suspend, resume: {@code PROPERTY_SUSPEND};</li>
 * <li>legal approval status: {@code PROPERTY_LEGAL_REVIEW}.</li>
 * </ul>
 * Owners can therefore never approve or publish their own properties. The property row is locked for
 * the change, so concurrent transitions run one after another and the second sees the first's result.
 */
@Service
@RequiredArgsConstructor
public class PropertyPublicationService {

	/** Transitions that require every mandatory wizard step to be complete. */
	private static final Set<PublicationAction> REQUIRE_COMPLETE = EnumSet.of(PublicationAction.SUBMIT,
			PublicationAction.APPROVE, PublicationAction.PUBLISH);

	private final PropertyProjectRepository projectRepository;
	private final PropertyAccessService access;
	private final PropertyWizardService wizard;
	private final PropertyStatusHistoryService statusHistory;
	private final PropertyResponseMapper mapper;
	private final Clock clock;

	/**
	 * Applies the action. Repeating an action whose target status the property already has (e.g. a
	 * retried submit) changes nothing and succeeds.
	 */
	@Transactional
	public PropertyResponse changeStatus(Long propertyId, CurrentActor actor, PublicationAction action, String reason,
			Long expectedVersion) {
		PropertyProject project = access.lockVisible(propertyId, actor);
		if (!mayPerform(project, actor, action)) {
			throw PropertyExceptions.actionForbidden();
		}
		PublicationStatus from = project.getPublicationStatus();
		if (from == action.getTo()) {
			return mapper.toResponse(project);
		}
		if (expectedVersion != null && expectedVersion != project.getVersion()) {
			throw PropertyExceptions.versionConflict(project.getVersion());
		}
		if (!action.isAllowedFrom(from)) {
			throw PropertyExceptions.invalidTransition(action, from);
		}
		String cleanReason = reason == null || reason.isBlank() ? null : reason.strip();
		if (action.isReasonRequired() && cleanReason == null) {
			throw new FieldValidationException("reason", "is required to " + action.getValue());
		}
		if (REQUIRE_COMPLETE.contains(action)) {
			Map<Integer, List<String>> missing = wizard.missingByStep(project);
			if (!missing.isEmpty()) {
				throw PropertyExceptions.incomplete(missing);
			}
		}
		project.apply(action, clock.instant());
		statusHistory.record(project.getId(), actor.userId(), StatusChangeAction.of(action), from, action.getTo(),
				cleanReason);
		project.touch(clock.instant());
		projectRepository.saveAndFlush(project);
		return mapper.toResponse(project);
	}

	/** Reviewer decision on the legal approval status; independent of construction and publication status. */
	@Transactional
	public PropertyResponse changeLegalStatus(Long propertyId, CurrentActor actor, LegalApprovalStatus status,
			String reason, Long expectedVersion) {
		PropertyProject project = access.lockVisible(propertyId, actor);
		if (!actor.has(PROPERTY_LEGAL_REVIEW)) {
			throw PropertyExceptions.actionForbidden();
		}
		if (expectedVersion != null && expectedVersion != project.getVersion()) {
			throw PropertyExceptions.versionConflict(project.getVersion());
		}
		if (project.getPublicationStatus() == PublicationStatus.ARCHIVED) {
			throw PropertyExceptions.notEditable(PublicationStatus.ARCHIVED);
		}
		String cleanReason = reason == null || reason.isBlank() ? null : reason.strip();
		if (status == LegalApprovalStatus.REJECTED && cleanReason == null) {
			throw new FieldValidationException("reason", "is required to reject the legal approval");
		}
		LegalApprovalStatus from = project.getLegalApprovalStatus();
		if (from != status) {
			project.reviewLegalApproval(status);
			statusHistory.record(project.getId(), actor.userId(), StatusChangeAction.LEGAL_STATUS_CHANGED, from, status,
					cleanReason);
			project.touch(clock.instant());
			projectRepository.saveAndFlush(project);
		}
		return mapper.toResponse(project);
	}

	private boolean mayPerform(PropertyProject project, CurrentActor actor, PublicationAction action) {
		return switch (action) {
			case SUBMIT, ARCHIVE -> access.isAllowed(project, actor, PROPERTY_UPDATE, PROPERTY_UPDATE_ANY);
			case APPROVE, REJECT -> actor.has(PROPERTY_REVIEW);
			case PUBLISH, UNPUBLISH -> actor.has(PROPERTY_PUBLISH);
			case SUSPEND, RESUME -> actor.has(PROPERTY_SUSPEND);
		};
	}

}
