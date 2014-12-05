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

	var app = angular.module('formulaTest', []);

	app.controller('Controller', ['$scope', function($scope) {
		var f = new Formula({
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
		});
		$scope.formula = f;
		$scope.clean_data = '';
		$scope.formulaRecompile = false;
		$scope.calculate = function() {
			var data = JSON.parse($scope.clean_data);
			$scope.formula = new Formula(data.formula ? data : {'formula': data});
			$scope.formulaRecompile = true;
		};

	}]);

	app
    .filter('formulaOperator', function() {
        return formatOperator;
    })
    .filter('formulaCurrency', function() {
        return formulaCurrency;
    }).filter('formulaNumberFormat', function() {
        return formulaNumberFormat;
    })
    .filter('formulaValue', function() {
        return formulaValue;
    })
    .directive('formulaHint', formulaHint)
    .directive('formulaPart', formulaPart)
    .directive('formula', formulaDirective);


	var Formula = function(data) {
	    var operatorBinding = {
	        '-': 'minus',
	        '+': 'plus',
	        '*': 'multiply',
	        '/': 'divide',
	        '%': 'percent',
	        '(': 'bracket',
	        '=': 'eq',
	        '': 'block'
	    };

	    this.hints = [];
	    this._hintById = {};
	    this._idStart = new Date().getTime();

	    this.genId = function() {
	        return ++this._idStart;
	    };

	    this.prepareHintText = function(hint) {
	        hint.parts = hint.text.split('{}').map(function(item, index) {
	            var part = {
	                'text': item
	            };
	            if (hint.args && hint.args[index]) {
	                part.value = hint.args[index];
	            }
	            return part;
	        });
	        return hint;
	    };

	    this.value = function(item) {
	        if (item.left) {
	            this.value(item.left);
	        }
	        if (item.right) {
	            this.value(item.right);
	        }
	        if (item.left || item.right) {
	            item.partType = 'operator';
	            item.op = operatorBinding[item.value] || 'unknown';
	        }
	        if (item.hint) {
	            if (item.hint.link_to) {
	                item.hint = this._hintById[item.hint.link_to];
	            } else {
	                item.hint.value = this.plain(item);
	                item.hint.toggle = function(value, who) {
	                    this.shine = value;
	                    this.partId = who || 'all';
	                };
	                this.hints.push(this.prepareHintText(item.hint));
	                if (item.hint.link_id) {
	                    this._hintById[item.hint.link_id] = item.hint;
	                }
	            }
	        }
	        item.genid = this.genId();
	        return item;
	    };

	    this.plain = function(item) {
	        var result = '';
	        if (item.left) {
	            result += this.plain(item.left) + (item.right ? ' ' : '');
	        }
	        result += formulaNumberFormat(formatOperator(item.value));
	        if (item.right) {
	            result += (item.left ? ' ' : '') + this.plain(item.right);
	        }
	        if (item.value === '(') {
	            result += ')';
	        }
	        return result;
	    };

	    if (data.hint_before) {
	        this.hints = this.hints.concat(data.hint_before.map(this.prepareHintText));
	    }

	    this.text = this.value(data.formula);
	    this.header = data.header;

	    if (data.hint_after) {
	        this.hints = this.hints.concat(data.hint_after.map(this.prepareHintText));
	    }
	};


	function formatOperator(input) {
	    if (input === '*') {
	        return '×';
	    } else if (input === '-') {
	        return '–';
	    }
	    return input;
	}

	function formulaCurrency(input) {
	    if (input.attrs && input.attrs.currency) {
	        return input.attrs.currency;
	    }
	    return '';
	}

	function formulaNumberFormat(value) {
	    if (!value || isNaN(Math.ceil(value))) {
	        return value;
	    }

	    value = String(value).replace(',', '.');
	    value = Math.ceil(value * 100) / 100;
	    value = String(value).split('.');

	    if (value.length > 1) {
	        //если пришло число типа 1.2, добавляем к копейкам ноль
	        value[1] = value[1].length === 1 ? value[1] + '0' : value[1];
	    }

	    return value[0].replace(/(\d)(?=(?:\d{3})+$)/g, '$1 ') + (+value[1] ? ',' + value[1] : '');
	}

	function formulaValue(item) {
	    return formulaNumberFormat(item.value) + (item.attrs && item.attrs.currency ? ' ' + item.attrs.currency : '');
	}

	function formulaHint() {
	    return {
	        restrict: 'E',
	        replace: true,
	        templateUrl: 'formula-hint.html'
	    };
	}

	function formulaPart($compile) {
	    var leftPart = '<formula-part part="part.left"></formula-part>';
	    var rightPart = '<formula-part part="part.right"></formula-part>';
	    var $leftPart, $rightPart;

	    return {
	        restrict: 'E',
	        replace: true,
	        scope: {
	            part: '='
	        },
	        templateUrl: 'formula-part.html',
	        link: function (scope, element) {
	            $leftPart = $leftPart || $compile(leftPart);
	            $rightPart = $rightPart || $compile(rightPart);

	            if (scope.part.left) {
	                $leftPart(scope, function(cloned) {
	                    element.prepend(cloned);
	                });
	            }
	            if (scope.part.right) {
	                $rightPart(scope, function(cloned) {
	                    element.append(cloned);
	                });
	            }
	        }
	    };
	}

	function formulaDirective($compile, $parse) {
	    var removeAllWatchers = function(element) {
	        if (element.data().hasOwnProperty('$scope')) {
	            element.data().$scope.$$watchers = [];
	        }
	        removeChildrenWatchers(element);
	    };

	    var removeChildrenWatchers = function(element) {
	        angular.forEach(element.children(), function(childElement) {
	            removeAllWatchers(angular.element(childElement));
	        });
	    };

	    return {
	        restrict: 'E',
	        replace: true,
	        scope: {
	            formula: '='
	        },
	        templateUrl: 'formula.html',
	        compile: function(el) {
	            var template = el.html();

	            return function link(scope, $el, attrs) {
	                scope.$parent.$watch(attrs.recompile, function(_new, _old) {
	                    var useBoolean = attrs.hasOwnProperty('useBoolean');
	                    if ((useBoolean && (!_new || _new === 'false')) || (!useBoolean && (!_new || _new === _old))) {
	                        return;
	                    }

	                    // remove all watchers because the recompiled version will set them up again.
	                    removeChildrenWatchers($el);

	                    // reset recompile to false if we're using a boolean
	                    if (useBoolean) {
	                        $parse(attrs.recompile).assign(scope.$parent, false);
	                    }

	                    // recompile
	                    var newEl = $compile(template)(scope.$parent.$new());
	                    $el.html('').append(newEl);
	                });
	            };
	        }
	    };
	}

})();