var H5P = H5P || {};
H5P.SingleChoiceSetCFRD = H5P.SingleChoiceSetCFRD || {};

/**
 * Activity appearance defaults and CSS custom properties for Single Choice Set CFRD.
 */
(function () {
  var APPEARANCE_DEFAULTS = {
    playAreaBackground: '#ffffff',
    alternativeBackground: '#dddddd',
    alternativeHoverBackground: '#ececec',
    alternativeText: '#333333',
    alternativeHoverText: '#333333',
    questionText: '#333333',
    contextText: '#555555',
    questionFontSize: 1,
    contextFontSize: 1,
    labelPrefixText: '#333333',
    correctBackground: '#9dd8bb',
    correctText: '#255c41',
    wrongBackground: '#f7d0d0',
    wrongText: '#b71c1c',
    soundIcon: '#757575',
    questionBackground: 'transparent',
    questionPadding: 0,
    questionPaddingRight: 1.777,
    questionBorderRadius: 0,
    alternativeBorderRadius: 0.25,
    alternativeBorderWidth: '0',
    alternativeBorderColor: 'transparent',
    alternativeHoverBorderColor: 'transparent',
    alternativeBoxShadow: '0 0.1em 0 rgba(0,0,0,0.3)',
    questionBorderWidth: '0',
    questionBorderColor: 'transparent',
    correctBorderWidth: '0',
    correctBorderColor: 'transparent',
    wrongBorderWidth: '0',
    wrongBorderColor: 'transparent',
    feedbackBackground: '#ffffff',
    feedbackTextColor: '#333333',
    solutionBackground: '#ffffff',
    solutionHeaderBackground: '#ffffff',
    solutionHeaderBorder: '#dddddd',
    solutionTitleColor: '#333333',
    solutionQuestionColor: '#333333',
    solutionAnswerColor: '#255c41',
    solutionDividerColor: '#cccccc',
    solutionCloseColor: '#1a73d9',
    solutionCloseHoverColor: '#1356a3',
    solutionCloseActiveColor: '#104888',
    scrollbarWidth: 8,
    scrollbarShowTrack: true,
    scrollbarTrack: '#e8e8e8',
    scrollbarThumb: '#b0b0b0',
    scrollbarThumbHover: '#888888'
  };

  var CSS_VAR_KEYS = {
    playAreaBackground: '--sc-play-area-bg',
    alternativeBackground: '--sc-alternative-bg',
    alternativeHoverBackground: '--sc-alternative-hover-bg',
    alternativeText: '--sc-alternative-color',
    alternativeHoverText: '--sc-alternative-hover-color',
    questionText: '--sc-question-color',
    contextText: '--sc-context-color',
    labelPrefixText: '--sc-label-prefix-color',
    questionBackground: '--sc-question-bg',
    alternativeBorderWidth: '--sc-alternative-border-width',
    alternativeBorderColor: '--sc-alternative-border-color',
    alternativeHoverBorderColor: '--sc-alternative-hover-border-color',
    alternativeBoxShadow: '--sc-alternative-box-shadow',
    questionBorderWidth: '--sc-question-border-width',
    questionBorderColor: '--sc-question-border-color',
    correctBackground: '--sc-correct-bg',
    correctText: '--sc-correct-color',
    correctBorderWidth: '--sc-correct-border-width',
    correctBorderColor: '--sc-correct-border-color',
    wrongBackground: '--sc-wrong-bg',
    wrongText: '--sc-wrong-color',
    wrongBorderWidth: '--sc-wrong-border-width',
    wrongBorderColor: '--sc-wrong-border-color',
    correctIcon: '--sc-correct-icon-color',
    wrongIcon: '--sc-wrong-icon-color',
    solutionIcon: '--sc-solution-icon-color',
    soundIcon: '--sc-sound-icon-color',
    feedbackBackground: '--sc-feedback-bg',
    feedbackTextColor: '--sc-feedback-color',
    solutionBackground: '--sc-solution-bg',
    solutionHeaderBackground: '--sc-solution-header-bg',
    solutionHeaderBorder: '--sc-solution-header-border',
    solutionTitleColor: '--sc-solution-title-color',
    solutionQuestionColor: '--sc-solution-question-color',
    solutionAnswerColor: '--sc-solution-answer-color',
    solutionDividerColor: '--sc-solution-divider-color',
    solutionCloseColor: '--sc-solution-close-color',
    solutionCloseHoverColor: '--sc-solution-close-hover-color',
    solutionCloseActiveColor: '--sc-solution-close-active-color',
    scrollbarTrack: '--sc-scrollbar-track',
    scrollbarThumb: '--sc-scrollbar-thumb',
    scrollbarThumbHover: '--sc-scrollbar-thumb-hover'
  };

  var CSS_EM_VAR_KEYS = {
    questionPadding: '--sc-question-padding',
    questionPaddingRight: '--sc-question-padding-right',
    questionBorderRadius: '--sc-question-border-radius',
    alternativeBorderRadius: '--sc-alternative-border-radius',
    questionFontSize: '--sc-question-font-size',
    contextFontSize: '--sc-context-font-size'
  };

  var CSS_PX_VAR_KEYS = {
    scrollbarWidth: '--sc-scrollbar-width'
  };

  /**
   * @param {*} value
   * @param {*} fallback
   * @returns {string}
   */
  function toEm(value, fallback) {
    var num = (value !== undefined && value !== null && value !== '') ?
      Number(value) :
      Number(fallback);

    if (isNaN(num)) {
      num = Number(fallback);
    }

    return num + 'em';
  }

  /**
   * @param {number|string} value
   * @param {number|string} fallback
   * @returns {string}
   */
  function toPx(value, fallback) {
    var num = (value !== undefined && value !== null && value !== '') ?
      Number(value) :
      Number(fallback);

    if (isNaN(num)) {
      num = Number(fallback);
    }

    return num + 'px';
  }

  /**
   * @param {*} value
   * @returns {boolean}
   */
  function isTruthy(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  /**
   * @param {*} value
   * @param {string} fallback
   * @returns {string}
   */
  function pickString(value, fallback) {
    return (value === undefined || value === null || value === '') ?
      fallback :
      String(value);
  }

  /**
   * @param {*} value
   * @param {number} fallback
   * @returns {number}
   */
  function normalizeAngle(value, fallback) {
    var normalized = parseInt(value, 10);

    if (isNaN(normalized)) {
      normalized = fallback;
    }

    return Math.max(0, Math.min(360, normalized));
  }

  /**
   * @param {number} angle
   * @param {string} colorStart
   * @param {string} colorEnd
   * @returns {string}
   */
  function buildLinearGradient(angle, colorStart, colorEnd) {
    return 'linear-gradient(' + angle + 'deg, ' + colorStart + ', ' + colorEnd + ')';
  }

  /**
   * Resolve solid or gradient fill from editor fields.
   *
   * @param {Object} [group]
   * @param {Object} options
   * @param {string} options.solidKey
   * @param {string} [options.useGradientKey]
   * @param {string} [options.gradientKey]
   * @param {string} options.fallbackSolid
   * @returns {string}
   */
  function resolveFill(group, options) {
    var useGradientKey = options.useGradientKey || 'useGradientBackground';
    var gradientKey = options.gradientKey || 'gradientBackground';
    var solid = pickString(group && group[options.solidKey], options.fallbackSolid);
    var gradient;
    var angle;
    var colorStart;
    var colorEnd;

    if (!isTruthy(group && group[useGradientKey])) {
      return solid;
    }

    gradient = (group && group[gradientKey]) || {};
    angle = normalizeAngle(gradient.angle, 180);
    colorStart = pickString(gradient.colorStart, solid);
    colorEnd = pickString(gradient.colorEnd, colorStart);

    return buildLinearGradient(angle, colorStart, colorEnd);
  }

  /**
   * @param {Object} merged
   * @param {Object} [appearance]
   * @returns {Object}
   */
  function applyBorderAppearance(merged, appearance) {
    var alt = (appearance && appearance.alternativeColors) || {};
    var altBorder = alt.borderSettings || {};
    var questionArea = (appearance && appearance.questionArea) || {};
    var questionBorder = questionArea.borderSettings || {};
    var correct = (appearance && appearance.correctColors) || {};
    var correctBorder = correct.borderSettings || {};
    var wrong = (appearance && appearance.wrongColors) || {};
    var wrongBorder = wrong.borderSettings || {};

    if (isTruthy(alt.useBorder)) {
      merged.alternativeBorderWidth = toEm(altBorder.borderWidth, 0.05);
      merged.alternativeBorderColor = altBorder.borderColor || '#999999';
      merged.alternativeHoverBorderColor = altBorder.hoverBorderColor ||
        merged.alternativeBorderColor;
      merged.alternativeBoxShadow = 'none';
    }
    else {
      merged.alternativeBorderWidth = '0';
      merged.alternativeBorderColor = 'transparent';
      merged.alternativeHoverBorderColor = 'transparent';
      merged.alternativeBoxShadow = '0 0.1em 0 rgba(0,0,0,0.3)';
    }

    if (isTruthy(questionArea.useBorder)) {
      merged.questionBorderWidth = toEm(questionBorder.borderWidth, 0.05);
      merged.questionBorderColor = questionBorder.borderColor || '#cccccc';
    }
    else {
      merged.questionBorderWidth = '0';
      merged.questionBorderColor = 'transparent';
    }

    if (isTruthy(correct.useBorder)) {
      merged.correctBorderWidth = toEm(correctBorder.borderWidth, 0.05);
      merged.correctBorderColor = correctBorder.borderColor || '#255c41';
    }
    else {
      merged.correctBorderWidth = merged.alternativeBorderWidth;
      merged.correctBorderColor = merged.alternativeBorderColor;
    }

    if (isTruthy(wrong.useBorder)) {
      merged.wrongBorderWidth = toEm(wrongBorder.borderWidth, 0.05);
      merged.wrongBorderColor = wrongBorder.borderColor || '#b71c1c';
    }
    else {
      merged.wrongBorderWidth = merged.alternativeBorderWidth;
      merged.wrongBorderColor = merged.alternativeBorderColor;
    }

    return merged;
  }

  /**
   * @param {Object} [overallFeedback]
   * @returns {{feedbackBackground: string, feedbackTextColor: string}}
   */
  function getFeedbackColors(overallFeedback) {
    var config = (H5P.QuestionCFRD && H5P.QuestionCFRD.normalizeOverallFeedbackConfig) ?
      H5P.QuestionCFRD.normalizeOverallFeedbackConfig(overallFeedback) :
      {
        popupBackgroundColor: '#ffffff',
        feedbackTextColor: '#333333'
      };

    return {
      feedbackBackground: config.popupBackgroundColor || '#ffffff',
      feedbackTextColor: config.feedbackTextColor || '#333333'
    };
  }

  /**
   * @param {Object} [appearance]
   * @returns {Object}
   */
  function readAppearanceFields(appearance) {
    var alt = (appearance && appearance.alternativeColors) || {};
    var text = (appearance && appearance.textColors) || {};
    var correct = (appearance && appearance.correctColors) || {};
    var wrong = (appearance && appearance.wrongColors) || {};
    var icons = (appearance && appearance.iconColors) || {};
    var questionArea = (appearance && appearance.questionArea) || {};
    var solutionView = (appearance && appearance.solutionView) || {};
    var scrollbar = (appearance && appearance.scrollbar) || {};

    return {
      playAreaBackground: appearance && appearance.playAreaBackground,
      alternativeBackground: resolveFill(alt, {
        solidKey: 'background',
        fallbackSolid: APPEARANCE_DEFAULTS.alternativeBackground
      }),
      alternativeHoverBackground: resolveFill(alt, {
        solidKey: 'hoverBackground',
        useGradientKey: 'useHoverGradientBackground',
        gradientKey: 'hoverGradientBackground',
        fallbackSolid: APPEARANCE_DEFAULTS.alternativeHoverBackground
      }),
      alternativeText: alt.text,
      alternativeHoverText: alt.hoverText,
      alternativeBorderRadius: alt.borderRadius,
      questionText: text.question,
      contextText: text.context,
      questionFontSize: text.questionFontSize,
      contextFontSize: text.contextFontSize,
      labelPrefixText: text.labelPrefix,
      questionBackground: questionArea.background,
      questionPadding: questionArea.padding,
      questionPaddingRight: questionArea.paddingRight,
      questionBorderRadius: questionArea.borderRadius,
      correctBackground: resolveFill(correct, {
        solidKey: 'background',
        fallbackSolid: APPEARANCE_DEFAULTS.correctBackground
      }),
      correctText: correct.text,
      wrongBackground: resolveFill(wrong, {
        solidKey: 'background',
        fallbackSolid: APPEARANCE_DEFAULTS.wrongBackground
      }),
      wrongText: wrong.text,
      correctIcon: icons.correct,
      wrongIcon: icons.wrong,
      solutionIcon: icons.solution,
      soundIcon: icons.sound,
      solutionBackground: solutionView.background,
      solutionHeaderBackground: solutionView.headerBackground,
      solutionHeaderBorder: solutionView.headerBorderColor,
      solutionTitleColor: solutionView.titleColor,
      solutionQuestionColor: solutionView.questionColor,
      solutionAnswerColor: solutionView.answerColor,
      solutionDividerColor: solutionView.dividerColor,
      solutionCloseColor: solutionView.closeButtonColor,
      solutionCloseHoverColor: solutionView.closeButtonHoverColor,
      solutionCloseActiveColor: solutionView.closeButtonActiveColor,
      scrollbarWidth: scrollbar.width,
      scrollbarShowTrack: scrollbar.showTrack,
      scrollbarTrack: scrollbar.track,
      scrollbarThumb: scrollbar.thumb,
      scrollbarThumbHover: scrollbar.thumbHover
    };
  }

  /**
   * @param {Object} merged
   * @param {Object} fields
   * @returns {Object}
   */
  function applyIconDefaults(merged, fields) {
    merged.correctIcon = (fields.correctIcon !== undefined &&
      fields.correctIcon !== null &&
      fields.correctIcon !== '') ?
      fields.correctIcon :
      merged.correctText;
    merged.wrongIcon = (fields.wrongIcon !== undefined &&
      fields.wrongIcon !== null &&
      fields.wrongIcon !== '') ?
      fields.wrongIcon :
      merged.wrongText;
    merged.solutionIcon = (fields.solutionIcon !== undefined &&
      fields.solutionIcon !== null &&
      fields.solutionIcon !== '') ?
      fields.solutionIcon :
      merged.correctText;

    return merged;
  }

  /**
   * @param {Object} merged
   * @param {Object} fields
   * @returns {Object}
   */
  function applySolutionViewDefaults(merged, fields) {
    if (!fields.solutionHeaderBackground) {
      merged.solutionHeaderBackground = merged.solutionBackground;
    }

    if (!fields.solutionTitleColor) {
      merged.solutionTitleColor = merged.questionText;
    }

    if (!fields.solutionQuestionColor) {
      merged.solutionQuestionColor = merged.questionText;
    }

    if (!fields.solutionAnswerColor) {
      merged.solutionAnswerColor = merged.correctText;
    }

    return merged;
  }

  /**
   * @param {Object} [appearance]
   * @param {Object|Array} [overallFeedback]
   * @returns {Object}
   */
  function mergeAppearance(appearance, overallFeedback) {
    var merged = {};
    var key;
    var fields = readAppearanceFields(appearance);
    var feedbackColors = getFeedbackColors(overallFeedback);

    for (key in APPEARANCE_DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(APPEARANCE_DEFAULTS, key)) {
        merged[key] = APPEARANCE_DEFAULTS[key];
      }
    }

    for (key in fields) {
      if (Object.prototype.hasOwnProperty.call(fields, key) &&
          fields[key] !== undefined &&
          fields[key] !== null &&
          fields[key] !== '') {
        merged[key] = fields[key];
      }
    }

    merged.feedbackBackground = feedbackColors.feedbackBackground;
    merged.feedbackTextColor = feedbackColors.feedbackTextColor;

    if (!fields.questionBackground) {
      merged.questionBackground = 'transparent';
    }

    if (!fields.alternativeHoverText) {
      merged.alternativeHoverText = merged.alternativeText;
    }

    applyIconDefaults(merged, fields);
    applySolutionViewDefaults(merged, fields);
    applyBorderAppearance(merged, appearance);

    if (merged.scrollbarShowTrack === false) {
      merged.scrollbarTrack = 'transparent';
    }

    return merged;
  }

  /**
   * @param {Object} merged
   * @param {string} key
   * @returns {string}
   */
  function getCssVarValue(merged, key) {
    if (Object.prototype.hasOwnProperty.call(CSS_EM_VAR_KEYS, key)) {
      return toEm(merged[key], APPEARANCE_DEFAULTS[key]);
    }

    if (Object.prototype.hasOwnProperty.call(CSS_PX_VAR_KEYS, key)) {
      return toPx(merged[key], APPEARANCE_DEFAULTS[key]);
    }

    return merged[key];
  }

  /**
   * @param {jQuery} $container
   * @param {Object} [appearance]
   * @param {Object|Array} [overallFeedback]
   * @returns {Object}
   */
  function applyAppearanceVars($container, appearance, overallFeedback) {
    var merged = mergeAppearance(appearance, overallFeedback);
    var key;
    var i;
    var el;

    if (!$container || !$container.length) {
      return merged;
    }

    for (i = 0; i < $container.length; i++) {
      el = $container[i];

      if (!el || !el.style) {
        continue;
      }

      for (key in CSS_VAR_KEYS) {
        if (Object.prototype.hasOwnProperty.call(CSS_VAR_KEYS, key)) {
          el.style.setProperty(CSS_VAR_KEYS[key], getCssVarValue(merged, key));
        }
      }

      for (key in CSS_EM_VAR_KEYS) {
        if (Object.prototype.hasOwnProperty.call(CSS_EM_VAR_KEYS, key)) {
          el.style.setProperty(CSS_EM_VAR_KEYS[key], getCssVarValue(merged, key));
        }
      }

      for (key in CSS_PX_VAR_KEYS) {
        if (Object.prototype.hasOwnProperty.call(CSS_PX_VAR_KEYS, key)) {
          el.style.setProperty(CSS_PX_VAR_KEYS[key], getCssVarValue(merged, key));
        }
      }
    }

    return merged;
  }

  /**
   * @param {jQuery} $container
   * @param {Object} [appearance]
   * @param {Object|Array} [overallFeedback]
   */
  function scheduleAppearance($container, appearance, overallFeedback) {
    var apply = function () {
      applyAppearanceVars($container, appearance, overallFeedback);
    };

    apply();
    setTimeout(apply, 0);
    setTimeout(apply, 50);
    setTimeout(apply, 200);
  }

  H5P.SingleChoiceSetCFRD.Appearance = {
    APPEARANCE_DEFAULTS: APPEARANCE_DEFAULTS,
    mergeAppearance: mergeAppearance,
    applyAppearanceVars: applyAppearanceVars,
    scheduleAppearance: scheduleAppearance
  };
})();
