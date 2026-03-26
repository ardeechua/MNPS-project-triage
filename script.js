// Find the elements we need from the page.
var triageForm = document.getElementById('triage-form');
var totalScoreElement = document.getElementById('total-score');
var priorityLevelElement = document.getElementById('priority-level');
var scoreExplanationElement = document.getElementById('score-explanation');

function toTitleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildScoreExplanation(urgency, usersImpacted, complianceRequired, strategicAlignment) {
  var explanationItems = [];

  if (complianceRequired === 'yes') {
    explanationItems.push('Compliance is required, so this adds a large boost to the score.');
  } else {
    explanationItems.push('Compliance is not required, so this did not add extra points.');
  }

  explanationItems.push('Urgency is set to ' + toTitleCase(urgency) + ', which affects how quickly this project should be reviewed.');

  explanationItems.push('Users impacted is ' + usersImpacted + ', so the score reflects how many people this project can help.');

  explanationItems.push('Strategic alignment is ' + toTitleCase(strategicAlignment) + ', which shows how strongly this supports district goals.');

  return explanationItems;
}

function renderExplanationList(explanationItems) {
  scoreExplanationElement.innerHTML = '';

  for (var i = 0; i < explanationItems.length; i += 1) {
    var listItem = document.createElement('li');
    listItem.textContent = explanationItems[i];
    scoreExplanationElement.appendChild(listItem);
  }
}

// Form submit handling:
// Listen for form submission, stop the page refresh,
// then read the selected answers from the form.
triageForm.addEventListener('submit', function (event) {
  event.preventDefault();

  var formData = new FormData(triageForm);
  var urgency = formData.get('urgency');
  var usersImpacted = formData.get('users_impacted');
  var complianceRequired = formData.get('compliance_required');
  var estimatedComplexity = formData.get('estimated_complexity');
  var strategicAlignment = formData.get('strategic_alignment');

  // Score calculation:
  // Each dropdown value maps to its rule-based point value.
  var urgencyScores = { low: 5, medium: 10, high: 15, critical: 20 };
  var usersImpactedScores = { '1-10': 5, '11-50': 10, '51-200': 15, '200+': 20 };
  var complianceScores = { no: 0, yes: 25 };
  var complexityScores = { low: 15, medium: 10, high: 5 };
  var alignmentScores = { low: 5, medium: 10, high: 20 };

  var totalScore =
    urgencyScores[urgency] +
    usersImpactedScores[usersImpacted] +
    complianceScores[complianceRequired] +
    complexityScores[estimatedComplexity] +
    alignmentScores[strategicAlignment];

  // Priority level logic:
  // 0-39 => Low Priority, 40-69 => Review Needed, 70-100 => High Priority.
  var priorityLevel = '';
  if (totalScore <= 39) {
    priorityLevel = 'Low Priority';
  } else if (totalScore <= 69) {
    priorityLevel = 'Review Needed';
  } else {
    priorityLevel = 'High Priority';
  }

  var explanationItems = buildScoreExplanation(
    urgency,
    usersImpacted,
    complianceRequired,
    strategicAlignment
  );

  // Rendering the result:
  // Update the result area on the page with the new score and label.
  totalScoreElement.textContent = totalScore;
  priorityLevelElement.textContent = priorityLevel;
  renderExplanationList(explanationItems);
});
