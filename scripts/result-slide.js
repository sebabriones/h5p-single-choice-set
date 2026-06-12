var H5P = H5P || {};
H5P.SingleChoiceSetCFRD = H5P.SingleChoiceSetCFRD || {};
/**
 * SingleChoiceResultSlide - Represents the result slide
 */
H5P.SingleChoiceSetCFRD.ResultSlide = (function ($, EventDispatcher) {

  /**
   * @param {string} html
   * @returns {string}
   */
  function stripHtml(html) {
    const decoder = document.createElement('div');
    decoder.innerHTML = html;
    return decoder.textContent || decoder.innerText || '';
  }

  /**
   * @param {object} question
   * @param {number|undefined} userResponseIndex
   * @param {object} l10n
   * @returns {object}
   */
  function buildQuestionData(question, userResponseIndex, l10n) {
    const hasResponse = userResponseIndex !== undefined && userResponseIndex !== null;
    const selectedAnswer = hasResponse ? question.options.answers[userResponseIndex] : null;
    const isCorrect = hasResponse && selectedAnswer?.correct;
    const data = {
      title: stripHtml(question.options.question),
      points: hasResponse ? (isCorrect ? '1' : '0') : '0',
    };

    if (hasResponse && selectedAnswer) {
      data.isCorrect = isCorrect;
      data.userAnswer = stripHtml(selectedAnswer.text);

      if (!isCorrect) {
        data.correctAnswer = stripHtml(question.options.answers.find(function (a) {
          return a.correct;
        }).text);
        data.correctAnswerPrepend = l10n.correctAnswerIntroduction + ': ';
      }
    }

    return data;
  }

  /**
   * @param {object} params
   * @param {number} maxscore
   * @returns {object}
   */
  function buildResultScreenParams(params, maxscore) {
    return {
      header: params.l10n.resultHeader,
      scoreHeader: params.l10n.totalScore
        .replace(':score', params.totalScore)
        .replace(':maxScore', maxscore),
      questionGroups: [{
        listHeaders: [
          params.l10n.resultTableHeader,
          params.l10n.resultScoreTableHeader,
        ],
        questions: params.questions.map(function (question, i) {
          return buildQuestionData(question, params.userResponses[i], params.l10n);
        }),
      }],
    };
  }

  /**
   * @constructor
   * @param {number} maxscore Max score
   */
  function ResultSlide(maxscore) {
    EventDispatcher.call(this);

    this.maxscore = maxscore;
    this.$resultSlide = $('<div>', {
      'class': 'h5p-sc-slide h5p-sc-set-results',
      'css': {left: (maxscore * 100) + '%'}
    });

    this.$buttonContainer = $('<div/>', {
      'class': 'h5p-sc-button-container'
    }).appendTo(this.$resultSlide);

    this.component;
    this.header;
  }

  // inherits from EventDispatchers prototype
  ResultSlide.prototype = Object.create(EventDispatcher.prototype);

  // set the constructor
  ResultSlide.prototype.constructor = ResultSlide;

  /**
   * Focus the header, in case there are no buttons
   */
  ResultSlide.prototype.focusScore = function () {
    this.header?.focus();
  };

  /**
   * Build or update the result screen DOM without showing it.
   *
   * @param {object} params.l10n Translation strings
   * @param {[object]} params.questions The question objects, including answers
   * @param {[object]} params.userResponses What the user has answered
   * @param {number} params.totalScore The total score
   */
  ResultSlide.prototype.refreshContent = function (params) {
    const screenParams = buildResultScreenParams(params, this.maxscore);
    const nextComponent = H5P.Components.ResultScreen(screenParams);

    if (this.component) {
      this.component.replaceWith(nextComponent);
    }
    else {
      this.$resultSlide[0].prepend(nextComponent);
    }

    this.component = nextComponent;
    this.header = this.component.querySelector('.h5p-theme-results-banner');
    this.header.tabindex = -1;
  };

  /**
   * Show the result slide, with updated results
   *
   * @param {object} params.l10n Translation strings
   * @param {[object]} params.questions The question objects, including answers
   * @param {[object]} params.userResponses What the user has answered
   * @param {number} params.totalScore The total score
   */
  ResultSlide.prototype.showSlide = function (params) {
    this.refreshContent(params);
  };

  /**
   * Pre-build the result screen while the user is still on question slides.
   *
   * @param {object} params
   */
  ResultSlide.prototype.warmUp = function (params) {
    this.refreshContent(params);
  };

  /**
   * Append the resultslide to a container
   *
   * @param  {jQuery} $container The container
   * @return {jQuery}            This dom element
   */
  ResultSlide.prototype.appendTo = function ($container) {
    this.$resultSlide.appendTo($container);
    return this.$resultSlide;
  };

  return ResultSlide;
})(H5P.jQuery, H5P.EventDispatcher);
