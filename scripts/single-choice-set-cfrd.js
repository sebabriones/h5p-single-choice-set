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
    animation: H5P.jQuery.extend(true, {}, instructions.animation || {}),
    startCollapsed: instructions.startCollapsed === undefined ?
      true :
      isTruthy(instructions.startCollapsed)
  };
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
 * Lightweight layout pass for the result slide (DOM already prepared).
 *
 * @param {H5P.SingleChoiceSetCFRD} instance
 */
function scheduleResultResize(instance) {
  requestAnimationFrame(function () {
    instance.trigger('resize');
  });
}

/**
 * @param {H5P.SingleChoiceSetCFRD} instance
 * @returns {object}
 */
function getResultSlideParams(instance) {
  return {
    l10n: instance.l10n,
    questions: instance.choices,
    userResponses: instance.userResponses,
    totalScore: instance.results.corrects,
    showCorrectAnswerWhenWrong: isTruthy(instance.options.behaviour.enableSolutionsButton),
  };
}

/**
 * @param {H5P.jQuery} $slide
 */
function triggerSlideEnterAnimation($slide) {
  if (!$slide || !$slide.length) {
    return;
  }

  $slide.removeClass('h5p-sc-slide-enter');

  // Reflow so the enter animation runs after display toggling.
  void $slide[0].offsetWidth;

  $slide.addClass('h5p-sc-slide-enter');
  $slide.one('animationend', function () {
    $slide.removeClass('h5p-sc-slide-enter');
  });
}

var PlayArea = H5P.SingleChoiceSetCFRD && H5P.SingleChoiceSetCFRD.PlayArea;
var AlternativeLabel = H5P.SingleChoiceSetCFRD && H5P.SingleChoiceSetCFRD.AlternativeLabel;

H5P.SingleChoiceSetCFRD = (function ($, UI, Question, SingleChoice, ResultSlide, SoundEffects, XApiEventBuilder, StopWatch, AlternativeLabelModule) {
  AlternativeLabelModule = AlternativeLabelModule || {
    prependLabel: function (prefix, text) {
      return prefix ? prefix + ' ' + text : text;
    },
  };
  /**
   * @constructor
   * @extends Question
   * @param {object} options Options for single choice set
   * @param {string} contentId H5P instance id
   * @param {Object} contentData H5P instance data
   */
  function SingleChoiceSet(options, contentId, contentData) {
    const self = this;

    // Extend defaults with provided options
    this.contentId = contentId;
    this.contentData = contentData;
    /**
     * The users input on the questions. Uses the same index as this.options.choices
     * @type {number[]}
     */
    this.userResponses = [];
    this.userAnswerIndex = [];
    Question.call(this, 'single-choice-set', { theme: true });
    this.options = $.extend(true, {}, {
      choices: [],
      overallFeedback: [],
      alternativeLabels: {
        enabled: false,
        style: 'uppercase',
        separator: 'period',
      },
      behaviour: {
        autoContinue: true,
        timeoutCorrect: 2000,
        timeoutWrong: 3000,
        soundEffectsEnabled: false,
        enableRetry: true,
        enableSolutionsButton: false,
        passPercentage: 100,
      },
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
      wrongs: 0,
    };

    if (!this.options.behaviour.autoContinue) {
      this.options.behaviour.timeoutCorrect = 0;
      this.options.behaviour.timeoutWrong = 0;
    }

    this.playAreaSize = PlayArea.getDesignSize();

    /**
     * @property {StopWatch[]} Stop watches for tracking duration of slides
     */
    this.stopWatches = [];
    this.startStopWatch(this.currentIndex);

    this.muted = (this.options.behaviour.soundEffectsEnabled === false);

    this.l10n = H5P.jQuery.extend({
      correctText: 'Correct!',
      incorrectText: 'Incorrect!',
      shouldSelect: 'Should have been selected',
      shouldNotSelect: 'Should not have been selected',
      nextButtonLabel: 'Next question',
      nextButton: 'Next',
      showResultsButtonLabel: 'Show results',
      retryButtonLabel: 'Retry',
      closeButtonLabel: 'Close',
      solutionViewTitle: 'Solution',
      slideOfTotal: 'Slide :num of :total',
      muteButtonLabel: 'Mute feedback sound',
      scoreBarLabel: 'You got :num out of :total points',
      solutionListQuestionNumber: 'Question :num',
      a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
      a11yRetry: 'Retry the task. Reset all responses and start the task over again.',
      resultHeader: 'Your result:',
      totalScore: ':score of :maxScore correct',
      resultTableHeader: 'Question',
      resultScoreTableHeader: 'Score',
      correctAnswerIntroduction: 'Correct answer',
    }, options.l10n !== undefined ? options.l10n : {});

    this.$playArea = $('<div>', {
      class: 'h5p-sc-play-area',
    });

    this.$container = $('<div>', {
      class: 'h5p-sc-set-wrapper navigatable',
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

    this.$choices = $('<div>', {
      class: 'h5p-sc-set h5p-sc-animate',
    });

    // sometimes an empty object is in the choices
    this.options.choices = this.options.choices.filter((choice) => choice !== undefined && !!choice.answers);

    const numQuestions = this.options.choices.length;

    // Create progressbar
    self.progressbar = UI.createProgressbar(numQuestions + 1, {
      progressText: this.l10n.slideOfTotal,
    });
    self.progressbar.setProgress(this.currentIndex);

    for (let i = 0; i < this.options.choices.length; i++) {
      const choice = new SingleChoice(
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
    this.resultSlide.on('retry', () => {
      self.resetTask(true);
    }, this);
    this.$slides.push(this.resultSlide.$resultSlide);

    requestAnimationFrame(function () {
      self.resultSlide.warmUp(getResultSlideParams(self));
    });

    this.on('resize', this.resize, this);

    // Use the correct starting slide
    this.recklessJump(this.currentIndex);

    if (this.options.choices.length === this.currentIndex) {
      // Make sure results slide is displayed
      this.resultSlide.$resultSlide.addClass('h5p-sc-current-slide');
      self.$container.toggleClass('navigatable', false);
      this.setScore(this.results.corrects, true);
    }

    if (!this.muted) {
      setTimeout(() => {
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
    }());
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
    const self = this;
    this.lastAnswerIsCorrect = event.data.correct;

    self.toggleNextButton(true);

    // Keep track of num correct/wrong answers
    this.results[this.lastAnswerIsCorrect ? 'corrects' : 'wrongs']++;

    // saves user response
    self.userResponses[event.data.index] = event.data.currentIndex;
    self.userAnswerIndex[event.data.index] = event.data.answerIndex;

    self.triggerXAPI('interacted');

    // Read and set a11y friendly texts
    self.readA11yFriendlyText(event.data.index, event.data.currentIndex);

    if (!this.muted) {
      // Can't play it after the transition end is received, since this is not
      // accepted on iPad. Therefore we are playing it here with a delay instead
      SoundEffects.play(this.lastAnswerIsCorrect ? 'positive-short' : 'negative-short', 700);
    }

    if (event.data.index + 1 >= self.choices.length) {
      self.nav?.setCanShowLast(true);
      self.resultSlide.refreshContent(getResultSlideParams(self));
    }
  };

  /**
   * Handler invoked when question is done
   *
   * @param  {object} event An object containing a single boolean property: "correct".
   */
  SingleChoiceSet.prototype.handleQuestionFinished = function (event) {
    const self = this;

    const { index } = event.data;

    // trigger answered event
    const duration = this.stopStopWatch(index);
    const xapiEvent = self.createXApiAnsweredEvent(self.options.choices[index], self.userResponses[index], duration);

    self.trigger(xapiEvent);

    self.continue(index);
  };

  /**
   * Setup auto continue
   */
  SingleChoiceSet.prototype.continue = function (index) {
    const self = this;

    self.choices[index].setA11yTextReadable();
    if (!self.options.behaviour.autoContinue) {
      // Set focus to next button
      self.$nextButton.focus();
      return;
    }

    let timeout;
    const letsMove = function () {
      // Handle impatient users
      self.$container.off('click.impatient keydown.impatient');
      clearTimeout(timeout);
      self.next();
    };

    timeout = setTimeout(() => {
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
    this.$container.one('keydown.impatient', (event) => {
      // If return, space or right arrow
      if ([13, 32, 39].indexOf(event.which)) {
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
    const self = this;
    const types = XApiEventBuilder.interactionTypes;

    // creates the definition object
    const definition = XApiEventBuilder.createDefinition()
      .interactionType(types.CHOICE)
      .description(question.question)
      .correctResponsesPattern(self.getXApiCorrectResponsePattern())
      .optional(self.getXApiChoices(question.answers))
      .build();

    // create the result object
    const result = XApiEventBuilder.createResult()
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
    const choices = answers.map((answer, index) => XApiEventBuilder.createChoice(index.toString(), answer));

    return {
      choices,
    };
  };

  /**
   * Handles buttons that are queued for hiding
   */
  SingleChoiceSet.prototype.handleQueuedButtonChanges = function () {
    const self = this;

    if (self.buttonsToBeHidden.length) {
      self.buttonsToBeHidden.forEach((id) => {
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
    const self = this;

    if (!self.choices.length) {
      return;
    }

    if (score === self.options.choices.length) {
      self.hideButton('try-again');
    }
    else {
      self.showButton('try-again');
    }
    self.handleQueuedButtonChanges();
    self.scoreTimeout = undefined;

    this.$container.addClass('showing-results');
    this.showingResultScreen = true;
    this.resultSlide.showSlide(getResultSlideParams(this));

    if (!noXAPI) {
      self.triggerXAPIScored(score, self.options.choices.length, 'completed', true, (100 * score / self.options.choices.length) >= self.options.behaviour.passPercentage);
    }

    scheduleResultResize(self);
  };

  /**
   * Toggle elements visibility to Assistive Technologies
   *
   * @param {boolean} enable Make elements visible
   */
  SingleChoiceSet.prototype.toggleAriaVisibility = function (enable) {
    const self = this;
    const ariaHidden = enable ? '' : 'true';
    if (self.$muteButton) {
      self.$muteButton.attr('aria-hidden', ariaHidden);
    }
    self.progressbar.$progressbar.attr('aria-hidden', ariaHidden);
    self.$choices.attr('aria-hidden', ariaHidden);
  };

  /**
   * Register DOM elements before they are attached.
   * Called from H5P.Question.
   */
  SingleChoiceSet.prototype.registerDomElements = function () {
    const self = this;
    // Register task content area.
    this.setContent(this.createQuestion());

    // Register buttons with question.
    this.addButtons();

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
    const self = this;

    if (this.options.behaviour.enableRetry) {
      this.addButton(
        'try-again',
        this.l10n.retryButtonLabel,
        () => {
          self.resetTask(true);
        },
        self.results.corrects !== self.options.choices.length,
        {
          'aria-label': this.l10n.a11yRetry,
        },
        {
          styleType: 'secondary',
          icon: 'retry',
        },
      );
    }
  };

  /**
   * Create main content
   */
  SingleChoiceSet.prototype.createQuestion = function () {
    const self = this;

    self.$container.append(self.$choices);

    function updateMuteButton() {
      if (self.$muteButton) {
        self.$muteButton.attr('aria-pressed', self.muted);
      }
    }

    function toggleMute(event) {
      const $button = $(event.target);
      event.preventDefault();
      self.muted = !self.muted;
      updateMuteButton();
    }

    // Keep this out of H5P.Question, since we are moving the button
    // region to the last slide
    if (!this.options.behaviour.autoContinue) {
      const handleNextClick = function () {
        if (self.$nextButton.attr('aria-disabled') !== 'true') {
          self.next();
          return true;
        }
        return false;
      };

      const nav = H5P.Components.Navigation({
        variant: '2-split-next',
        progressType: 'bar',
        handleNext: handleNextClick,
        handleLast: () => {
          self.move(self.currentIndex + 1);
        },
        index: this.currentIndex,
        navigationLength: this.choices.length,
        texts: {
          nextButton: this.l10n.nextButton,
          nextButtonAria: this.l10n.nextButtonLabel,
          tooltip: this.l10n.nextButtonLabel,
          lastButton: this.l10n.showResultsButtonLabel,
        },
      });
      self.$container[0].appendChild(nav);
      self.$nextButton = $(nav.querySelector('.h5p-theme-next'));
      self.lastButton = nav.querySelector('.h5p-show-results');

      self.toggleNextButton(false);
      self.nav = nav;
    }

    if (self.options.behaviour.soundEffectsEnabled) {
      self.$muteButton = $('<div>', {
        class: 'h5p-sc-sound-control',
        tabindex: 0,
        role: 'button',
        'aria-label': self.l10n.muteButtonLabel,
        'aria-pressed': false,
      }).appendTo(self.choices[self.currentIndex].$choice.find('.h5p-question-introduction').first());
      self.$muteButton.on('click', toggleMute);
      self.$muteButton.on('keydown', (event) => {
        switch (event.which) {
          case 13: // Enter
          case 32: // Space
            toggleMute(event);
            break;
        }
      });
    }

    self.$container.addClass('initialized');
    scheduleDeferredResize(self);

    return self.$playArea;
  };

  /**
   * Observe play area size changes for layout refresh.
   */
  SingleChoiceSet.prototype.observePlayAreaResize = function () {
    const self = this;

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
    const self = this;
    const choice = self.choices[self.currentIndex];

    if (!self.$muteButton || !choice || !choice.$choice || self.currentIndex >= self.choices.length) {
      return;
    }

    choice.$choice.find('.h5p-question-introduction').first().append(self.$muteButton);
  };

  /**
   * Play-area layout: one visible slide at a time (no horizontal carousel transform).
   */
  SingleChoiceSet.prototype.syncPlayAreaSlides = function () {
    const self = this;

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
      transform: '',
    });
  };

  /**
   * Height of wrapper children excluding the carousel (e.g. navigation).
   *
   * @param {H5P.jQuery} $wrapper
   * @param {H5P.jQuery} $choices
   * @returns {number}
   */
  SingleChoiceSet.prototype.getCarouselChromeHeight = function ($wrapper, $choices) {
    let chromeHeight = 0;

    $wrapper.children().each(function () {
      if (this !== $choices[0]) {
        chromeHeight += $(this).outerHeight(true);
      }
    });

    return chromeHeight;
  };

  /**
   * Natural content height of a slide in the play area.
   *
   * @param {H5P.jQuery} $slide
   * @returns {number}
   */
  SingleChoiceSet.prototype.measureNaturalSlideHeight = function ($slide) {
    if (!$slide || !$slide.length || !$slide.is(':visible')) {
      return 0;
    }

    const $intro = $slide.find('.h5p-question-introduction').first();
    const $alternatives = $slide.find('ul.h5p-sc-alternatives').first();
    let height = 0;

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
    const self = this;
    const $wrapper = self.$container;
    const wrapperHeight = $wrapper.innerHeight() || 0;

    if (wrapperHeight <= 0) {
      scheduleDeferredResize(self);
      return;
    }

    const chromeHeight = self.getCarouselChromeHeight($wrapper, self.$choices);
    const availableHeight = Math.max(0, wrapperHeight - chromeHeight);
    let maxNaturalHeight = 0;

    if (self.showingResultScreen) {
      const resultScreenHeight = self.resultSlide.component.scrollHeight;
      const listContainer = $wrapper.find('.h5p-theme-results-list-container')[0];

      maxNaturalHeight = resultScreenHeight;

      if (listContainer) {
        const containerStyle = getComputedStyle(listContainer);
        const bottomPadding = parseInt(containerStyle.paddingBottom, 10) || 0;
        const bottomMargin = parseInt(containerStyle.marginBottom, 10) || 0;
        maxNaturalHeight += bottomPadding + bottomMargin;
      }
    }
    else {
      const $current = self.$slides[self.currentIndex];
      maxNaturalHeight = self.measureNaturalSlideHeight($current);
    }

    const overflow = availableHeight > 0 && maxNaturalHeight > availableHeight + 1;

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
    const self = this;
    const instructions = getInstructionsOptions(self);

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
    const self = this;

    if (!self.$playArea || !self.$playArea.length) {
      return;
    }

    if (!self.$playArea.is(':visible')) {
      scheduleDeferredResize(self);
      return;
    }

    const design = self.playAreaSize;
    const $parent = self.$playArea.parent();
    let width = self.$playArea.width();

    if (width <= 0) {
      width = $parent.width() || design.baseWidth;
    }

    const scale = PlayArea.getScale(width);
    const fontSize = (design.baseFontSize * scale) + 'px';

    self.$playArea.css({
      width: '100%',
      height: '',
      fontSize: fontSize,
      '--sc-scale': scale.toFixed(4),
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
    this.progressbar.setProgress(index + 1);
  };

  /**
   * Move to slide n
   * @param  {number} index The slide number    to move to
   * @param {boolean} moveFocus True to set focus on first alternative
   */
  SingleChoiceSet.prototype.move = function (index, moveFocus = true) {
    const self = this;
    if (index === this.currentIndex || index > self.$slides.length - 1) {
      return;
    }

    const $previousSlide = self.$slides[self.currentIndex];
    const $currentChoice = self.choices[index];
    const $currentSlide = self.$slides[index];
    const isResultSlide = (index >= self.choices.length);

    self.toggleNextButton(false);

    // if should show result slide
    if (isResultSlide) {
      self.setScore(self.results.corrects);
      this.showButton('try-again');
    }

    self.$container.toggleClass('navigatable', !isResultSlide);

    // start timing of new slide
    this.startStopWatch(index);

    // switch slides immediately (play area uses display toggling, not carousel transform)
    $previousSlide.removeClass('h5p-sc-current-slide h5p-sc-slide-enter');
    $currentSlide.addClass('h5p-sc-current-slide');
    triggerSlideEnterAnimation($currentSlide);
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

    // if not created, return no passed time,
    return 0;
  };

  /**
   * Returns the time the user has spent on all questions so far
   *
   * @return {number}
   */
  SingleChoiceSet.prototype.getTotalPassedTime = function () {
    return this.stopWatches
      .filter((watch) => watch != undefined)
      .reduce((sum, watch) => sum + watch.passedTime(), 0);
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
    const self = this;

    // create array with userAnswer
    const children = self.options.choices.map((question, index) => {
      const userResponse = self.userAnswerIndex[index] >= 0 ? self.userAnswerIndex[index] : '';
      const duration = self.timePassedInStopWatch(index);
      const event = self.createXApiAnsweredEvent(question, userResponse, duration);

      return {
        statement: event.data.statement,
      };
    });

    const result = XApiEventBuilder.createResult()
      .score(self.getScore(), self.getMaxScore())
      .duration(self.getTotalPassedTime())
      .build();

    // creates the definition object
    const definition = XApiEventBuilder.createDefinition()
      .interactionType(XApiEventBuilder.interactionTypes.COMPOUND)
      .build();

    const xAPIEvent = XApiEventBuilder.create()
      .verb(XApiEventBuilder.verbs.ANSWERED)
      .contentId(self.contentId, self.subContentId)
      .context(self.getParentAttribute('contentId'), self.getParentAttribute('subContentId'))
      .objectDefinition(definition)
      .result(result)
      .build();

    return {
      statement: xAPIEvent.data.statement,
      children,
    };
  };

  /**
   * Returns an attribute from this.parent if it exists
   *
   * @param {string} attributeName
   * @return {*|undefined}
   */
  SingleChoiceSet.prototype.getParentAttribute = function (attributeName) {
    const self = this;

    if (self.parent !== undefined) {
      return self.parent[attributeName];
    }
  };

  /**
   * Reset all answers. This is equal to refreshing the quiz
   * @param {boolean} moveFocus True to move the focus
   * This prevents loss of focus if reset from within content
   */
  SingleChoiceSet.prototype.resetTask = function (moveFocus = false) {
    const self = this;

    // Hide result slide buttons
    this.hideButton('try-again');

    // Reset the user's answers
    const classes = ['h5p-sc-reveal-wrong', 'h5p-sc-reveal-correct', 'h5p-sc-selected', 'h5p-sc-drummed', 'h5p-sc-correct-answer'];
    for (let i = 0; i < classes.length; i++) {
      this.$choices.find(`.${classes[i]}`).removeClass(classes[i]);
    }
    this.results = {
      corrects: 0,
      wrongs: 0,
    };

    this.choices.forEach((choice) => {
      choice.setAnswered(false);
      choice.resetA11yText();
      choice.resetAriaAttributes();
    });

    this.stopWatches.forEach((stopWatch) => {
      if (stopWatch) {
        stopWatch.reset();
      }
    });

    this.showingResultScreen = false;

    this.$container.removeClass('showing-results');

    this.move(0, moveFocus);
    scheduleDeferredResize(this);

    // Reset userResponses as well
    this.userResponses = [];

    if (this.nav) {
      this.nav.setCanShowLast(false);
      this.nav.setCurrentIndex(0);
    }
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
        userResponses: this.userResponses,
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
    const self = this;
    const showCorrectAnswerWhenWrong = isTruthy(self.options.behaviour.enableSolutionsButton);
    const $currentSlide = self.$choices.find('.h5p-sc-current-slide');
    const $selected = $currentSlide.find('.h5p-sc-alternative').eq(currentIndex);
    const prefix = $selected.find('.h5p-sc-alternative-prefix').text();
    const selectedText = $selected.find('.h5p-sc-label').text().replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
    const labeledSelectedText = AlternativeLabelModule.prependLabel(prefix, selectedText);
    const $correctAlternative = $currentSlide.find('.h5p-sc-is-correct');
    const correctPrefix = $correctAlternative.find('.h5p-sc-alternative-prefix').text();
    const correctText = $correctAlternative.find('.h5p-sc-label').text().replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
    const labeledCorrectText = AlternativeLabelModule.prependLabel(correctPrefix, correctText);
    let selectedOptionText = this.lastAnswerIsCorrect ? self.l10n.correctText : self.l10n.incorrectText;
    // Announce by ARIA label
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
}(H5P.jQuery, H5P.JoubelUI, H5P.Question, H5P.SingleChoiceSetCFRD.SingleChoice, H5P.SingleChoiceSetCFRD.ResultSlide, H5P.SingleChoiceSetCFRD.SoundEffects, H5P.SingleChoiceSetCFRD.XApiEventBuilder, H5P.SingleChoiceSetCFRD.StopWatch, AlternativeLabel));
