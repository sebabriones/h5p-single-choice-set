var H5PPresave = H5PPresave || {};

/**
 * Resolve the presave logic for the content type Single Choice Set
 *
 * @param {object} content
 * @param finished
 * @constructor
 */
H5PPresave['H5P.SingleChoiceSetCFRD'] = function (content, finished) {
  var presave = H5PEditor.Presave;
  var score = 0;

  normalizeContent(content);

  if (isContentInvalid()) {
    throw new presave.exceptions.InvalidContentSemanticsException('Invalid Single Choice Error');
  }

  validateCorrectAlternatives(content);

  score = content.choices
    .filter(function (choice) {
      return choice.hasOwnProperty('question') && choice.question.length > 0;
    })
    .length;

  presave.validateScore(score);

  finished({maxScore: score});

  /**
   * @param {object} contentParams
   */
  function normalizeContent(contentParams) {
    if (!contentParams) {
      return;
    }

    contentParams.behaviour = contentParams.behaviour || {};
    if (contentParams.behaviour.randomAnswers === undefined) {
      contentParams.behaviour.randomAnswers = true;
    }

    if (!Array.isArray(contentParams.choices)) {
      return;
    }

    contentParams.choices.forEach(function (choice) {
      if (!choice || !Array.isArray(choice.answers)) {
        return;
      }

      choice.answers = choice.answers.map(function (answer, index) {
        if (typeof answer === 'string') {
          return {
            text: answer,
            correct: index === 0
          };
        }

        if (answer && typeof answer === 'object') {
          return {
            text: answer.text || '',
            correct: answer.correct === undefined ? index === 0 : !!answer.correct
          };
        }

        return {
          text: '',
          correct: index === 0
        };
      });
    });
  }

  /**
   * @param {object} contentParams
   */
  function validateCorrectAlternatives(contentParams) {
    if (!contentParams || contentParams.behaviour.randomAnswers !== false) {
      return;
    }

    if (!Array.isArray(contentParams.choices)) {
      return;
    }

    contentParams.choices.forEach(function (choice, questionIndex) {
      if (!choice || !Array.isArray(choice.answers) || !choice.answers.length) {
        return;
      }

      var correctCount = choice.answers.filter(function (answer) {
        return answer && answer.correct;
      }).length;

      if (correctCount !== 1) {
        throw new presave.exceptions.InvalidContentSemanticsException(
          'Question ' + (questionIndex + 1) + ' must have exactly one correct alternative when alternative shuffling is disabled.'
        );
      }
    });
  }

  /**
   * Check if required parameters is present
   * @return {boolean}
   */
  function isContentInvalid() {
    return !presave.checkNestedRequirements(content, 'content.choices') || !Array.isArray(content.choices);
  }
};
