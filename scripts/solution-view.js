var H5P = H5P || {};
H5P.SingleChoiceSetCFRD = H5P.SingleChoiceSetCFRD || {};

H5P.SingleChoiceSetCFRD.SolutionView = (function ($, EventDispatcher, AlternativeLabel) {
  AlternativeLabel = AlternativeLabel || {
    prependLabel: function (prefix, text) {
      return prefix ? prefix + ' ' + text : text;
    },
    getAlternativeLabel: function () {
      return '';
    }
  };

  /**
   * Constructor function.
   */
  function SolutionView(id, choices, l10n, alternativeLabels, randomAnswers) {
    EventDispatcher.call(this);
    var self = this;
    self.id = id;
    this.choices = choices;
    self.l10n = l10n;
    self.alternativeLabels = alternativeLabels;
    self.randomAnswers = randomAnswers !== false;

    this.$solutionView = $('<div>', {
      'class': 'h5p-sc-solution-view'
    });

    // Add header
    this.$header = $('<div>', {
      'class': 'h5p-sc-solution-view-header'
    }).appendTo(this.$solutionView);

    this.$title = $('<div>', {
      'class': 'h5p-sc-solution-view-title',
      'html': l10n.solutionViewTitle,
      'tabindex': '-1'
    });
    this.$title = this.addAriaPunctuation(this.$title);
    this.$header.append(this.$title);

    // Close solution view button
    $('<button>', {
      'role': 'button',
      'aria-label': l10n.closeButtonLabel + '.',
      'class': 'h5p-joubelui-button h5p-sc-close-solution-view',
      'click': function () {
        self.hide();
      }
    }).appendTo(this.$header);

    self.populate();
  }

  /**
   * Will append the solution view to a container DOM
   * @param  {jQuery} $container The DOM object to append to
   */
  SolutionView.prototype.appendTo = function ($container) {
    this.$solutionView.appendTo($container);
  };

  /**
   * Shows the solution view
   */
  SolutionView.prototype.show = function () {
    var self = this;
    self.$solutionView.addClass('visible');
    self.$title.focus();

    $(document).on('keyup.solutionview', function (event) {
      if (event.keyCode === 27) { // Escape
        self.hide();
        $(document).off('keyup.solutionview');
      }
    });
  };

  /**
   * Hides the solution view
   */
  SolutionView.prototype.hide = function () {
    this.$solutionView.removeClass('visible');
    this.trigger('hide', this);
  };


  /**
   * Populates the solution view
   */
  SolutionView.prototype.populate = function () {
    var self = this;
    self.$choices = $('<dl>', {
      'class': 'h5p-sc-solution-choices',
      'tabindex': -1,
    });

    this.choices.forEach(function (choice, index) {
      if (choice.question && choice.answers && choice.answers.length !== 0) {
        var AnswerUtils = H5P.SingleChoiceSetCFRD;
        var correctIndex = AnswerUtils.getCorrectAnswerIndex(choice.answers, self.randomAnswers);
        var $question = self.addAriaPunctuation($('<dt>', {
          'class': 'h5p-sc-solution-question',
          html: '<span class="h5p-hidden-read">' + self.l10n.solutionListQuestionNumber.replace(':num', index + 1) + '</span>' + choice.question
        }));

        self.$choices.append($question);

        var answerHtml = AnswerUtils.getAnswerText(choice.answers[correctIndex]);
        var correctLabel = AlternativeLabel.getAlternativeLabel(correctIndex, self.alternativeLabels);

        if (correctLabel) {
          answerHtml = AlternativeLabel.prependLabel(correctLabel, answerHtml);
        }

        var $answer = self.addAriaPunctuation($('<dd>', {
          'class': 'h5p-sc-solution-answer',
          'html': answerHtml
        }));

        self.$choices.append($answer);
      }
    });
    self.$choices.appendTo(this.$solutionView);
  };

  /**
   * If a jQuery elements text is missing punctuation, add an aria-label to the element
   * containing the text, and adding an extra "period"-symbol at the end.
   *
   * @param {jQuery} $element A jQuery-element
   * @returns {jQuery} The mutated jQuery-element
   */
  SolutionView.prototype.addAriaPunctuation = function ($element) {
    var text = $element.text().trim();

    if (!this.hasPunctuation(text)) {
      $element.attr('aria-label', text + '.');
    }

    return $element;
  };

  /**
   * Checks if a string ends with punctuation
   *
   * @private
   * @param {String} text Input string
   */
  SolutionView.prototype.hasPunctuation = function (text) {
    return /[,.?!]$/.test(text);
  };

  return SolutionView;
})(H5P.jQuery, H5P.EventDispatcher, H5P.SingleChoiceSetCFRD.AlternativeLabel);
