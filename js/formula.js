angular.module('format', []);
(function (angular) {
    'use strict';

    angular.module('format').filter('formatCurrency', function () {
        return formatCurrency;
    });

    /**
     * Returns currency if object has it
     * @param {object} input
     * @returns {string}
     */
    function formatCurrency (input) {
        if (input.attrs && input.attrs.currency) {
            return input.attrs.currency;
        }
        return '';
    }
})(angular);
(function (angular) {
    'use strict';

    angular.module('format').filter('formatNumber', function () {
        return formatNumber;
    });

    /**
     * Format number – this is refactored bolCurrency version with no currency addition
     * @param {string} value
     * @returns {string}
     */
    function formatNumber (value) {
        if (!value || String(value)[0] === '0') {
            return value;
        }

        var signs = 4; // знаков после запятой

        var numberValue = Number(String(value).replace(',', '.'));

        if (isNaN(numberValue)) {
            return value;
        }

        var splitValue = String(numberValue).split('.');

        var intPart = splitValue[0];
        var fractionalTemp = splitValue[1] || null;
        var fractional = '';

        if (fractionalTemp) {
            for (var i = signs; i >= 0; i--) {
                // пропускаем нули в конце
                if ((!fractionalTemp[i] || fractionalTemp[i] === '0') && !fractional) {
                    continue;
                }

                // если есть число после количества знаков – добавляем троеточие
                if (i === signs) {
                    fractional += '...';
                    continue;
                }

                fractional = fractionalTemp[i] + fractional;
            }

            // если пришло число типа 1.2, добавляем к копейкам ноль
            fractional += fractional.length === 1 ? '0' : '';
        }
        return intPart.replace(/(\d)(?=(?:\d{3})+$)/g, '$1 ') +
            (fractional ? ',' + fractional : '');
    }
})(angular);

(function (angular) {
    'use strict';

    angular.module('format').filter('formatOperator', function () {
        return formatOperator;
    });

    /**
     * Convert math operator to nice html view
     * @param {string} input
     * @returns {string}
     */
    function formatOperator (input) {
        if (input === '*') {
            return '×';
        } else if (input === '-') {
            return '–';
        }
        return input;
    }
})(angular);

(function (angular) {
    'use strict';

    angular
        .module('format')
        .filter('formatValue', function ($filter) {
            var formatCurrency = $filter('formatCurrency');
            var formatNumber = $filter('formatNumber');
            var formatOperator = $filter('formatOperator');

            return formatValue;

            /**
             * Format part value with currency
             * @param {object} item
             * @returns {string}
             */
            function formatValue (item) {
                var currency = formatCurrency(item);
                return formatNumber(formatOperator(item.value)) + (currency ? ' ' + currency : '');
            }
    });
})(angular);

angular.module('formula', ['format']);

/**
 * @ngdoc directive
 * @name formulaFast
 * @restrict E
 *
 * @description
 *
 * Основная директива для отображения формул
 * Отображение формул и расчетов (https://github.com/1pgb/frontend/blob/api-formulas/docs/formula/README.md)
 *
 */

(function (angular) {
    'use strict';

    angular.module('formula').directive('formulaFast', formulaDirective);

    function formulaDirective (formulaFastFactory) {

        return {
            restrict: 'E',
            replace: true,
            scope: true,
            template: '<div></div>',
            compile: function () {
                return function link (scope, element, attrs) {
                    if (scope[attrs.formulaJson]) {
                        element.html(formulaFastFactory(scope[attrs.formulaJson]));
                    }

                    scope.$watch(attrs.formulaJson, function (_new, _old) {
                        if (_new) {
                            element.html(formulaFastFactory(_new));
                        }
                    });
                };
            }
        };
    }
})(angular);

/**
 * @ngdoc factory
 * @name formulaFastFactory
 *
 * @description
 * Фабрика преобразования объекта от сервера в вид для отображения формулы (ускоренный вариант без ангуляра)
 * Отображение формул и расчетов (https://github.com/1pgb/frontend/blob/api-formulas/docs/formula/README.md)
 *
 */
(function (angular, $, _, Backbone) {
    'use strict';

    angular
        .module('formula')
        .factory('formulaFastFactory', function ($filter) {
            var formatNumber = $filter('formatNumber');
            var formatOperator = $filter('formatOperator');
            var formatValue = $filter('formatValue');

            var Hint = {};

            Hint.Model = Backbone.Model.extend({
                initialize: function () {
                    if (this.get('text')) {
                        this.parts = this.get('text').split('{}').map(function (item, index) {
                            var part = {
                                text: item
                            };
                            if (this.get('args') && this.get('args')[index]) {
                                part.value = this.get('args')[index];
                            }
                            return part;
                        }.bind(this));
                    }
                }
            });

            Hint.View = Backbone.View.extend({
                className: 'formula-hints__item',
                tagName: 'li',
                events: {
                    'mouseover .formula-hint': 'mouseover',
                    'mouseout .formula-hint': 'mouseout'
                },
                initialize: function () {
                    _.bindAll(this, 'mouseover', 'mouseout', 'shine');

                    if (this.model.get('couldShine')) {
                        this.listenTo(this.model, 'change:shine', this.shine);
                    }
                },
                mouseover: function () {
                    this.model.set('shine', 'all');
                },
                mouseout: function () {
                    this.model.set('shine', null);
                },
                shine: function (model, value) {
                    this.$part.toggleClass('formula-hint_shine', value !== null);
                },
                render: function () {
                    var $part = this.$part = $('<div class="formula-hint"></div>').appendTo(this.$el);

                    if (this.model.get('value')) {
                        var $value = $('<strong></strong>').appendTo($part);
                        $value.append(new Part.View({
                            model: new Part.Model(this.model.attributes)
                        }).render());

                        $part.append($('<span> &mdash; </span>'));
                    }

                    _.each(this.model.parts, function (part) {
                        var $text = $('<span class="formula-hint-text">' + _.escape(part.text) + '</span>')
                            .appendTo($part);
                        if (part.value) {
                            $('<span class="formula-hint-text__arg"></span>')
                                .append(new Part.View({model: new Part.Model(part.value)}).render())
                                .appendTo($text);
                        }
                    });

                    return this.$el;
                }
            });

            Hint.Collection = Backbone.Collection.extend({
                model: Hint.Model
            });

            var Part = {};

            Part.View = Backbone.View.extend({
                className: 'formula-part',
                tagName: 'span',
                events: {
                    'mouseover .formula-part__value': 'mouseover',
                    'mouseout .formula-part__value': 'mouseout'
                },
                initialize: function () {
                    this.model.view = this;
                    if (this.model.left) {
                        new Part.View({
                            model: this.model.left
                        });
                    }
                    if (this.model.right) {
                        new Part.View({
                            model: this.model.right
                        });
                    }

                    _.bindAll(this, 'mouseover', 'mouseout', 'shine');
                    if (this.model.hint) {
                        this.listenTo(this.model.hint, 'change:shine', this.shine);
                    }
                },
                mouseover: function (e) {
                    if (this.model.hint) {
                        this.model.hint.set('shine', [this.model.cid, this.model.hint.model.cid]);
                        e.stopPropagation();
                    }
                },
                mouseout: function (e) {
                    if (this.model.hint) {
                        this.model.hint.set('shine', null);
                        e.stopPropagation();
                    }
                },
                shine: function (model, value) {
                    if (value === null || value === 'all' || value.indexOf(this.model.cid) !== -1) {
                        this.$el.toggleClass('formula-part_shine', value !== null);
                    }
                },
                render: function () {
                    if (this.model.get('op')) {
                        this.$el.addClass('formula-part_' + this.model.get('op') + ' formula-part_operator');
                    }
                    this.$el.html('<span class="formula-part__value">' +
                        _.escape(formatValue(this.model.attributes)) + '</span>');
                    if (this.model.left) {
                        this.$el.prepend(this.model.left.view.render());
                    }
                    if (this.model.right) {
                        this.$el.append(this.model.right.view.render());
                    }
                    return this.$el;
                }
            });

            Part.Model = Backbone.Model.extend({
                operatorBinding: {
                    '-': 'minus',
                    '+': 'plus',
                    '*': 'multiply',
                    '/': 'divide',
                    '%': 'percent',
                    '(': 'bracket',
                    '=': 'eq',
                    '': 'block'
                },
                initialize: function (attributes) {
                    if (attributes.left) {
                        this.left = new Part.Model(attributes.left);
                    }
                    if (attributes.right) {
                        this.right = new Part.Model(attributes.right);
                    }
                    if (attributes.left || attributes.right) {
                        this.set('op', this.operatorBinding[attributes.value] || 'unknown');
                    }
                    if (attributes.hint) {
                        attributes.hint.couldShine = true;  // подсвечиваем только хинты из формулы
                        this.hint = new Hint.Model(attributes.hint);
                        this.hint.model = this;
                    }
                }
            });

            var Formula = {};

            Formula.View = Backbone.View.extend({
                className: 'formula-container',
                initialize: function () {
                    this.deferredHints = $.Deferred();
                    this.hints = new Hint.Collection(this.model.get('hint_before') || []);
                    if (this.model.get('formula')) {
                        this.part = new Part.Model(this.model.get('formula'));
                        this.fillHints(this.part);
                    }
                    this.hints.add(this.model.get('hint_after') || []);
                    // Resolve all deferred objects because all hints are ready now
                    this.deferredHints.resolve();
                },
                plain: function (model) {
                    var result = '';
                    if (model.left) {
                        result += this.plain(model.left) + (model.right ? ' ' : '');
                    }
                    result += formatNumber(formatOperator(model.get('value')));
                    if (model.right) {
                        result += (model.left ? ' ' : '') + this.plain(model.right);
                    }
                    if (model.get('value') === '(') {
                        result += ')';
                    }
                    return result;
                },
                fillHints: function (model) {
                    if (model.left) {
                        this.fillHints(model.left);
                    }
                    if (model.right) {
                        this.fillHints(model.right);
                    }
                    if (model.hint) {
                        if (model.hint.get('link_to')) {
                            this.deferredHints.done(function () {
                                model.hint = this.hints.find(function (hint) {
                                    return hint.get('link_id') === model.hint.get('link_to');
                                });
                            }.bind(this));
                        } else {
                            model.hint.set('value', this.plain(model));
                            this.hints.add(model.hint);
                        }
                    }
                },
                render: function () {
                    if (this.part) {
                        var $header = $('<div class="formula-header"></div>').appendTo(this.$el);
                        if (this.model.get('header')) {
                            $('<div class="formula-header__text">' + _.escape(this.model.get('header')) + '</div>').appendTo($header);
                        }

                        var $formula = $('<div class="formula-header__formula"></div>').appendTo($header);
                        $formula.append(new Part.View({
                            model: this.part
                        }).render());
                    } else {
                        $('<div class="formula-unavailable">' + _.escape(this.model.get('header')) + '</div>').appendTo(this.$el);
                    }

                    if (this.hints.length) {
                        var $hints = $('<ul class="formula-hints"></ul>').appendTo(this.$el);
                        this.hints.each(function (hint) {
                            $hints.append(new Hint.View({
                                model: hint
                            }).render());
                        });
                    }

                    return this.$el;
                }
            });

            return function (data) {
                return new Formula.View({
                    model: new Backbone.Model(data)
                }).render();
            };
        });
})(angular, jQuery, _, Backbone);

(function() {
	var D2 = {"value":"+","left":{"value":"(","right":{"value":"*","left":{"value":"/","left":{"value":"10800"},"right":{"value":"731"}},"right":{"value":"15"}}},"right":{"value":"(","right":{"value":"*","left":{"value":"/","left":{"value":"108000"},"right":{"value":"731"}},"right":{"value":"31"}}}};
	var Data = {
        "value": "=",
        "left": {
            "value": "+",
            "left": {
                "value": "(",
                "right": {
                    "value": "*",
                    "left": {
                        "value": "(",
                        "right": {
                            "value": "-",
                            "hint": {
                                "text": "превышение лимита базы для начисления взносов в июле ({})",
                                "args": [{
                                    "value": "21000",
                                    "attrs": {
                                        "currency": "руб"
                                    }
                                }]
                            },
                            "left": {
                                "value": "41000",
                                "hint": {
                                    "text": "начислено за июль"
                                }
                            },
                            "right": {
                                "value": "(",
                                "right": {
                                    "value": "-",
                                    "hint": {
                                        "text": "в пределах лимита базы для начисления взносов в июле ({})",
                                        "args": [{
                                            "value": "20000",
                                            "attrs": {
                                                "currency": "руб"
                                            }
                                        }],
                                        "link_id": "limit_nachisleno"
                                    },
                                    "left": {
                                        "value": "624000",
                                        "hint": {
                                            "link_id": "limit",
                                            "text": "лимит базы для начисления взносов в 2014 году"
                                        }
                                    },
                                    "right": {
                                        "value": "604000",
                                        "hint": {
                                            "link_id": "nachisleno",
                                            "text": "начислено с января по июнь"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "right": {
                        "value": "10%",
                        "hint": {
                            "text": "размер тарифа для превышения лимита базы для начисления взносов"
                        }
                    }
                }
            },
            "right": {
                "value": "(",
                "right": {
                    "value": "*",
                    "left": {
                        "value": "(",
                        "right": {
                            "value": "-",
                            "hint": {
                                "link_to": "limit_nachisleno"
                            },
                            "left": {
                                "value": "624000",
                                "hint": {
                                    "link_to": "limit"
                                }
                            },
                            "right": {
                                "value": "604000",
                                "hint": {
                                    "link_to": "nachisleno"
                                }
                            }
                        }
                    },
                    "right": {
                        "value": "22%",
                        "hint": {
                            "text": "размер тарифа"
                        }
                    }
                }
            }
        },
        "right": {
            "value": "6500",
            "attrs": {
                "currency": "руб"
            }
        }
    };

    angular.module('formulaTest', ['formula']);

    angular.module('formulaTest').controller('Controller', ['$scope', function($scope) {
		
    	$scope.clean_data = JSON.stringify(Data, null, 4);

		var f = {
			"formula": Data,
			"header": "Расчитано так:",
			"hint_before": [
		        {
		            "text": "Начисления за расчетный период ({})",
		            "args": [
		                {
		                    "value": "1000",
		                    "attrs": {
		                        "currency": "руб"
		                    }
		                }
		            ]
		        }
		    ],
		    "hint_after": [
		        {
		            "value": "01",
		            "text": "код тарифа плательщика страховых взносов, основной тариф"
		        }
		    ]
		};
		//$scope.formulaJson = null;
		
		$scope.formulaRecompile = false;
		$scope.calculate = function() {
			var data = JSON.parse($scope.clean_data);
			$scope.formulaJson = data.formula ? data : {'formula': data};
			$scope.formulaRecompile = true;
		};
	}]);
})();
