(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.coverflow = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/coverflow.js');

},{"./lib/coverflow.js":2}],2:[function(require,module,exports){
'use strict';

require('./raf.lib.js');
require('./wheelEvent.lib.js');
var createStyleSheet = require('./createStyleSheet.js');

var count, images, dim, offset, center, angle, dist, shift,
    pressed, reference, amplitude, target, velocity, timeConstant,
    xform, frame, timestamp, ticker, oldActiveIndex, starttimestamp, tapMaxConstant,
    onActiveClick, onChange, view, viewHeight;

function initialize(container, options) {
  options = options || {};
  pressed = false;
  oldActiveIndex = 0;
  timeConstant = options.timeConstant || 250; // ms
  tapMaxConstant = options.tapMaxConstant || 150; // ms
  offset = target = 0;
  reference = amplitude = velocity = frame = undefined;
  angle = options.angle || -60;
  dist = options.angle || -150;
  shift = options.shift || 10;
  onActiveClick = options.onActiveClick || function () {};
  onChange = options.onChange || function () {};
  container = (typeof container === 'string') ? document.getElementById(container) : container;
  count = container.children.length;
  images = [];
  while (images.length < count) images.push(container.children.item(images.length));
  var maxHeight = 0, maxWidth = 0;
  var tagName = options.tagName || images[0].tagName;
  images.map(function (el, index) {
    el.onclick = function (e) {
      flowTo(index);
      e.preventDefault();
      e.stopPropagation();
    };
    maxHeight = maxHeight > el.scrollHeight ? maxHeight : el.scrollHeight;
    maxWidth = maxWidth > el.style.width ? maxWidth : el.style.width;
  });
  maxHeight = options.maxHeight || maxHeight;
  maxWidth = options.maxWidth || maxWidth;
  container.className += ' coverflow';
  container.style.height = maxHeight * 1.1;
  createStyleSheet(tagName, maxHeight, maxWidth);
  images.map(function (el, index) {
    maxHeight = maxHeight > el.scrollHeight ? maxHeight : el.scrollHeight;
    maxWidth = maxWidth > el.scrollWidth ? maxWidth : el.scrollWidth;
  });
  viewHeight = maxHeight * 1.1;
  dim = maxWidth;
  view = container;
  scroll(offset);
  setupEvents(container);
}

function setupEvents() {
  if (view) {
    if (typeof window.ontouchstart !== 'undefined') {
      view.addEventListener('touchstart', tap);
      view.addEventListener('touchmove', drag);
      view.addEventListener('touchend', release);
      view.addEventListener('touchcancel', release);
    }
    addWheelListener(view, wheel);
    view.addEventListener('mousedown', tap);
    view.addEventListener('mousemove', drag);
    view.addEventListener('mouseup', release);
  }
}

function wheel(e) {
  if (e.deltaY > 0) setActive(getActiveIndex() + 1);
  else if (e.deltaY < 0) setActive(getActiveIndex() - 1);
  changed(getActiveIndex());
}

function xpos(e) {
  // touch event
  if (e.targetTouches && (e.targetTouches.length >= 1)) {
    return e.targetTouches[0].clientX;
  }

  // mouse event
  return e.clientX;
}

function wrap(x) {
  return (x >= count) ? (x % count) : (x < 0) ? wrap(count + (x % count)) : x;
}

function scroll(x) {
  var i, half, delta, dir, tween, el, alignment;

  offset = (typeof x === 'number') ? x : offset;
  center = Math.floor((offset + dim / 2) / dim);
  delta = offset - center * dim;
  dir = (delta < 0) ? 1 : -1;
  tween = -dir * delta * 2 / dim;

  alignment = 'translateX(' + (view.clientWidth - dim) / 2 + 'px) ';
  alignment += 'translateY(' + (viewHeight - dim) / 2 + 'px)';

  // center
  el = images[wrap(center)];
  if (el) {
    el.style[xform] = alignment +
      ' translateX(' + (-delta / 2) + 'px)' +
      ' translateX(' + (dir * shift * tween) + 'px)' +
      ' translateZ(' + (dist * tween) + 'px)' +
      ' rotateY(' + (dir * angle * tween) + 'deg)';
    el.style.zIndex = 0;
    el.style.opacity = 1;
  }

  half = count >> 1;
  for (i = 1; i <= half; ++i) {
    // right side
    el = images[wrap(center + i)];
    if (el) {
      el.style[xform] = alignment +
        ' translateX(' + (shift + (dim * i - delta) / 2) + 'px)' +
        ' translateZ(' + dist + 'px)' +
        ' rotateY(' + angle + 'deg)';
      el.style.zIndex = -i;
      el.style.opacity = (i === half && delta < 0) ? 1 - tween : 1;
    }

    // left side
    el = images[wrap(center - i)];
    if (el) {
      el.style[xform] = alignment +
        ' translateX(' + (-shift + (-dim * i - delta) / 2) + 'px)' +
        ' translateZ(' + dist + 'px)' +
        ' rotateY(' + -angle + 'deg)';
      el.style.zIndex = -i;
      el.style.opacity = (i === half && delta > 0) ? 1 - tween : 1;
    }
  }

  // center
  el = images[wrap(center)];
  if (el) {
    el.style[xform] = alignment +
      ' translateX(' + (-delta / 2) + 'px)' +
      ' translateX(' + (dir * shift * tween) + 'px)' +
      ' translateZ(' + (dist * tween) + 'px)' +
      ' rotateY(' + (dir * angle * tween) + 'deg)';
    el.style.zIndex = 0;
    el.style.opacity = 1;
  }
}

function track() {
  var now, elapsed, delta, v;

  now = Date.now();
  elapsed = now - timestamp;
  timestamp = now;
  delta = offset - frame;
  frame = offset;

  v = 1000 * delta / (1 + elapsed);
  velocity = 0.8 * v + 0.2 * velocity;
}

function autoScroll() {
  var elapsed, delta;

  if (amplitude) {
    elapsed = Date.now() - timestamp;
    delta = amplitude * Math.exp(-elapsed / timeConstant);
    if (delta > 4 || delta < -4) {
      scroll(target - delta);
      requestAnimationFrame(autoScroll);
    } else  {
      scroll(target);
      changed(getActiveIndex());
    }
  }
}

function tap(e) {
  pressed = true;
  reference = xpos(e);

  velocity = amplitude = 0;
  frame = offset;
  timestamp = Date.now();
  starttimestamp = timestamp;
  clearInterval(ticker);
  ticker = setInterval(track, 50);

  // allow touch devices to handle click event but dont allow dragging on desktops
  if (e.type == 'mousedown') e.preventDefault();
  e.stopPropagation();
  // allow touch devices to handle click event but dont allow dragging on desktops
  if (e.type == 'mousedown') return false;
}

function drag(e) {
  var x, delta;
  if (pressed) {
    x = xpos(e);
    delta = reference - x;
    if (delta > 2 || delta < -2) {
      reference = x;
      scroll(offset + delta);
    }
  }
  e.preventDefault();
  e.stopPropagation();
  return false;
}

function release(e) {
  pressed = false;

  clearInterval(ticker);
  target = offset;
  timestamp = Date.now();
  if (velocity > 10 || velocity < -10) {
    amplitude = 0.9 * velocity;
    target = offset + amplitude;
    target = Math.round(target / dim) * dim;
    amplitude = target - offset;
    requestAnimationFrame(autoScroll);

    e.preventDefault();
    e.stopPropagation();
    return false;
  } else if (timestamp - starttimestamp > tapMaxConstant) { // Snap to nearest element
    target = Math.round(target / dim) * dim;
    amplitude = target - offset;
    requestAnimationFrame(autoScroll);

    e.preventDefault();
    e.stopPropagation();
    return false;
  } else {
    var newtarget = Math.round(target / dim) * dim;
    amplitude = newtarget - target;
    target = newtarget;
    requestAnimationFrame(autoScroll);
  }
}

function handleKey(e) {
  if (!pressed && (target === offset)) {
    // Space or PageDown or RightArrow or DownArrow
    if ([32, 34, 39, 40].indexOf(e.which) >= 0) {
      target = offset + dim;
    }
    // PageUp or LeftArrow or UpArrow
    if ([33, 37, 38].indexOf(e.which) >= 0) {
      target = offset - dim;
    }
    if (offset !== target) {
      amplitude = target - offset;
      timestamp = Date.now();
      requestAnimationFrame(autoScroll);
      return true;
    }
  }
}

function flowTo(to) {
  var centerIndex = getActiveIndex();
  if (to == centerIndex) {
    onActiveClick(centerIndex);
  } else {
    var offsetPosition;
    if (to - centerIndex > (count - 1)/2) offsetPosition = (to - centerIndex) - count;
    else if (to - centerIndex <= -(count - 1)/2) offsetPosition = (to - centerIndex) + count;
    else offsetPosition = to - centerIndex;
    target = offset + offsetPosition * dim;
    amplitude = target - offset;
    timestamp = Date.now();
    requestAnimationFrame(autoScroll);
    return true;
  }
}

function setActive(to) {
  target = dim * to;
  scroll(dim * to);
}

function getActiveIndex() {
  var centerIndex = center % count;
  while (centerIndex < 0) centerIndex += count;
  return centerIndex;
}

function getActiveElement() {
  return images[getActiveIndex()];
}

function getActiveId() {
  return images[getActiveIndex()].id;
}

function changed(to) {
  if (oldActiveIndex != to) {
    onChange(to, oldActiveIndex);
    oldActiveIndex = to;
  }
}

xform = 'transform';
['webkit', 'Moz', 'O', 'ms'].every(function (prefix) {
  var e = prefix + 'Transform';
  if (typeof document.body.style[e] !== 'undefined') {
    xform = e;
    return false;
  }
  return true;
});

document.addEventListener('keydown', handleKey);
window.addEventListener('resize', scroll);

module.exports = {
  initialize: initialize,
  flowTo: flowTo,
  setActive: setActive,
  getActiveId: getActiveId,
  getActiveElement: getActiveElement,
  getActiveIndex: getActiveIndex
};

},{"./createStyleSheet.js":3,"./raf.lib.js":4,"./wheelEvent.lib.js":5}],3:[function(require,module,exports){
module.exports = function (tagName, maxHeight, maxWidth) {
  var style = document.createElement("style");
  var str = "\
    .coverflow {\
        overflow: hidden;\
        perspective: 1000px;\
        -webkit-perspective: 1000px;\
        transform-style: preserve-3d;\
        -webkit-transform-style: preserve-3d;\
    }\
    \
    .coverflow > " + tagName + " {" +
    ((maxHeight) ? "   height : " + maxHeight + "px;" : "") +
    ((maxWidth) ? "   width : " + maxWidth + "px;" : "") +
    "   position: absolute;\
        top: 0;\
        left: 0;\
        opacity: 0;\
        border: none;\
    }\
  ";
  style.appendChild(document.createTextNode(str));
  document.head.appendChild(style);
}

},{}],4:[function(require,module,exports){
/*
 * raf.js
 * https://github.com/ngryman/raf.js
 *
 * original requestAnimationFrame polyfill by Erik Möller
 * inspired from paul_irish gist and post
 *
 * Copyright (c) 2013 ngryman
 * Licensed under the MIT license.
 */

(function(window) {
	var lastTime = 0,
		vendors = ['webkit', 'moz'],
		requestAnimationFrame = window.requestAnimationFrame,
		cancelAnimationFrame = window.cancelAnimationFrame,
		i = vendors.length;

	// try to un-prefix existing raf
	while (--i >= 0 && !requestAnimationFrame) {
		requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
		cancelAnimationFrame = window[vendors[i] + 'CancelRequestAnimationFrame'];
	}

	// polyfill with setTimeout fallback
	// heavily inspired from @darius gist mod: https://gist.github.com/paulirish/1579671#comment-837945
	if (!requestAnimationFrame || !cancelAnimationFrame) {
		requestAnimationFrame = function(callback) {
			var now = +Date.now(),
				nextTime = Math.max(lastTime + 16, now);
			return setTimeout(function() {
				callback(lastTime = nextTime);
			}, nextTime - now);
		};

		cancelAnimationFrame = clearTimeout;
	}

	// export to window
	window.requestAnimationFrame = requestAnimationFrame;
	window.cancelAnimationFrame = cancelAnimationFrame;
}(window));

},{}],5:[function(require,module,exports){
// https://developer.mozilla.org/en-US/docs/Web/Events/wheel#Listening_to_this_event_across_browser
// creates a global "addWheelListener" method
// example: addWheelListener( elem, function( e ) { console.log( e.deltaY ); e.preventDefault(); } );
(function(window,document) {

    var prefix = "", _addEventListener, support;

    // detect event model
    if ( window.addEventListener ) {
        _addEventListener = "addEventListener";
    } else {
        _addEventListener = "attachEvent";
        prefix = "on";
    }

    // detect available wheel event
    support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
              document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
              "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

    window.addWheelListener = function( elem, callback, useCapture ) {
        _addWheelListener( elem, support, callback, useCapture );

        // handle MozMousePixelScroll in older Firefox
        if( support == "DOMMouseScroll" ) {
            _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
        }
    };

    function _addWheelListener( elem, eventName, callback, useCapture ) {
        elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
            !originalEvent && ( originalEvent = window.event );

            // create a normalized event object
            var event = {
                // keep a ref to the original event object
                originalEvent: originalEvent,
                target: originalEvent.target || originalEvent.srcElement,
                type: "wheel",
                deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
                deltaX: 0,
                deltaZ: 0,
                preventDefault: function() {
                    originalEvent.preventDefault ?
                        originalEvent.preventDefault() :
                        originalEvent.returnValue = false;
                }
            };

            // calculate deltaY (and deltaX) according to the event
            if ( support == "mousewheel" ) {
                event.deltaY = - 1/40 * originalEvent.wheelDelta;
                // Webkit also support wheelDeltaX
                originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
            } else {
                event.deltaY = originalEvent.detail;
            }

            // it's time to fire the callback
            return callback( event );

        }, useCapture || false );
    }

})(window,document);

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb3ZlcmZsb3cuanMiLCJsaWIvY3JlYXRlU3R5bGVTaGVldC5qcyIsImxpYi9yYWYubGliLmpzIiwibGliL3doZWVsRXZlbnQubGliLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvY292ZXJmbG93LmpzJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJy4vcmFmLmxpYi5qcycpO1xucmVxdWlyZSgnLi93aGVlbEV2ZW50LmxpYi5qcycpO1xudmFyIGNyZWF0ZVN0eWxlU2hlZXQgPSByZXF1aXJlKCcuL2NyZWF0ZVN0eWxlU2hlZXQuanMnKTtcblxudmFyIGNvdW50LCBpbWFnZXMsIGRpbSwgb2Zmc2V0LCBjZW50ZXIsIGFuZ2xlLCBkaXN0LCBzaGlmdCxcbiAgICBwcmVzc2VkLCByZWZlcmVuY2UsIGFtcGxpdHVkZSwgdGFyZ2V0LCB2ZWxvY2l0eSwgdGltZUNvbnN0YW50LFxuICAgIHhmb3JtLCBmcmFtZSwgdGltZXN0YW1wLCB0aWNrZXIsIG9sZEFjdGl2ZUluZGV4LCBzdGFydHRpbWVzdGFtcCwgdGFwTWF4Q29uc3RhbnQsXG4gICAgb25BY3RpdmVDbGljaywgb25DaGFuZ2UsIHZpZXcsIHZpZXdIZWlnaHQ7XG5cbmZ1bmN0aW9uIGluaXRpYWxpemUoY29udGFpbmVyLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBwcmVzc2VkID0gZmFsc2U7XG4gIG9sZEFjdGl2ZUluZGV4ID0gMDtcbiAgdGltZUNvbnN0YW50ID0gb3B0aW9ucy50aW1lQ29uc3RhbnQgfHwgMjUwOyAvLyBtc1xuICB0YXBNYXhDb25zdGFudCA9IG9wdGlvbnMudGFwTWF4Q29uc3RhbnQgfHwgMTUwOyAvLyBtc1xuICBvZmZzZXQgPSB0YXJnZXQgPSAwO1xuICByZWZlcmVuY2UgPSBhbXBsaXR1ZGUgPSB2ZWxvY2l0eSA9IGZyYW1lID0gdW5kZWZpbmVkO1xuICBhbmdsZSA9IG9wdGlvbnMuYW5nbGUgfHwgLTYwO1xuICBkaXN0ID0gb3B0aW9ucy5hbmdsZSB8fCAtMTUwO1xuICBzaGlmdCA9IG9wdGlvbnMuc2hpZnQgfHwgMTA7XG4gIG9uQWN0aXZlQ2xpY2sgPSBvcHRpb25zLm9uQWN0aXZlQ2xpY2sgfHwgZnVuY3Rpb24gKCkge307XG4gIG9uQ2hhbmdlID0gb3B0aW9ucy5vbkNoYW5nZSB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgY29udGFpbmVyID0gKHR5cGVvZiBjb250YWluZXIgPT09ICdzdHJpbmcnKSA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcikgOiBjb250YWluZXI7XG4gIGNvdW50ID0gY29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aDtcbiAgaW1hZ2VzID0gW107XG4gIHdoaWxlIChpbWFnZXMubGVuZ3RoIDwgY291bnQpIGltYWdlcy5wdXNoKGNvbnRhaW5lci5jaGlsZHJlbi5pdGVtKGltYWdlcy5sZW5ndGgpKTtcbiAgdmFyIG1heEhlaWdodCA9IDAsIG1heFdpZHRoID0gMDtcbiAgdmFyIHRhZ05hbWUgPSBvcHRpb25zLnRhZ05hbWUgfHwgaW1hZ2VzWzBdLnRhZ05hbWU7XG4gIGltYWdlcy5tYXAoZnVuY3Rpb24gKGVsLCBpbmRleCkge1xuICAgIGVsLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgZmxvd1RvKGluZGV4KTtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfTtcbiAgICBtYXhIZWlnaHQgPSBtYXhIZWlnaHQgPiBlbC5zY3JvbGxIZWlnaHQgPyBtYXhIZWlnaHQgOiBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgbWF4V2lkdGggPSBtYXhXaWR0aCA+IGVsLnN0eWxlLndpZHRoID8gbWF4V2lkdGggOiBlbC5zdHlsZS53aWR0aDtcbiAgfSk7XG4gIG1heEhlaWdodCA9IG9wdGlvbnMubWF4SGVpZ2h0IHx8IG1heEhlaWdodDtcbiAgbWF4V2lkdGggPSBvcHRpb25zLm1heFdpZHRoIHx8IG1heFdpZHRoO1xuICBjb250YWluZXIuY2xhc3NOYW1lICs9ICcgY292ZXJmbG93JztcbiAgY29udGFpbmVyLnN0eWxlLmhlaWdodCA9IG1heEhlaWdodCAqIDEuMTtcbiAgY3JlYXRlU3R5bGVTaGVldCh0YWdOYW1lLCBtYXhIZWlnaHQsIG1heFdpZHRoKTtcbiAgaW1hZ2VzLm1hcChmdW5jdGlvbiAoZWwsIGluZGV4KSB7XG4gICAgbWF4SGVpZ2h0ID0gbWF4SGVpZ2h0ID4gZWwuc2Nyb2xsSGVpZ2h0ID8gbWF4SGVpZ2h0IDogZWwuc2Nyb2xsSGVpZ2h0O1xuICAgIG1heFdpZHRoID0gbWF4V2lkdGggPiBlbC5zY3JvbGxXaWR0aCA/IG1heFdpZHRoIDogZWwuc2Nyb2xsV2lkdGg7XG4gIH0pO1xuICB2aWV3SGVpZ2h0ID0gbWF4SGVpZ2h0ICogMS4xO1xuICBkaW0gPSBtYXhXaWR0aDtcbiAgdmlldyA9IGNvbnRhaW5lcjtcbiAgc2Nyb2xsKG9mZnNldCk7XG4gIHNldHVwRXZlbnRzKGNvbnRhaW5lcik7XG59XG5cbmZ1bmN0aW9uIHNldHVwRXZlbnRzKCkge1xuICBpZiAodmlldykge1xuICAgIGlmICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRhcCk7XG4gICAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGRyYWcpO1xuICAgICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHJlbGVhc2UpO1xuICAgICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGNhbmNlbCcsIHJlbGVhc2UpO1xuICAgIH1cbiAgICBhZGRXaGVlbExpc3RlbmVyKHZpZXcsIHdoZWVsKTtcbiAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRhcCk7XG4gICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnKTtcbiAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCByZWxlYXNlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3aGVlbChlKSB7XG4gIGlmIChlLmRlbHRhWSA+IDApIHNldEFjdGl2ZShnZXRBY3RpdmVJbmRleCgpICsgMSk7XG4gIGVsc2UgaWYgKGUuZGVsdGFZIDwgMCkgc2V0QWN0aXZlKGdldEFjdGl2ZUluZGV4KCkgLSAxKTtcbiAgY2hhbmdlZChnZXRBY3RpdmVJbmRleCgpKTtcbn1cblxuZnVuY3Rpb24geHBvcyhlKSB7XG4gIC8vIHRvdWNoIGV2ZW50XG4gIGlmIChlLnRhcmdldFRvdWNoZXMgJiYgKGUudGFyZ2V0VG91Y2hlcy5sZW5ndGggPj0gMSkpIHtcbiAgICByZXR1cm4gZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFg7XG4gIH1cblxuICAvLyBtb3VzZSBldmVudFxuICByZXR1cm4gZS5jbGllbnRYO1xufVxuXG5mdW5jdGlvbiB3cmFwKHgpIHtcbiAgcmV0dXJuICh4ID49IGNvdW50KSA/ICh4ICUgY291bnQpIDogKHggPCAwKSA/IHdyYXAoY291bnQgKyAoeCAlIGNvdW50KSkgOiB4O1xufVxuXG5mdW5jdGlvbiBzY3JvbGwoeCkge1xuICB2YXIgaSwgaGFsZiwgZGVsdGEsIGRpciwgdHdlZW4sIGVsLCBhbGlnbm1lbnQ7XG5cbiAgb2Zmc2V0ID0gKHR5cGVvZiB4ID09PSAnbnVtYmVyJykgPyB4IDogb2Zmc2V0O1xuICBjZW50ZXIgPSBNYXRoLmZsb29yKChvZmZzZXQgKyBkaW0gLyAyKSAvIGRpbSk7XG4gIGRlbHRhID0gb2Zmc2V0IC0gY2VudGVyICogZGltO1xuICBkaXIgPSAoZGVsdGEgPCAwKSA/IDEgOiAtMTtcbiAgdHdlZW4gPSAtZGlyICogZGVsdGEgKiAyIC8gZGltO1xuXG4gIGFsaWdubWVudCA9ICd0cmFuc2xhdGVYKCcgKyAodmlldy5jbGllbnRXaWR0aCAtIGRpbSkgLyAyICsgJ3B4KSAnO1xuICBhbGlnbm1lbnQgKz0gJ3RyYW5zbGF0ZVkoJyArICh2aWV3SGVpZ2h0IC0gZGltKSAvIDIgKyAncHgpJztcblxuICAvLyBjZW50ZXJcbiAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIpXTtcbiAgaWYgKGVsKSB7XG4gICAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAgICcgdHJhbnNsYXRlWCgnICsgKC1kZWx0YSAvIDIpICsgJ3B4KScgK1xuICAgICAgJyB0cmFuc2xhdGVYKCcgKyAoZGlyICogc2hpZnQgKiB0d2VlbikgKyAncHgpJyArXG4gICAgICAnIHRyYW5zbGF0ZVooJyArIChkaXN0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICAgJyByb3RhdGVZKCcgKyAoZGlyICogYW5nbGUgKiB0d2VlbikgKyAnZGVnKSc7XG4gICAgZWwuc3R5bGUuekluZGV4ID0gMDtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gMTtcbiAgfVxuXG4gIGhhbGYgPSBjb3VudCA+PiAxO1xuICBmb3IgKGkgPSAxOyBpIDw9IGhhbGY7ICsraSkge1xuICAgIC8vIHJpZ2h0IHNpZGVcbiAgICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlciArIGkpXTtcbiAgICBpZiAoZWwpIHtcbiAgICAgIGVsLnN0eWxlW3hmb3JtXSA9IGFsaWdubWVudCArXG4gICAgICAgICcgdHJhbnNsYXRlWCgnICsgKHNoaWZ0ICsgKGRpbSAqIGkgLSBkZWx0YSkgLyAyKSArICdweCknICtcbiAgICAgICAgJyB0cmFuc2xhdGVaKCcgKyBkaXN0ICsgJ3B4KScgK1xuICAgICAgICAnIHJvdGF0ZVkoJyArIGFuZ2xlICsgJ2RlZyknO1xuICAgICAgZWwuc3R5bGUuekluZGV4ID0gLWk7XG4gICAgICBlbC5zdHlsZS5vcGFjaXR5ID0gKGkgPT09IGhhbGYgJiYgZGVsdGEgPCAwKSA/IDEgLSB0d2VlbiA6IDE7XG4gICAgfVxuXG4gICAgLy8gbGVmdCBzaWRlXG4gICAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIgLSBpKV07XG4gICAgaWYgKGVsKSB7XG4gICAgICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICAgICAnIHRyYW5zbGF0ZVgoJyArICgtc2hpZnQgKyAoLWRpbSAqIGkgLSBkZWx0YSkgLyAyKSArICdweCknICtcbiAgICAgICAgJyB0cmFuc2xhdGVaKCcgKyBkaXN0ICsgJ3B4KScgK1xuICAgICAgICAnIHJvdGF0ZVkoJyArIC1hbmdsZSArICdkZWcpJztcbiAgICAgIGVsLnN0eWxlLnpJbmRleCA9IC1pO1xuICAgICAgZWwuc3R5bGUub3BhY2l0eSA9IChpID09PSBoYWxmICYmIGRlbHRhID4gMCkgPyAxIC0gdHdlZW4gOiAxO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNlbnRlclxuICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlcildO1xuICBpZiAoZWwpIHtcbiAgICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICAgJyB0cmFuc2xhdGVYKCcgKyAoLWRlbHRhIC8gMikgKyAncHgpJyArXG4gICAgICAnIHRyYW5zbGF0ZVgoJyArIChkaXIgKiBzaGlmdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAgICcgdHJhbnNsYXRlWignICsgKGRpc3QgKiB0d2VlbikgKyAncHgpJyArXG4gICAgICAnIHJvdGF0ZVkoJyArIChkaXIgKiBhbmdsZSAqIHR3ZWVuKSArICdkZWcpJztcbiAgICBlbC5zdHlsZS56SW5kZXggPSAwO1xuICAgIGVsLnN0eWxlLm9wYWNpdHkgPSAxO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyYWNrKCkge1xuICB2YXIgbm93LCBlbGFwc2VkLCBkZWx0YSwgdjtcblxuICBub3cgPSBEYXRlLm5vdygpO1xuICBlbGFwc2VkID0gbm93IC0gdGltZXN0YW1wO1xuICB0aW1lc3RhbXAgPSBub3c7XG4gIGRlbHRhID0gb2Zmc2V0IC0gZnJhbWU7XG4gIGZyYW1lID0gb2Zmc2V0O1xuXG4gIHYgPSAxMDAwICogZGVsdGEgLyAoMSArIGVsYXBzZWQpO1xuICB2ZWxvY2l0eSA9IDAuOCAqIHYgKyAwLjIgKiB2ZWxvY2l0eTtcbn1cblxuZnVuY3Rpb24gYXV0b1Njcm9sbCgpIHtcbiAgdmFyIGVsYXBzZWQsIGRlbHRhO1xuXG4gIGlmIChhbXBsaXR1ZGUpIHtcbiAgICBlbGFwc2VkID0gRGF0ZS5ub3coKSAtIHRpbWVzdGFtcDtcbiAgICBkZWx0YSA9IGFtcGxpdHVkZSAqIE1hdGguZXhwKC1lbGFwc2VkIC8gdGltZUNvbnN0YW50KTtcbiAgICBpZiAoZGVsdGEgPiA0IHx8IGRlbHRhIDwgLTQpIHtcbiAgICAgIHNjcm9sbCh0YXJnZXQgLSBkZWx0YSk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgfSBlbHNlICB7XG4gICAgICBzY3JvbGwodGFyZ2V0KTtcbiAgICAgIGNoYW5nZWQoZ2V0QWN0aXZlSW5kZXgoKSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRhcChlKSB7XG4gIHByZXNzZWQgPSB0cnVlO1xuICByZWZlcmVuY2UgPSB4cG9zKGUpO1xuXG4gIHZlbG9jaXR5ID0gYW1wbGl0dWRlID0gMDtcbiAgZnJhbWUgPSBvZmZzZXQ7XG4gIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gIHN0YXJ0dGltZXN0YW1wID0gdGltZXN0YW1wO1xuICBjbGVhckludGVydmFsKHRpY2tlcik7XG4gIHRpY2tlciA9IHNldEludGVydmFsKHRyYWNrLCA1MCk7XG5cbiAgLy8gYWxsb3cgdG91Y2ggZGV2aWNlcyB0byBoYW5kbGUgY2xpY2sgZXZlbnQgYnV0IGRvbnQgYWxsb3cgZHJhZ2dpbmcgb24gZGVza3RvcHNcbiAgaWYgKGUudHlwZSA9PSAnbW91c2Vkb3duJykgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAvLyBhbGxvdyB0b3VjaCBkZXZpY2VzIHRvIGhhbmRsZSBjbGljayBldmVudCBidXQgZG9udCBhbGxvdyBkcmFnZ2luZyBvbiBkZXNrdG9wc1xuICBpZiAoZS50eXBlID09ICdtb3VzZWRvd24nKSByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGRyYWcoZSkge1xuICB2YXIgeCwgZGVsdGE7XG4gIGlmIChwcmVzc2VkKSB7XG4gICAgeCA9IHhwb3MoZSk7XG4gICAgZGVsdGEgPSByZWZlcmVuY2UgLSB4O1xuICAgIGlmIChkZWx0YSA+IDIgfHwgZGVsdGEgPCAtMikge1xuICAgICAgcmVmZXJlbmNlID0geDtcbiAgICAgIHNjcm9sbChvZmZzZXQgKyBkZWx0YSk7XG4gICAgfVxuICB9XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZWxlYXNlKGUpIHtcbiAgcHJlc3NlZCA9IGZhbHNlO1xuXG4gIGNsZWFySW50ZXJ2YWwodGlja2VyKTtcbiAgdGFyZ2V0ID0gb2Zmc2V0O1xuICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICBpZiAodmVsb2NpdHkgPiAxMCB8fCB2ZWxvY2l0eSA8IC0xMCkge1xuICAgIGFtcGxpdHVkZSA9IDAuOSAqIHZlbG9jaXR5O1xuICAgIHRhcmdldCA9IG9mZnNldCArIGFtcGxpdHVkZTtcbiAgICB0YXJnZXQgPSBNYXRoLnJvdW5kKHRhcmdldCAvIGRpbSkgKiBkaW07XG4gICAgYW1wbGl0dWRlID0gdGFyZ2V0IC0gb2Zmc2V0O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmICh0aW1lc3RhbXAgLSBzdGFydHRpbWVzdGFtcCA+IHRhcE1heENvbnN0YW50KSB7IC8vIFNuYXAgdG8gbmVhcmVzdCBlbGVtZW50XG4gICAgdGFyZ2V0ID0gTWF0aC5yb3VuZCh0YXJnZXQgLyBkaW0pICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG5ld3RhcmdldCA9IE1hdGgucm91bmQodGFyZ2V0IC8gZGltKSAqIGRpbTtcbiAgICBhbXBsaXR1ZGUgPSBuZXd0YXJnZXQgLSB0YXJnZXQ7XG4gICAgdGFyZ2V0ID0gbmV3dGFyZ2V0O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVLZXkoZSkge1xuICBpZiAoIXByZXNzZWQgJiYgKHRhcmdldCA9PT0gb2Zmc2V0KSkge1xuICAgIC8vIFNwYWNlIG9yIFBhZ2VEb3duIG9yIFJpZ2h0QXJyb3cgb3IgRG93bkFycm93XG4gICAgaWYgKFszMiwgMzQsIDM5LCA0MF0uaW5kZXhPZihlLndoaWNoKSA+PSAwKSB7XG4gICAgICB0YXJnZXQgPSBvZmZzZXQgKyBkaW07XG4gICAgfVxuICAgIC8vIFBhZ2VVcCBvciBMZWZ0QXJyb3cgb3IgVXBBcnJvd1xuICAgIGlmIChbMzMsIDM3LCAzOF0uaW5kZXhPZihlLndoaWNoKSA+PSAwKSB7XG4gICAgICB0YXJnZXQgPSBvZmZzZXQgLSBkaW07XG4gICAgfVxuICAgIGlmIChvZmZzZXQgIT09IHRhcmdldCkge1xuICAgICAgYW1wbGl0dWRlID0gdGFyZ2V0IC0gb2Zmc2V0O1xuICAgICAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmbG93VG8odG8pIHtcbiAgdmFyIGNlbnRlckluZGV4ID0gZ2V0QWN0aXZlSW5kZXgoKTtcbiAgaWYgKHRvID09IGNlbnRlckluZGV4KSB7XG4gICAgb25BY3RpdmVDbGljayhjZW50ZXJJbmRleCk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG9mZnNldFBvc2l0aW9uO1xuICAgIGlmICh0byAtIGNlbnRlckluZGV4ID4gKGNvdW50IC0gMSkvMikgb2Zmc2V0UG9zaXRpb24gPSAodG8gLSBjZW50ZXJJbmRleCkgLSBjb3VudDtcbiAgICBlbHNlIGlmICh0byAtIGNlbnRlckluZGV4IDw9IC0oY291bnQgLSAxKS8yKSBvZmZzZXRQb3NpdGlvbiA9ICh0byAtIGNlbnRlckluZGV4KSArIGNvdW50O1xuICAgIGVsc2Ugb2Zmc2V0UG9zaXRpb24gPSB0byAtIGNlbnRlckluZGV4O1xuICAgIHRhcmdldCA9IG9mZnNldCArIG9mZnNldFBvc2l0aW9uICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRBY3RpdmUodG8pIHtcbiAgdGFyZ2V0ID0gZGltICogdG87XG4gIHNjcm9sbChkaW0gKiB0byk7XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZUluZGV4KCkge1xuICB2YXIgY2VudGVySW5kZXggPSBjZW50ZXIgJSBjb3VudDtcbiAgd2hpbGUgKGNlbnRlckluZGV4IDwgMCkgY2VudGVySW5kZXggKz0gY291bnQ7XG4gIHJldHVybiBjZW50ZXJJbmRleDtcbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlRWxlbWVudCgpIHtcbiAgcmV0dXJuIGltYWdlc1tnZXRBY3RpdmVJbmRleCgpXTtcbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlSWQoKSB7XG4gIHJldHVybiBpbWFnZXNbZ2V0QWN0aXZlSW5kZXgoKV0uaWQ7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZWQodG8pIHtcbiAgaWYgKG9sZEFjdGl2ZUluZGV4ICE9IHRvKSB7XG4gICAgb25DaGFuZ2UodG8sIG9sZEFjdGl2ZUluZGV4KTtcbiAgICBvbGRBY3RpdmVJbmRleCA9IHRvO1xuICB9XG59XG5cbnhmb3JtID0gJ3RyYW5zZm9ybSc7XG5bJ3dlYmtpdCcsICdNb3onLCAnTycsICdtcyddLmV2ZXJ5KGZ1bmN0aW9uIChwcmVmaXgpIHtcbiAgdmFyIGUgPSBwcmVmaXggKyAnVHJhbnNmb3JtJztcbiAgaWYgKHR5cGVvZiBkb2N1bWVudC5ib2R5LnN0eWxlW2VdICE9PSAndW5kZWZpbmVkJykge1xuICAgIHhmb3JtID0gZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59KTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZUtleSk7XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgc2Nyb2xsKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gIGZsb3dUbzogZmxvd1RvLFxuICBzZXRBY3RpdmU6IHNldEFjdGl2ZSxcbiAgZ2V0QWN0aXZlSWQ6IGdldEFjdGl2ZUlkLFxuICBnZXRBY3RpdmVFbGVtZW50OiBnZXRBY3RpdmVFbGVtZW50LFxuICBnZXRBY3RpdmVJbmRleDogZ2V0QWN0aXZlSW5kZXhcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0YWdOYW1lLCBtYXhIZWlnaHQsIG1heFdpZHRoKSB7XG4gIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgdmFyIHN0ciA9IFwiXFxcbiAgICAuY292ZXJmbG93IHtcXFxuICAgICAgICBvdmVyZmxvdzogaGlkZGVuO1xcXG4gICAgICAgIHBlcnNwZWN0aXZlOiAxMDAwcHg7XFxcbiAgICAgICAgLXdlYmtpdC1wZXJzcGVjdGl2ZTogMTAwMHB4O1xcXG4gICAgICAgIHRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxcbiAgICAgICAgLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcXG4gICAgfVxcXG4gICAgXFxcbiAgICAuY292ZXJmbG93ID4gXCIgKyB0YWdOYW1lICsgXCIge1wiICtcbiAgICAoKG1heEhlaWdodCkgPyBcIiAgIGhlaWdodCA6IFwiICsgbWF4SGVpZ2h0ICsgXCJweDtcIiA6IFwiXCIpICtcbiAgICAoKG1heFdpZHRoKSA/IFwiICAgd2lkdGggOiBcIiArIG1heFdpZHRoICsgXCJweDtcIiA6IFwiXCIpICtcbiAgICBcIiAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXFxuICAgICAgICB0b3A6IDA7XFxcbiAgICAgICAgbGVmdDogMDtcXFxuICAgICAgICBvcGFjaXR5OiAwO1xcXG4gICAgICAgIGJvcmRlcjogbm9uZTtcXFxuICAgIH1cXFxuICBcIjtcbiAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyKSk7XG4gIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xufVxuIiwiLypcbiAqIHJhZi5qc1xuICogaHR0cHM6Ly9naXRodWIuY29tL25ncnltYW4vcmFmLmpzXG4gKlxuICogb3JpZ2luYWwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlclxuICogaW5zcGlyZWQgZnJvbSBwYXVsX2lyaXNoIGdpc3QgYW5kIHBvc3RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgbmdyeW1hblxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG5cbihmdW5jdGlvbih3aW5kb3cpIHtcblx0dmFyIGxhc3RUaW1lID0gMCxcblx0XHR2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J10sXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSxcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSxcblx0XHRpID0gdmVuZG9ycy5sZW5ndGg7XG5cblx0Ly8gdHJ5IHRvIHVuLXByZWZpeCBleGlzdGluZyByYWZcblx0d2hpbGUgKC0taSA+PSAwICYmICFyZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1tpXSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuXHR9XG5cblx0Ly8gcG9seWZpbGwgd2l0aCBzZXRUaW1lb3V0IGZhbGxiYWNrXG5cdC8vIGhlYXZpbHkgaW5zcGlyZWQgZnJvbSBAZGFyaXVzIGdpc3QgbW9kOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9wYXVsaXJpc2gvMTU3OTY3MSNjb21tZW50LTgzNzk0NVxuXHRpZiAoIXJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0dmFyIG5vdyA9ICtEYXRlLm5vdygpLFxuXHRcdFx0XHRuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG5cdFx0XHRyZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7XG5cdFx0XHR9LCBuZXh0VGltZSAtIG5vdyk7XG5cdFx0fTtcblxuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuXHR9XG5cblx0Ly8gZXhwb3J0IHRvIHdpbmRvd1xuXHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjYW5jZWxBbmltYXRpb25GcmFtZTtcbn0od2luZG93KSk7XG4iLCIvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWwjTGlzdGVuaW5nX3RvX3RoaXNfZXZlbnRfYWNyb3NzX2Jyb3dzZXJcbi8vIGNyZWF0ZXMgYSBnbG9iYWwgXCJhZGRXaGVlbExpc3RlbmVyXCIgbWV0aG9kXG4vLyBleGFtcGxlOiBhZGRXaGVlbExpc3RlbmVyKCBlbGVtLCBmdW5jdGlvbiggZSApIHsgY29uc29sZS5sb2coIGUuZGVsdGFZICk7IGUucHJldmVudERlZmF1bHQoKTsgfSApO1xuKGZ1bmN0aW9uKHdpbmRvdyxkb2N1bWVudCkge1xuXG4gICAgdmFyIHByZWZpeCA9IFwiXCIsIF9hZGRFdmVudExpc3RlbmVyLCBzdXBwb3J0O1xuXG4gICAgLy8gZGV0ZWN0IGV2ZW50IG1vZGVsXG4gICAgaWYgKCB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciApIHtcbiAgICAgICAgX2FkZEV2ZW50TGlzdGVuZXIgPSBcImFkZEV2ZW50TGlzdGVuZXJcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBfYWRkRXZlbnRMaXN0ZW5lciA9IFwiYXR0YWNoRXZlbnRcIjtcbiAgICAgICAgcHJlZml4ID0gXCJvblwiO1xuICAgIH1cblxuICAgIC8vIGRldGVjdCBhdmFpbGFibGUgd2hlZWwgZXZlbnRcbiAgICBzdXBwb3J0ID0gXCJvbndoZWVsXCIgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSA/IFwid2hlZWxcIiA6IC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxuICAgICAgICAgICAgICBkb2N1bWVudC5vbm1vdXNld2hlZWwgIT09IHVuZGVmaW5lZCA/IFwibW91c2V3aGVlbFwiIDogLy8gV2Via2l0IGFuZCBJRSBzdXBwb3J0IGF0IGxlYXN0IFwibW91c2V3aGVlbFwiXG4gICAgICAgICAgICAgIFwiRE9NTW91c2VTY3JvbGxcIjsgLy8gbGV0J3MgYXNzdW1lIHRoYXQgcmVtYWluaW5nIGJyb3dzZXJzIGFyZSBvbGRlciBGaXJlZm94XG5cbiAgICB3aW5kb3cuYWRkV2hlZWxMaXN0ZW5lciA9IGZ1bmN0aW9uKCBlbGVtLCBjYWxsYmFjaywgdXNlQ2FwdHVyZSApIHtcbiAgICAgICAgX2FkZFdoZWVsTGlzdGVuZXIoIGVsZW0sIHN1cHBvcnQsIGNhbGxiYWNrLCB1c2VDYXB0dXJlICk7XG5cbiAgICAgICAgLy8gaGFuZGxlIE1vek1vdXNlUGl4ZWxTY3JvbGwgaW4gb2xkZXIgRmlyZWZveFxuICAgICAgICBpZiggc3VwcG9ydCA9PSBcIkRPTU1vdXNlU2Nyb2xsXCIgKSB7XG4gICAgICAgICAgICBfYWRkV2hlZWxMaXN0ZW5lciggZWxlbSwgXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIsIGNhbGxiYWNrLCB1c2VDYXB0dXJlICk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2FkZFdoZWVsTGlzdGVuZXIoIGVsZW0sIGV2ZW50TmFtZSwgY2FsbGJhY2ssIHVzZUNhcHR1cmUgKSB7XG4gICAgICAgIGVsZW1bIF9hZGRFdmVudExpc3RlbmVyIF0oIHByZWZpeCArIGV2ZW50TmFtZSwgc3VwcG9ydCA9PSBcIndoZWVsXCIgPyBjYWxsYmFjayA6IGZ1bmN0aW9uKCBvcmlnaW5hbEV2ZW50ICkge1xuICAgICAgICAgICAgIW9yaWdpbmFsRXZlbnQgJiYgKCBvcmlnaW5hbEV2ZW50ID0gd2luZG93LmV2ZW50ICk7XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5vcm1hbGl6ZWQgZXZlbnQgb2JqZWN0XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgLy8ga2VlcCBhIHJlZiB0byB0aGUgb3JpZ2luYWwgZXZlbnQgb2JqZWN0XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxFdmVudDogb3JpZ2luYWxFdmVudCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IG9yaWdpbmFsRXZlbnQudGFyZ2V0IHx8IG9yaWdpbmFsRXZlbnQuc3JjRWxlbWVudCxcbiAgICAgICAgICAgICAgICB0eXBlOiBcIndoZWVsXCIsXG4gICAgICAgICAgICAgICAgZGVsdGFNb2RlOiBvcmlnaW5hbEV2ZW50LnR5cGUgPT0gXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIgPyAwIDogMSxcbiAgICAgICAgICAgICAgICBkZWx0YVg6IDAsXG4gICAgICAgICAgICAgICAgZGVsdGFaOiAwLFxuICAgICAgICAgICAgICAgIHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCA/XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxFdmVudC5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSBkZWx0YVkgKGFuZCBkZWx0YVgpIGFjY29yZGluZyB0byB0aGUgZXZlbnRcbiAgICAgICAgICAgIGlmICggc3VwcG9ydCA9PSBcIm1vdXNld2hlZWxcIiApIHtcbiAgICAgICAgICAgICAgICBldmVudC5kZWx0YVkgPSAtIDEvNDAgKiBvcmlnaW5hbEV2ZW50LndoZWVsRGVsdGE7XG4gICAgICAgICAgICAgICAgLy8gV2Via2l0IGFsc28gc3VwcG9ydCB3aGVlbERlbHRhWFxuICAgICAgICAgICAgICAgIG9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YVggJiYgKCBldmVudC5kZWx0YVggPSAtIDEvNDAgKiBvcmlnaW5hbEV2ZW50LndoZWVsRGVsdGFYICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV2ZW50LmRlbHRhWSA9IG9yaWdpbmFsRXZlbnQuZGV0YWlsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpdCdzIHRpbWUgdG8gZmlyZSB0aGUgY2FsbGJhY2tcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayggZXZlbnQgKTtcblxuICAgICAgICB9LCB1c2VDYXB0dXJlIHx8IGZhbHNlICk7XG4gICAgfVxuXG59KSh3aW5kb3csZG9jdW1lbnQpO1xuIl19
