var H5P = H5P || {};
H5P.SingleChoiceSetCFRD = H5P.SingleChoiceSetCFRD || {};

H5P.SingleChoiceSetCFRD.AlternativeLabel = (function () {
  var LOWER_ROMAN = ['', 'i', 'ii', 'iii', 'iv'];
  var UPPER_ROMAN = ['', 'I', 'II', 'III', 'IV'];

  /**
   * @param {number} index
   * @param {boolean} upper
   * @returns {string}
   */
  function toRoman(index, upper) {
    var table = upper ? UPPER_ROMAN : LOWER_ROMAN;
    return table[index + 1] || String(index + 1);
  }

  /**
   * @param {string} core
   * @param {string} separator
   * @returns {string}
   */
  function applySeparator(core, separator) {
    if (separator === 'paren') {
      return '(' + core + ')';
    }

    if (separator === 'period') {
      return core + '.';
    }

    return core;
  }

  /**
   * @param {number} index
   * @param {string} style
   * @returns {string}
   */
  function getCore(index, style) {
    switch (style) {
      case 'numbers':
        return String(index + 1);
      case 'uppercase':
        return String.fromCharCode(65 + index);
      case 'lowercase':
        return String.fromCharCode(97 + index);
      case 'upperRoman':
        return toRoman(index, true);
      case 'lowerRoman':
        return toRoman(index, false);
      default:
        return String.fromCharCode(65 + index);
    }
  }

  /**
   * @param {object|null|undefined} settings
   * @returns {{enabled: boolean, style: string, separator: string}}
   */
  function normalizeSettings(settings) {
    return {
      enabled: !!(settings && settings.enabled),
      style: (settings && settings.style) || 'uppercase',
      separator: (settings && settings.separator) || 'period'
    };
  }

  /**
   * @param {number} index Zero-based visible position
   * @param {object|null|undefined} settings
   * @returns {string}
   */
  function getAlternativeLabel(index, settings) {
    var normalized = normalizeSettings(settings);

    if (!normalized.enabled) {
      return '';
    }

    return applySeparator(getCore(index, normalized.style), normalized.separator);
  }

  /**
   * @param {string} prefix
   * @param {string} text
   * @returns {string}
   */
  function prependLabel(prefix, text) {
    if (!prefix) {
      return text;
    }

    return prefix + ' ' + text;
  }

  return {
    getAlternativeLabel: getAlternativeLabel,
    normalizeSettings: normalizeSettings,
    prependLabel: prependLabel
  };
})();
