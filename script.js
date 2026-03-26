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

function looksLikeGenericSupport(text) {
  var normalized = (text || '').trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === 'it' ||
    normalized === 'it team' ||
    normalized === 'technology' ||
    normalized === 'tbd' ||
    normalized === 'unsure'
  );
}

function calculateScore(urgency, usersImpacted, estimatedComplexity, outcomesCount) {
  var urgencyScores = { low: 5, medium: 10, high: 15, critical: 20 };
  var usersImpactedScores = { '1-10': 4, '11-100': 8, '101-1000': 12, 'district-wide': 16 };
  var complexityScores = { low: 10, medium: 7, high: 4 };
  var outcomeBonus = Math.min(outcomesCount, 6);

  return (
    (urgencyScores[urgency] || 0) +
    (usersImpactedScores[usersImpacted] || 0) +
    (complexityScores[estimatedComplexity] || 0) +
    outcomeBonus
  );
}

function calculatePriority(totalScore, urgency, outcomesCount) {
  if (urgency === 'critical' || totalScore >= 35 || outcomesCount >= 6) {
    return 'High Priority';
  }

  if (totalScore >= 23) {
    return 'Medium Priority';
  }

  return 'Low Priority';
}

function getWarnings(values) {
  var warnings = [];

  if (values.existingSolutionAwareness === 'unsure') {
    warnings.push('Existing solution not confirmed (marked Unsure).');
  }

  if (looksLikeGenericSupport(values.supportOwner)) {
    warnings.push('Support ownership is unclear or too vague.');
  }

  if (values.budgetAllocated === 'no' || values.budgetAllocated === 'unsure') {
    warnings.push('No confirmed budget identified for this request.');
  }

  if (values.solutionLongevity === 'lt_1_year') {
    warnings.push('Short-term solution (<1 year) may not justify build effort.');
  }

  if (values.vendorSolution === 'yes' || values.vendorSolution === 'unsure') {
    warnings.push('A vendor option may exist and should be evaluated before building.');
  }

  return warnings;
}

function determineRoute(values, warnings) {
  var explanationItems = [];
  var route = 'Approve – Route to Development Team';
  var missingKeyInfo =
    !values.postGoLiveOwner ||
    !values.trainingPlan ||
    !values.requestedOutcome ||
    includesUnsure(values.requestType) ||
    includesUnsure(values.solutionLongevity);
  var supportUnclear = looksLikeGenericSupport(values.supportOwner);

  if (missingKeyInfo || supportUnclear) {
    route = 'Need More Information';
    explanationItems.push('Need More Information selected because ownership/support clarity or core scoping details are incomplete.');
  }

  if (values.vendorSolution === 'yes' || values.vendorSolution === 'unsure') {
    route = 'Recommend Buy / RFP';
    explanationItems.push('Vendor solution is marked ' + values.vendorSolution + ', so buy/RFP review is recommended before custom build.');
  }

  if (values.requestType === 'simple_workflow' && route !== 'Recommend Buy / RFP') {
    route = 'Approve – Route to BPA Team';
    explanationItems.push('Request classified as Simple workflow / automation, so it leans to BPA Team routing.');
  }

  if (values.requestType === 'new_application' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to Development Team';
    explanationItems.push('Request classified as New application / system, so Development Team routing is the best fit.');
  }

  if (values.requestType === 'data_reporting' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to BPA Team';
    explanationItems.push('Data/reporting requests generally start with BPA intake and scoping.');
  }

  if (values.requestType === 'enhancement' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to Development Team';
    explanationItems.push('Enhancements to existing systems are usually handled by Development Team workflows.');
  }

  if (values.existingSolutionAwareness === 'yes') {
    explanationItems.push('Existing solution awareness is Yes, which creates duplication risk that must be validated.');
  }

  if (values.existingSolutionAwareness === 'unsure') {
    explanationItems.push('Existing solution awareness is Unsure, so duplication risk remains unresolved.');
  }

  if (values.aiComponent === 'yes') {
    explanationItems.push('AI component is Yes, so additional governance, privacy, and security review is required.');
  }

  if (values.budgetAllocated === 'no' || values.budgetAllocated === 'unsure') {
    explanationItems.push('Budget is ' + values.budgetAllocated + ', so funding risk is part of the routing recommendation.');
  }

  if (values.solutionLongevity === 'lt_1_year') {
    explanationItems.push('Longevity is Less than 1 year, so the implementation effort may not be justified.');
  }

  if (values.focusedOutcomes.length >= 5) {
    explanationItems.push('This request supports many district outcomes, increasing potential district-level impact.');
  }

  if (route !== 'Need More Information' && values.teamsSpoken.length === 1 && values.teamsSpoken[0] === 'none') {
    explanationItems.push('No teams have been consulted yet; coordination is recommended after routing.');
  }

  if (route === 'Approve – Route to BPA Team' && values.estimatedComplexity === 'high') {
    route = 'Need More Information';
    explanationItems.push('High complexity on a BPA-leaning request suggests additional cross-team scoping is needed.');
  }

  if (route === 'Approve – Route to Development Team' && values.estimatedComplexity === 'low' && values.urgency !== 'critical') {
    route = 'Approve – Simple Task';
    explanationItems.push('Low complexity suggests this can be approved and handled as a simple task.');
  }

  if (
    (values.vendorSolution === 'yes' || values.vendorSolution === 'unsure') &&
    values.existingSolutionAwareness === 'yes' &&
    values.requestType === 'unsure'
  ) {
    route = 'Reject / No';
    explanationItems.push('Existing internal and vendor options exist without a clear gap statement, so this should not proceed yet.');
  }

  if (supportUnclear && route !== 'Need More Information') {
    route = 'Need More Information';
    explanationItems.push('Support owner response is unclear (for example, IT/TBD/Unsure), so more accountability detail is required.');
  }

  if (warnings.length > 0) {
    explanationItems.push('Warnings/Risks were triggered and should be resolved before final approval.');
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

  var totalScore = calculateScore(
    values.urgency,
    values.usersImpacted,
    values.estimatedComplexity,
    values.focusedOutcomes.length
  );

  var priorityLevel = calculatePriority(totalScore, values.urgency, values.focusedOutcomes.length);
  var warnings = getWarnings(values);
  var routeResult = determineRoute(values, warnings);

  routeResult.explanationItems.unshift(
    'Priority level is ' +
      priorityLevel +
      ' based on urgency, users impacted, complexity, and number of district outcomes selected.'
  );

  totalScoreElement.textContent = String(totalScore);
  recommendedRouteElement.textContent = routeResult.route;
  priorityLevelElement.textContent = priorityLevel;
  renderExplanationList(routeResult.explanationItems);
  renderWarningList(warnings);
});
