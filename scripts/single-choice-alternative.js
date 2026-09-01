var H5P = H5P || {};
H5P.SingleChoiceSetCFRD = H5P.SingleChoiceSetCFRD || {};

H5P.SingleChoiceSetCFRD.Alternative = (function ($, EventDispatcher, AlternativeLabel) {
  AlternativeLabel = AlternativeLabel || {
    prependLabel: function (prefix, text) {
      return prefix ? prefix + ' ' + text : text;
    }
  };

  /**
   * @param {string} html
   * @returns {string}
   */
  function stripHtml(html) {
    var decoder = document.createElement('div');
    decoder.innerHTML = html;
    return (decoder.textContent || decoder.innerText || '').replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
  }

  /**
   * @constructor
   *
   * @param {object} options Options for the alternative
   */
  function Alternative(options) {
    EventDispatcher.call(this);
    var self = this;

    this.options = options;

    var triggerAlternativeSelected = function (event) {
      self.trigger('alternative-selected', {
        correct: self.options.correct,
        $element: self.$alternative,
        answerIndex: self.options.answerIndex
      });

      event.preventDefault();
    };

    this.$alternative = $('<li>', {
      'class': 'h5p-sc-alternative h5p-sc-is-' + (this.options.correct ? 'correct' : 'wrong'),
      'role': 'radio',
      'tabindex': -1,
      'on': {
        'keydown': function (event) {
          switch (event.which) {
            case 13: // Enter
            case 32: // Space
              triggerAlternativeSelected(event);
              break;

            case 35: // End
              self.trigger('lastOption', event);
              event.preventDefault();
              break;

            case 36: // Home
              self.trigger('firstOption', event);
              event.preventDefault();
              break;

            case 37: // Left
            case 38: // Up
              self.trigger('previousOption', event);
              event.preventDefault();
              break;

            case 39: // Right
            case 40: // Down
              self.trigger('nextOption', event);
              event.preventDefault();
              break;
          }
        }
      },
      'focus': function (event) {
        self.trigger('focus', event);
      },
      'click': triggerAlternativeSelected
    });

    if (this.options.prefix) {
      this.$alternative.attr(
        'aria-label',
        AlternativeLabel.prependLabel(
          this.options.prefix,
          stripHtml(this.options.text)
        )
      );
    }

    this.$alternative.append($('<div>', {
      'class': 'h5p-sc-progressbar'
    }));

    var $body = $('<div>', {
      'class': 'h5p-sc-alternative-body'
    });

    if (this.options.prefix) {
      $body.append($('<span>', {
        'class': 'h5p-sc-alternative-prefix',
        'aria-hidden': 'true',
        'text': this.options.prefix
      }));
    }

    $body.append($('<div>', {
      'class': 'h5p-sc-label',
      'html': this.options.text
    }));

    this.$alternative.append($body);
    this.$alternative.append($('<div>', {
      'class': 'h5p-sc-status'
    }));
    this.$alternative.append($('<div>', {
      'class': 'h5p-sc-a11y',
      'aria-hidden': 'true'
    }));
  }

  Alternative.prototype = Object.create(EventDispatcher.prototype);
  Alternative.prototype.constructor = Alternative;

  /**
   * @return {boolean}
   */
  Alternative.prototype.isCorrect = function () {
    return this.options.correct;
  };

  Alternative.prototype.focus = function () {
    this.$alternative.focus();
  };

  Alternative.prototype.tabbable = function () {
    this.$alternative.attr('tabindex', 0);
  };

  Alternative.prototype.notTabbable = function () {
    this.$alternative.attr('tabindex', -1);
  };

  Alternative.prototype.appendTo = function ($container) {
    $container.append(this.$alternative);
    return this.$alternative;
  };

  /**
   * Apply per-alternative base colors.
   *
   * @param {{background: string, text: string, hoverBackground: string, hoverText: string}} colors
   */
  Alternative.prototype.applyDistinctColors = function (colors) {
    if (!colors || !this.$alternative) {
      return;
    }

    this.$alternative.addClass('h5p-sc-alternative--distinct-color');
    this.$alternative.css({
      '--sc-alternative-bg': colors.background,
      '--sc-alternative-color': colors.text,
      '--sc-alternative-hover-bg': colors.hoverBackground,
      '--sc-alternative-hover-color': colors.hoverText
    });
  };

  return Alternative;

})(H5P.jQuery, H5P.EventDispatcher, H5P.SingleChoiceSetCFRD.AlternativeLabel);
