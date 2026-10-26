package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.Positive;

/** @param assignedTo the new assignee, or {@code null} to unassign the lead */
@RejectUnknownFields
public record AssignLeadRequest(@Positive Long assignedTo) {
}
