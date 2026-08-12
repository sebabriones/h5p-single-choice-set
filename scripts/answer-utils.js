var H5P = H5P || {};
H5P.SingleChoiceSetCFRD = H5P.SingleChoiceSetCFRD || {};

/**
 * @param {string|object} answer
 * @returns {string}
 */
H5P.SingleChoiceSetCFRD.getAnswerText = function (answer) {
  if (answer === undefined || answer === null) {
    return '';
  }

  if (typeof answer === 'string') {
    return answer;
  }

  return answer.text || '';
};

/**
 * @param {Array} answers
 * @param {boolean} randomAnswers
 * @returns {number}
 */
H5P.SingleChoiceSetCFRD.getCorrectAnswerIndex = function (answers, randomAnswers) {
  if (!answers || !answers.length) {
    return 0;
  }

  if (randomAnswers !== false) {
    return 0;
  }

  for (var i = 0; i < answers.length; i++) {
    var answer = answers[i];

    if (typeof answer === 'object' && answer.correct) {
      return i;
    }
  }

  return 0;
};

/**
 * @param {Array} answers
 * @param {boolean} randomAnswers
 * @returns {string}
 */
H5P.SingleChoiceSetCFRD.getCorrectAnswerText = function (answers, randomAnswers) {
  var index = H5P.SingleChoiceSetCFRD.getCorrectAnswerIndex(answers, randomAnswers);

  return H5P.SingleChoiceSetCFRD.getAnswerText(answers[index]);
};

/**
 * @param {Array} answers
 * @returns {Array}
 */
H5P.SingleChoiceSetCFRD.normalizeAnswersForStorage = function (answers) {
  if (!Array.isArray(answers)) {
    return answers;
  }

  return answers.map(function (answer, index) {
    if (typeof answer === 'string') {
      return {
        text: answer,
        correct: index === 0
      };
    }

    if (answer && typeof answer === 'object') {
      return {
        text: answer.text || '',
        correct: !!answer.correct
      };
    }

    return {
      text: '',
      correct: index === 0
    };
  });
};
