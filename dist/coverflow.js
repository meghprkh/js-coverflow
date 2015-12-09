(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.coverflow = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/coverflow.js');

},{"./lib/coverflow.js":2}],2:[function(require,module,exports){
'use strict';

require('./raf.lib.js');
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
  }
  view.addEventListener('mousedown', tap);
  view.addEventListener('mousemove', drag);
  view.addEventListener('mouseup', release);
  document.addEventListener('keydown', handleKey);
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

},{"./createStyleSheet.js":3,"./raf.lib.js":4}],3:[function(require,module,exports){
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
    .coverflow " + tagName + " {" +
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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb3ZlcmZsb3cuanMiLCJsaWIvY3JlYXRlU3R5bGVTaGVldC5qcyIsImxpYi9yYWYubGliLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9jb3ZlcmZsb3cuanMnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9yYWYubGliLmpzJyk7XG52YXIgY3JlYXRlU3R5bGVTaGVldCA9IHJlcXVpcmUoJy4vY3JlYXRlU3R5bGVTaGVldC5qcycpO1xuXG52YXIgY291bnQsIGltYWdlcywgZGltLCBvZmZzZXQsIGNlbnRlciwgYW5nbGUsIGRpc3QsIHNoaWZ0LFxuICAgIHByZXNzZWQsIHJlZmVyZW5jZSwgYW1wbGl0dWRlLCB0YXJnZXQsIHZlbG9jaXR5LCB0aW1lQ29uc3RhbnQsXG4gICAgeGZvcm0sIGZyYW1lLCB0aW1lc3RhbXAsIHRpY2tlciwgb2xkQWN0aXZlSW5kZXgsIHN0YXJ0dGltZXN0YW1wLCB0YXBNYXhDb25zdGFudCxcbiAgICBvbkFjdGl2ZUNsaWNrLCBvbkNoYW5nZSwgdmlldywgdmlld0hlaWdodDtcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZShjb250YWluZXIsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHByZXNzZWQgPSBmYWxzZTtcbiAgb2xkQWN0aXZlSW5kZXggPSAwO1xuICB0aW1lQ29uc3RhbnQgPSBvcHRpb25zLnRpbWVDb25zdGFudCB8fCAyNTA7IC8vIG1zXG4gIHRhcE1heENvbnN0YW50ID0gb3B0aW9ucy50YXBNYXhDb25zdGFudCB8fCAxNTA7IC8vIG1zXG4gIG9mZnNldCA9IHRhcmdldCA9IDA7XG4gIHJlZmVyZW5jZSA9IGFtcGxpdHVkZSA9IHZlbG9jaXR5ID0gZnJhbWUgPSB1bmRlZmluZWQ7XG4gIGFuZ2xlID0gb3B0aW9ucy5hbmdsZSB8fCAtNjA7XG4gIGRpc3QgPSBvcHRpb25zLmFuZ2xlIHx8IC0xNTA7XG4gIHNoaWZ0ID0gb3B0aW9ucy5zaGlmdCB8fCAxMDtcbiAgb25BY3RpdmVDbGljayA9IG9wdGlvbnMub25BY3RpdmVDbGljayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgb25DaGFuZ2UgPSBvcHRpb25zLm9uQ2hhbmdlIHx8IGZ1bmN0aW9uICgpIHt9O1xuICBjb250YWluZXIgPSAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29udGFpbmVyKSA6IGNvbnRhaW5lcjtcbiAgY291bnQgPSBjb250YWluZXIuY2hpbGRyZW4ubGVuZ3RoO1xuICBpbWFnZXMgPSBbXTtcbiAgd2hpbGUgKGltYWdlcy5sZW5ndGggPCBjb3VudCkgaW1hZ2VzLnB1c2goY29udGFpbmVyLmNoaWxkcmVuLml0ZW0oaW1hZ2VzLmxlbmd0aCkpO1xuICB2YXIgbWF4SGVpZ2h0ID0gMCwgbWF4V2lkdGggPSAwO1xuICB2YXIgdGFnTmFtZSA9IG9wdGlvbnMudGFnTmFtZSB8fCBpbWFnZXNbMF0udGFnTmFtZTtcbiAgaW1hZ2VzLm1hcChmdW5jdGlvbiAoZWwsIGluZGV4KSB7XG4gICAgZWwub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICBmbG93VG8oaW5kZXgpO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9O1xuICAgIG1heEhlaWdodCA9IG1heEhlaWdodCA+IGVsLnNjcm9sbEhlaWdodCA/IG1heEhlaWdodCA6IGVsLnNjcm9sbEhlaWdodDtcbiAgICBtYXhXaWR0aCA9IG1heFdpZHRoID4gZWwuc3R5bGUud2lkdGggPyBtYXhXaWR0aCA6IGVsLnN0eWxlLndpZHRoO1xuICB9KTtcbiAgbWF4SGVpZ2h0ID0gb3B0aW9ucy5tYXhIZWlnaHQgfHwgbWF4SGVpZ2h0O1xuICBtYXhXaWR0aCA9IG9wdGlvbnMubWF4V2lkdGggfHwgbWF4V2lkdGg7XG4gIGNvbnRhaW5lci5jbGFzc05hbWUgKz0gJyBjb3ZlcmZsb3cnO1xuICBjb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gbWF4SGVpZ2h0ICogMS4xO1xuICBjcmVhdGVTdHlsZVNoZWV0KHRhZ05hbWUsIG1heEhlaWdodCwgbWF4V2lkdGgpO1xuICBpbWFnZXMubWFwKGZ1bmN0aW9uIChlbCwgaW5kZXgpIHtcbiAgICBtYXhIZWlnaHQgPSBtYXhIZWlnaHQgPiBlbC5zY3JvbGxIZWlnaHQgPyBtYXhIZWlnaHQgOiBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgbWF4V2lkdGggPSBtYXhXaWR0aCA+IGVsLnNjcm9sbFdpZHRoID8gbWF4V2lkdGggOiBlbC5zY3JvbGxXaWR0aDtcbiAgfSk7XG4gIHZpZXdIZWlnaHQgPSBtYXhIZWlnaHQgKiAxLjE7XG4gIGRpbSA9IG1heFdpZHRoO1xuICB2aWV3ID0gY29udGFpbmVyO1xuICBzY3JvbGwob2Zmc2V0KTtcbiAgc2V0dXBFdmVudHMoY29udGFpbmVyKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBFdmVudHMoKSB7XG4gIGlmICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0YXApO1xuICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZHJhZyk7XG4gICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHJlbGVhc2UpO1xuICB9XG4gIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGFwKTtcbiAgdmlldy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnKTtcbiAgdmlldy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgcmVsZWFzZSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVLZXkpO1xufVxuXG5mdW5jdGlvbiB4cG9zKGUpIHtcbiAgLy8gdG91Y2ggZXZlbnRcbiAgaWYgKGUudGFyZ2V0VG91Y2hlcyAmJiAoZS50YXJnZXRUb3VjaGVzLmxlbmd0aCA+PSAxKSkge1xuICAgIHJldHVybiBlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WDtcbiAgfVxuXG4gIC8vIG1vdXNlIGV2ZW50XG4gIHJldHVybiBlLmNsaWVudFg7XG59XG5cbmZ1bmN0aW9uIHdyYXAoeCkge1xuICByZXR1cm4gKHggPj0gY291bnQpID8gKHggJSBjb3VudCkgOiAoeCA8IDApID8gd3JhcChjb3VudCArICh4ICUgY291bnQpKSA6IHg7XG59XG5cbmZ1bmN0aW9uIHNjcm9sbCh4KSB7XG4gIHZhciBpLCBoYWxmLCBkZWx0YSwgZGlyLCB0d2VlbiwgZWwsIGFsaWdubWVudDtcblxuICBvZmZzZXQgPSAodHlwZW9mIHggPT09ICdudW1iZXInKSA/IHggOiBvZmZzZXQ7XG4gIGNlbnRlciA9IE1hdGguZmxvb3IoKG9mZnNldCArIGRpbSAvIDIpIC8gZGltKTtcbiAgZGVsdGEgPSBvZmZzZXQgLSBjZW50ZXIgKiBkaW07XG4gIGRpciA9IChkZWx0YSA8IDApID8gMSA6IC0xO1xuICB0d2VlbiA9IC1kaXIgKiBkZWx0YSAqIDIgLyBkaW07XG5cbiAgYWxpZ25tZW50ID0gJ3RyYW5zbGF0ZVgoJyArICh2aWV3LmNsaWVudFdpZHRoIC0gZGltKSAvIDIgKyAncHgpICc7XG4gIGFsaWdubWVudCArPSAndHJhbnNsYXRlWSgnICsgKHZpZXdIZWlnaHQgLSBkaW0pIC8gMiArICdweCknO1xuXG4gIC8vIGNlbnRlclxuICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlcildO1xuICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICcgdHJhbnNsYXRlWCgnICsgKC1kZWx0YSAvIDIpICsgJ3B4KScgK1xuICAgICcgdHJhbnNsYXRlWCgnICsgKGRpciAqIHNoaWZ0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgdHJhbnNsYXRlWignICsgKGRpc3QgKiB0d2VlbikgKyAncHgpJyArXG4gICAgJyByb3RhdGVZKCcgKyAoZGlyICogYW5nbGUgKiB0d2VlbikgKyAnZGVnKSc7XG4gIGVsLnN0eWxlLnpJbmRleCA9IDA7XG4gIGVsLnN0eWxlLm9wYWNpdHkgPSAxO1xuXG4gIGhhbGYgPSBjb3VudCA+PiAxO1xuICBmb3IgKGkgPSAxOyBpIDw9IGhhbGY7ICsraSkge1xuICAgIC8vIHJpZ2h0IHNpZGVcbiAgICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlciArIGkpXTtcbiAgICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICAgJyB0cmFuc2xhdGVYKCcgKyAoc2hpZnQgKyAoZGltICogaSAtIGRlbHRhKSAvIDIpICsgJ3B4KScgK1xuICAgICAgJyB0cmFuc2xhdGVaKCcgKyBkaXN0ICsgJ3B4KScgK1xuICAgICAgJyByb3RhdGVZKCcgKyBhbmdsZSArICdkZWcpJztcbiAgICBlbC5zdHlsZS56SW5kZXggPSAtaTtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gKGkgPT09IGhhbGYgJiYgZGVsdGEgPCAwKSA/IDEgLSB0d2VlbiA6IDE7XG5cbiAgICAvLyBsZWZ0IHNpZGVcbiAgICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlciAtIGkpXTtcbiAgICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICAgJyB0cmFuc2xhdGVYKCcgKyAoLXNoaWZ0ICsgKC1kaW0gKiBpIC0gZGVsdGEpIC8gMikgKyAncHgpJyArXG4gICAgICAnIHRyYW5zbGF0ZVooJyArIGRpc3QgKyAncHgpJyArXG4gICAgICAnIHJvdGF0ZVkoJyArIC1hbmdsZSArICdkZWcpJztcbiAgICBlbC5zdHlsZS56SW5kZXggPSAtaTtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gKGkgPT09IGhhbGYgJiYgZGVsdGEgPiAwKSA/IDEgLSB0d2VlbiA6IDE7XG4gIH1cblxuICAvLyBjZW50ZXJcbiAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIpXTtcbiAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArICgtZGVsdGEgLyAyKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArIChkaXIgKiBzaGlmdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVooJyArIChkaXN0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgcm90YXRlWSgnICsgKGRpciAqIGFuZ2xlICogdHdlZW4pICsgJ2RlZyknO1xuICBlbC5zdHlsZS56SW5kZXggPSAwO1xuICBlbC5zdHlsZS5vcGFjaXR5ID0gMTtcbn1cblxuZnVuY3Rpb24gdHJhY2soKSB7XG4gIHZhciBub3csIGVsYXBzZWQsIGRlbHRhLCB2O1xuXG4gIG5vdyA9IERhdGUubm93KCk7XG4gIGVsYXBzZWQgPSBub3cgLSB0aW1lc3RhbXA7XG4gIHRpbWVzdGFtcCA9IG5vdztcbiAgZGVsdGEgPSBvZmZzZXQgLSBmcmFtZTtcbiAgZnJhbWUgPSBvZmZzZXQ7XG5cbiAgdiA9IDEwMDAgKiBkZWx0YSAvICgxICsgZWxhcHNlZCk7XG4gIHZlbG9jaXR5ID0gMC44ICogdiArIDAuMiAqIHZlbG9jaXR5O1xufVxuXG5mdW5jdGlvbiBhdXRvU2Nyb2xsKCkge1xuICB2YXIgZWxhcHNlZCwgZGVsdGE7XG5cbiAgaWYgKGFtcGxpdHVkZSkge1xuICAgIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gdGltZXN0YW1wO1xuICAgIGRlbHRhID0gYW1wbGl0dWRlICogTWF0aC5leHAoLWVsYXBzZWQgLyB0aW1lQ29uc3RhbnQpO1xuICAgIGlmIChkZWx0YSA+IDQgfHwgZGVsdGEgPCAtNCkge1xuICAgICAgc2Nyb2xsKHRhcmdldCAtIGRlbHRhKTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgICB9IGVsc2UgIHtcbiAgICAgIHNjcm9sbCh0YXJnZXQpO1xuICAgICAgY2hhbmdlZChnZXRBY3RpdmVJbmRleCgpKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdGFwKGUpIHtcbiAgcHJlc3NlZCA9IHRydWU7XG4gIHJlZmVyZW5jZSA9IHhwb3MoZSk7XG5cbiAgdmVsb2NpdHkgPSBhbXBsaXR1ZGUgPSAwO1xuICBmcmFtZSA9IG9mZnNldDtcbiAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgc3RhcnR0aW1lc3RhbXAgPSB0aW1lc3RhbXA7XG4gIGNsZWFySW50ZXJ2YWwodGlja2VyKTtcbiAgdGlja2VyID0gc2V0SW50ZXJ2YWwodHJhY2ssIDEwMCk7XG5cbiAgLy8gYWxsb3cgdG91Y2ggZGV2aWNlcyB0byBoYW5kbGUgY2xpY2sgZXZlbnQgYnV0IGRvbnQgYWxsb3cgZHJhZ2dpbmcgb24gZGVza3RvcHNcbiAgaWYgKGUudHlwZSA9PSAnbW91c2Vkb3duJykgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAvLyBhbGxvdyB0b3VjaCBkZXZpY2VzIHRvIGhhbmRsZSBjbGljayBldmVudCBidXQgZG9udCBhbGxvdyBkcmFnZ2luZyBvbiBkZXNrdG9wc1xuICBpZiAoZS50eXBlID09ICdtb3VzZWRvd24nKSByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGRyYWcoZSkge1xuICB2YXIgeCwgZGVsdGE7XG4gIGlmIChwcmVzc2VkKSB7XG4gICAgeCA9IHhwb3MoZSk7XG4gICAgZGVsdGEgPSByZWZlcmVuY2UgLSB4O1xuICAgIGlmIChkZWx0YSA+IDIgfHwgZGVsdGEgPCAtMikge1xuICAgICAgcmVmZXJlbmNlID0geDtcbiAgICAgIHNjcm9sbChvZmZzZXQgKyBkZWx0YSk7XG4gICAgfVxuICB9XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZWxlYXNlKGUpIHtcbiAgcHJlc3NlZCA9IGZhbHNlO1xuXG4gIGNsZWFySW50ZXJ2YWwodGlja2VyKTtcbiAgdGFyZ2V0ID0gb2Zmc2V0O1xuICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICBpZiAodmVsb2NpdHkgPiAxMCB8fCB2ZWxvY2l0eSA8IC0xMCkge1xuICAgIGFtcGxpdHVkZSA9IDAuOSAqIHZlbG9jaXR5O1xuICAgIHRhcmdldCA9IG9mZnNldCArIGFtcGxpdHVkZTtcbiAgICB0YXJnZXQgPSBNYXRoLnJvdW5kKHRhcmdldCAvIGRpbSkgKiBkaW07XG4gICAgYW1wbGl0dWRlID0gdGFyZ2V0IC0gb2Zmc2V0O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmICh0aW1lc3RhbXAgLSBzdGFydHRpbWVzdGFtcCA+IHRhcE1heENvbnN0YW50KSB7IC8vIFNuYXAgdG8gbmVhcmVzdCBlbGVtZW50XG4gICAgdGFyZ2V0ID0gTWF0aC5yb3VuZCh0YXJnZXQgLyBkaW0pICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlS2V5KGUpIHtcbiAgaWYgKCFwcmVzc2VkICYmICh0YXJnZXQgPT09IG9mZnNldCkpIHtcbiAgICAvLyBTcGFjZSBvciBQYWdlRG93biBvciBSaWdodEFycm93IG9yIERvd25BcnJvd1xuICAgIGlmIChbMzIsIDM0LCAzOSwgNDBdLmluZGV4T2YoZS53aGljaCkgPj0gMCkge1xuICAgICAgdGFyZ2V0ID0gb2Zmc2V0ICsgZGltO1xuICAgIH1cbiAgICAvLyBQYWdlVXAgb3IgTGVmdEFycm93IG9yIFVwQXJyb3dcbiAgICBpZiAoWzMzLCAzNywgMzhdLmluZGV4T2YoZS53aGljaCkgPj0gMCkge1xuICAgICAgdGFyZ2V0ID0gb2Zmc2V0IC0gZGltO1xuICAgIH1cbiAgICBpZiAob2Zmc2V0ICE9PSB0YXJnZXQpIHtcbiAgICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICAgIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxvd1RvKHRvKSB7XG4gIHZhciBjZW50ZXJJbmRleCA9IGdldEFjdGl2ZUluZGV4KCk7XG4gIGlmICh0byA9PSBjZW50ZXJJbmRleCkge1xuICAgIG9uQWN0aXZlQ2xpY2soY2VudGVySW5kZXgpO1xuICB9IGVsc2Uge1xuICAgIHZhciBvZmZzZXRQb3NpdGlvbjtcbiAgICBpZiAodG8gLSBjZW50ZXJJbmRleCA+IChjb3VudCAtIDEpLzIpIG9mZnNldFBvc2l0aW9uID0gKHRvIC0gY2VudGVySW5kZXgpIC0gY291bnQ7XG4gICAgZWxzZSBpZiAodG8gLSBjZW50ZXJJbmRleCA8PSAtKGNvdW50IC0gMSkvMikgb2Zmc2V0UG9zaXRpb24gPSAodG8gLSBjZW50ZXJJbmRleCkgKyBjb3VudDtcbiAgICBlbHNlIG9mZnNldFBvc2l0aW9uID0gdG8gLSBjZW50ZXJJbmRleDtcbiAgICB0YXJnZXQgPSBvZmZzZXQgKyBvZmZzZXRQb3NpdGlvbiAqIGRpbTtcbiAgICBhbXBsaXR1ZGUgPSB0YXJnZXQgLSBvZmZzZXQ7XG4gICAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0QWN0aXZlKHRvKSB7XG4gIHNjcm9sbChkaW0gKiB0byk7XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZUluZGV4KCkge1xuICB2YXIgY2VudGVySW5kZXggPSBjZW50ZXIgJSBjb3VudDtcbiAgd2hpbGUgKGNlbnRlckluZGV4IDwgMCkgY2VudGVySW5kZXggKz0gY291bnQ7XG4gIHJldHVybiBjZW50ZXJJbmRleDtcbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlRWxlbWVudCgpIHtcbiAgcmV0dXJuIGltYWdlc1tnZXRBY3RpdmVJbmRleCgpXTtcbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlSWQoKSB7XG4gIHJldHVybiBpbWFnZXNbZ2V0QWN0aXZlSW5kZXgoKV0uaWQ7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZWQodG8pIHtcbiAgaWYgKG9sZEFjdGl2ZUluZGV4ICE9IHRvKSB7XG4gICAgb25DaGFuZ2UodG8sIG9sZEFjdGl2ZUluZGV4KTtcbiAgICBvbGRBY3RpdmVJbmRleCA9IHRvO1xuICB9XG59XG5cbnhmb3JtID0gJ3RyYW5zZm9ybSc7XG5bJ3dlYmtpdCcsICdNb3onLCAnTycsICdtcyddLmV2ZXJ5KGZ1bmN0aW9uIChwcmVmaXgpIHtcbiAgdmFyIGUgPSBwcmVmaXggKyAnVHJhbnNmb3JtJztcbiAgaWYgKHR5cGVvZiBkb2N1bWVudC5ib2R5LnN0eWxlW2VdICE9PSAndW5kZWZpbmVkJykge1xuICAgIHhmb3JtID0gZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHNjcm9sbCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICBmbG93VG86IGZsb3dUbyxcbiAgc2V0QWN0aXZlOiBzZXRBY3RpdmUsXG4gIGdldEFjdGl2ZUlkOiBnZXRBY3RpdmVJZCxcbiAgZ2V0QWN0aXZlRWxlbWVudDogZ2V0QWN0aXZlRWxlbWVudCxcbiAgZ2V0QWN0aXZlSW5kZXg6IGdldEFjdGl2ZUluZGV4XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodGFnTmFtZSwgbWF4SGVpZ2h0LCBtYXhXaWR0aCkge1xuICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gIHZhciBzdHIgPSBcIlxcXG4gICAgLmNvdmVyZmxvdyB7XFxcbiAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcXFxuICAgICAgICBwZXJzcGVjdGl2ZTogMTAwMHB4O1xcXG4gICAgICAgIC13ZWJraXQtcGVyc3BlY3RpdmU6IDEwMDBweDtcXFxuICAgICAgICB0cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcXG4gICAgICAgIC13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXFxuICAgIH1cXFxuICAgIFxcXG4gICAgLmNvdmVyZmxvdyBcIiArIHRhZ05hbWUgKyBcIiB7XCIgK1xuICAgICgobWF4SGVpZ2h0KSA/IFwiICAgaGVpZ2h0IDogXCIgKyBtYXhIZWlnaHQgKyBcInB4O1wiIDogXCJcIikgK1xuICAgICgobWF4V2lkdGgpID8gXCIgICB3aWR0aCA6IFwiICsgbWF4V2lkdGggKyBcInB4O1wiIDogXCJcIikgK1xuICAgIFwiICAgcG9zaXRpb246IGFic29sdXRlO1xcXG4gICAgICAgIHRvcDogMDtcXFxuICAgICAgICBsZWZ0OiAwO1xcXG4gICAgICAgIG9wYWNpdHk6IDA7XFxcbiAgICAgICAgYm9yZGVyOiBub25lO1xcXG4gICAgfVxcXG4gIFwiO1xuICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHIpKTtcbiAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG59XG4iLCIvKlxuICogcmFmLmpzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbmdyeW1hbi9yYWYuanNcbiAqXG4gKiBvcmlnaW5hbCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyXG4gKiBpbnNwaXJlZCBmcm9tIHBhdWxfaXJpc2ggZ2lzdCBhbmQgcG9zdFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBuZ3J5bWFuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cblxuKGZ1bmN0aW9uKHdpbmRvdykge1xuXHR2YXIgbGFzdFRpbWUgPSAwLFxuXHRcdHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXSxcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lLFxuXHRcdGkgPSB2ZW5kb3JzLmxlbmd0aDtcblxuXHQvLyB0cnkgdG8gdW4tcHJlZml4IGV4aXN0aW5nIHJhZlxuXHR3aGlsZSAoLS1pID49IDAgJiYgIXJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbaV0gKyAnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG5cdH1cblxuXHQvLyBwb2x5ZmlsbCB3aXRoIHNldFRpbWVvdXQgZmFsbGJhY2tcblx0Ly8gaGVhdmlseSBpbnNwaXJlZCBmcm9tIEBkYXJpdXMgZ2lzdCBtb2Q6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL3BhdWxpcmlzaC8xNTc5NjcxI2NvbW1lbnQtODM3OTQ1XG5cdGlmICghcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICFjYW5jZWxBbmltYXRpb25GcmFtZSkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgbm93ID0gK0RhdGUubm93KCksXG5cdFx0XHRcdG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcblx0XHRcdHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTtcblx0XHRcdH0sIG5leHRUaW1lIC0gbm93KTtcblx0XHR9O1xuXG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG5cdH1cblxuXHQvLyBleHBvcnQgdG8gd2luZG93XG5cdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNhbmNlbEFuaW1hdGlvbkZyYW1lO1xufSh3aW5kb3cpKTtcbiJdfQ==
