package com.propertypro.property_platform.property.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PropertyProjectTests {

	private static final Instant NOW = Instant.parse("2026-10-25T10:00:00Z");

	@Test
	void submitApproveAndPublish() {
		PropertyProject project = new PropertyProject(1L, "slug");

		project.apply(PublicationAction.SUBMIT, NOW);
		assertThat(project.getPublicationStatus()).isEqualTo(PublicationStatus.PENDING_REVIEW);
		project.apply(PublicationAction.APPROVE, NOW);
		assertThat(project.getPublicationStatus()).isEqualTo(PublicationStatus.APPROVED);
		assertThat(project.getPublishedAt()).isNull();
		project.apply(PublicationAction.PUBLISH, NOW);
		assertThat(project.getPublicationStatus()).isEqualTo(PublicationStatus.PUBLISHED);
		assertThat(project.getPublishedAt()).isEqualTo(NOW);
	}

	@Test
	void rejectedProjectCanBeResubmitted() {
		PropertyProject project = new PropertyProject(1L, "slug");
		project.apply(PublicationAction.SUBMIT, NOW);
		project.apply(PublicationAction.REJECT, NOW);

		project.apply(PublicationAction.SUBMIT, NOW);

		assertThat(project.getPublicationStatus()).isEqualTo(PublicationStatus.PENDING_REVIEW);
	}

	@Test
	void draftCannotBeApprovedOrPublishedWithoutReview() {
		PropertyProject project = new PropertyProject(1L, "slug");

		assertThatThrownBy(() -> project.apply(PublicationAction.APPROVE, NOW)).isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> project.apply(PublicationAction.PUBLISH, NOW)).isInstanceOf(IllegalStateException.class);
		assertThat(project.getPublicationStatus()).isEqualTo(PublicationStatus.DRAFT);
	}

	@Test
	void suspendAndResumeKeepFirstPublicationTime() {
		PropertyProject project = published();
		project.apply(PublicationAction.SUSPEND, NOW.plusSeconds(60));
		project.apply(PublicationAction.RESUME, NOW.plusSeconds(120));
		project.apply(PublicationAction.PUBLISH, NOW.plusSeconds(180));

		assertThat(project.getPublicationStatus()).isEqualTo(PublicationStatus.PUBLISHED);
		assertThat(project.getPublishedAt()).isEqualTo(NOW);
	}

	@ParameterizedTest
	@EnumSource(value = PublicationAction.class, names = "ARCHIVE", mode = EnumSource.Mode.EXCLUDE)
	void archivedProjectAllowsNoFurtherTransition(PublicationAction action) {
		PropertyProject project = new PropertyProject(1L, "slug");
		project.apply(PublicationAction.ARCHIVE, NOW);

		assertThatThrownBy(() -> project.apply(action, NOW)).isInstanceOf(IllegalStateException.class);
	}

	@Test
	void constructionAndLegalStatusAreIndependentOfPublication() {
		PropertyProject project = new PropertyProject(1L, "slug");

		project.setProjectStatus(ProjectStatus.UNDER_CONSTRUCTION);
		project.reviewLegalApproval(LegalApprovalStatus.APPROVED);

		assertThat(project.getPublicationStatus()).isEqualTo(PublicationStatus.DRAFT);
		assertThat(project.getLegalApprovalStatus()).isEqualTo(LegalApprovalStatus.APPROVED);
	}

	private static PropertyProject published() {
		PropertyProject project = new PropertyProject(1L, "slug");
		project.apply(PublicationAction.SUBMIT, NOW);
		project.apply(PublicationAction.APPROVE, NOW);
		project.apply(PublicationAction.PUBLISH, NOW);
		return project;
	}

}
