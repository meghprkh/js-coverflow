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
  document.addEventListener('keydown', handleKey);
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
  el.style[xform] = alignment +
    ' translateX(' + (-delta / 2) + 'px)' +
    ' translateX(' + (dir * shift * tween) + 'px)' +
    ' translateZ(' + (dist * tween) + 'px)' +
    ' rotateY(' + (dir * angle * tween) + 'deg)';
  el.style.zIndex = 0;
  el.style.opacity = 1;

  half = count >> 1;
  for (i = 1; i <= half; ++i) {
    // right side
    el = images[wrap(center + i)];
    el.style[xform] = alignment +
      ' translateX(' + (shift + (dim * i - delta) / 2) + 'px)' +
      ' translateZ(' + dist + 'px)' +
      ' rotateY(' + angle + 'deg)';
    el.style.zIndex = -i;
    el.style.opacity = (i === half && delta < 0) ? 1 - tween : 1;

    // left side
    el = images[wrap(center - i)];
    el.style[xform] = alignment +
      ' translateX(' + (-shift + (-dim * i - delta) / 2) + 'px)' +
      ' translateZ(' + dist + 'px)' +
      ' rotateY(' + -angle + 'deg)';
    el.style.zIndex = -i;
    el.style.opacity = (i === half && delta > 0) ? 1 - tween : 1;
  }

  // center
  el = images[wrap(center)];
  el.style[xform] = alignment +
    ' translateX(' + (-delta / 2) + 'px)' +
    ' translateX(' + (dir * shift * tween) + 'px)' +
    ' translateZ(' + (dist * tween) + 'px)' +
    ' rotateY(' + (dir * angle * tween) + 'deg)';
  el.style.zIndex = 0;
  el.style.opacity = 1;
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
  ticker = setInterval(track, 100);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb3ZlcmZsb3cuanMiLCJsaWIvY3JlYXRlU3R5bGVTaGVldC5qcyIsImxpYi9yYWYubGliLmpzIiwibGliL3doZWVsRXZlbnQubGliLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9jb3ZlcmZsb3cuanMnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9yYWYubGliLmpzJyk7XG5yZXF1aXJlKCcuL3doZWVsRXZlbnQubGliLmpzJyk7XG52YXIgY3JlYXRlU3R5bGVTaGVldCA9IHJlcXVpcmUoJy4vY3JlYXRlU3R5bGVTaGVldC5qcycpO1xuXG52YXIgY291bnQsIGltYWdlcywgZGltLCBvZmZzZXQsIGNlbnRlciwgYW5nbGUsIGRpc3QsIHNoaWZ0LFxuICAgIHByZXNzZWQsIHJlZmVyZW5jZSwgYW1wbGl0dWRlLCB0YXJnZXQsIHZlbG9jaXR5LCB0aW1lQ29uc3RhbnQsXG4gICAgeGZvcm0sIGZyYW1lLCB0aW1lc3RhbXAsIHRpY2tlciwgb2xkQWN0aXZlSW5kZXgsIHN0YXJ0dGltZXN0YW1wLCB0YXBNYXhDb25zdGFudCxcbiAgICBvbkFjdGl2ZUNsaWNrLCBvbkNoYW5nZSwgdmlldywgdmlld0hlaWdodDtcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZShjb250YWluZXIsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHByZXNzZWQgPSBmYWxzZTtcbiAgb2xkQWN0aXZlSW5kZXggPSAwO1xuICB0aW1lQ29uc3RhbnQgPSBvcHRpb25zLnRpbWVDb25zdGFudCB8fCAyNTA7IC8vIG1zXG4gIHRhcE1heENvbnN0YW50ID0gb3B0aW9ucy50YXBNYXhDb25zdGFudCB8fCAxNTA7IC8vIG1zXG4gIG9mZnNldCA9IHRhcmdldCA9IDA7XG4gIHJlZmVyZW5jZSA9IGFtcGxpdHVkZSA9IHZlbG9jaXR5ID0gZnJhbWUgPSB1bmRlZmluZWQ7XG4gIGFuZ2xlID0gb3B0aW9ucy5hbmdsZSB8fCAtNjA7XG4gIGRpc3QgPSBvcHRpb25zLmFuZ2xlIHx8IC0xNTA7XG4gIHNoaWZ0ID0gb3B0aW9ucy5zaGlmdCB8fCAxMDtcbiAgb25BY3RpdmVDbGljayA9IG9wdGlvbnMub25BY3RpdmVDbGljayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgb25DaGFuZ2UgPSBvcHRpb25zLm9uQ2hhbmdlIHx8IGZ1bmN0aW9uICgpIHt9O1xuICBjb250YWluZXIgPSAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29udGFpbmVyKSA6IGNvbnRhaW5lcjtcbiAgY291bnQgPSBjb250YWluZXIuY2hpbGRyZW4ubGVuZ3RoO1xuICBpbWFnZXMgPSBbXTtcbiAgd2hpbGUgKGltYWdlcy5sZW5ndGggPCBjb3VudCkgaW1hZ2VzLnB1c2goY29udGFpbmVyLmNoaWxkcmVuLml0ZW0oaW1hZ2VzLmxlbmd0aCkpO1xuICB2YXIgbWF4SGVpZ2h0ID0gMCwgbWF4V2lkdGggPSAwO1xuICB2YXIgdGFnTmFtZSA9IG9wdGlvbnMudGFnTmFtZSB8fCBpbWFnZXNbMF0udGFnTmFtZTtcbiAgaW1hZ2VzLm1hcChmdW5jdGlvbiAoZWwsIGluZGV4KSB7XG4gICAgZWwub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICBmbG93VG8oaW5kZXgpO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9O1xuICAgIG1heEhlaWdodCA9IG1heEhlaWdodCA+IGVsLnNjcm9sbEhlaWdodCA/IG1heEhlaWdodCA6IGVsLnNjcm9sbEhlaWdodDtcbiAgICBtYXhXaWR0aCA9IG1heFdpZHRoID4gZWwuc3R5bGUud2lkdGggPyBtYXhXaWR0aCA6IGVsLnN0eWxlLndpZHRoO1xuICB9KTtcbiAgbWF4SGVpZ2h0ID0gb3B0aW9ucy5tYXhIZWlnaHQgfHwgbWF4SGVpZ2h0O1xuICBtYXhXaWR0aCA9IG9wdGlvbnMubWF4V2lkdGggfHwgbWF4V2lkdGg7XG4gIGNvbnRhaW5lci5jbGFzc05hbWUgKz0gJyBjb3ZlcmZsb3cnO1xuICBjb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gbWF4SGVpZ2h0ICogMS4xO1xuICBjcmVhdGVTdHlsZVNoZWV0KHRhZ05hbWUsIG1heEhlaWdodCwgbWF4V2lkdGgpO1xuICBpbWFnZXMubWFwKGZ1bmN0aW9uIChlbCwgaW5kZXgpIHtcbiAgICBtYXhIZWlnaHQgPSBtYXhIZWlnaHQgPiBlbC5zY3JvbGxIZWlnaHQgPyBtYXhIZWlnaHQgOiBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgbWF4V2lkdGggPSBtYXhXaWR0aCA+IGVsLnNjcm9sbFdpZHRoID8gbWF4V2lkdGggOiBlbC5zY3JvbGxXaWR0aDtcbiAgfSk7XG4gIHZpZXdIZWlnaHQgPSBtYXhIZWlnaHQgKiAxLjE7XG4gIGRpbSA9IG1heFdpZHRoO1xuICB2aWV3ID0gY29udGFpbmVyO1xuICBzY3JvbGwob2Zmc2V0KTtcbiAgc2V0dXBFdmVudHMoY29udGFpbmVyKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBFdmVudHMoKSB7XG4gIGlmICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0YXApO1xuICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZHJhZyk7XG4gICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHJlbGVhc2UpO1xuICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hjYW5jZWwnLCByZWxlYXNlKTtcbiAgfVxuICBhZGRXaGVlbExpc3RlbmVyKHZpZXcsIHdoZWVsKTtcbiAgdmlldy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0YXApO1xuICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGRyYWcpO1xuICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCByZWxlYXNlKTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZUtleSk7XG59XG5cbmZ1bmN0aW9uIHdoZWVsKGUpIHtcbiAgaWYgKGUuZGVsdGFZID4gMCkgc2V0QWN0aXZlKGdldEFjdGl2ZUluZGV4KCkgKyAxKTtcbiAgZWxzZSBpZiAoZS5kZWx0YVkgPCAwKSBzZXRBY3RpdmUoZ2V0QWN0aXZlSW5kZXgoKSAtIDEpO1xuICBjaGFuZ2VkKGdldEFjdGl2ZUluZGV4KCkpO1xufVxuXG5mdW5jdGlvbiB4cG9zKGUpIHtcbiAgLy8gdG91Y2ggZXZlbnRcbiAgaWYgKGUudGFyZ2V0VG91Y2hlcyAmJiAoZS50YXJnZXRUb3VjaGVzLmxlbmd0aCA+PSAxKSkge1xuICAgIHJldHVybiBlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WDtcbiAgfVxuXG4gIC8vIG1vdXNlIGV2ZW50XG4gIHJldHVybiBlLmNsaWVudFg7XG59XG5cbmZ1bmN0aW9uIHdyYXAoeCkge1xuICByZXR1cm4gKHggPj0gY291bnQpID8gKHggJSBjb3VudCkgOiAoeCA8IDApID8gd3JhcChjb3VudCArICh4ICUgY291bnQpKSA6IHg7XG59XG5cbmZ1bmN0aW9uIHNjcm9sbCh4KSB7XG4gIHZhciBpLCBoYWxmLCBkZWx0YSwgZGlyLCB0d2VlbiwgZWwsIGFsaWdubWVudDtcblxuICBvZmZzZXQgPSAodHlwZW9mIHggPT09ICdudW1iZXInKSA/IHggOiBvZmZzZXQ7XG4gIGNlbnRlciA9IE1hdGguZmxvb3IoKG9mZnNldCArIGRpbSAvIDIpIC8gZGltKTtcbiAgZGVsdGEgPSBvZmZzZXQgLSBjZW50ZXIgKiBkaW07XG4gIGRpciA9IChkZWx0YSA8IDApID8gMSA6IC0xO1xuICB0d2VlbiA9IC1kaXIgKiBkZWx0YSAqIDIgLyBkaW07XG5cbiAgYWxpZ25tZW50ID0gJ3RyYW5zbGF0ZVgoJyArICh2aWV3LmNsaWVudFdpZHRoIC0gZGltKSAvIDIgKyAncHgpICc7XG4gIGFsaWdubWVudCArPSAndHJhbnNsYXRlWSgnICsgKHZpZXdIZWlnaHQgLSBkaW0pIC8gMiArICdweCknO1xuXG4gIC8vIGNlbnRlclxuICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlcildO1xuICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICcgdHJhbnNsYXRlWCgnICsgKC1kZWx0YSAvIDIpICsgJ3B4KScgK1xuICAgICcgdHJhbnNsYXRlWCgnICsgKGRpciAqIHNoaWZ0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgdHJhbnNsYXRlWignICsgKGRpc3QgKiB0d2VlbikgKyAncHgpJyArXG4gICAgJyByb3RhdGVZKCcgKyAoZGlyICogYW5nbGUgKiB0d2VlbikgKyAnZGVnKSc7XG4gIGVsLnN0eWxlLnpJbmRleCA9IDA7XG4gIGVsLnN0eWxlLm9wYWNpdHkgPSAxO1xuXG4gIGhhbGYgPSBjb3VudCA+PiAxO1xuICBmb3IgKGkgPSAxOyBpIDw9IGhhbGY7ICsraSkge1xuICAgIC8vIHJpZ2h0IHNpZGVcbiAgICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlciArIGkpXTtcbiAgICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICAgJyB0cmFuc2xhdGVYKCcgKyAoc2hpZnQgKyAoZGltICogaSAtIGRlbHRhKSAvIDIpICsgJ3B4KScgK1xuICAgICAgJyB0cmFuc2xhdGVaKCcgKyBkaXN0ICsgJ3B4KScgK1xuICAgICAgJyByb3RhdGVZKCcgKyBhbmdsZSArICdkZWcpJztcbiAgICBlbC5zdHlsZS56SW5kZXggPSAtaTtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gKGkgPT09IGhhbGYgJiYgZGVsdGEgPCAwKSA/IDEgLSB0d2VlbiA6IDE7XG5cbiAgICAvLyBsZWZ0IHNpZGVcbiAgICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlciAtIGkpXTtcbiAgICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICAgJyB0cmFuc2xhdGVYKCcgKyAoLXNoaWZ0ICsgKC1kaW0gKiBpIC0gZGVsdGEpIC8gMikgKyAncHgpJyArXG4gICAgICAnIHRyYW5zbGF0ZVooJyArIGRpc3QgKyAncHgpJyArXG4gICAgICAnIHJvdGF0ZVkoJyArIC1hbmdsZSArICdkZWcpJztcbiAgICBlbC5zdHlsZS56SW5kZXggPSAtaTtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gKGkgPT09IGhhbGYgJiYgZGVsdGEgPiAwKSA/IDEgLSB0d2VlbiA6IDE7XG4gIH1cblxuICAvLyBjZW50ZXJcbiAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIpXTtcbiAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArICgtZGVsdGEgLyAyKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArIChkaXIgKiBzaGlmdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVooJyArIChkaXN0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgcm90YXRlWSgnICsgKGRpciAqIGFuZ2xlICogdHdlZW4pICsgJ2RlZyknO1xuICBlbC5zdHlsZS56SW5kZXggPSAwO1xuICBlbC5zdHlsZS5vcGFjaXR5ID0gMTtcbn1cblxuZnVuY3Rpb24gdHJhY2soKSB7XG4gIHZhciBub3csIGVsYXBzZWQsIGRlbHRhLCB2O1xuXG4gIG5vdyA9IERhdGUubm93KCk7XG4gIGVsYXBzZWQgPSBub3cgLSB0aW1lc3RhbXA7XG4gIHRpbWVzdGFtcCA9IG5vdztcbiAgZGVsdGEgPSBvZmZzZXQgLSBmcmFtZTtcbiAgZnJhbWUgPSBvZmZzZXQ7XG5cbiAgdiA9IDEwMDAgKiBkZWx0YSAvICgxICsgZWxhcHNlZCk7XG4gIHZlbG9jaXR5ID0gMC44ICogdiArIDAuMiAqIHZlbG9jaXR5O1xufVxuXG5mdW5jdGlvbiBhdXRvU2Nyb2xsKCkge1xuICB2YXIgZWxhcHNlZCwgZGVsdGE7XG5cbiAgaWYgKGFtcGxpdHVkZSkge1xuICAgIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gdGltZXN0YW1wO1xuICAgIGRlbHRhID0gYW1wbGl0dWRlICogTWF0aC5leHAoLWVsYXBzZWQgLyB0aW1lQ29uc3RhbnQpO1xuICAgIGlmIChkZWx0YSA+IDQgfHwgZGVsdGEgPCAtNCkge1xuICAgICAgc2Nyb2xsKHRhcmdldCAtIGRlbHRhKTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgICB9IGVsc2UgIHtcbiAgICAgIHNjcm9sbCh0YXJnZXQpO1xuICAgICAgY2hhbmdlZChnZXRBY3RpdmVJbmRleCgpKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdGFwKGUpIHtcbiAgcHJlc3NlZCA9IHRydWU7XG4gIHJlZmVyZW5jZSA9IHhwb3MoZSk7XG5cbiAgdmVsb2NpdHkgPSBhbXBsaXR1ZGUgPSAwO1xuICBmcmFtZSA9IG9mZnNldDtcbiAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgc3RhcnR0aW1lc3RhbXAgPSB0aW1lc3RhbXA7XG4gIGNsZWFySW50ZXJ2YWwodGlja2VyKTtcbiAgdGlja2VyID0gc2V0SW50ZXJ2YWwodHJhY2ssIDEwMCk7XG5cbiAgLy8gYWxsb3cgdG91Y2ggZGV2aWNlcyB0byBoYW5kbGUgY2xpY2sgZXZlbnQgYnV0IGRvbnQgYWxsb3cgZHJhZ2dpbmcgb24gZGVza3RvcHNcbiAgaWYgKGUudHlwZSA9PSAnbW91c2Vkb3duJykgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAvLyBhbGxvdyB0b3VjaCBkZXZpY2VzIHRvIGhhbmRsZSBjbGljayBldmVudCBidXQgZG9udCBhbGxvdyBkcmFnZ2luZyBvbiBkZXNrdG9wc1xuICBpZiAoZS50eXBlID09ICdtb3VzZWRvd24nKSByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGRyYWcoZSkge1xuICB2YXIgeCwgZGVsdGE7XG4gIGlmIChwcmVzc2VkKSB7XG4gICAgeCA9IHhwb3MoZSk7XG4gICAgZGVsdGEgPSByZWZlcmVuY2UgLSB4O1xuICAgIGlmIChkZWx0YSA+IDIgfHwgZGVsdGEgPCAtMikge1xuICAgICAgcmVmZXJlbmNlID0geDtcbiAgICAgIHNjcm9sbChvZmZzZXQgKyBkZWx0YSk7XG4gICAgfVxuICB9XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZWxlYXNlKGUpIHtcbiAgcHJlc3NlZCA9IGZhbHNlO1xuXG4gIGNsZWFySW50ZXJ2YWwodGlja2VyKTtcbiAgdGFyZ2V0ID0gb2Zmc2V0O1xuICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICBpZiAodmVsb2NpdHkgPiAxMCB8fCB2ZWxvY2l0eSA8IC0xMCkge1xuICAgIGFtcGxpdHVkZSA9IDAuOSAqIHZlbG9jaXR5O1xuICAgIHRhcmdldCA9IG9mZnNldCArIGFtcGxpdHVkZTtcbiAgICB0YXJnZXQgPSBNYXRoLnJvdW5kKHRhcmdldCAvIGRpbSkgKiBkaW07XG4gICAgYW1wbGl0dWRlID0gdGFyZ2V0IC0gb2Zmc2V0O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmICh0aW1lc3RhbXAgLSBzdGFydHRpbWVzdGFtcCA+IHRhcE1heENvbnN0YW50KSB7IC8vIFNuYXAgdG8gbmVhcmVzdCBlbGVtZW50XG4gICAgdGFyZ2V0ID0gTWF0aC5yb3VuZCh0YXJnZXQgLyBkaW0pICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG5ld3RhcmdldCA9IE1hdGgucm91bmQodGFyZ2V0IC8gZGltKSAqIGRpbTtcbiAgICBhbXBsaXR1ZGUgPSBuZXd0YXJnZXQgLSB0YXJnZXQ7XG4gICAgdGFyZ2V0ID0gbmV3dGFyZ2V0O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVLZXkoZSkge1xuICBpZiAoIXByZXNzZWQgJiYgKHRhcmdldCA9PT0gb2Zmc2V0KSkge1xuICAgIC8vIFNwYWNlIG9yIFBhZ2VEb3duIG9yIFJpZ2h0QXJyb3cgb3IgRG93bkFycm93XG4gICAgaWYgKFszMiwgMzQsIDM5LCA0MF0uaW5kZXhPZihlLndoaWNoKSA+PSAwKSB7XG4gICAgICB0YXJnZXQgPSBvZmZzZXQgKyBkaW07XG4gICAgfVxuICAgIC8vIFBhZ2VVcCBvciBMZWZ0QXJyb3cgb3IgVXBBcnJvd1xuICAgIGlmIChbMzMsIDM3LCAzOF0uaW5kZXhPZihlLndoaWNoKSA+PSAwKSB7XG4gICAgICB0YXJnZXQgPSBvZmZzZXQgLSBkaW07XG4gICAgfVxuICAgIGlmIChvZmZzZXQgIT09IHRhcmdldCkge1xuICAgICAgYW1wbGl0dWRlID0gdGFyZ2V0IC0gb2Zmc2V0O1xuICAgICAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmbG93VG8odG8pIHtcbiAgdmFyIGNlbnRlckluZGV4ID0gZ2V0QWN0aXZlSW5kZXgoKTtcbiAgaWYgKHRvID09IGNlbnRlckluZGV4KSB7XG4gICAgb25BY3RpdmVDbGljayhjZW50ZXJJbmRleCk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG9mZnNldFBvc2l0aW9uO1xuICAgIGlmICh0byAtIGNlbnRlckluZGV4ID4gKGNvdW50IC0gMSkvMikgb2Zmc2V0UG9zaXRpb24gPSAodG8gLSBjZW50ZXJJbmRleCkgLSBjb3VudDtcbiAgICBlbHNlIGlmICh0byAtIGNlbnRlckluZGV4IDw9IC0oY291bnQgLSAxKS8yKSBvZmZzZXRQb3NpdGlvbiA9ICh0byAtIGNlbnRlckluZGV4KSArIGNvdW50O1xuICAgIGVsc2Ugb2Zmc2V0UG9zaXRpb24gPSB0byAtIGNlbnRlckluZGV4O1xuICAgIHRhcmdldCA9IG9mZnNldCArIG9mZnNldFBvc2l0aW9uICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRBY3RpdmUodG8pIHtcbiAgc2Nyb2xsKGRpbSAqIHRvKTtcbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlSW5kZXgoKSB7XG4gIHZhciBjZW50ZXJJbmRleCA9IGNlbnRlciAlIGNvdW50O1xuICB3aGlsZSAoY2VudGVySW5kZXggPCAwKSBjZW50ZXJJbmRleCArPSBjb3VudDtcbiAgcmV0dXJuIGNlbnRlckluZGV4O1xufVxuXG5mdW5jdGlvbiBnZXRBY3RpdmVFbGVtZW50KCkge1xuICByZXR1cm4gaW1hZ2VzW2dldEFjdGl2ZUluZGV4KCldO1xufVxuXG5mdW5jdGlvbiBnZXRBY3RpdmVJZCgpIHtcbiAgcmV0dXJuIGltYWdlc1tnZXRBY3RpdmVJbmRleCgpXS5pZDtcbn1cblxuZnVuY3Rpb24gY2hhbmdlZCh0bykge1xuICBpZiAob2xkQWN0aXZlSW5kZXggIT0gdG8pIHtcbiAgICBvbkNoYW5nZSh0bywgb2xkQWN0aXZlSW5kZXgpO1xuICAgIG9sZEFjdGl2ZUluZGV4ID0gdG87XG4gIH1cbn1cblxueGZvcm0gPSAndHJhbnNmb3JtJztcblsnd2Via2l0JywgJ01veicsICdPJywgJ21zJ10uZXZlcnkoZnVuY3Rpb24gKHByZWZpeCkge1xuICB2YXIgZSA9IHByZWZpeCArICdUcmFuc2Zvcm0nO1xuICBpZiAodHlwZW9mIGRvY3VtZW50LmJvZHkuc3R5bGVbZV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgeGZvcm0gPSBlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgc2Nyb2xsKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gIGZsb3dUbzogZmxvd1RvLFxuICBzZXRBY3RpdmU6IHNldEFjdGl2ZSxcbiAgZ2V0QWN0aXZlSWQ6IGdldEFjdGl2ZUlkLFxuICBnZXRBY3RpdmVFbGVtZW50OiBnZXRBY3RpdmVFbGVtZW50LFxuICBnZXRBY3RpdmVJbmRleDogZ2V0QWN0aXZlSW5kZXhcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0YWdOYW1lLCBtYXhIZWlnaHQsIG1heFdpZHRoKSB7XG4gIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgdmFyIHN0ciA9IFwiXFxcbiAgICAuY292ZXJmbG93IHtcXFxuICAgICAgICBvdmVyZmxvdzogaGlkZGVuO1xcXG4gICAgICAgIHBlcnNwZWN0aXZlOiAxMDAwcHg7XFxcbiAgICAgICAgLXdlYmtpdC1wZXJzcGVjdGl2ZTogMTAwMHB4O1xcXG4gICAgICAgIHRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxcbiAgICAgICAgLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcXG4gICAgfVxcXG4gICAgXFxcbiAgICAuY292ZXJmbG93ID4gXCIgKyB0YWdOYW1lICsgXCIge1wiICtcbiAgICAoKG1heEhlaWdodCkgPyBcIiAgIGhlaWdodCA6IFwiICsgbWF4SGVpZ2h0ICsgXCJweDtcIiA6IFwiXCIpICtcbiAgICAoKG1heFdpZHRoKSA/IFwiICAgd2lkdGggOiBcIiArIG1heFdpZHRoICsgXCJweDtcIiA6IFwiXCIpICtcbiAgICBcIiAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXFxuICAgICAgICB0b3A6IDA7XFxcbiAgICAgICAgbGVmdDogMDtcXFxuICAgICAgICBvcGFjaXR5OiAwO1xcXG4gICAgICAgIGJvcmRlcjogbm9uZTtcXFxuICAgIH1cXFxuICBcIjtcbiAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyKSk7XG4gIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xufVxuIiwiLypcbiAqIHJhZi5qc1xuICogaHR0cHM6Ly9naXRodWIuY29tL25ncnltYW4vcmFmLmpzXG4gKlxuICogb3JpZ2luYWwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlclxuICogaW5zcGlyZWQgZnJvbSBwYXVsX2lyaXNoIGdpc3QgYW5kIHBvc3RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgbmdyeW1hblxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG5cbihmdW5jdGlvbih3aW5kb3cpIHtcblx0dmFyIGxhc3RUaW1lID0gMCxcblx0XHR2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J10sXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSxcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSxcblx0XHRpID0gdmVuZG9ycy5sZW5ndGg7XG5cblx0Ly8gdHJ5IHRvIHVuLXByZWZpeCBleGlzdGluZyByYWZcblx0d2hpbGUgKC0taSA+PSAwICYmICFyZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1tpXSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuXHR9XG5cblx0Ly8gcG9seWZpbGwgd2l0aCBzZXRUaW1lb3V0IGZhbGxiYWNrXG5cdC8vIGhlYXZpbHkgaW5zcGlyZWQgZnJvbSBAZGFyaXVzIGdpc3QgbW9kOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9wYXVsaXJpc2gvMTU3OTY3MSNjb21tZW50LTgzNzk0NVxuXHRpZiAoIXJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0dmFyIG5vdyA9ICtEYXRlLm5vdygpLFxuXHRcdFx0XHRuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG5cdFx0XHRyZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7XG5cdFx0XHR9LCBuZXh0VGltZSAtIG5vdyk7XG5cdFx0fTtcblxuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuXHR9XG5cblx0Ly8gZXhwb3J0IHRvIHdpbmRvd1xuXHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjYW5jZWxBbmltYXRpb25GcmFtZTtcbn0od2luZG93KSk7XG4iLCIvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWwjTGlzdGVuaW5nX3RvX3RoaXNfZXZlbnRfYWNyb3NzX2Jyb3dzZXJcbi8vIGNyZWF0ZXMgYSBnbG9iYWwgXCJhZGRXaGVlbExpc3RlbmVyXCIgbWV0aG9kXG4vLyBleGFtcGxlOiBhZGRXaGVlbExpc3RlbmVyKCBlbGVtLCBmdW5jdGlvbiggZSApIHsgY29uc29sZS5sb2coIGUuZGVsdGFZICk7IGUucHJldmVudERlZmF1bHQoKTsgfSApO1xuKGZ1bmN0aW9uKHdpbmRvdyxkb2N1bWVudCkge1xuXG4gICAgdmFyIHByZWZpeCA9IFwiXCIsIF9hZGRFdmVudExpc3RlbmVyLCBzdXBwb3J0O1xuXG4gICAgLy8gZGV0ZWN0IGV2ZW50IG1vZGVsXG4gICAgaWYgKCB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciApIHtcbiAgICAgICAgX2FkZEV2ZW50TGlzdGVuZXIgPSBcImFkZEV2ZW50TGlzdGVuZXJcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBfYWRkRXZlbnRMaXN0ZW5lciA9IFwiYXR0YWNoRXZlbnRcIjtcbiAgICAgICAgcHJlZml4ID0gXCJvblwiO1xuICAgIH1cblxuICAgIC8vIGRldGVjdCBhdmFpbGFibGUgd2hlZWwgZXZlbnRcbiAgICBzdXBwb3J0ID0gXCJvbndoZWVsXCIgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSA/IFwid2hlZWxcIiA6IC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxuICAgICAgICAgICAgICBkb2N1bWVudC5vbm1vdXNld2hlZWwgIT09IHVuZGVmaW5lZCA/IFwibW91c2V3aGVlbFwiIDogLy8gV2Via2l0IGFuZCBJRSBzdXBwb3J0IGF0IGxlYXN0IFwibW91c2V3aGVlbFwiXG4gICAgICAgICAgICAgIFwiRE9NTW91c2VTY3JvbGxcIjsgLy8gbGV0J3MgYXNzdW1lIHRoYXQgcmVtYWluaW5nIGJyb3dzZXJzIGFyZSBvbGRlciBGaXJlZm94XG5cbiAgICB3aW5kb3cuYWRkV2hlZWxMaXN0ZW5lciA9IGZ1bmN0aW9uKCBlbGVtLCBjYWxsYmFjaywgdXNlQ2FwdHVyZSApIHtcbiAgICAgICAgX2FkZFdoZWVsTGlzdGVuZXIoIGVsZW0sIHN1cHBvcnQsIGNhbGxiYWNrLCB1c2VDYXB0dXJlICk7XG5cbiAgICAgICAgLy8gaGFuZGxlIE1vek1vdXNlUGl4ZWxTY3JvbGwgaW4gb2xkZXIgRmlyZWZveFxuICAgICAgICBpZiggc3VwcG9ydCA9PSBcIkRPTU1vdXNlU2Nyb2xsXCIgKSB7XG4gICAgICAgICAgICBfYWRkV2hlZWxMaXN0ZW5lciggZWxlbSwgXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIsIGNhbGxiYWNrLCB1c2VDYXB0dXJlICk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2FkZFdoZWVsTGlzdGVuZXIoIGVsZW0sIGV2ZW50TmFtZSwgY2FsbGJhY2ssIHVzZUNhcHR1cmUgKSB7XG4gICAgICAgIGVsZW1bIF9hZGRFdmVudExpc3RlbmVyIF0oIHByZWZpeCArIGV2ZW50TmFtZSwgc3VwcG9ydCA9PSBcIndoZWVsXCIgPyBjYWxsYmFjayA6IGZ1bmN0aW9uKCBvcmlnaW5hbEV2ZW50ICkge1xuICAgICAgICAgICAgIW9yaWdpbmFsRXZlbnQgJiYgKCBvcmlnaW5hbEV2ZW50ID0gd2luZG93LmV2ZW50ICk7XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5vcm1hbGl6ZWQgZXZlbnQgb2JqZWN0XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgLy8ga2VlcCBhIHJlZiB0byB0aGUgb3JpZ2luYWwgZXZlbnQgb2JqZWN0XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxFdmVudDogb3JpZ2luYWxFdmVudCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IG9yaWdpbmFsRXZlbnQudGFyZ2V0IHx8IG9yaWdpbmFsRXZlbnQuc3JjRWxlbWVudCxcbiAgICAgICAgICAgICAgICB0eXBlOiBcIndoZWVsXCIsXG4gICAgICAgICAgICAgICAgZGVsdGFNb2RlOiBvcmlnaW5hbEV2ZW50LnR5cGUgPT0gXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIgPyAwIDogMSxcbiAgICAgICAgICAgICAgICBkZWx0YVg6IDAsXG4gICAgICAgICAgICAgICAgZGVsdGFaOiAwLFxuICAgICAgICAgICAgICAgIHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCA/XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxFdmVudC5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSBkZWx0YVkgKGFuZCBkZWx0YVgpIGFjY29yZGluZyB0byB0aGUgZXZlbnRcbiAgICAgICAgICAgIGlmICggc3VwcG9ydCA9PSBcIm1vdXNld2hlZWxcIiApIHtcbiAgICAgICAgICAgICAgICBldmVudC5kZWx0YVkgPSAtIDEvNDAgKiBvcmlnaW5hbEV2ZW50LndoZWVsRGVsdGE7XG4gICAgICAgICAgICAgICAgLy8gV2Via2l0IGFsc28gc3VwcG9ydCB3aGVlbERlbHRhWFxuICAgICAgICAgICAgICAgIG9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YVggJiYgKCBldmVudC5kZWx0YVggPSAtIDEvNDAgKiBvcmlnaW5hbEV2ZW50LndoZWVsRGVsdGFYICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV2ZW50LmRlbHRhWSA9IG9yaWdpbmFsRXZlbnQuZGV0YWlsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpdCdzIHRpbWUgdG8gZmlyZSB0aGUgY2FsbGJhY2tcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayggZXZlbnQgKTtcblxuICAgICAgICB9LCB1c2VDYXB0dXJlIHx8IGZhbHNlICk7XG4gICAgfVxuXG59KSh3aW5kb3csZG9jdW1lbnQpO1xuIl19
