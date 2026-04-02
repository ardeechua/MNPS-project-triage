var triageForm = document.getElementById('triage-form');
var totalScoreElement = document.getElementById('total-score');
var recommendedRouteElement = document.getElementById('recommended-route');
var priorityLevelElement = document.getElementById('priority-level');
var scoreExplanationElement = document.getElementById('score-explanation');
var warningListElement = document.getElementById('warning-list');
var inlineWarningListElement = document.getElementById('inline-warning-list');
var nextStepMessageElement = document.getElementById('next-step-message');
var routingTagsElement = document.getElementById('routing-tags');
var intakeHealthElement = document.getElementById('intake-health');
var intakeHealthLabelElement = document.getElementById('intake-health-label');
var resultHealthElement = document.getElementById('result-health');

var existingSolutionAwarenessElement = document.getElementById('existing-solution-awareness');
var existingGapWrapElement = document.getElementById('existing-gap-wrap');
var existingSolutionGapElement = document.getElementById('existing-solution-gap');
var existingTalkedWrapElement = document.getElementById('existing-talked-wrap');
var existingTalkedToElement = document.getElementById('existing-talked-to');

var inactionImpactElement = document.getElementById('inaction-impact');
var lowImpactWrapElement = document.getElementById('low-impact-wrap');
var lowImpactJustificationElement = document.getElementById('low-impact-justification');

var aiComponentElement = document.getElementById('ai-component');
var aiTaskWrapElement = document.getElementById('ai-task-wrap');
var aiTaskElement = document.getElementById('ai-task');
var aiDataWrapElement = document.getElementById('ai-data-wrap');
var aiDataElement = document.getElementById('ai-data');
var aiHumanReviewWrapElement = document.getElementById('ai-human-review-wrap');
var aiHumanReviewElement = document.getElementById('ai-human-review');

var alignmentDetailsWrapElement = document.getElementById('alignment-details-wrap');
var alignmentDetailsElement = document.getElementById('alignment-details');

var qualifiedFollowupElement = document.getElementById('qualified-followup');

function hasRealAlignment(focusedOutcomes) {
  var blockers = {
    'None / Not directly aligned': true,
    Unsure: true
  };

  for (var i = 0; i < focusedOutcomes.length; i += 1) {
    if (!blockers[focusedOutcomes[i]]) {
      return true;
    }
  }

  return false;
}

function countUnsureAnswers(values) {
  var unsureCount = 0;

  if (values.existingSolutionAwareness === 'maybe') {
    unsureCount += 1;
  }

  if (values.aiComponent === 'unsure') {
    unsureCount += 1;
  }

  if (values.requestType === 'unsure') {
    unsureCount += 1;
  }

  if (values.sustainabilityNeed === 'unsure') {
    unsureCount += 1;
  }

  if (values.sensitiveData.indexOf('unsure') !== -1) {
    unsureCount += 1;
  }

  if (values.focusedOutcomes.indexOf('Unsure') !== -1) {
    unsureCount += 1;
  }

  return unsureCount;
}

function evaluateSupportOwner(text) {
  var rawValue = text || '';
  var normalized = rawValue.trim().toLowerCase();
  var weakExactValues = {
    '': true,
    it: true,
    technology: true,
    tech: true,
    support: true,
    tbd: true,
    unsure: true,
    unknown: true,
    'n/a': true,
    na: true
  };

  if (weakExactValues[normalized]) {
    return {
      quality: normalized === '' ? 'missing' : 'vague',
      score: -6,
      warning:
        normalized === ''
          ? 'No support owner identified yet. Add a team/function for smoother routing.'
          : 'Support owner is too vague (example: IT, Tech, Support, TBD).'
    };
  }

  if (normalized.length < 8) {
    return {
      quality: 'short',
      score: -3,
      warning: 'Support owner looks short; include a specific team or function.'
    };
  }

  var specificityHints = ['team', 'department', 'office', 'vendor', 'services', 'division', 'school', 'group'];
  var hasSpecificHint = false;

  for (var i = 0; i < specificityHints.length; i += 1) {
    if (normalized.indexOf(specificityHints[i]) !== -1) {
      hasSpecificHint = true;
      break;
    }
  }

  return {
    quality: hasSpecificHint ? 'specific' : 'acceptable',
    score: hasSpecificHint ? 3 : 1,
    warning: null
  };
}

function getFormValues() {
  var formData = new FormData(triageForm);
  var focusedOutcomes = formData.getAll('focused_outcomes');

  return {
    postGoLiveOwner: (formData.get('post_go_live_owner') || '').trim(),
    supportOwner: (formData.get('support_owner') || '').trim(),
    supportCommitment: formData.get('support_commitment'),
    requestType: formData.get('request_type'),
    existingSolutionAwareness: formData.get('existing_solution_awareness'),
    aiComponent: formData.get('ai_component'),
    aiHumanReview: formData.get('ai_human_review'),
    integrationNeeded: formData.get('integration_needed'),
    sensitiveData: formData.getAll('sensitive_data'),
    impactScope: formData.get('impact_scope'),
    inactionImpact: formData.get('inaction_impact'),
    usersImpacted: formData.get('users_impacted'),
    focusedOutcomes: focusedOutcomes,
    hasRealAlignment: hasRealAlignment(focusedOutcomes),
    sustainabilityNeed: formData.get('sustainability_need')
  };
}

function updateConditionalFields() {
  var existingSelection = existingSolutionAwarenessElement.value;
  var showExistingBranch = existingSelection === 'yes' || existingSelection === 'maybe';
  existingGapWrapElement.hidden = !showExistingBranch;
  existingTalkedWrapElement.hidden = !showExistingBranch;
  existingSolutionGapElement.required = showExistingBranch;
  existingTalkedToElement.required = showExistingBranch;

  var aiSelection = aiComponentElement.value;
  var showAiBranch = aiSelection && aiSelection !== 'no';
  aiTaskWrapElement.hidden = !showAiBranch;
  aiDataWrapElement.hidden = !showAiBranch;
  aiHumanReviewWrapElement.hidden = !showAiBranch;
  aiTaskElement.required = showAiBranch;
  aiDataElement.required = showAiBranch;
  aiHumanReviewElement.required = showAiBranch;

  var showLowImpact = inactionImpactElement.value === 'minor_inconvenience' || inactionImpactElement.value === 'no_meaningful_impact';
  lowImpactWrapElement.hidden = !showLowImpact;
  lowImpactJustificationElement.required = showLowImpact;

  var values = getFormValues();
  var showAlignmentDetails = values.focusedOutcomes.length > 0 && values.hasRealAlignment;
  alignmentDetailsWrapElement.hidden = !showAlignmentDetails;
  alignmentDetailsElement.required = showAlignmentDetails;
}

function generateWarnings(values, supportEvaluation) {
  var warnings = [];

  if (supportEvaluation.warning) {
    warnings.push(supportEvaluation.warning);
  }

  if (values.supportCommitment === 'no' || values.supportCommitment === 'not_yet_discussed') {
    warnings.push('Support owner is not yet confirmed. Confirm ownership before implementation planning.');
  }

  if (values.existingSolutionAwareness === 'yes' || values.existingSolutionAwareness === 'maybe') {
    warnings.push('Possible duplicate of an existing solution. Validate overlap first.');
  }

  if (!values.hasRealAlignment) {
    warnings.push('No strategic alignment selected yet. Clarify initiative linkage if possible.');
  }

  if (values.aiComponent && values.aiComponent !== 'no') {
    warnings.push('AI is involved. Plan governance, privacy, and review controls.');
  }

  if (values.integrationNeeded === 'yes' || values.integrationNeeded === 'maybe') {
    warnings.push('Integration is likely required. Include system dependencies in planning.');
  }

  if (
    values.sensitiveData.indexOf('student') !== -1 ||
    values.sensitiveData.indexOf('staff') !== -1 ||
    values.sensitiveData.indexOf('financial') !== -1 ||
    values.sensitiveData.indexOf('unsure') !== -1
  ) {
    warnings.push('Sensitive data is involved or uncertain. Confirm data handling and access needs.');
  }

  if (values.inactionImpact === 'no_meaningful_impact') {
    warnings.push('Consequence of inaction is low; provide clear rationale for prioritization.');
  }

  var unsureCount = countUnsureAnswers(values);
  if (unsureCount >= 3) {
    warnings.push('Several answers are marked unsure. Clarify details before formal review.');
  }

  var hasSensitive = values.sensitiveData.indexOf('student') !== -1 || values.sensitiveData.indexOf('staff') !== -1 || values.sensitiveData.indexOf('financial') !== -1;
  if (values.aiComponent !== 'no' && hasSensitive && values.aiHumanReview === 'no') {
    warnings.push('High-risk combination: AI + sensitive data + no human review before action.');
  }

  return warnings;
}

function calculateScore(values, supportEvaluation) {
  var score = 0;
  var impactScopeScores = {
    just_me: 0,
    my_team: 2,
    multiple_departments: 4,
    district_wide: 6
  };
  var inactionScores = {
    major_operational: 6,
    moderate_inefficiency: 3,
    minor_inconvenience: 1,
    no_meaningful_impact: -2
  };
  var usersImpactedScores = { '1-10': 1, '11-100': 2, '101-1000': 4, 'district-wide': 5 };

  score += impactScopeScores[values.impactScope] || 0;
  score += inactionScores[values.inactionImpact] || 0;
  score += usersImpactedScores[values.usersImpacted] || 0;
  score += supportEvaluation.score;

  if (values.supportCommitment === 'yes') {
    score += 4;
  } else if (values.supportCommitment === 'no') {
    score -= 4;
  } else if (values.supportCommitment === 'not_yet_discussed') {
    score -= 2;
  }

  if (values.hasRealAlignment) {
    score += Math.min(values.focusedOutcomes.length, 4);
  } else {
    score -= 2;
  }

  if (values.existingSolutionAwareness === 'yes') {
    score -= 2;
  } else if (values.existingSolutionAwareness === 'maybe') {
    score -= 1;
  }

  if (values.aiComponent !== 'no' && values.aiComponent !== '') {
    score -= 1;
  }

  if (values.integrationNeeded === 'yes') {
    score -= 1;
  }

  if (values.sensitiveData.indexOf('student') !== -1 || values.sensitiveData.indexOf('staff') !== -1 || values.sensitiveData.indexOf('financial') !== -1) {
    score -= 1;
  }

  return score;
}

function calculatePriority(totalScore) {
  if (totalScore >= 14) {
    return 'High Priority';
  }

  if (totalScore >= 7) {
    return 'Medium Priority';
  }

  return 'Low Priority';
}

function getRoutingTags(values, warnings) {
  var tags = [];

  if (values.aiComponent && values.aiComponent !== 'no') {
    tags.push('AI');
  }

  if (values.integrationNeeded === 'yes' || values.integrationNeeded === 'maybe') {
    tags.push('Integration');
  }

  if (
    values.sensitiveData.indexOf('student') !== -1 ||
    values.sensitiveData.indexOf('staff') !== -1 ||
    values.sensitiveData.indexOf('financial') !== -1 ||
    values.sensitiveData.indexOf('unsure') !== -1
  ) {
    tags.push('Sensitive Data');
  }

  if (values.existingSolutionAwareness === 'yes' || values.existingSolutionAwareness === 'maybe') {
    tags.push('Duplicate Risk');
  }

  if (values.impactScope === 'district_wide' || values.usersImpacted === 'district-wide' || values.inactionImpact === 'major_operational') {
    tags.push('High Impact');
  }

  if (!values.supportOwner) {
    tags.push('No Support Owner');
  }

  if (!values.hasRealAlignment) {
    tags.push('Low Strategic Alignment');
  }

  if (values.requestType === 'new_application') {
    tags.push('Vendor Likely');
  }

  if (warnings.length >= 5) {
    tags.push('Needs Clarification');
  }

  return tags;
}

function getHealthStatus(values, warnings) {
  var hasSensitive = values.sensitiveData.indexOf('student') !== -1 || values.sensitiveData.indexOf('staff') !== -1 || values.sensitiveData.indexOf('financial') !== -1;
  var highRiskCombo = values.aiComponent !== 'no' && hasSensitive && values.aiHumanReview === 'no';

  if (highRiskCombo || (warnings.length >= 5 && values.inactionImpact === 'no_meaningful_impact')) {
    return { label: 'High risk / low value', className: 'status-high-risk' };
  }

  if (warnings.length <= 2 && values.supportCommitment === 'yes' && values.hasRealAlignment && values.supportOwner) {
    return { label: 'Strong request', className: 'status-strong' };
  }

  return { label: 'Needs clarification', className: 'status-clarify' };
}

function determineRoute(values, warnings, totalScore) {
  var explanationItems = [];
  var route = 'Need More Information';

  if (values.requestType === 'workflow_automation' || values.requestType === 'reporting_data') {
    route = 'Route to BPA Team';
    explanationItems.push('Request type aligns with workflow/reporting intake paths.');
  }

  if (values.requestType === 'enhancement_existing' || values.requestType === 'new_application') {
    route = 'Route to Development Team';
    explanationItems.push('Request type aligns with enhancement/new application intake paths.');
  }

  if (values.existingSolutionAwareness === 'yes') {
    route = 'Need More Information';
    explanationItems.push('Existing solution risk should be reviewed before approval.');
  }

  if (!values.postGoLiveOwner || !values.supportOwner || values.supportCommitment !== 'yes') {
    route = 'Need More Information';
    explanationItems.push('Ownership and support confirmation are incomplete.');
  }

  if (warnings.length > 0) {
    explanationItems.push('Warnings were identified and should be addressed in triage follow-up.');
  }

  if (totalScore >= 14 && warnings.length <= 2 && values.supportCommitment === 'yes') {
    route = 'Ready for Product Review';
    explanationItems.push('Strong baseline inputs indicate readiness for product-level review.');
  }

  if (explanationItems.length === 0) {
    explanationItems.push('Inputs indicate a standard path with no major blockers.');
  }

  return { route: route, explanationItems: explanationItems };
}

function getNextStepMessage(values, warnings, route) {
  var hasDuplicateRisk = values.existingSolutionAwareness === 'yes' || values.existingSolutionAwareness === 'maybe';
  var hasSensitive = values.sensitiveData.indexOf('student') !== -1 || values.sensitiveData.indexOf('staff') !== -1 || values.sensitiveData.indexOf('financial') !== -1;
  var complexGovernance = (values.aiComponent && values.aiComponent !== 'no') || hasSensitive || values.integrationNeeded === 'yes' || values.integrationNeeded === 'maybe';

  if (!values.supportOwner || values.supportCommitment !== 'yes') {
    return 'Needs support owner confirmation before moving forward.';
  }

  if (hasDuplicateRisk) {
    return 'Possible duplicate — review current solution and stakeholder conversations first.';
  }

  if (complexGovernance) {
    return 'Requires additional governance review due to AI, data, or integration complexity.';
  }

  if (route === 'Ready for Product Review' && warnings.length <= 2) {
    return 'Ready for Product review with current intake detail.';
  }

  return 'Needs clarification in flagged areas before final routing.';
}

function renderExplanationList(explanationItems) {
  scoreExplanationElement.innerHTML = '';

  for (var i = 0; i < explanationItems.length; i += 1) {
    var listItem = document.createElement('li');
    listItem.textContent = explanationItems[i];
    scoreExplanationElement.appendChild(listItem);
  }
}

function renderWarningList(warningItems, targetElement) {
  targetElement.innerHTML = '';

  if (warningItems.length === 0) {
    var emptyItem = document.createElement('li');
    emptyItem.textContent = 'No warnings flagged based on current inputs.';
    targetElement.appendChild(emptyItem);
    return;
  }

  for (var i = 0; i < warningItems.length; i += 1) {
    var warningItem = document.createElement('li');
    warningItem.textContent = warningItems[i];
    targetElement.appendChild(warningItem);
  }
}

function renderTags(tags) {
  routingTagsElement.innerHTML = '';

  if (tags.length === 0) {
    var emptyTag = document.createElement('span');
    emptyTag.className = 'tag-chip';
    emptyTag.textContent = 'No tags yet';
    routingTagsElement.appendChild(emptyTag);
    return;
  }

  for (var i = 0; i < tags.length; i += 1) {
    var chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = tags[i];
    routingTagsElement.appendChild(chip);
  }
}

function updateHealthUI(status) {
  intakeHealthElement.className = 'intake-health ' + status.className;
  intakeHealthLabelElement.textContent = status.label;

  resultHealthElement.className = 'result-status ' + status.className;
  resultHealthElement.textContent = status.label;
}

function toggleQualifiedFollowup(totalScore, warnings, values) {
  var hasCriticalBlocker = !values.supportOwner || values.supportCommitment !== 'yes';
  var canShowFollowup = totalScore >= 10 && !hasCriticalBlocker && warnings.length <= 3;

  qualifiedFollowupElement.hidden = !canShowFollowup;
}

function refreshLiveState() {
  updateConditionalFields();

  var values = getFormValues();
  var supportEvaluation = evaluateSupportOwner(values.supportOwner);
  var warnings = generateWarnings(values, supportEvaluation);
  var totalScore = calculateScore(values, supportEvaluation);
  var tags = getRoutingTags(values, warnings);
  var healthStatus = getHealthStatus(values, warnings);

  renderWarningList(warnings, inlineWarningListElement);
  renderTags(tags);
  updateHealthUI(healthStatus);
  toggleQualifiedFollowup(totalScore, warnings, values);
}

function handleSubmit(event) {
  event.preventDefault();

  var values = getFormValues();
  var supportEvaluation = evaluateSupportOwner(values.supportOwner);
  var totalScore = calculateScore(values, supportEvaluation);
  var priorityLevel = calculatePriority(totalScore);
  var warnings = generateWarnings(values, supportEvaluation);
  var routeResult = determineRoute(values, warnings, totalScore);
  var nextStepMessage = getNextStepMessage(values, warnings, routeResult.route);
  var tags = getRoutingTags(values, warnings);
  var healthStatus = getHealthStatus(values, warnings);

  routeResult.explanationItems.unshift(
    'Priority is based on impact, consequence of inaction, scale, ownership readiness, and strategic alignment.'
  );

  totalScoreElement.textContent = String(totalScore);
  recommendedRouteElement.textContent = routeResult.route;
  priorityLevelElement.textContent = priorityLevel;
  nextStepMessageElement.textContent = nextStepMessage;

  renderExplanationList(routeResult.explanationItems);
  renderWarningList(warnings, warningListElement);
  renderWarningList(warnings, inlineWarningListElement);
  renderTags(tags);
  updateHealthUI(healthStatus);
  toggleQualifiedFollowup(totalScore, warnings, values);
}

triageForm.addEventListener('input', refreshLiveState);
triageForm.addEventListener('change', refreshLiveState);
triageForm.addEventListener('submit', handleSubmit);

refreshLiveState();
