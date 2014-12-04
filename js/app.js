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
										}]
									},
									"left": {
										"value": "624000",
										"hint": {
											"text": "лимит базы для начисления взносов в 2014 году"
										}
									},
									"right": {
										"value": "604000",
										"hint": {
											"text": "начислено с января по июнь"
										}
									}	
								}	
							}
						}
					},
					"right": {
						"value": "%",
						"left": {
							"value": "10"
						},
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
							"left":	{
								"value": "624000"
							},
							"right": {
								"value": "604000"
							}
						}
					},
					"right": {
						"value": "%",
						"left": {
							"value": "22"
						},
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
	var Formula = function(data) {
		this.hints = [];
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
			hint.toggle = function(value) {
				this.shine = value;
			};
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
				item.hint.value = this.plain(item);
				this.hints.push(this.prepareHintText(item.hint));
			}
			item.genid = this.genId();
		    return item;
		};

		this.plain = function(item) {
			var result = '';
			if (item.left) {
				result += this.plain(item.left) + (item.right ? ' ' : '');
			}
			result += formatOperator(item.value);
			if (item.right) {
				result += (item.left ? ' ' : '') + this.plain(item.right);
			}
			if (item.value === '(') {
				result += ')';
			}
			return result;
		}

		if (data.hint_before) {
			this.hints = this.hints.concat(data.hint_before.map(this.prepareHintText));
		}

		this.text = this.value(data.formula);
		this.header = data.header;

		if (data.hint_after) {
			this.hints = this.hints.concat(data.hint_after.map(this.prepareHintText));
		}
		//console.log(this.text);
		//console.log(this.hints);
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
			$scope.formula = new Formula(JSON.parse($scope.clean_data));
			$scope.formulaRecompile = true;
		};

	}]);

	app.directive('formula', function($compile, $parse) {
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
	});

	app.directive('formulaPart', function($compile) {
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
			link: function (scope, element, attrs) {
				$leftPart = $leftPart || $compile(leftPart);
				$rightPart = $rightPart || $compile(rightPart);

				if (scope.part.left) {
					$leftPart(scope, function(cloned, s) {
  	  	     	  		element.prepend(cloned); 
  	  	  	  	  	});
				}
				if (scope.part.right) {
					$rightPart(scope, function(cloned, s) {
						element.append(cloned);
  	  	  	  	  	});
				}
			}
		};
	});

	app.directive('formulaHint', function() {
		return {
			restrict: 'E',
			replace: true,
			templateUrl: 'formula-hint.html'
		};
	});

	var formatOperator = function(input) {
		if (input === '*') {
  			return '×';
  		} else if (input === '-') {
  			return '–';
  		}	
    	return input;
  	};

	app.filter('formulaOperator', function() {
		return formatOperator;
	});

	app.filter('formulaCurrency', function() {
	  return function(input) {
	  	if (input.attrs && input.attrs.currency) {
	  		return input.attrs.currency;
	  	}
	    return '';
	  };
	});

})();