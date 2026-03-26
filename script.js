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

function calculateScore(urgency, usersImpacted, estimatedComplexity, strategicAlignment) {
  var urgencyScores = { low: 5, medium: 10, high: 15, critical: 20 };
  var usersImpactedScores = { '1-10': 5, '11-100': 10, '101-1000': 15, 'district-wide': 20 };
  var complexityScores = { low: 15, medium: 10, high: 5 };
  var alignmentScores = { low: 5, medium: 10, high: 20 };

  return (
    (urgencyScores[urgency] || 0) +
    (usersImpactedScores[usersImpacted] || 0) +
    (complexityScores[estimatedComplexity] || 0) +
    (alignmentScores[strategicAlignment] || 0)
  );
}

function calculatePriority(totalScore, urgency) {
  if (urgency === 'critical' || totalScore >= 50) {
    return 'High Priority';
  }

  if (totalScore >= 30) {
    return 'Medium Priority';
  }

  return 'Low Priority';
}

function determineRoute(values) {
  var explanationItems = [];
  var route = 'Approve – Route to Development Team';

  var missingOwnershipSupport =
    !values.postGoLiveOwner ||
    !values.trainingPlan ||
    includesUnsure(values.supportOwner);

  if (missingOwnershipSupport || includesUnsure(values.requestType)) {
    route = 'Need More Information';
    explanationItems.push('Ownership, support, or request details are incomplete/unsure and should be clarified first.');
  }

  if (values.vendorSolution === 'yes') {
    route = 'Recommend Buy / RFP';
    explanationItems.push('A possible vendor/product solution already exists, so buy/RFP review is recommended.');
  }

  if (values.requestType === 'simple_workflow' && route !== 'Recommend Buy / RFP') {
    route = 'Approve – Route to BPA Team';
    explanationItems.push('This was identified as a simple workflow/automation request, which is a BPA fit.');
  }

  if (values.requestType === 'new_application' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to Development Team';
    explanationItems.push('New application/system requests generally require Development Team delivery.');
  }

  if (values.requestType === 'data_reporting' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to BPA Team';
    explanationItems.push('Data/reporting requests often begin with BPA-led intake and scoping.');
  }

  if (values.requestType === 'enhancement' && route !== 'Recommend Buy / RFP' && route !== 'Need More Information') {
    route = 'Approve – Route to Development Team';
    explanationItems.push('Enhancements to existing systems are typically routed to the Development Team.');
  }

  if (values.existingSolutionAwareness === 'yes') {
    explanationItems.push('A related internal effort already exists, so check for possible duplication before proceeding.');
  }

  if (values.aiComponent === 'yes') {
    explanationItems.push('AI is included, so additional governance/privacy/security review may be required.');
  }

  if (values.supportOwner === 'vendor' && values.vendorSolution === 'no') {
    explanationItems.push('Vendor support is expected, but no clear vendor product is confirmed yet.');
  }

  if (route !== 'Need More Information' && values.teamsSpoken.length === 1 && values.teamsSpoken[0] === 'none') {
    explanationItems.push('No teams have been consulted yet; early coordination is recommended after routing.');
  }

  if (route === 'Approve – Route to BPA Team' && values.estimatedComplexity === 'high') {
    route = 'Need More Information';
    explanationItems.push('High complexity with BPA-style intake indicates additional cross-team scoping is needed.');
  }

  if (route === 'Approve – Route to Development Team' && values.estimatedComplexity === 'low' && values.urgency !== 'critical') {
    route = 'Approve – Simple Task';
    explanationItems.push('Low complexity suggests this can likely be handled as a simple approved task.');
  }

  if (values.vendorSolution === 'yes' && values.existingSolutionAwareness === 'yes') {
    route = 'Reject / No';
    explanationItems.push('Both internal and external solutions appear to exist; avoid duplicate investment without a clear gap.');
  }

  if (explanationItems.length === 0) {
    explanationItems.push('Inputs indicate a standard intake path with no blockers.');
  }

  return { route: route, explanationItems: explanationItems };
}

triageForm.addEventListener('submit', function (event) {
  event.preventDefault();

  var formData = new FormData(triageForm);

  var values = {
    postGoLiveOwner: (formData.get('post_go_live_owner') || '').trim(),
    trainingPlan: (formData.get('training_plan') || '').trim(),
    supportOwner: formData.get('support_owner'),
    requestType: formData.get('request_type'),
    existingSolutionAwareness: formData.get('existing_solution_awareness'),
    aiComponent: formData.get('ai_component'),
    urgency: formData.get('urgency'),
    usersImpacted: formData.get('users_impacted'),
    estimatedComplexity: formData.get('estimated_complexity'),
    strategicAlignment: formData.get('strategic_alignment'),
    vendorSolution: formData.get('vendor_solution'),
    teamsSpoken: formData.getAll('teams_spoken')
  };

  var totalScore = calculateScore(
    values.urgency,
    values.usersImpacted,
    values.estimatedComplexity,
    values.strategicAlignment
  );

  var priorityLevel = calculatePriority(totalScore, values.urgency);
  var routeResult = determineRoute(values);

  routeResult.explanationItems.unshift('Priority level is ' + priorityLevel + ' based on urgency, users impacted, complexity, and strategic alignment.');

  totalScoreElement.textContent = String(totalScore);
  recommendedRouteElement.textContent = routeResult.route;
  priorityLevelElement.textContent = priorityLevel;
  renderExplanationList(routeResult.explanationItems);
});
