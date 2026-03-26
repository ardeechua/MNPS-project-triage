var triageForm = document.getElementById('triage-form');
var totalScoreElement = document.getElementById('total-score');
var recommendedRouteElement = document.getElementById('recommended-route');
var priorityLevelElement = document.getElementById('priority-level');
var scoreExplanationElement = document.getElementById('score-explanation');
var warningListElement = document.getElementById('warning-list');

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

function includesUnsure(value) {
  return value === 'unsure' || value === '' || value === null;
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

function getWarnings(values, supportEvaluation) {
  var warnings = [];

  if (supportEvaluation.warning) {
    warnings.push(supportEvaluation.warning);
  }

  if (values.supportCommitment === 'no' || values.supportCommitment === 'not_yet') {
    warnings.push('Support group has not agreed to provide ongoing support.');
  }

  if (values.existingSolutionAwareness === 'unsure') {
    warnings.push('Existing solution not confirmed.');
  }

  if (values.vendorSolution === 'yes' || values.vendorSolution === 'unsure') {
    warnings.push('Vendor/product may already exist; evaluate buy options first.');
  }

  if (values.budgetAllocated === 'no' || values.budgetAllocated === 'unsure') {
    warnings.push('No budget identified or funding is uncertain.');
  }

  if (values.solutionLongevity === 'lt_1_year') {
    warnings.push('Short-term solution may not justify build effort.');
  }

  if (values.aiComponent === 'yes' || values.aiComponent === 'unsure') {
    warnings.push('AI component requires additional review (privacy, security, governance).');
  }

  return warnings;
}

function calculateScore(values, supportEvaluation) {
  var score = 0;

  var urgencyScores = { low: 1, medium: 3, high: 5, critical: 6 };
  var usersImpactedScores = { '1-10': 1, '11-100': 2, '101-1000': 4, 'district-wide': 5 };

  score += urgencyScores[values.urgency] || 0;
  score += usersImpactedScores[values.usersImpacted] || 0;

  if (values.budgetAllocated === 'yes') {
    score += 3;
  } else if (values.budgetAllocated === 'no' || values.budgetAllocated === 'unsure') {
    score -= 3;
  }

  if (values.supportCommitment === 'yes') {
    score += 3;
  } else if (values.supportCommitment === 'no' || values.supportCommitment === 'not_yet') {
    score -= 4;
  }

  score += supportEvaluation.score;

  if (values.solutionLongevity === 'lt_1_year') {
    score -= 2;
  }

  if (values.existingSolutionAwareness === 'unsure') {
    score -= 2;
  }

  if (values.focusedOutcomes.length > 0) {
    score += Math.min(values.focusedOutcomes.length, 4);
  } else {
    score -= 1;
  }

  if (values.focusedOutcomes.indexOf('None / Not directly aligned') !== -1 || values.focusedOutcomes.indexOf('Unsure') !== -1) {
    score -= 1;
  }

  return score;
}

function calculatePriority(totalScore, urgency) {
  if (urgency === 'critical' || totalScore >= 15) {
    return 'High Priority';
  }

  if (totalScore >= 8) {
    return 'Medium Priority';
  }

  return 'Low Priority';
}

function determineRoute(values, warnings, supportEvaluation, totalScore) {
  var explanationItems = [];
  var route = 'Approve – Route to Development Team';

  var missingKeyInfo =
    !values.postGoLiveOwner ||
    !values.trainingPlan ||
    !values.requestedOutcome ||
    includesUnsure(values.requestType) ||
    includesUnsure(values.solutionLongevity);

  var supportNeedsFollowUp =
    supportEvaluation.quality === 'missing' ||
    supportEvaluation.quality === 'vague' ||
    supportEvaluation.quality === 'short' ||
    values.supportCommitment === 'no' ||
    values.supportCommitment === 'not_yet';

  if (values.requestType === 'simple_workflow' || values.requestType === 'data_reporting') {
    route = 'Approve – Route to BPA Team';
    explanationItems.push('Request is classified as a simple workflow/automation or reporting need, so it leans to BPA Team routing.');
  }

  if (values.requestType === 'new_application' || values.requestType === 'enhancement') {
    route = 'Approve – Route to Development Team';
    explanationItems.push('Request is classified as a new application/enhancement, so it leans to Development Team routing.');
  }

  if (values.requestType === 'simple_workflow' && values.estimatedComplexity === 'low' && values.supportCommitment === 'yes' && supportEvaluation.quality !== 'missing' && supportEvaluation.quality !== 'vague') {
    route = 'Approve – Simple Task';
    explanationItems.push('Request appears to be a low-complexity workflow with support in place, so it can be handled as a simple task.');
  }

  if (values.vendorSolution === 'yes') {
    route = 'Recommend Buy / RFP';
    explanationItems.push('An existing vendor solution may already meet this need, so buy/RFP evaluation is recommended first.');
  }

  if (missingKeyInfo || supportNeedsFollowUp) {
    route = 'Need More Information';

    if (supportEvaluation.quality === 'missing' || supportEvaluation.quality === 'vague' || supportEvaluation.quality === 'short') {
      explanationItems.push('Support ownership is unclear and must be specific before approval.');
    }

    if (values.supportCommitment === 'no' || values.supportCommitment === 'not_yet') {
      explanationItems.push('Support group has not agreed to provide ongoing support, so readiness is not sufficient yet.');
    }

    if (missingKeyInfo) {
      explanationItems.push('Core scoping fields are incomplete or marked unsure.');
    }
  }

  if (values.existingSolutionAwareness === 'yes') {
    explanationItems.push('An internal/existing solution was identified, so there is duplication risk to resolve.');
  } else if (values.existingSolutionAwareness === 'unsure') {
    explanationItems.push('Existing solution status is not confirmed, creating duplication risk.');
  }

  if (values.budgetAllocated === 'no' || values.budgetAllocated === 'unsure') {
    explanationItems.push('No budget has been identified, which is a dependency for implementation.');
  }

  if (values.solutionLongevity === 'lt_1_year') {
    explanationItems.push('This appears to be a short-term need, so build effort justification is weaker.');
  }

  if (values.aiComponent === 'yes' || values.aiComponent === 'unsure') {
    explanationItems.push('AI involvement was selected, so additional review is required even if routing proceeds.');
  }

  if (
    values.vendorSolution === 'yes' &&
    values.existingSolutionAwareness === 'yes' &&
    values.requestType === 'unsure'
  ) {
    route = 'Reject / No';
    explanationItems.push('Both internal and vendor options exist, but the requested gap is unclear, so intake is not approved.');
  }

  if (route.indexOf('Approve') === 0 && totalScore < 5) {
    route = 'Need More Information';
    explanationItems.push('Overall readiness score is low, so additional detail is required before approval.');
  }

  if (warnings.length > 0) {
    explanationItems.push('Warnings/Risks were triggered and should be addressed during next review.');
  }

  if (explanationItems.length === 0) {
    explanationItems.push('Inputs indicate a standard intake path with no major blockers.');
  }

  return { route: route, explanationItems: explanationItems };
}

triageForm.addEventListener('submit', function (event) {
  event.preventDefault();

  var formData = new FormData(triageForm);

  var values = {
    requestedOutcome: (formData.get('requested_outcome') || '').trim(),
    postGoLiveOwner: (formData.get('post_go_live_owner') || '').trim(),
    supportOwner: (formData.get('support_owner') || '').trim(),
    supportCommitment: formData.get('support_commitment'),
    trainingPlan: (formData.get('training_plan') || '').trim(),
    requestType: formData.get('request_type'),
    existingSolutionAwareness: formData.get('existing_solution_awareness'),
    aiComponent: formData.get('ai_component'),
    urgency: formData.get('urgency'),
    usersImpacted: formData.get('users_impacted'),
    estimatedComplexity: formData.get('estimated_complexity'),
    vendorSolution: formData.get('vendor_solution'),
    budgetAllocated: formData.get('budget_allocated'),
    solutionLongevity: formData.get('solution_longevity'),
    teamsSpoken: formData.getAll('teams_spoken'),
    focusedOutcomes: formData.getAll('focused_outcomes')
  };

  var supportEvaluation = evaluateSupportOwner(values.supportOwner);
  var totalScore = calculateScore(values, supportEvaluation);
  var priorityLevel = calculatePriority(totalScore, values.urgency);
  var warnings = getWarnings(values, supportEvaluation);
  var routeResult = determineRoute(values, warnings, supportEvaluation, totalScore);

  routeResult.explanationItems.unshift(
    'Priority level is ' +
      priorityLevel +
      ' based on urgency, user impact, support readiness, budget readiness, and selected district outcomes.'
  );

  totalScoreElement.textContent = String(totalScore);
  recommendedRouteElement.textContent = routeResult.route;
  priorityLevelElement.textContent = priorityLevel;
  renderExplanationList(routeResult.explanationItems);
  renderWarningList(warnings);
});
