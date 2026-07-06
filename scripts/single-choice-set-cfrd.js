var H5P = H5P || {};

/**
 * @param {*} value
 * @returns {boolean}
 */
function isTruthy(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/**
 * @param {H5P.SingleChoiceSetCFRD} instance
 * @returns {Object|null}
 */
function getInstructionsOptions(instance) {
  var instructions = instance && instance.options && instance.options.instructions;
  var text;

  if (!instructions || !isTruthy(instructions.enabled)) {
    return null;
  }

  text = (instructions.text === undefined || instructions.text === null) ?
    '' :
    String(instructions.text).trim();

  if (!text) {
    return null;
  }

  return {
    id: instance.contentId || instance.id,
    text: text,
    displayMode: instructions.displayMode || 'both',
    introButtonLabel: instructions.introButtonLabel || 'Start',
    tabButtonLabel: instructions.tabButtonLabel || 'Instructions',
    appearance: H5P.jQuery.extend(true, {}, instructions.appearance || {}),
    animation: H5P.jQuery.extend(true, {}, instructions.animation || {}),
    startCollapsed: instructions.startCollapsed === undefined ?
      true :
      isTruthy(instructions.startCollapsed)
  };
}

/**
 * @param {object} options
 * @returns {string|null} left | center | right, or null when tab is not used
 */
function getInstructionsTabPosition(options) {
  var instructions = options && options.instructions;

  if (!instructions || !isTruthy(instructions.enabled)) {
    return null;
  }

  var displayMode = instructions.displayMode || 'both';

  if (displayMode !== 'tab' && displayMode !== 'both') {
    return null;
  }

  var tabAppearance = instructions.appearance && instructions.appearance.tab;
  var position = tabAppearance && tabAppearance.buttonPosition;

  if (position === 'left' || position === 'center' || position === 'right') {
    return position;
  }

  return 'left';
}

/**
 * @param {H5P.SingleChoiceSetCFRD} instance
 * @param {H5P.jQuery} $fallbackContainer
 */
function scheduleInstructionsAttach(instance, $fallbackContainer) {
  [0, 200, 500].forEach(function (delay) {
    setTimeout(function () {
      var instructions = getInstructionsOptions(instance);
      var $target = (instance.$playArea && instance.$playArea.length) ?
        instance.$playArea :
        ((instance.$container && instance.$container.length) ?
          instance.$container :
          $fallbackContainer);
      var attached;

      if (!instructions || !$target || !$target.length) {
        return;
      }

      if ($target.find('.h5p-instructions-root').length) {
        instance.trigger('resize');
        return;
      }

      if (H5P.Instructions && typeof H5P.Instructions.attach === 'function') {
        attached = H5P.Instructions.attach($target, instructions);

        if (attached) {
          instance.trigger('resize');
        }
      }
    }, delay);
  });
}

/**
 * Restore full button labels on the results slide after QuestionCFRD truncation.
 *
 * @param {H5P.SingleChoiceSetCFRD} instance
 */
function restoreResultSlideButtonLabels(instance) {
  var labels = {
    'try-again': instance.l10n.retryButtonLabel,
    'show-solution': instance.l10n.showSolutionButtonLabel
  };

  if (!instance.resultSlide || !instance.resultSlide.$buttonContainer) {
    return;
  }

  instance.resultSlide.$buttonContainer.find('.h5p-joubelui-button.truncated').each(function () {
    var $button = H5P.jQuery(this);
    var id;

    Object.keys(labels).some(function (buttonId) {
      if ($button.hasClass('h5p-question-' + buttonId)) {
        id = buttonId;
        return true;
      }
      return false;
    });

    if (id && labels[id]) {
      $button.html(labels[id]).removeClass('truncated').removeAttr('data-tooltip');
    }
  });
}

/**
 * @param {H5P.SingleChoiceSetCFRD} instance
 */
function scheduleDeferredResize(instance) {
  requestAnimationFrame(function () {
    instance.trigger('resize');

    requestAnimationFrame(function () {
      instance.trigger('resize');
    });
  });

  [50, 150, 350].forEach(function (delay) {
    setTimeout(function () {
      instance.trigger('resize');
    }, delay);
  });
}

/**
 * @param {H5P.SingleChoiceSetCFRD} instance
 */
function scheduleResultResize(instance) {
  requestAnimationFrame(function () {
    instance.trigger('resize');
    restoreResultSlideButtonLabels(instance);
  });
}

var PlayArea = H5P.SingleChoiceSetCFRD && H5P.SingleChoiceSetCFRD.PlayArea;
var AlternativeLabelModule = H5P.SingleChoiceSetCFRD && H5P.SingleChoiceSetCFRD.AlternativeLabel;

H5P.SingleChoiceSetCFRD = (function ($, UI, Question, SingleChoice, SolutionView, ResultSlide, SoundEffects, XApiEventBuilder, StopWatch, AlternativeLabel) {
  AlternativeLabel = AlternativeLabel || {
    prependLabel: function (prefix, text) {
      return prefix ? prefix + ' ' + text : text;
    }
  };
  /**
   * @constructor
   * @extends Question
   * @param {object} options Options for single choice set
   * @param {string} contentId H5P instance id
   * @param {Object} contentData H5P instance data
   */
  function SingleChoiceSet(options, contentId, contentData) {
    var self = this;

    // Extend defaults with provided options
    this.contentId = contentId;
    this.contentData = contentData;
    /**
     * The users input on the questions. Uses the same index as this.options.choices
     * @type {number[]}
     */
    this.userResponses = [];
    Question.call(this, 'single-choice-set');
    this.options = $.extend(true, {}, {
      choices: [],
      overallFeedback: [],
      alternativeLabels: {
        enabled: false,
        style: 'uppercase',
        separator: 'period'
      },
      behaviour: {
        autoContinue: true,
        timeoutCorrect: 300,
        timeoutWrong: 300,
        soundEffectsEnabled: false,
        enableRetry: true,
        enableSolutionsButton: false,
        enableShowSolutionButton: false,
        passPercentage: 100
      }
    }, options);
    if (contentData && contentData.previousState !== undefined) {
      this.currentIndex = contentData.previousState.progress;
      this.results = contentData.previousState.answers;
      this.userResponses = contentData.previousState.userResponses !== undefined
        ? contentData.previousState.userResponses
        : [];
    }
    this.currentIndex = this.currentIndex || 0;
    this.results = this.results || {
      corrects: 0,
      wrongs: 0
    };

    if (!this.options.behaviour.autoContinue) {
      this.options.behaviour.timeoutCorrect = 0;
      this.options.behaviour.timeoutWrong = 0;
    }

    /**
     * @property {StopWatch[]} Stop watches for tracking duration of slides
     */
    this.stopWatches = [];
    this.startStopWatch(this.currentIndex);

    this.muted = (this.options.behaviour.soundEffectsEnabled === false);

    this.l10n = H5P.jQuery.extend({
      correctText: 'Correct!',
      incorrectText: 'Incorrect!',
      shouldSelect: "Should have been selected",
      shouldNotSelect: "Should not have been selected",
      nextButtonLabel: 'Next question',
      showSolutionButtonLabel: 'Show solution',
      retryButtonLabel: 'Retry',
      closeButtonLabel: 'Close',
      solutionViewTitle: 'Solution',
      slideOfTotal: 'Slide :num of :total',
      muteButtonLabel: "Mute feedback sound",
      scoreBarLabel: 'You got :num out of :total points',
      solutionListQuestionNumber: 'Question :num',
      a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
      a11yRetry: 'Retry the task. Reset all responses and start the task over again.',
    }, options.l10n !== undefined ? options.l10n : {});

    this.playAreaSize = PlayArea.getDesignSize();

    this.$playArea = $('<div>', {
      'class': 'h5p-sc-play-area'
    });

    this.$container = $('<div>', {
      'class': 'h5p-sc-set-wrapper navigatable' + (!this.options.behaviour.autoContinue ? ' next-button-mode' : '')
    });

    this.$playArea.append(this.$container);

    this.$slides = [];
    // An array containing the SingleChoice instances
    this.choices = [];

    /**
     * Keeps track of buttons that will be hidden
     * @type {Array}
     */
    self.buttonsToBeHidden = [];

    /**
     * The solution dialog
     * @type {SolutionView}
     */
    this.solutionView = new SolutionView(contentId, this.options.choices, this.l10n, this.options.alternativeLabels);

    this.$choices = $('<div>', {
      'class': 'h5p-sc-set h5p-sc-animate'
    });

    // sometimes an empty object is in the choices
    this.options.choices = this.options.choices.filter(function (choice) {
      return choice !== undefined && !!choice.answers;
    });

    for (var i = 0; i < this.options.choices.length; i++) {
      var choice = new SingleChoice(
        this.options.choices[i],
        i,
        this.contentId,
        this.options.behaviour.autoContinue,
        this.options.alternativeLabels,
        isTruthy(this.options.behaviour.enableSolutionsButton)
      );
      choice.on('finished', this.handleQuestionFinished, this);
      choice.on('alternative-selected', this.handleAlternativeSelected, this);
      choice.appendTo(this.$choices, (i === this.currentIndex));
      this.choices.push(choice);
      this.$slides.push(choice.$choice);
    }

    this.resultSlide = new ResultSlide(this.options.choices.length);
    this.resultSlide.appendTo(this.$choices);
    this.resultSlide.on('retry', function() {
      self.resetTask(true);
    }, this);
    this.$slides.push(this.resultSlide.$resultSlide);
    this.on('resize', this.resize, this);

    // Use the correct starting slide
    this.recklessJump(this.currentIndex);

    if (this.options.choices.length === this.currentIndex) {
      // Make sure results slide is displayed
      this.resultSlide.$resultSlide.addClass('h5p-sc-current-slide');
      this.setScore(this.results.corrects, true);
    }

    if (!this.muted) {
      setTimeout(function () {
        SoundEffects.setup(self.getLibraryFilePath(''));
      }, 1);
    }

    /**
     * Override Question's hideButton function
     * to be able to hide buttons after delay
     *
     * @override
     * @param {string} id
     */
    this.superHideButton = self.hideButton;
    this.hideButton = (function () {
      return function (id) {

        if (!self.scoreTimeout) {
          return self.superHideButton(id);
        }

        self.buttonsToBeHidden.push(id);
        return this;
      };
    })();
  }

  SingleChoiceSet.prototype = Object.create(Question.prototype);
  SingleChoiceSet.prototype.constructor = SingleChoiceSet;

  /**
   * Set if a element is tabbable or not
   *
   * @param {jQuery} $element The element
   * @param {boolean} tabbable If element should be tabbable
   * @returns {jQuery} The element
   */
  SingleChoiceSet.prototype.setTabbable = function ($element, tabbable) {
    if ($element) {
      $element.attr('tabindex', tabbable ? 0 : -1);
    }
  };

  /**
   * Handle alternative selected, i.e play sound if sound effects are enabled
   *
   * @method handleAlternativeSelected
   * @param  {Object} event Event that was fired
   */
  SingleChoiceSet.prototype.handleAlternativeSelected = function (event) {
    var self = this;
    this.lastAnswerIsCorrect = event.data.correct;

    self.toggleNextButton(true);

    // Keep track of num correct/wrong answers
    this.results[this.lastAnswerIsCorrect ? 'corrects' : 'wrongs']++;

    self.triggerXAPI('interacted');

    // Read and set a11y friendly texts 
    self.readA11yFriendlyText(event.data.index, event.data.currentIndex)

    if (!this.muted) {
      // Can't play it after the transition end is received, since this is not
      // accepted on iPad. Therefore we are playing it here with a delay instead
      SoundEffects.play(this.lastAnswerIsCorrect ? 'positive-short' : 'negative-short', 700);
    }
  };

  /**
   * Handler invoked when question is done
   *
   * @param  {object} event An object containing a single boolean property: "correct".
   */
  SingleChoiceSet.prototype.handleQuestionFinished = function (event) {
    var self = this;

    var index = event.data.index;

    // saves user response
    var userResponse = self.userResponses[index] = event.data.answerIndex;

    // trigger answered event
    var duration = this.stopStopWatch(index);
    var xapiEvent = self.createXApiAnsweredEvent(self.options.choices[index], userResponse, duration);

    self.trigger(xapiEvent);

    self.continue(index);
  };

  /**
   * Setup auto continue
   */
  SingleChoiceSet.prototype.continue = function (index) {
    var self = this;

    self.choices[index].setA11yTextReadable();
    if (!self.options.behaviour.autoContinue) {
      // Set focus to next button
      self.$nextButton.focus();
      return;
    }

    var timeout;
    var letsMove = function () {
      // Handle impatient users
      self.$container.off('click.impatient keydown.impatient');
      clearTimeout(timeout);
      self.next();
    };

    timeout = setTimeout(function () {
      letsMove();
    }, self.lastAnswerIsCorrect ? self.options.behaviour.timeoutCorrect : self.options.behaviour.timeoutWrong);

    self.onImpatientUser(letsMove);
  };

  /**
   * Listen to impatience
   * @param  {Function} action Callback
   */
  SingleChoiceSet.prototype.onImpatientUser = function (action) {
    this.$container.off('click.impatient keydown.impatient');

    this.$container.one('click.impatient', action);
    this.$container.one('keydown.impatient', function (event) {
      // If return, space or right arrow
      if ([13,32,39].indexOf(event.which)) {
        action();
      }
    });
  };

  /**
   * Go to next slide
   */
  SingleChoiceSet.prototype.next = function () {
    this.move(this.currentIndex + 1);
  };

  /**
   * Creates an xAPI answered event
   *
   * @param {object} question
   * @param {number} userAnswer
   * @param {number} duration
   *
   * @return {H5P.XAPIEvent}
   */
  SingleChoiceSet.prototype.createXApiAnsweredEvent = function (question, userAnswer, duration) {
    var self = this;
    var types = XApiEventBuilder.interactionTypes;

    // creates the definition object
    var definition = XApiEventBuilder.createDefinition()
      .interactionType(types.CHOICE)
      .description(question.question)
      .correctResponsesPattern(self.getXApiCorrectResponsePattern())
      .optional( self.getXApiChoices(question.answers))
      .build();

    // create the result object
    var result = XApiEventBuilder.createResult()
      .response(userAnswer.toString())
      .duration(duration)
      .score((userAnswer === 0) ? 1 : 0, 1)
      .completion(true)
      .success(userAnswer === 0)
      .build();

    return XApiEventBuilder.create()
      .verb(XApiEventBuilder.verbs.ANSWERED)
      .objectDefinition(definition)
      .context(self.contentId, self.subContentId)
      .contentId(self.contentId, question.subContentId)
      .result(result)
      .build();
  };

  /**
   * Returns the 'correct response pattern' for xApi
   *
   * @return {string[]}
   */
  SingleChoiceSet.prototype.getXApiCorrectResponsePattern = function () {
    return [XApiEventBuilder.createCorrectResponsePattern([(0).toString()])]; // is always '0' for SCS
  };

  /**
   * Returns the choices array for xApi statements
   *
   * @param {String[]} answers
   *
   * @return {{ choices: []}}
   */
  SingleChoiceSet.prototype.getXApiChoices = function (answers) {
    var choices = answers.map(function (answer, index) {
      return XApiEventBuilder.createChoice(index.toString(), answer);
    });

    return {
      choices: choices
    };
  };

  /**
   * Handles buttons that are queued for hiding
   */
  SingleChoiceSet.prototype.handleQueuedButtonChanges = function () {
    var self = this;

    if (self.buttonsToBeHidden.length) {
      self.buttonsToBeHidden.forEach(function (id) {
        self.superHideButton(id);
      });
    }
    self.buttonsToBeHidden = [];
  };

  /**
   * Set score and feedback
   *
   * @params {Number} score Number of correct answers
   */
  SingleChoiceSet.prototype.setScore = function (score, noXAPI) {
    var self = this;
    var maxScore = self.options.choices.length;
    var scoreRatio = maxScore ? score / maxScore : 0;
    var resolved;
    var feedbackText;

    if (!self.choices.length) {
      return;
    }

    resolved = Question.resolveOverallFeedback(
      self.options.overallFeedback,
      scoreRatio,
      self.contentId,
      score,
      maxScore
    );

    if (resolved && resolved.html && resolved.html.trim().length > 0) {
      feedbackText = resolved.html
        .replace(':numcorrect', String(score))
        .replace(':maxscore', String(maxScore));
    }
    else {
      feedbackText = Question.determineOverallFeedback(
        self.options.overallFeedback,
        scoreRatio
      )
        .replace(':numcorrect', score)
        .replace(':maxscore', maxScore.toString());
    }

    // Inline en la diapositiva de resultados (patrón upstream), sin popup.
    self.setFeedback(feedbackText, score, maxScore, self.l10n.scoreBarLabel);

    if (score === self.options.choices.length) {
      self.hideButton('try-again');
      self.hideButton('show-solution');
    }
    else {
      self.showButton('try-again');
      if (isTruthy(self.options.behaviour.enableShowSolutionButton)) {
        self.showButton('show-solution');
      }
      else {
        self.hideButton('show-solution');
      }
    }
    self.handleQueuedButtonChanges();
    self.scoreTimeout = undefined;

    if (!noXAPI) {
      self.triggerXAPIScored(score, self.options.choices.length, 'completed', true, (100 * score / self.options.choices.length) >= self.options.behaviour.passPercentage);
    }

    scheduleResultResize(self);
  };

  /**
   * Opens the solution view overlay on the results slide.
   */
  SingleChoiceSet.prototype.openSolutionView = function () {
    var self = this;

    var $tryAgainButton = $('.h5p-question-try-again', self.$container);
    var $showSolutionButton = $('.h5p-question-show-solution', self.$container);
    var buttons = [self.$muteButton, $tryAgainButton, $showSolutionButton];

    buttons.forEach(function (button) {
      self.setTabbable(button, false);
    });

    self.solutionView.on('hide', function () {
      buttons.forEach(function (button) {
        self.setTabbable(button, true);
      });
      self.toggleAriaVisibility(true);
      self.focusButton();
    });

    self.solutionView.setCloseOnRight(getInstructionsTabPosition(self.options) === 'left');

    self.solutionView.show();
    self.toggleAriaVisibility(false);
  };

  /**
   * Handler invoked when view solution is selected
   * @deprecated Use openSolutionView
   */
  SingleChoiceSet.prototype.handleViewSolution = function () {
    this.openSolutionView();
  };

  /**
   * Toggle elements visibility to Assistive Technologies
   *
   * @param {boolean} enable Make elements visible
   */
  SingleChoiceSet.prototype.toggleAriaVisibility = function (enable) {
    var self = this;
    var ariaHidden = enable ? '' : 'true';
    if (self.$muteButton) {
      self.$muteButton.attr('aria-hidden', ariaHidden);
    }
    self.$choices.attr('aria-hidden', ariaHidden);
  };

  /**
   * Register DOM elements before they are attached.
   * Called from H5P.QuestionCFRD.
   */
  SingleChoiceSet.prototype.registerDomElements = function () {
    var self = this;

    // Register task content area.
    this.setContent(this.createQuestion());

    // Register buttons with question.
    this.addButtons();

    // Insert feedback and buttons section on the result slide
    this.insertSectionAtElement('feedback', this.resultSlide.$feedbackContainer);
    this.insertSectionAtElement('scorebar', this.resultSlide.$feedbackContainer);
    this.insertSectionAtElement('buttons', this.resultSlide.$buttonContainer);

    // Question is finished
    if (this.options.choices.length === this.currentIndex) {
      this.trigger('question-finished');
    }

    scheduleInstructionsAttach(self, self.$playArea);
    self.observePlayAreaResize();
    scheduleDeferredResize(self);
  };

  /**
   * Add Buttons to question.
   */
  SingleChoiceSet.prototype.addButtons = function () {
    var self = this;

    if (this.options.behaviour.enableRetry) {
      this.addButton('try-again', this.l10n.retryButtonLabel, function () {
        self.resetTask(true);
      }, self.results.corrects !== self.options.choices.length, {
        'aria-label': this.l10n.a11yRetry,
      });
    }

    if (isTruthy(this.options.behaviour.enableShowSolutionButton)) {
      this.addButton('show-solution', this.l10n.showSolutionButtonLabel, function () {
        self.showSolutions();
      }, self.results.corrects !== self.options.choices.length, {
        'aria-label': this.l10n.a11yShowSolution,
      });
    }
  };

  /**
   * Create main content
   */
  SingleChoiceSet.prototype.createQuestion = function () {
    var self = this;

    self.$container.append(self.$choices);

    function toggleMute(event) {
      var $button = $(event.target);
      event.preventDefault();
      self.muted = !self.muted;
      $button.attr('aria-pressed', self.muted);
    }

    // Keep this out of H5P.QuestionCFRD, since we are moving the button & feedback
    // region to the last slide
    if (!this.options.behaviour.autoContinue) {

      var handleNextClick = function () {
        if (self.$nextButton.attr('aria-disabled') !== 'true') {
          self.next();
        }
      };

      self.$nextButton = UI.createButton({
        'class': 'h5p-ssc-next-button',
        'aria-label': self.l10n.nextButtonLabel,
        click: handleNextClick,
        keydown: function (event) {
          switch (event.which) {
            case 13: // Enter
            case 32: // Space
              handleNextClick();
              event.preventDefault();
          }
        },
        appendTo: self.$container
      });
      self.toggleNextButton(false);
    }

    if (self.options.behaviour.soundEffectsEnabled) {
      self.$muteButton = $('<div>', {
        'class': 'h5p-sc-sound-control',
        'tabindex': 0,
        'role': 'button',
        'aria-label': self.l10n.muteButtonLabel,
        'aria-pressed': false,
        'on': {
          'keydown': function (event) {
            switch (event.which) {
              case 13: // Enter
              case 32: // Space
                toggleMute(event);
                break;
            }
          }
        },
        'click': toggleMute
      });
      self.syncMuteButtonPlacement();
    }

    // Append solution view - hidden by default:
    self.solutionView.appendTo(self.$container);

    self.$container.addClass('initialized');
    scheduleDeferredResize(self);

    return self.$playArea;
  };

  /**
   * Observe play area size changes for layout refresh.
   */
  SingleChoiceSet.prototype.observePlayAreaResize = function () {
    var self = this;

    if (!window.ResizeObserver || !self.$playArea || !self.$playArea.length) {
      return;
    }

    if (self.playAreaResizeObserver) {
      return;
    }

    self.playAreaResizeObserver = new ResizeObserver(function () {
      self.trigger('resize');
    });

    self.playAreaResizeObserver.observe(self.$playArea[0]);
  };

  /**
   * Keep mute control on the current question slide.
   */
  SingleChoiceSet.prototype.syncMuteButtonPlacement = function () {
    var self = this;
    var choice = self.choices[self.currentIndex];

    if (!self.$muteButton || !choice || !choice.$choice || self.currentIndex >= self.choices.length) {
      return;
    }

    choice.$choice.find('.h5p-question-introduction').first().append(self.$muteButton);
  };

  /**
   * Play-area layout: one visible slide at a time (no horizontal carousel transform).
   */
  SingleChoiceSet.prototype.syncPlayAreaSlides = function () {
    var self = this;

    if (!self.$playArea || !self.$playArea.length) {
      return;
    }

    self.$slides.forEach(function ($slide) {
      $slide.css('left', '0');
    });

    self.$choices.css({
      '-webkit-transform': '',
      '-moz-transform': '',
      '-ms-transform': '',
      'transform': ''
    });
  };

  /**
   * @param {H5P.jQuery} $wrapper
   * @param {H5P.jQuery} $choices
   * @returns {number}
   */
  SingleChoiceSet.prototype.getCarouselChromeHeight = function ($wrapper, $choices) {
    var chromeHeight = 0;

    $wrapper.children().each(function () {
      if (this !== $choices[0]) {
        chromeHeight += $(this).outerHeight(true);
      }
    });

    return chromeHeight;
  };

  /**
   * @param {H5P.jQuery} $slide
   * @returns {number}
   */
  SingleChoiceSet.prototype.measureNaturalSlideHeight = function ($slide) {
    if (!$slide || !$slide.length || !$slide.is(':visible')) {
      return 0;
    }

    if ($slide.hasClass('h5p-sc-has-context')) {
      var $questionColumn = $slide.find('.h5p-sc-question-column').first();
      if ($questionColumn.length) {
        $slide = $questionColumn;
      }
    }

    var $intro = $slide.find('.h5p-question-introduction').first();
    if (!$intro.length) {
      $intro = $slide.find('.h5p-sc-question').first();
    }
    var $alternatives = $slide.find('ul.h5p-sc-alternatives').first();
    var height = 0;

    if ($intro.length) {
      height += $intro.outerHeight(true);
    }

    if ($alternatives.length) {
      height += $alternatives.outerHeight(true);
    }

    if (height > 0) {
      return height;
    }

    return $slide[0].scrollHeight;
  };

  /**
   * Equalize slide heights inside the carousel.
   */
  SingleChoiceSet.prototype.syncSlideHeights = function () {
    var self = this;
    var $wrapper = self.$container;
    var wrapperHeight = $wrapper.innerHeight() || 0;

    if (wrapperHeight <= 0) {
      scheduleDeferredResize(self);
      return;
    }

    var $currentSlide = self.$slides[self.currentIndex];
    var onResultSlide = $currentSlide && $currentSlide.hasClass('h5p-sc-set-results');

    if (onResultSlide) {
      self.$choices.removeClass('h5p-sc-set--scroll');
      self.$choices.scrollTop(0);
      self.syncPlayAreaSlides();
      self.syncMuteButtonPlacement();
      return;
    }

    var chromeHeight = self.getCarouselChromeHeight($wrapper, self.$choices);
    var availableHeight = Math.max(0, wrapperHeight - chromeHeight);
    var $current = self.$slides[self.currentIndex];
    var maxNaturalHeight = self.measureNaturalSlideHeight($current);
    var overflow = availableHeight > 0 && maxNaturalHeight > availableHeight + 1;

    if (overflow) {
      self.$choices.addClass('h5p-sc-set--scroll');
      self.$choices.scrollTop(0);
    }
    else {
      self.$choices.removeClass('h5p-sc-set--scroll');
      self.$choices.scrollTop(0);
    }

    self.syncPlayAreaSlides();
    self.syncMuteButtonPlacement();
  };

  /**
   * Refresh instructions scale when available.
   */
  SingleChoiceSet.prototype.refreshInstructionsScale = function () {
    var self = this;
    var instructions = getInstructionsOptions(self);

    if (!instructions || !self.$playArea || !self.$playArea.length) {
      return;
    }

    if (H5P.Instructions && typeof H5P.Instructions.updateScale === 'function') {
      H5P.Instructions.updateScale(self.$playArea, instructions);
    }
  };

  /**
   * Resize if something outside resizes
   */
  SingleChoiceSet.prototype.resize = function () {
    var self = this;

    if (!self.$playArea || !self.$playArea.length) {
      return;
    }

    if (!self.$playArea.is(':visible')) {
      scheduleDeferredResize(self);
      return;
    }

    var design = self.playAreaSize;
    var $parent = self.$playArea.parent();
    var width = self.$playArea.width();

    if (width <= 0) {
      width = $parent.width() || design.baseWidth;
    }

    var scale = PlayArea.getScale(width);
    var fontSize = (design.baseFontSize * scale) + 'px';

    self.$playArea.css({
      fontSize: fontSize,
      '--sc-scale': scale.toFixed(4),
      width: '100%',
      height: ''
    });

    self.refreshInstructionsScale();
    self.syncSlideHeights();
  };

  /**
   * Disable/enable the next button
   * @param  {boolean} enable
   */
  SingleChoiceSet.prototype.toggleNextButton = function (enable) {
    if (this.$nextButton) {
      this.$nextButton.attr('aria-disabled', !enable);
    }
  };

  /**
   * Will jump to the given slide without any though to animations,
   * current slide etc.
   *
   * @public
   */
  SingleChoiceSet.prototype.recklessJump = function (index) {
    this.syncPlayAreaSlides();
  };

  /**
   * Move to slide n
   * @param  {number} index The slide number    to move to
   * @param {boolean} moveFocus True to set focus on first alternative
   */
  SingleChoiceSet.prototype.move = function (index, moveFocus = true) {
    var self = this;
    if (index === this.currentIndex || index > self.$slides.length-1) {
      return;
    }

    var $previousSlide = self.$slides[self.currentIndex];
    var $currentChoice = self.choices[index];
    var $currentSlide = self.$slides[index];
    var isResultSlide = (index >= self.choices.length);

    self.toggleNextButton(false);

    if (isResultSlide) {
      self.setScore(self.results.corrects);
    }

    self.$container.toggleClass('navigatable', !isResultSlide);

    this.startStopWatch(index);

    $previousSlide.removeClass('h5p-sc-current-slide');
    $currentSlide.addClass('h5p-sc-current-slide');
    self.recklessJump(index);
    self.$choices.scrollTop(0);

    self.currentIndex = index;
    self.trigger('resize');

    requestAnimationFrame(function () {
      if (!isResultSlide && (moveFocus || self.isRoot())) {
        $currentChoice.focusOnAlternative(0);
      }
      else if (isResultSlide) {
        self.resultSlide.focusScore();
      }

      if (isResultSlide) {
        scheduleResultResize(self);
      }
      else {
        scheduleDeferredResize(self);
      }
    });
  };

  /**
   * Starts a stopwatch for indexed slide
   *
   * @param {number} index
   */
  SingleChoiceSet.prototype.startStopWatch = function (index) {
    this.stopWatches[index] = this.stopWatches[index] || new StopWatch();
    this.stopWatches[index].start();
  };

  /**
   * Stops a stopwatch for indexed slide
   *
   * @param {number} index
   */
  SingleChoiceSet.prototype.stopStopWatch = function (index) {
    if (this.stopWatches[index]) {
      this.stopWatches[index].stop();
    }
  };

  /**
   * Returns the passed time in seconds of a stopwatch on an indexed slide,
   * or 0 if not existing
   *
   * @param {number} index
   * @return {number}
   */
  SingleChoiceSet.prototype.timePassedInStopWatch = function (index) {
    if (this.stopWatches[index] !== undefined) {
      return this.stopWatches[index].passedTime();
    }
    else {
      // if not created, return no passed time,
      return 0;
    }
  };

  /**
   * Returns the time the user has spent on all questions so far
   *
   * @return {number}
   */
  SingleChoiceSet.prototype.getTotalPassedTime = function () {
    return this.stopWatches
      .filter(function (watch) {
        return watch != undefined;
      })
      .reduce(function (sum, watch) {
        return sum + watch.passedTime();
      }, 0);
  };

  /**
   * The following functions implements the CP and IV - Contracts v 1.0 documented here:
   * http://h5p.org/node/1009
   */
  SingleChoiceSet.prototype.getScore = function () {
    return this.results.corrects;
  };

  SingleChoiceSet.prototype.getMaxScore = function () {
    return this.options.choices.length;
  };

  SingleChoiceSet.prototype.getAnswerGiven = function () {
    return (this.results.corrects + this.results.wrongs) > 0;
  };

  SingleChoiceSet.prototype.getTitle = function () {
    return H5P.createTitle((this.contentData && this.contentData.metadata && this.contentData.metadata.title) ? this.contentData.metadata.title : 'Single Choice Set');
  };

  /**
   * Retrieves the xAPI data necessary for generating result reports.
   *
   * @return {object}
   */
  SingleChoiceSet.prototype.getXAPIData = function () {
    var self = this;

    // create array with userAnswer
    var children =  self.options.choices.map(function (question, index) {
      var userResponse = self.userResponses[index] >= 0 ? self.userResponses[index] : '';
      var duration = self.timePassedInStopWatch(index);
      var event = self.createXApiAnsweredEvent(question, userResponse, duration);

      return {
        statement: event.data.statement
      };
    });

    var result = XApiEventBuilder.createResult()
      .score(self.getScore(), self.getMaxScore())
      .duration(self.getTotalPassedTime())
      .build();

    // creates the definition object
    var definition = XApiEventBuilder.createDefinition()
      .interactionType(XApiEventBuilder.interactionTypes.COMPOUND)
      .build();

    var xAPIEvent = XApiEventBuilder.create()
      .verb(XApiEventBuilder.verbs.ANSWERED)
      .contentId(self.contentId, self.subContentId)
      .context(self.getParentAttribute('contentId'), self.getParentAttribute('subContentId'))
      .objectDefinition(definition)
      .result(result)
      .build();

    return {
      statement: xAPIEvent.data.statement,
      children: children
    };
  };

  /**
   * Returns an attribute from this.parent if it exists
   *
   * @param {string} attributeName
   * @return {*|undefined}
   */
  SingleChoiceSet.prototype.getParentAttribute = function (attributeName) {
    var self = this;

    if (self.parent !== undefined) {
      return self.parent[attributeName];
    }
  };

  SingleChoiceSet.prototype.showSolutions = function () {
    this.openSolutionView();
  };

  /**
   * Reset all answers. This is equal to refreshing the quiz
   * @param {boolean} moveFocus True to move the focus
   * This prevents loss of focus if reset from within content
   */
  SingleChoiceSet.prototype.resetTask = function (moveFocus = false) {
    var self = this;

    // Close solution view if visible:
    this.solutionView.hide();

    // Reset the user's answers
    var classes = ['h5p-sc-reveal-wrong', 'h5p-sc-reveal-correct', 'h5p-sc-selected', 'h5p-sc-drummed', 'h5p-sc-correct-answer'];
    for (var i = 0; i < classes.length; i++) {
      this.$choices.find('.' + classes[i]).removeClass(classes[i]);
    }
    this.results = {
      corrects: 0,
      wrongs: 0
    };

    this.choices.forEach(function (choice) {
      choice.setAnswered(false);
      choice.resetA11yText();
      choice.resetAriaAttributes();
    });

    this.stopWatches.forEach(function (stopWatch) {
      if (stopWatch) {
        stopWatch.reset();
      }
    });

    this.move(0, moveFocus);

    // Reset userResponses as well
    this.userResponses = [];

    self.removeFeedback();
    scheduleDeferredResize(self);
  };

  /**
   * Clever comment.
   *
   * @public
   * @returns {object}
   */
  SingleChoiceSet.prototype.getCurrentState = function () {
    return this.userResponses.length > 0
      ? {
        progress: this.currentIndex,
        answers: this.results,
        userResponses: this.userResponses
      }
      : undefined;
  };

  /**
   * Generate A11y friendly text
   * 
   * @param  {number} index
   * @param  {number} currentIndex 
   */
  SingleChoiceSet.prototype.readA11yFriendlyText = function (index, currentIndex) {
    var self = this;
    var showCorrectAnswerWhenWrong = isTruthy(self.options.behaviour.enableSolutionsButton);
    var $currentSlide = self.$choices.find('.h5p-sc-current-slide');
    var $selected = $currentSlide.find('.h5p-sc-alternative').eq(currentIndex);
    var prefix = $selected.find('.h5p-sc-alternative-prefix').text();
    var selectedText = $selected.find('.h5p-sc-label').text().replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
    var labeledSelectedText = AlternativeLabel.prependLabel(prefix, selectedText);
    var $correctAlternative = $currentSlide.find('.h5p-sc-is-correct');
    var correctPrefix = $correctAlternative.find('.h5p-sc-alternative-prefix').text();
    var correctText = $correctAlternative.find('.h5p-sc-label').text().replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
    var labeledCorrectText = AlternativeLabel.prependLabel(correctPrefix, correctText);
    var selectedOptionText = this.lastAnswerIsCorrect ? self.l10n.correctText : self.l10n.incorrectText;

    selectedOptionText = this.lastAnswerIsCorrect ?
      self.l10n.correctText + self.l10n.shouldSelect :
      self.l10n.incorrectText + self.l10n.shouldNotSelect;

    if (this.lastAnswerIsCorrect || showCorrectAnswerWhenWrong) {
      self.$choices.find('.h5p-sc-current-slide .h5p-sc-is-correct .h5p-sc-a11y').text(self.l10n.shouldSelect);
    }

    self.$choices.find('.h5p-sc-current-slide .h5p-sc-is-wrong .h5p-sc-a11y').text(self.l10n.shouldNotSelect);
    self.$choices.find('.h5p-sc-current-slide .h5p-sc-alternative').eq(currentIndex).find('.h5p-sc-a11y').text(selectedOptionText);

    if (this.lastAnswerIsCorrect) {
      selectedOptionText = self.l10n.correctText + ' ' + labeledSelectedText;
    }
    else if (showCorrectAnswerWhenWrong) {
      selectedOptionText = self.l10n.incorrectText + ' ' + labeledSelectedText + '. ' +
        labeledCorrectText + '. ' + self.l10n.shouldSelect;
    }
    else {
      selectedOptionText = self.l10n.incorrectText + ' ' + labeledSelectedText;
    }

    self.read(selectedOptionText);
  };

  return SingleChoiceSet;
})(H5P.jQuery, H5P.JoubelUICFRD, H5P.QuestionCFRD, H5P.SingleChoiceSetCFRD.SingleChoice, H5P.SingleChoiceSetCFRD.SolutionView, H5P.SingleChoiceSetCFRD.ResultSlide, H5P.SingleChoiceSetCFRD.SoundEffects, H5P.SingleChoiceSetCFRD.XApiEventBuilder, H5P.SingleChoiceSetCFRD.StopWatch, AlternativeLabelModule);
