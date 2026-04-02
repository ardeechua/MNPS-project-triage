var triageForm = document.getElementById('triage-form');
var totalScoreElement = document.getElementById('total-score');
var recommendedRouteElement = document.getElementById('recommended-route');
var priorityLevelElement = document.getElementById('priority-level');
var scoreExplanationElement = document.getElementById('score-explanation');
var warningListElement = document.getElementById('warning-list');

var existingSolutionAwarenessElement = document.getElementById('existing-solution-awareness');
var existingGapWrapElement = document.getElementById('existing-gap-wrap');
var existingSolutionGapElement = document.getElementById('existing-solution-gap');

var aiComponentElement = document.getElementById('ai-component');
var aiDetailsWrapElement = document.getElementById('ai-details-wrap');
var aiDetailsElement = document.getElementById('ai-details');

var alignmentDetailsWrapElement = document.getElementById('alignment-details-wrap');
var alignmentDetailsElement = document.getElementById('alignment-details');

function renderExplanationList(explanationItems) {
  scoreExplanationElement.innerHTML = '';

  for (var i = 0; i < explanationItems.length; i += 1) {
    var listItem = document.createElement('li');
    listItem.textContent = explanationItems[i];
    scoreExplanationElement.appendChild(listItem);
  }
}

function renderWarningList(warningItems) {
  warningListElement.innerHTML = '';

  if (warningItems.length === 0) {
    var emptyItem = document.createElement('li');
    emptyItem.textContent = 'No warnings flagged based on current inputs.';
    warningListElement.appendChild(emptyItem);
    return;
  }

  for (var i = 0; i < warningItems.length; i += 1) {
    var warningItem = document.createElement('li');
    warningItem.textContent = warningItems[i];
    warningListElement.appendChild(warningItem);
  }
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
          ? 'Support ownership is missing.'
          : 'Support ownership is too vague (for example: IT, Tech, Support, TBD, Unsure).'
    };
  }

  if (normalized.length < 8) {
    return {
      quality: 'short',
      score: -3,
      warning: 'Support ownership looks very short; provide a specific team, department, or vendor group.'
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

function updateConditionalFields() {
  var existingSelection = existingSolutionAwarenessElement.value;
  var showExistingGap = existingSelection === 'yes' || existingSelection === 'maybe';
  existingGapWrapElement.hidden = !showExistingGap;
  existingSolutionGapElement.required = showExistingGap;

  var aiSelection = aiComponentElement.value;
  var showAiDetails = aiSelection && aiSelection !== 'no';
  aiDetailsWrapElement.hidden = !showAiDetails;
  aiDetailsElement.required = showAiDetails;

  var selectedOutcomes = triageForm.querySelectorAll('input[name="focused_outcomes"]:checked');
  var outcomes = [];

  for (var i = 0; i < selectedOutcomes.length; i += 1) {
    outcomes.push(selectedOutcomes[i].value);
  }

  var showAlignmentDetails = outcomes.length > 0 && hasRealAlignment(outcomes);
  alignmentDetailsWrapElement.hidden = !showAlignmentDetails;
  alignmentDetailsElement.required = showAlignmentDetails;
}

function getWarnings(values, supportEvaluation) {
  var warnings = [];

  if (supportEvaluation.warning) {
    warnings.push(supportEvaluation.warning);
  }

  if (values.supportCommitment === 'no' || values.supportCommitment === 'not_yet_discussed') {
    warnings.push('Support owner has not explicitly agreed to ongoing support.');
  }

  if (values.existingSolutionAwareness === 'yes' || values.existingSolutionAwareness === 'maybe') {
    warnings.push('Potential overlap with existing work; verify duplication risk before moving forward.');
  }

  if (values.aiComponent !== 'no') {
    warnings.push('AI involvement requires additional governance, privacy, and security review.');
  }

  if (values.integrationNeeded === 'yes' || values.integrationNeeded === 'maybe') {
    warnings.push('Integration dependency identified; sequencing and technical review will be needed.');
  }

  if (
    values.sensitiveData.indexOf('student') !== -1 ||
    values.sensitiveData.indexOf('staff') !== -1 ||
    values.sensitiveData.indexOf('financial') !== -1 ||
    values.sensitiveData.indexOf('unsure') !== -1
  ) {
    warnings.push('Sensitive or uncertain data handling is involved and requires follow-up review.');
  }

  if (values.inactionImpact === 'no_meaningful_impact') {
    warnings.push('Request indicates no meaningful impact if unchanged; urgency may be low.');
  }

  if (!values.hasRealAlignment) {
    warnings.push('No clear district strategic alignment was identified.');
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

  if (values.aiComponent !== 'no') {
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

function determineRoute(values, warnings) {
  var explanationItems = [];
  var route = 'Need More Information';

  if (values.requestType === 'workflow_automation' || values.requestType === 'reporting_data') {
    route = 'Approve – Route to BPA Team';
    explanationItems.push('Request type aligns with workflow/reporting support and likely BPA triage.');
  }

  if (values.requestType === 'enhancement_existing' || values.requestType === 'new_application') {
    route = 'Approve – Route to Development Team';
    explanationItems.push('Request type aligns with system enhancement/new application work and development triage.');
  }

  if (values.existingSolutionAwareness === 'yes') {
    route = 'Need More Information';
    explanationItems.push('Possible duplication was identified and should be validated before approval.');
  }

  if (!values.postGoLiveOwner || !values.supportOwner || values.supportCommitment !== 'yes') {
    route = 'Need More Information';
    explanationItems.push('Ownership and support readiness are not fully confirmed.');
  }

  if (warnings.length > 0) {
    explanationItems.push('Warnings were flagged and should be resolved in follow-up triage.');
  }

  if (explanationItems.length === 0) {
    explanationItems.push('Inputs indicate a standard intake path with no major blockers.');
  }

  return { route: route, explanationItems: explanationItems };
}

existingSolutionAwarenessElement.addEventListener('change', updateConditionalFields);
aiComponentElement.addEventListener('change', updateConditionalFields);
triageForm.addEventListener('change', function (event) {
  if (event.target && event.target.name === 'focused_outcomes') {
    updateConditionalFields();
  }
});

triageForm.addEventListener('submit', function (event) {
  event.preventDefault();

  var formData = new FormData(triageForm);
  var focusedOutcomes = formData.getAll('focused_outcomes');
  var values = {
    problemStatement: (formData.get('problem_statement') || '').trim(),
    postGoLiveOwner: (formData.get('post_go_live_owner') || '').trim(),
    supportOwner: (formData.get('support_owner') || '').trim(),
    supportCommitment: formData.get('support_commitment'),
    requestType: formData.get('request_type'),
    existingSolutionAwareness: formData.get('existing_solution_awareness'),
    aiComponent: formData.get('ai_component'),
    integrationNeeded: formData.get('integration_needed'),
    sensitiveData: formData.getAll('sensitive_data'),
    impactScope: formData.get('impact_scope'),
    inactionImpact: formData.get('inaction_impact'),
    usersImpacted: formData.get('users_impacted'),
    focusedOutcomes: focusedOutcomes,
    hasRealAlignment: hasRealAlignment(focusedOutcomes)
  };

  var supportEvaluation = evaluateSupportOwner(values.supportOwner);
  var totalScore = calculateScore(values, supportEvaluation);
  var priorityLevel = calculatePriority(totalScore);
  var warnings = getWarnings(values, supportEvaluation);
  var routeResult = determineRoute(values, warnings);

  routeResult.explanationItems.unshift(
    'Priority is based on impact scope, consequence of inaction, scale, ownership/support readiness, and district alignment.'
  );

  totalScoreElement.textContent = String(totalScore);
  recommendedRouteElement.textContent = routeResult.route;
  priorityLevelElement.textContent = priorityLevel;
  renderExplanationList(routeResult.explanationItems);
  renderWarningList(warnings);
});

updateConditionalFields();
