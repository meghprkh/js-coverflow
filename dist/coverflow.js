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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb3ZlcmZsb3cuanMiLCJsaWIvY3JlYXRlU3R5bGVTaGVldC5qcyIsImxpYi9yYWYubGliLmpzIiwibGliL3doZWVsRXZlbnQubGliLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9jb3ZlcmZsb3cuanMnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9yYWYubGliLmpzJyk7XG5yZXF1aXJlKCcuL3doZWVsRXZlbnQubGliLmpzJyk7XG52YXIgY3JlYXRlU3R5bGVTaGVldCA9IHJlcXVpcmUoJy4vY3JlYXRlU3R5bGVTaGVldC5qcycpO1xuXG52YXIgY291bnQsIGltYWdlcywgZGltLCBvZmZzZXQsIGNlbnRlciwgYW5nbGUsIGRpc3QsIHNoaWZ0LFxuICAgIHByZXNzZWQsIHJlZmVyZW5jZSwgYW1wbGl0dWRlLCB0YXJnZXQsIHZlbG9jaXR5LCB0aW1lQ29uc3RhbnQsXG4gICAgeGZvcm0sIGZyYW1lLCB0aW1lc3RhbXAsIHRpY2tlciwgb2xkQWN0aXZlSW5kZXgsIHN0YXJ0dGltZXN0YW1wLCB0YXBNYXhDb25zdGFudCxcbiAgICBvbkFjdGl2ZUNsaWNrLCBvbkNoYW5nZSwgdmlldywgdmlld0hlaWdodDtcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZShjb250YWluZXIsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHByZXNzZWQgPSBmYWxzZTtcbiAgb2xkQWN0aXZlSW5kZXggPSAwO1xuICB0aW1lQ29uc3RhbnQgPSBvcHRpb25zLnRpbWVDb25zdGFudCB8fCAyNTA7IC8vIG1zXG4gIHRhcE1heENvbnN0YW50ID0gb3B0aW9ucy50YXBNYXhDb25zdGFudCB8fCAxNTA7IC8vIG1zXG4gIG9mZnNldCA9IHRhcmdldCA9IDA7XG4gIHJlZmVyZW5jZSA9IGFtcGxpdHVkZSA9IHZlbG9jaXR5ID0gZnJhbWUgPSB1bmRlZmluZWQ7XG4gIGFuZ2xlID0gb3B0aW9ucy5hbmdsZSB8fCAtNjA7XG4gIGRpc3QgPSBvcHRpb25zLmFuZ2xlIHx8IC0xNTA7XG4gIHNoaWZ0ID0gb3B0aW9ucy5zaGlmdCB8fCAxMDtcbiAgb25BY3RpdmVDbGljayA9IG9wdGlvbnMub25BY3RpdmVDbGljayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgb25DaGFuZ2UgPSBvcHRpb25zLm9uQ2hhbmdlIHx8IGZ1bmN0aW9uICgpIHt9O1xuICBjb250YWluZXIgPSAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29udGFpbmVyKSA6IGNvbnRhaW5lcjtcbiAgY291bnQgPSBjb250YWluZXIuY2hpbGRyZW4ubGVuZ3RoO1xuICBpbWFnZXMgPSBbXTtcbiAgd2hpbGUgKGltYWdlcy5sZW5ndGggPCBjb3VudCkgaW1hZ2VzLnB1c2goY29udGFpbmVyLmNoaWxkcmVuLml0ZW0oaW1hZ2VzLmxlbmd0aCkpO1xuICB2YXIgbWF4SGVpZ2h0ID0gMCwgbWF4V2lkdGggPSAwO1xuICB2YXIgdGFnTmFtZSA9IG9wdGlvbnMudGFnTmFtZSB8fCBpbWFnZXNbMF0udGFnTmFtZTtcbiAgaW1hZ2VzLm1hcChmdW5jdGlvbiAoZWwsIGluZGV4KSB7XG4gICAgZWwub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICBmbG93VG8oaW5kZXgpO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9O1xuICAgIG1heEhlaWdodCA9IG1heEhlaWdodCA+IGVsLnNjcm9sbEhlaWdodCA/IG1heEhlaWdodCA6IGVsLnNjcm9sbEhlaWdodDtcbiAgICBtYXhXaWR0aCA9IG1heFdpZHRoID4gZWwuc3R5bGUud2lkdGggPyBtYXhXaWR0aCA6IGVsLnN0eWxlLndpZHRoO1xuICB9KTtcbiAgbWF4SGVpZ2h0ID0gb3B0aW9ucy5tYXhIZWlnaHQgfHwgbWF4SGVpZ2h0O1xuICBtYXhXaWR0aCA9IG9wdGlvbnMubWF4V2lkdGggfHwgbWF4V2lkdGg7XG4gIGNvbnRhaW5lci5jbGFzc05hbWUgKz0gJyBjb3ZlcmZsb3cnO1xuICBjb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gbWF4SGVpZ2h0ICogMS4xO1xuICBjcmVhdGVTdHlsZVNoZWV0KHRhZ05hbWUsIG1heEhlaWdodCwgbWF4V2lkdGgpO1xuICBpbWFnZXMubWFwKGZ1bmN0aW9uIChlbCwgaW5kZXgpIHtcbiAgICBtYXhIZWlnaHQgPSBtYXhIZWlnaHQgPiBlbC5zY3JvbGxIZWlnaHQgPyBtYXhIZWlnaHQgOiBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgbWF4V2lkdGggPSBtYXhXaWR0aCA+IGVsLnNjcm9sbFdpZHRoID8gbWF4V2lkdGggOiBlbC5zY3JvbGxXaWR0aDtcbiAgfSk7XG4gIHZpZXdIZWlnaHQgPSBtYXhIZWlnaHQgKiAxLjE7XG4gIGRpbSA9IG1heFdpZHRoO1xuICB2aWV3ID0gY29udGFpbmVyO1xuICBzY3JvbGwob2Zmc2V0KTtcbiAgc2V0dXBFdmVudHMoY29udGFpbmVyKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBFdmVudHMoKSB7XG4gIGlmICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0YXApO1xuICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZHJhZyk7XG4gICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHJlbGVhc2UpO1xuICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hjYW5jZWwnLCByZWxlYXNlKTtcbiAgfVxuICBhZGRXaGVlbExpc3RlbmVyKHZpZXcsIHdoZWVsKTtcbiAgdmlldy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0YXApO1xuICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGRyYWcpO1xuICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCByZWxlYXNlKTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZUtleSk7XG59XG5cbmZ1bmN0aW9uIHdoZWVsKGUpIHtcbiAgaWYgKGUuZGVsdGFZID4gMCkgc2V0QWN0aXZlKGdldEFjdGl2ZUluZGV4KCkgKyAxKTtcbiAgZWxzZSBpZiAoZS5kZWx0YVkgPCAwKSBzZXRBY3RpdmUoZ2V0QWN0aXZlSW5kZXgoKSAtIDEpO1xuICBjaGFuZ2VkKGdldEFjdGl2ZUluZGV4KCkpO1xufVxuXG5mdW5jdGlvbiB4cG9zKGUpIHtcbiAgLy8gdG91Y2ggZXZlbnRcbiAgaWYgKGUudGFyZ2V0VG91Y2hlcyAmJiAoZS50YXJnZXRUb3VjaGVzLmxlbmd0aCA+PSAxKSkge1xuICAgIHJldHVybiBlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WDtcbiAgfVxuXG4gIC8vIG1vdXNlIGV2ZW50XG4gIHJldHVybiBlLmNsaWVudFg7XG59XG5cbmZ1bmN0aW9uIHdyYXAoeCkge1xuICByZXR1cm4gKHggPj0gY291bnQpID8gKHggJSBjb3VudCkgOiAoeCA8IDApID8gd3JhcChjb3VudCArICh4ICUgY291bnQpKSA6IHg7XG59XG5cbmZ1bmN0aW9uIHNjcm9sbCh4KSB7XG4gIHZhciBpLCBoYWxmLCBkZWx0YSwgZGlyLCB0d2VlbiwgZWwsIGFsaWdubWVudDtcblxuICBvZmZzZXQgPSAodHlwZW9mIHggPT09ICdudW1iZXInKSA/IHggOiBvZmZzZXQ7XG4gIGNlbnRlciA9IE1hdGguZmxvb3IoKG9mZnNldCArIGRpbSAvIDIpIC8gZGltKTtcbiAgZGVsdGEgPSBvZmZzZXQgLSBjZW50ZXIgKiBkaW07XG4gIGRpciA9IChkZWx0YSA8IDApID8gMSA6IC0xO1xuICB0d2VlbiA9IC1kaXIgKiBkZWx0YSAqIDIgLyBkaW07XG5cbiAgYWxpZ25tZW50ID0gJ3RyYW5zbGF0ZVgoJyArICh2aWV3LmNsaWVudFdpZHRoIC0gZGltKSAvIDIgKyAncHgpICc7XG4gIGFsaWdubWVudCArPSAndHJhbnNsYXRlWSgnICsgKHZpZXdIZWlnaHQgLSBkaW0pIC8gMiArICdweCknO1xuXG4gIC8vIGNlbnRlclxuICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlcildO1xuICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICcgdHJhbnNsYXRlWCgnICsgKC1kZWx0YSAvIDIpICsgJ3B4KScgK1xuICAgICcgdHJhbnNsYXRlWCgnICsgKGRpciAqIHNoaWZ0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgdHJhbnNsYXRlWignICsgKGRpc3QgKiB0d2VlbikgKyAncHgpJyArXG4gICAgJyByb3RhdGVZKCcgKyAoZGlyICogYW5nbGUgKiB0d2VlbikgKyAnZGVnKSc7XG4gIGVsLnN0eWxlLnpJbmRleCA9IDA7XG4gIGVsLnN0eWxlLm9wYWNpdHkgPSAxO1xuXG4gIGhhbGYgPSBjb3VudCA+PiAxO1xuICBmb3IgKGkgPSAxOyBpIDw9IGhhbGY7ICsraSkge1xuICAgIC8vIHJpZ2h0IHNpZGVcbiAgICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlciArIGkpXTtcbiAgICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICAgJyB0cmFuc2xhdGVYKCcgKyAoc2hpZnQgKyAoZGltICogaSAtIGRlbHRhKSAvIDIpICsgJ3B4KScgK1xuICAgICAgJyB0cmFuc2xhdGVaKCcgKyBkaXN0ICsgJ3B4KScgK1xuICAgICAgJyByb3RhdGVZKCcgKyBhbmdsZSArICdkZWcpJztcbiAgICBlbC5zdHlsZS56SW5kZXggPSAtaTtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gKGkgPT09IGhhbGYgJiYgZGVsdGEgPCAwKSA/IDEgLSB0d2VlbiA6IDE7XG5cbiAgICAvLyBsZWZ0IHNpZGVcbiAgICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlciAtIGkpXTtcbiAgICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICAgJyB0cmFuc2xhdGVYKCcgKyAoLXNoaWZ0ICsgKC1kaW0gKiBpIC0gZGVsdGEpIC8gMikgKyAncHgpJyArXG4gICAgICAnIHRyYW5zbGF0ZVooJyArIGRpc3QgKyAncHgpJyArXG4gICAgICAnIHJvdGF0ZVkoJyArIC1hbmdsZSArICdkZWcpJztcbiAgICBlbC5zdHlsZS56SW5kZXggPSAtaTtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gKGkgPT09IGhhbGYgJiYgZGVsdGEgPiAwKSA/IDEgLSB0d2VlbiA6IDE7XG4gIH1cblxuICAvLyBjZW50ZXJcbiAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIpXTtcbiAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArICgtZGVsdGEgLyAyKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArIChkaXIgKiBzaGlmdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVooJyArIChkaXN0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgcm90YXRlWSgnICsgKGRpciAqIGFuZ2xlICogdHdlZW4pICsgJ2RlZyknO1xuICBlbC5zdHlsZS56SW5kZXggPSAwO1xuICBlbC5zdHlsZS5vcGFjaXR5ID0gMTtcbn1cblxuZnVuY3Rpb24gdHJhY2soKSB7XG4gIHZhciBub3csIGVsYXBzZWQsIGRlbHRhLCB2O1xuXG4gIG5vdyA9IERhdGUubm93KCk7XG4gIGVsYXBzZWQgPSBub3cgLSB0aW1lc3RhbXA7XG4gIHRpbWVzdGFtcCA9IG5vdztcbiAgZGVsdGEgPSBvZmZzZXQgLSBmcmFtZTtcbiAgZnJhbWUgPSBvZmZzZXQ7XG5cbiAgdiA9IDEwMDAgKiBkZWx0YSAvICgxICsgZWxhcHNlZCk7XG4gIHZlbG9jaXR5ID0gMC44ICogdiArIDAuMiAqIHZlbG9jaXR5O1xufVxuXG5mdW5jdGlvbiBhdXRvU2Nyb2xsKCkge1xuICB2YXIgZWxhcHNlZCwgZGVsdGE7XG5cbiAgaWYgKGFtcGxpdHVkZSkge1xuICAgIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gdGltZXN0YW1wO1xuICAgIGRlbHRhID0gYW1wbGl0dWRlICogTWF0aC5leHAoLWVsYXBzZWQgLyB0aW1lQ29uc3RhbnQpO1xuICAgIGlmIChkZWx0YSA+IDQgfHwgZGVsdGEgPCAtNCkge1xuICAgICAgc2Nyb2xsKHRhcmdldCAtIGRlbHRhKTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgICB9IGVsc2UgIHtcbiAgICAgIHNjcm9sbCh0YXJnZXQpO1xuICAgICAgY2hhbmdlZChnZXRBY3RpdmVJbmRleCgpKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdGFwKGUpIHtcbiAgcHJlc3NlZCA9IHRydWU7XG4gIHJlZmVyZW5jZSA9IHhwb3MoZSk7XG5cbiAgdmVsb2NpdHkgPSBhbXBsaXR1ZGUgPSAwO1xuICBmcmFtZSA9IG9mZnNldDtcbiAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgc3RhcnR0aW1lc3RhbXAgPSB0aW1lc3RhbXA7XG4gIGNsZWFySW50ZXJ2YWwodGlja2VyKTtcbiAgdGlja2VyID0gc2V0SW50ZXJ2YWwodHJhY2ssIDUwKTtcblxuICAvLyBhbGxvdyB0b3VjaCBkZXZpY2VzIHRvIGhhbmRsZSBjbGljayBldmVudCBidXQgZG9udCBhbGxvdyBkcmFnZ2luZyBvbiBkZXNrdG9wc1xuICBpZiAoZS50eXBlID09ICdtb3VzZWRvd24nKSBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIC8vIGFsbG93IHRvdWNoIGRldmljZXMgdG8gaGFuZGxlIGNsaWNrIGV2ZW50IGJ1dCBkb250IGFsbG93IGRyYWdnaW5nIG9uIGRlc2t0b3BzXG4gIGlmIChlLnR5cGUgPT0gJ21vdXNlZG93bicpIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZHJhZyhlKSB7XG4gIHZhciB4LCBkZWx0YTtcbiAgaWYgKHByZXNzZWQpIHtcbiAgICB4ID0geHBvcyhlKTtcbiAgICBkZWx0YSA9IHJlZmVyZW5jZSAtIHg7XG4gICAgaWYgKGRlbHRhID4gMiB8fCBkZWx0YSA8IC0yKSB7XG4gICAgICByZWZlcmVuY2UgPSB4O1xuICAgICAgc2Nyb2xsKG9mZnNldCArIGRlbHRhKTtcbiAgICB9XG4gIH1cbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlbGVhc2UoZSkge1xuICBwcmVzc2VkID0gZmFsc2U7XG5cbiAgY2xlYXJJbnRlcnZhbCh0aWNrZXIpO1xuICB0YXJnZXQgPSBvZmZzZXQ7XG4gIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gIGlmICh2ZWxvY2l0eSA+IDEwIHx8IHZlbG9jaXR5IDwgLTEwKSB7XG4gICAgYW1wbGl0dWRlID0gMC45ICogdmVsb2NpdHk7XG4gICAgdGFyZ2V0ID0gb2Zmc2V0ICsgYW1wbGl0dWRlO1xuICAgIHRhcmdldCA9IE1hdGgucm91bmQodGFyZ2V0IC8gZGltKSAqIGRpbTtcbiAgICBhbXBsaXR1ZGUgPSB0YXJnZXQgLSBvZmZzZXQ7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGF1dG9TY3JvbGwpO1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKHRpbWVzdGFtcCAtIHN0YXJ0dGltZXN0YW1wID4gdGFwTWF4Q29uc3RhbnQpIHsgLy8gU25hcCB0byBuZWFyZXN0IGVsZW1lbnRcbiAgICB0YXJnZXQgPSBNYXRoLnJvdW5kKHRhcmdldCAvIGRpbSkgKiBkaW07XG4gICAgYW1wbGl0dWRlID0gdGFyZ2V0IC0gb2Zmc2V0O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbmV3dGFyZ2V0ID0gTWF0aC5yb3VuZCh0YXJnZXQgLyBkaW0pICogZGltO1xuICAgIGFtcGxpdHVkZSA9IG5ld3RhcmdldCAtIHRhcmdldDtcbiAgICB0YXJnZXQgPSBuZXd0YXJnZXQ7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGF1dG9TY3JvbGwpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUtleShlKSB7XG4gIGlmICghcHJlc3NlZCAmJiAodGFyZ2V0ID09PSBvZmZzZXQpKSB7XG4gICAgLy8gU3BhY2Ugb3IgUGFnZURvd24gb3IgUmlnaHRBcnJvdyBvciBEb3duQXJyb3dcbiAgICBpZiAoWzMyLCAzNCwgMzksIDQwXS5pbmRleE9mKGUud2hpY2gpID49IDApIHtcbiAgICAgIHRhcmdldCA9IG9mZnNldCArIGRpbTtcbiAgICB9XG4gICAgLy8gUGFnZVVwIG9yIExlZnRBcnJvdyBvciBVcEFycm93XG4gICAgaWYgKFszMywgMzcsIDM4XS5pbmRleE9mKGUud2hpY2gpID49IDApIHtcbiAgICAgIHRhcmdldCA9IG9mZnNldCAtIGRpbTtcbiAgICB9XG4gICAgaWYgKG9mZnNldCAhPT0gdGFyZ2V0KSB7XG4gICAgICBhbXBsaXR1ZGUgPSB0YXJnZXQgLSBvZmZzZXQ7XG4gICAgICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGF1dG9TY3JvbGwpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZsb3dUbyh0bykge1xuICB2YXIgY2VudGVySW5kZXggPSBnZXRBY3RpdmVJbmRleCgpO1xuICBpZiAodG8gPT0gY2VudGVySW5kZXgpIHtcbiAgICBvbkFjdGl2ZUNsaWNrKGNlbnRlckluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgb2Zmc2V0UG9zaXRpb247XG4gICAgaWYgKHRvIC0gY2VudGVySW5kZXggPiAoY291bnQgLSAxKS8yKSBvZmZzZXRQb3NpdGlvbiA9ICh0byAtIGNlbnRlckluZGV4KSAtIGNvdW50O1xuICAgIGVsc2UgaWYgKHRvIC0gY2VudGVySW5kZXggPD0gLShjb3VudCAtIDEpLzIpIG9mZnNldFBvc2l0aW9uID0gKHRvIC0gY2VudGVySW5kZXgpICsgY291bnQ7XG4gICAgZWxzZSBvZmZzZXRQb3NpdGlvbiA9IHRvIC0gY2VudGVySW5kZXg7XG4gICAgdGFyZ2V0ID0gb2Zmc2V0ICsgb2Zmc2V0UG9zaXRpb24gKiBkaW07XG4gICAgYW1wbGl0dWRlID0gdGFyZ2V0IC0gb2Zmc2V0O1xuICAgIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGF1dG9TY3JvbGwpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldEFjdGl2ZSh0bykge1xuICBzY3JvbGwoZGltICogdG8pO1xufVxuXG5mdW5jdGlvbiBnZXRBY3RpdmVJbmRleCgpIHtcbiAgdmFyIGNlbnRlckluZGV4ID0gY2VudGVyICUgY291bnQ7XG4gIHdoaWxlIChjZW50ZXJJbmRleCA8IDApIGNlbnRlckluZGV4ICs9IGNvdW50O1xuICByZXR1cm4gY2VudGVySW5kZXg7XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZUVsZW1lbnQoKSB7XG4gIHJldHVybiBpbWFnZXNbZ2V0QWN0aXZlSW5kZXgoKV07XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZUlkKCkge1xuICByZXR1cm4gaW1hZ2VzW2dldEFjdGl2ZUluZGV4KCldLmlkO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VkKHRvKSB7XG4gIGlmIChvbGRBY3RpdmVJbmRleCAhPSB0bykge1xuICAgIG9uQ2hhbmdlKHRvLCBvbGRBY3RpdmVJbmRleCk7XG4gICAgb2xkQWN0aXZlSW5kZXggPSB0bztcbiAgfVxufVxuXG54Zm9ybSA9ICd0cmFuc2Zvcm0nO1xuWyd3ZWJraXQnLCAnTW96JywgJ08nLCAnbXMnXS5ldmVyeShmdW5jdGlvbiAocHJlZml4KSB7XG4gIHZhciBlID0gcHJlZml4ICsgJ1RyYW5zZm9ybSc7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQuYm9keS5zdHlsZVtlXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB4Zm9ybSA9IGU7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBzY3JvbGwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgZmxvd1RvOiBmbG93VG8sXG4gIHNldEFjdGl2ZTogc2V0QWN0aXZlLFxuICBnZXRBY3RpdmVJZDogZ2V0QWN0aXZlSWQsXG4gIGdldEFjdGl2ZUVsZW1lbnQ6IGdldEFjdGl2ZUVsZW1lbnQsXG4gIGdldEFjdGl2ZUluZGV4OiBnZXRBY3RpdmVJbmRleFxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHRhZ05hbWUsIG1heEhlaWdodCwgbWF4V2lkdGgpIHtcbiAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuICB2YXIgc3RyID0gXCJcXFxuICAgIC5jb3ZlcmZsb3cge1xcXG4gICAgICAgIG92ZXJmbG93OiBoaWRkZW47XFxcbiAgICAgICAgcGVyc3BlY3RpdmU6IDEwMDBweDtcXFxuICAgICAgICAtd2Via2l0LXBlcnNwZWN0aXZlOiAxMDAwcHg7XFxcbiAgICAgICAgdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXFxuICAgICAgICAtd2Via2l0LXRyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7XFxcbiAgICB9XFxcbiAgICBcXFxuICAgIC5jb3ZlcmZsb3cgPiBcIiArIHRhZ05hbWUgKyBcIiB7XCIgK1xuICAgICgobWF4SGVpZ2h0KSA/IFwiICAgaGVpZ2h0IDogXCIgKyBtYXhIZWlnaHQgKyBcInB4O1wiIDogXCJcIikgK1xuICAgICgobWF4V2lkdGgpID8gXCIgICB3aWR0aCA6IFwiICsgbWF4V2lkdGggKyBcInB4O1wiIDogXCJcIikgK1xuICAgIFwiICAgcG9zaXRpb246IGFic29sdXRlO1xcXG4gICAgICAgIHRvcDogMDtcXFxuICAgICAgICBsZWZ0OiAwO1xcXG4gICAgICAgIG9wYWNpdHk6IDA7XFxcbiAgICAgICAgYm9yZGVyOiBub25lO1xcXG4gICAgfVxcXG4gIFwiO1xuICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHIpKTtcbiAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG59XG4iLCIvKlxuICogcmFmLmpzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbmdyeW1hbi9yYWYuanNcbiAqXG4gKiBvcmlnaW5hbCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyXG4gKiBpbnNwaXJlZCBmcm9tIHBhdWxfaXJpc2ggZ2lzdCBhbmQgcG9zdFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBuZ3J5bWFuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cblxuKGZ1bmN0aW9uKHdpbmRvdykge1xuXHR2YXIgbGFzdFRpbWUgPSAwLFxuXHRcdHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXSxcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lLFxuXHRcdGkgPSB2ZW5kb3JzLmxlbmd0aDtcblxuXHQvLyB0cnkgdG8gdW4tcHJlZml4IGV4aXN0aW5nIHJhZlxuXHR3aGlsZSAoLS1pID49IDAgJiYgIXJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbaV0gKyAnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG5cdH1cblxuXHQvLyBwb2x5ZmlsbCB3aXRoIHNldFRpbWVvdXQgZmFsbGJhY2tcblx0Ly8gaGVhdmlseSBpbnNwaXJlZCBmcm9tIEBkYXJpdXMgZ2lzdCBtb2Q6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL3BhdWxpcmlzaC8xNTc5NjcxI2NvbW1lbnQtODM3OTQ1XG5cdGlmICghcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICFjYW5jZWxBbmltYXRpb25GcmFtZSkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgbm93ID0gK0RhdGUubm93KCksXG5cdFx0XHRcdG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcblx0XHRcdHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTtcblx0XHRcdH0sIG5leHRUaW1lIC0gbm93KTtcblx0XHR9O1xuXG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG5cdH1cblxuXHQvLyBleHBvcnQgdG8gd2luZG93XG5cdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNhbmNlbEFuaW1hdGlvbkZyYW1lO1xufSh3aW5kb3cpKTtcbiIsIi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbCNMaXN0ZW5pbmdfdG9fdGhpc19ldmVudF9hY3Jvc3NfYnJvd3NlclxuLy8gY3JlYXRlcyBhIGdsb2JhbCBcImFkZFdoZWVsTGlzdGVuZXJcIiBtZXRob2Rcbi8vIGV4YW1wbGU6IGFkZFdoZWVsTGlzdGVuZXIoIGVsZW0sIGZ1bmN0aW9uKCBlICkgeyBjb25zb2xlLmxvZyggZS5kZWx0YVkgKTsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9ICk7XG4oZnVuY3Rpb24od2luZG93LGRvY3VtZW50KSB7XG5cbiAgICB2YXIgcHJlZml4ID0gXCJcIiwgX2FkZEV2ZW50TGlzdGVuZXIsIHN1cHBvcnQ7XG5cbiAgICAvLyBkZXRlY3QgZXZlbnQgbW9kZWxcbiAgICBpZiAoIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICkge1xuICAgICAgICBfYWRkRXZlbnRMaXN0ZW5lciA9IFwiYWRkRXZlbnRMaXN0ZW5lclwiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIF9hZGRFdmVudExpc3RlbmVyID0gXCJhdHRhY2hFdmVudFwiO1xuICAgICAgICBwcmVmaXggPSBcIm9uXCI7XG4gICAgfVxuXG4gICAgLy8gZGV0ZWN0IGF2YWlsYWJsZSB3aGVlbCBldmVudFxuICAgIHN1cHBvcnQgPSBcIm9ud2hlZWxcIiBpbiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpID8gXCJ3aGVlbFwiIDogLy8gTW9kZXJuIGJyb3dzZXJzIHN1cHBvcnQgXCJ3aGVlbFwiXG4gICAgICAgICAgICAgIGRvY3VtZW50Lm9ubW91c2V3aGVlbCAhPT0gdW5kZWZpbmVkID8gXCJtb3VzZXdoZWVsXCIgOiAvLyBXZWJraXQgYW5kIElFIHN1cHBvcnQgYXQgbGVhc3QgXCJtb3VzZXdoZWVsXCJcbiAgICAgICAgICAgICAgXCJET01Nb3VzZVNjcm9sbFwiOyAvLyBsZXQncyBhc3N1bWUgdGhhdCByZW1haW5pbmcgYnJvd3NlcnMgYXJlIG9sZGVyIEZpcmVmb3hcblxuICAgIHdpbmRvdy5hZGRXaGVlbExpc3RlbmVyID0gZnVuY3Rpb24oIGVsZW0sIGNhbGxiYWNrLCB1c2VDYXB0dXJlICkge1xuICAgICAgICBfYWRkV2hlZWxMaXN0ZW5lciggZWxlbSwgc3VwcG9ydCwgY2FsbGJhY2ssIHVzZUNhcHR1cmUgKTtcblxuICAgICAgICAvLyBoYW5kbGUgTW96TW91c2VQaXhlbFNjcm9sbCBpbiBvbGRlciBGaXJlZm94XG4gICAgICAgIGlmKCBzdXBwb3J0ID09IFwiRE9NTW91c2VTY3JvbGxcIiApIHtcbiAgICAgICAgICAgIF9hZGRXaGVlbExpc3RlbmVyKCBlbGVtLCBcIk1vek1vdXNlUGl4ZWxTY3JvbGxcIiwgY2FsbGJhY2ssIHVzZUNhcHR1cmUgKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkV2hlZWxMaXN0ZW5lciggZWxlbSwgZXZlbnROYW1lLCBjYWxsYmFjaywgdXNlQ2FwdHVyZSApIHtcbiAgICAgICAgZWxlbVsgX2FkZEV2ZW50TGlzdGVuZXIgXSggcHJlZml4ICsgZXZlbnROYW1lLCBzdXBwb3J0ID09IFwid2hlZWxcIiA/IGNhbGxiYWNrIDogZnVuY3Rpb24oIG9yaWdpbmFsRXZlbnQgKSB7XG4gICAgICAgICAgICAhb3JpZ2luYWxFdmVudCAmJiAoIG9yaWdpbmFsRXZlbnQgPSB3aW5kb3cuZXZlbnQgKTtcblxuICAgICAgICAgICAgLy8gY3JlYXRlIGEgbm9ybWFsaXplZCBldmVudCBvYmplY3RcbiAgICAgICAgICAgIHZhciBldmVudCA9IHtcbiAgICAgICAgICAgICAgICAvLyBrZWVwIGEgcmVmIHRvIHRoZSBvcmlnaW5hbCBldmVudCBvYmplY3RcbiAgICAgICAgICAgICAgICBvcmlnaW5hbEV2ZW50OiBvcmlnaW5hbEV2ZW50LFxuICAgICAgICAgICAgICAgIHRhcmdldDogb3JpZ2luYWxFdmVudC50YXJnZXQgfHwgb3JpZ2luYWxFdmVudC5zcmNFbGVtZW50LFxuICAgICAgICAgICAgICAgIHR5cGU6IFwid2hlZWxcIixcbiAgICAgICAgICAgICAgICBkZWx0YU1vZGU6IG9yaWdpbmFsRXZlbnQudHlwZSA9PSBcIk1vek1vdXNlUGl4ZWxTY3JvbGxcIiA/IDAgOiAxLFxuICAgICAgICAgICAgICAgIGRlbHRhWDogMCxcbiAgICAgICAgICAgICAgICBkZWx0YVo6IDAsXG4gICAgICAgICAgICAgICAgcHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0ID9cbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsRXZlbnQucHJldmVudERlZmF1bHQoKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEV2ZW50LnJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gY2FsY3VsYXRlIGRlbHRhWSAoYW5kIGRlbHRhWCkgYWNjb3JkaW5nIHRvIHRoZSBldmVudFxuICAgICAgICAgICAgaWYgKCBzdXBwb3J0ID09IFwibW91c2V3aGVlbFwiICkge1xuICAgICAgICAgICAgICAgIGV2ZW50LmRlbHRhWSA9IC0gMS80MCAqIG9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YTtcbiAgICAgICAgICAgICAgICAvLyBXZWJraXQgYWxzbyBzdXBwb3J0IHdoZWVsRGVsdGFYXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxFdmVudC53aGVlbERlbHRhWCAmJiAoIGV2ZW50LmRlbHRhWCA9IC0gMS80MCAqIG9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YVggKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXZlbnQuZGVsdGFZID0gb3JpZ2luYWxFdmVudC5kZXRhaWw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGl0J3MgdGltZSB0byBmaXJlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCBldmVudCApO1xuXG4gICAgICAgIH0sIHVzZUNhcHR1cmUgfHwgZmFsc2UgKTtcbiAgICB9XG5cbn0pKHdpbmRvdyxkb2N1bWVudCk7XG4iXX0=
