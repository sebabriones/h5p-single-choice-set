var H5P = H5P || {};
H5P.SingleChoiceSetCFRD = H5P.SingleChoiceSetCFRD || {};

H5P.SingleChoiceSetCFRD.SingleChoice = (function ($, EventDispatcher, Alternative, AlternativeLabel) {
  /**
   * @param {string} html
   * @returns {string}
   */
  function stripHtmlText(html) {
    var decoder = document.createElement('div');
    decoder.innerHTML = html || '';
    return (decoder.textContent || decoder.innerText || '').replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
  }

  /**
   * @param {object} context
   * @returns {boolean}
   */
  function hasContextText(context) {
    return !!(context && context.text && stripHtmlText(context.text));
  }

  /**
   * @param {object} context
   * @returns {boolean}
   */
  function hasContextImage(context) {
    var media = context && context.media;
    var type = media && media.type;
    return !!(type && type.library && type.params && type.params.file);
  }

  /**
   * @param {object} context
   * @returns {string|null}
   */
  function getContextLayoutClass(context) {
    var hasText = hasContextText(context);
    var hasImage = hasContextImage(context);

    if (!hasText && !hasImage) {
      return null;
    }

    if (hasText && hasImage) {
      return 'h5p-sc-context--both';
    }

    if (hasText) {
      return 'h5p-sc-context--text-only';
    }

    return 'h5p-sc-context--image-only';
  }

  /**
   * @param {object} context
   * @param {number} contentId
   * @param {H5P.jQuery} $container
   */
  function attachContextImage(context, contentId, $container) {
    var media = context && context.media;
    var library = media && media.type;

    if (!library || !library.library || !$container || !$container.length) {
      return;
    }

    H5P.newRunnable(library, contentId, $container);
  }

  /**
   * Constructor function.
   */
  function SingleChoice(options, index, id, isAutoConfinue, alternativeLabels, showCorrectAnswerWhenWrong, randomAnswers, appearance) {
    EventDispatcher.call(this);
    var AnswerUtils = H5P.SingleChoiceSetCFRD;
    // Extend defaults with provided options
    this.options = $.extend(true, {}, {
      question: '',
      answers: [],
      context: {}
    }, options);
    this.isAutoConfinue = isAutoConfinue;
    this.alternativeLabels = AlternativeLabel.normalizeSettings(alternativeLabels);
    this.showCorrectAnswerWhenWrong = !!showCorrectAnswerWhenWrong;
    this.appearance = appearance || {};
    // Keep provided id.
    this.index = index;
    this.id = id;
    this.answered = false;

    var rawAnswers = this.options.answers || [];
    var correctIndex = AnswerUtils.getCorrectAnswerIndex(rawAnswers, randomAnswers);
    var normalizedAnswers = [];

    for (var i = 0; i < rawAnswers.length; i++) {
      normalizedAnswers.push({
        text: AnswerUtils.getAnswerText(rawAnswers[i]),
        correct: i === correctIndex,
        answerIndex: i
      });
    }

    this.options.answers = normalizedAnswers;

    if (randomAnswers !== false) {
      this.options.answers = H5P.shuffleArray(this.options.answers);
    }
  }

  SingleChoice.prototype = Object.create(EventDispatcher.prototype);
  SingleChoice.prototype.constructor = SingleChoice;

  /**
   * appendTo function invoked to append SingleChoice to container
   *
   * @param {jQuery} $container
   * @param {boolean} isCurrent Current slide we are on
   */
  SingleChoice.prototype.appendTo = function ($container, isCurrent) {
    var self = this;
    this.$container = $container;

    // Index of the currently focused option.
    var focusedOption;

    this.$choice = $('<div>', {
      'class': 'h5p-sc-slide h5p-sc' + (isCurrent ? ' h5p-sc-current-slide' : ''),
      css: {'left': (self.index * 100) + '%'}
    });

    var questionId = 'single-choice-' + self.id + '-question-' + self.index;
    var contextLayoutClass = getContextLayoutClass(self.options.context);
    var hasContext = !!contextLayoutClass;
    var contextTextId = 'single-choice-' + self.id + '-context-' + self.index;

    var $introduction = $('<div>', {
      'class': 'h5p-question-introduction'
    });

    var questionAttrs = {
      'id': questionId,
      'class': 'h5p-sc-question',
      'html': this.options.question
    };

    if (hasContext && hasContextText(self.options.context)) {
      questionAttrs['aria-describedby'] = contextTextId;
    }

    $introduction.append($('<div>', questionAttrs));

    var $alternatives = $('<ul>', {
      'class': 'h5p-sc-alternatives',
      'role': 'radiogroup',
      'aria-labelledby': questionId
    });

    /**
     * List of Alternatives
     *
     * @type {Alternative[]}
     */
    this.alternatives = self.options.answers.map(function (opts, displayIndex) {
      return new Alternative({
        text: opts.text,
        correct: opts.correct,
        answerIndex: opts.answerIndex,
        prefix: AlternativeLabel.getAlternativeLabel(displayIndex, self.alternativeLabels)
      });
    });

    $alternatives.css('--sc-alt-count', this.alternatives.length);

    var AppearanceModule = H5P.SingleChoiceSetCFRD.Appearance;
    /**
     * Handles click on an alternative
     */
    var handleAlternativeSelected = function (event) {
      var $element = event.data.$element;
      var correct = event.data.correct;
      var answerIndex = event.data.answerIndex;

      if ($element.parent().hasClass('h5p-sc-selected')) {
        return;
      }

      self.trigger('alternative-selected', {
        correct: correct,
        index: self.index,
        answerIndex: answerIndex,
        currentIndex: $element.index()
      });

      H5P.Transition.onTransitionEnd($element.find('.h5p-sc-progressbar'), function () {
        $element.addClass('h5p-sc-drummed');
        self.showResult(correct, answerIndex, $element);
      }, 700);

      $element.addClass('h5p-sc-selected').parent().addClass('h5p-sc-selected');

      // indicate that this question is anwered
      this.setAnswered(true);
    };

    /**
     * Handles focusing one of the options, making the rest non-tabbable.
     * @private
     */
    var handleFocus = function (answer, index) {
      // Keep track of currently focused option
      focusedOption = index;

      // remove tabbable all alternatives
      self.alternatives.forEach(function (alternative) {
        alternative.notTabbable();
      });
      answer.tabbable();
    };

    /**
     * Handles moving the focus from the current option to the previous option.
     * @private
     */
    var handlePreviousOption = function () {
      if (focusedOption === 0) {
        // wrap around to last
        this.focusOnAlternative(self.alternatives.length - 1);
      }
      else {
        this.focusOnAlternative(focusedOption - 1);
      }
    };

    /**
     * Handles moving the focus from the current option to the next option.
     * @private
     */
    var handleNextOption = function () {
      if ((focusedOption === this.alternatives.length - 1)) {
        // wrap around to first
        this.focusOnAlternative(0);
      }
      else {
        this.focusOnAlternative(focusedOption + 1);
      }
    };

    /**
     * Handles moving the focus to the first option
     * @private
     */
    var handleFirstOption = function () {
      this.focusOnAlternative(0);
    };

    /**
     * Handles moving the focus to the last option
     * @private
     */
    var handleLastOption = function () {
      this.focusOnAlternative(self.alternatives.length - 1);
    };

    for (var i = 0; i < this.alternatives.length; i++) {
      var alternative = this.alternatives[i];

      if (i === 0) {
        alternative.tabbable();
      }

      alternative.appendTo($alternatives);

      if (AppearanceModule && typeof AppearanceModule.getDistinctColorsForAlternative === 'function') {
        var distinctColors = AppearanceModule.getDistinctColorsForAlternative(self.appearance, i);
        if (distinctColors) {
          alternative.applyDistinctColors(distinctColors);
        }
      }

      alternative.on('focus', handleFocus.bind(this, alternative, i), this);
      alternative.on('alternative-selected', handleAlternativeSelected, this);
      alternative.on('previousOption', handlePreviousOption, this);
      alternative.on('nextOption', handleNextOption, this);
      alternative.on('firstOption', handleFirstOption, this);
      alternative.on('lastOption', handleLastOption, this);
    }

    if (hasContext) {
      self.$choice.addClass('h5p-sc-has-context ' + contextLayoutClass);

      var $layout = $('<div>', {
        'class': 'h5p-sc-slide-layout'
      });
      var $context = $('<aside>', {
        'class': 'h5p-sc-context',
        'aria-label': 'Context'
      });
      var $questionColumn = $('<div>', {
        'class': 'h5p-sc-question-column'
      });

      if (hasContextText(self.options.context)) {
        $context.append($('<div>', {
          'id': contextTextId,
          'class': 'h5p-sc-context-text',
          'html': self.options.context.text
        }));
      }

      if (hasContextImage(self.options.context)) {
        self.$contextMedia = $('<div>', {
          'class': 'h5p-sc-context-media'
        });
        $context.append(self.$contextMedia);
      }

      $questionColumn.append($introduction);
      $questionColumn.append($alternatives);
      $layout.append($context);
      $layout.append($questionColumn);
      self.$choice.append($layout);
    }
    else {
      this.$choice.append($('<div>', {
        'id': questionId,
        'class': 'h5p-sc-question',
        'html': this.options.question
      }));
      this.$choice.append($alternatives);
    }

    $container.append(this.$choice);

    if (self.$contextMedia && self.$contextMedia.length) {
      attachContextImage(self.options.context, self.id, self.$contextMedia);
    }

    return this.$choice;
  };

  /**
   * Focus on an alternative by index
   *
   * @param {Number} index The index of the alternative to focus on
   */
  SingleChoice.prototype.focusOnAlternative = function (index) {
    if (!this.answered || !this.isAutoConfinue) {
      this.alternatives[index].focus();
    }
  };

  /**
   * Sets if the question was answered
   *
   * @param {Boolean} answered If this question was answered
   */
  SingleChoice.prototype.setAnswered = function (answered) {
    this.answered = answered;
  };

  /**
   * Reveals the result for a question
   *
   * @param  {boolean} correct True uf answer was correct, otherwise false
   * @param  {number} answerIndex Original index of answer
   * @param  {H5P.jQuery} $selectedAlternative The chosen alternative element
   */
  SingleChoice.prototype.showResult = function (correct, answerIndex, $selectedAlternative) {
    var self = this;
    var $correctAlternative = self.$choice.find('.h5p-sc-is-correct');
    var revealCorrectAnswer = correct || self.showCorrectAnswerWhenWrong;
    var $transitionTarget = revealCorrectAnswer && !correct ?
      $correctAlternative :
      ($selectedAlternative && $selectedAlternative.length ? $selectedAlternative : $correctAlternative);

    H5P.Transition.onTransitionEnd($transitionTarget, function () {
      self.trigger('finished', {
        correct: correct,
        index: self.index,
        answerIndex: answerIndex
      });
      self.setAriaAttributes();
    }, 600);

    if (correct) {
      self.$choice.find('.h5p-sc-is-wrong').addClass('h5p-sc-reveal-wrong');
      $correctAlternative.addClass('h5p-sc-reveal-correct');
    }
    else if (self.showCorrectAnswerWhenWrong) {
      self.$choice.find('.h5p-sc-is-wrong').addClass('h5p-sc-reveal-wrong');
      $correctAlternative.addClass('h5p-sc-reveal-correct');
    }
    else if ($selectedAlternative && $selectedAlternative.length) {
      $selectedAlternative.addClass('h5p-sc-reveal-wrong');
    }
  };

  /**
   * Reset a11y text for selected options
   */
  SingleChoice.prototype.resetA11yText = function () {
    var self = this;
    self.$choice.find('.h5p-sc-a11y').text('');
  };

  /**
   * Make a11y text readable for screen reader
   */
  SingleChoice.prototype.setA11yTextReadable = function () {
    var self = this;
    self.$choice.find('.h5p-sc-a11y').attr('aria-hidden', false);
  };

  /**
   * Set aria attributes for choice
   */
  SingleChoice.prototype.setAriaAttributes = function () {
    var self = this;
    // A11y mode is enabled
    if (!self.isAutoConfinue) {
      self.$choice.find('.h5p-sc-alternative.h5p-sc-selected').attr('aria-checked', true);
      self.$choice.find('.h5p-sc-alternative').attr('aria-disabled', true);
    }
  };

  /**
   * Reset aria attributes
   */
  SingleChoice.prototype.resetAriaAttributes = function () {
    var self = this;
    // A11y mode is enabled
    if (!self.isAutoConfinue) {
      var alternative = self.$choice.find('.h5p-sc-alternative');
      alternative.removeAttr('aria-disabled');
      alternative.removeAttr('aria-checked');
    }
  };

  return SingleChoice;

})(H5P.jQuery, H5P.EventDispatcher, H5P.SingleChoiceSetCFRD.Alternative, H5P.SingleChoiceSetCFRD.AlternativeLabel);
