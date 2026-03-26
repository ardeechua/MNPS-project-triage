var triageForm = document.getElementById('triage-form');
var totalScoreElement = document.getElementById('total-score');
var recommendedRouteElement = document.getElementById('recommended-route');
var priorityLevelElement = document.getElementById('priority-level');
var scoreExplanationElement = document.getElementById('score-explanation');

function renderExplanationList(explanationItems) {
  scoreExplanationElement.innerHTML = '';

  for (var i = 0; i < explanationItems.length; i += 1) {
    var listItem = document.createElement('li');
    listItem.textContent = explanationItems[i];
    scoreExplanationElement.appendChild(listItem);
  }
}

function includesUnsure(value) {
  return value === 'unsure' || value === '' || value === null;
}

function looksLikeGenericItSupport(text) {
  var normalized = (text || '').trim().toLowerCase();
  return normalized === '' || normalized === 'it' || normalized === 'it team' || normalized === 'technology';
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

function determineRoute(values) {
  var explanationItems = [];
  var route = 'Approve – Route to Development Team';
  var missingKeyInfo =
    !values.postGoLiveOwner ||
    !values.trainingPlan ||
    !values.requestedOutcome ||
    includesUnsure(values.requestType) ||
    includesUnsure(values.solutionLongevity);

  if (missingKeyInfo || looksLikeGenericItSupport(values.supportOwner)) {
    route = 'Need More Information';
    explanationItems.push('Key ownership, support, request detail, or lifespan information is incomplete for routing.');
  }

  if (values.vendorSolution === 'yes') {
    route = 'Recommend Buy / RFP';
    explanationItems.push('An existing vendor/product option is available, so buy/RFP evaluation is recommended first.');
  }

  if (values.requestType === 'simple_workflow' && route !== 'Recommend Buy / RFP') {
    route = 'Approve – Route to BPA Team';
    explanationItems.push('Simple workflow/automation requests are typically routed to the BPA Team.');
  }

  if (values.requestType === 'new_application' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to Development Team';
    explanationItems.push('New application/system requests usually require Development Team delivery.');
  }

  if (values.requestType === 'data_reporting' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to BPA Team';
    explanationItems.push('Data/reporting requests generally start with BPA intake and scoping.');
  }

  if (values.requestType === 'enhancement' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to Development Team';
    explanationItems.push('Enhancements to existing systems are usually handled by Development Team workflows.');
  }

  if (values.existingSolutionAwareness === 'yes' || values.existingSolutionAwareness === 'unsure') {
    explanationItems.push('An internal effort may already exist, so duplication risk should be reviewed before work starts.');
  }

  if (values.aiComponent === 'yes') {
    explanationItems.push('AI is included, so additional governance, privacy, and security review may be required.');
  }

  if (values.budgetAllocated === 'no' || values.budgetAllocated === 'unsure') {
    explanationItems.push('Budget is not confirmed, which is a planning dependency and potential risk.');
  }

  if (values.solutionLongevity === 'lt_1_year') {
    explanationItems.push('The need is short-term (<1 year), which may affect the level of effort that is justified.');
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
    values.vendorSolution === 'yes' &&
    values.existingSolutionAwareness === 'yes' &&
    values.requestType === 'unsure'
  ) {
    route = 'Reject / No';
    explanationItems.push('Existing internal and vendor options exist without a clear gap statement, so this should not proceed yet.');
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
  var routeResult = determineRoute(values);

  routeResult.explanationItems.unshift(
    'Priority level is ' +
      priorityLevel +
      ' based on urgency, users impacted, complexity, and number of district outcomes selected.'
  );

  totalScoreElement.textContent = String(totalScore);
  recommendedRouteElement.textContent = routeResult.route;
  priorityLevelElement.textContent = priorityLevel;
  renderExplanationList(routeResult.explanationItems);
});
