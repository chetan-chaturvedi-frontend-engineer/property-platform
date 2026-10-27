package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.Positive;

/** @param assignId the new assignee, or {@code null} to unassign the visit */
@RejectUnknownFields
public record AssignSiteVisitRequest(@Positive Long assignId) {
}
