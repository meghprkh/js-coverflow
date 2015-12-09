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
  console.log(offset);
  center = Math.floor((offset + dim / 2) / dim);
  console.log(center);
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
    // console.log('BABA');
    // initialize(imagesInit, originalContent, originalOptions);
    // scroll(target);
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
    if (to - centerIndex > count/2) offsetPosition = (to - centerIndex) - count;
    else if (to - centerIndex <= -count/2) offsetPosition = (to - centerIndex) + count;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb3ZlcmZsb3cuanMiLCJsaWIvY3JlYXRlU3R5bGVTaGVldC5qcyIsImxpYi9yYWYubGliLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvY292ZXJmbG93LmpzJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJy4vcmFmLmxpYi5qcycpO1xudmFyIGNyZWF0ZVN0eWxlU2hlZXQgPSByZXF1aXJlKCcuL2NyZWF0ZVN0eWxlU2hlZXQuanMnKTtcblxudmFyIGNvdW50LCBpbWFnZXMsIGRpbSwgb2Zmc2V0LCBjZW50ZXIsIGFuZ2xlLCBkaXN0LCBzaGlmdCxcbiAgICBwcmVzc2VkLCByZWZlcmVuY2UsIGFtcGxpdHVkZSwgdGFyZ2V0LCB2ZWxvY2l0eSwgdGltZUNvbnN0YW50LFxuICAgIHhmb3JtLCBmcmFtZSwgdGltZXN0YW1wLCB0aWNrZXIsIG9sZEFjdGl2ZUluZGV4LCBzdGFydHRpbWVzdGFtcCwgdGFwTWF4Q29uc3RhbnQsXG4gICAgb25BY3RpdmVDbGljaywgb25DaGFuZ2UsIHZpZXcsIHZpZXdIZWlnaHQ7XG5cbmZ1bmN0aW9uIGluaXRpYWxpemUoY29udGFpbmVyLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBwcmVzc2VkID0gZmFsc2U7XG4gIG9sZEFjdGl2ZUluZGV4ID0gMDtcbiAgdGltZUNvbnN0YW50ID0gb3B0aW9ucy50aW1lQ29uc3RhbnQgfHwgMjUwOyAvLyBtc1xuICB0YXBNYXhDb25zdGFudCA9IG9wdGlvbnMudGFwTWF4Q29uc3RhbnQgfHwgMTUwOyAvLyBtc1xuICBvZmZzZXQgPSB0YXJnZXQgPSAwO1xuICByZWZlcmVuY2UgPSBhbXBsaXR1ZGUgPSB2ZWxvY2l0eSA9IGZyYW1lID0gdW5kZWZpbmVkO1xuICBhbmdsZSA9IG9wdGlvbnMuYW5nbGUgfHwgLTYwO1xuICBkaXN0ID0gb3B0aW9ucy5hbmdsZSB8fCAtMTUwO1xuICBzaGlmdCA9IG9wdGlvbnMuc2hpZnQgfHwgMTA7XG4gIG9uQWN0aXZlQ2xpY2sgPSBvcHRpb25zLm9uQWN0aXZlQ2xpY2sgfHwgZnVuY3Rpb24gKCkge307XG4gIG9uQ2hhbmdlID0gb3B0aW9ucy5vbkNoYW5nZSB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgY29udGFpbmVyID0gKHR5cGVvZiBjb250YWluZXIgPT09ICdzdHJpbmcnKSA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcikgOiBjb250YWluZXI7XG4gIGNvdW50ID0gY29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aDtcbiAgaW1hZ2VzID0gW107XG4gIHdoaWxlIChpbWFnZXMubGVuZ3RoIDwgY291bnQpIGltYWdlcy5wdXNoKGNvbnRhaW5lci5jaGlsZHJlbi5pdGVtKGltYWdlcy5sZW5ndGgpKTtcbiAgdmFyIG1heEhlaWdodCA9IDAsIG1heFdpZHRoID0gMDtcbiAgdmFyIHRhZ05hbWUgPSBvcHRpb25zLnRhZ05hbWUgfHwgaW1hZ2VzWzBdLnRhZ05hbWU7XG4gIGltYWdlcy5tYXAoZnVuY3Rpb24gKGVsLCBpbmRleCkge1xuICAgIGVsLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgZmxvd1RvKGluZGV4KTtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfTtcbiAgICBtYXhIZWlnaHQgPSBtYXhIZWlnaHQgPiBlbC5zY3JvbGxIZWlnaHQgPyBtYXhIZWlnaHQgOiBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgbWF4V2lkdGggPSBtYXhXaWR0aCA+IGVsLnN0eWxlLndpZHRoID8gbWF4V2lkdGggOiBlbC5zdHlsZS53aWR0aDtcbiAgfSk7XG4gIG1heEhlaWdodCA9IG9wdGlvbnMubWF4SGVpZ2h0IHx8IG1heEhlaWdodDtcbiAgbWF4V2lkdGggPSBvcHRpb25zLm1heFdpZHRoIHx8IG1heFdpZHRoO1xuICBjb250YWluZXIuY2xhc3NOYW1lICs9ICcgY292ZXJmbG93JztcbiAgY29udGFpbmVyLnN0eWxlLmhlaWdodCA9IG1heEhlaWdodCAqIDEuMTtcbiAgY3JlYXRlU3R5bGVTaGVldCh0YWdOYW1lLCBtYXhIZWlnaHQsIG1heFdpZHRoKTtcbiAgaW1hZ2VzLm1hcChmdW5jdGlvbiAoZWwsIGluZGV4KSB7XG4gICAgbWF4SGVpZ2h0ID0gbWF4SGVpZ2h0ID4gZWwuc2Nyb2xsSGVpZ2h0ID8gbWF4SGVpZ2h0IDogZWwuc2Nyb2xsSGVpZ2h0O1xuICAgIG1heFdpZHRoID0gbWF4V2lkdGggPiBlbC5zY3JvbGxXaWR0aCA/IG1heFdpZHRoIDogZWwuc2Nyb2xsV2lkdGg7XG4gIH0pO1xuICB2aWV3SGVpZ2h0ID0gbWF4SGVpZ2h0ICogMS4xO1xuICBkaW0gPSBtYXhXaWR0aDtcbiAgdmlldyA9IGNvbnRhaW5lcjtcbiAgc2Nyb2xsKG9mZnNldCk7XG4gIHNldHVwRXZlbnRzKGNvbnRhaW5lcik7XG59XG5cbmZ1bmN0aW9uIHNldHVwRXZlbnRzKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdy5vbnRvdWNoc3RhcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdGFwKTtcbiAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGRyYWcpO1xuICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCByZWxlYXNlKTtcbiAgfVxuICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRhcCk7XG4gIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZyk7XG4gIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHJlbGVhc2UpO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlS2V5KTtcbn1cblxuZnVuY3Rpb24geHBvcyhlKSB7XG4gIC8vIHRvdWNoIGV2ZW50XG4gIGlmIChlLnRhcmdldFRvdWNoZXMgJiYgKGUudGFyZ2V0VG91Y2hlcy5sZW5ndGggPj0gMSkpIHtcbiAgICByZXR1cm4gZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFg7XG4gIH1cblxuICAvLyBtb3VzZSBldmVudFxuICByZXR1cm4gZS5jbGllbnRYO1xufVxuXG5mdW5jdGlvbiB3cmFwKHgpIHtcbiAgcmV0dXJuICh4ID49IGNvdW50KSA/ICh4ICUgY291bnQpIDogKHggPCAwKSA/IHdyYXAoY291bnQgKyAoeCAlIGNvdW50KSkgOiB4O1xufVxuXG5mdW5jdGlvbiBzY3JvbGwoeCkge1xuICB2YXIgaSwgaGFsZiwgZGVsdGEsIGRpciwgdHdlZW4sIGVsLCBhbGlnbm1lbnQ7XG5cbiAgb2Zmc2V0ID0gKHR5cGVvZiB4ID09PSAnbnVtYmVyJykgPyB4IDogb2Zmc2V0O1xuICBjb25zb2xlLmxvZyhvZmZzZXQpO1xuICBjZW50ZXIgPSBNYXRoLmZsb29yKChvZmZzZXQgKyBkaW0gLyAyKSAvIGRpbSk7XG4gIGNvbnNvbGUubG9nKGNlbnRlcik7XG4gIGRlbHRhID0gb2Zmc2V0IC0gY2VudGVyICogZGltO1xuICBkaXIgPSAoZGVsdGEgPCAwKSA/IDEgOiAtMTtcbiAgdHdlZW4gPSAtZGlyICogZGVsdGEgKiAyIC8gZGltO1xuXG4gIGFsaWdubWVudCA9ICd0cmFuc2xhdGVYKCcgKyAodmlldy5jbGllbnRXaWR0aCAtIGRpbSkgLyAyICsgJ3B4KSAnO1xuICBhbGlnbm1lbnQgKz0gJ3RyYW5zbGF0ZVkoJyArICh2aWV3SGVpZ2h0IC0gZGltKSAvIDIgKyAncHgpJztcblxuICAvLyBjZW50ZXJcbiAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIpXTtcbiAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArICgtZGVsdGEgLyAyKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArIChkaXIgKiBzaGlmdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVooJyArIChkaXN0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgcm90YXRlWSgnICsgKGRpciAqIGFuZ2xlICogdHdlZW4pICsgJ2RlZyknO1xuICBlbC5zdHlsZS56SW5kZXggPSAwO1xuICBlbC5zdHlsZS5vcGFjaXR5ID0gMTtcblxuICBoYWxmID0gY291bnQgPj4gMTtcbiAgZm9yIChpID0gMTsgaSA8PSBoYWxmOyArK2kpIHtcbiAgICAvLyByaWdodCBzaWRlXG4gICAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIgKyBpKV07XG4gICAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAgICcgdHJhbnNsYXRlWCgnICsgKHNoaWZ0ICsgKGRpbSAqIGkgLSBkZWx0YSkgLyAyKSArICdweCknICtcbiAgICAgICcgdHJhbnNsYXRlWignICsgZGlzdCArICdweCknICtcbiAgICAgICcgcm90YXRlWSgnICsgYW5nbGUgKyAnZGVnKSc7XG4gICAgZWwuc3R5bGUuekluZGV4ID0gLWk7XG4gICAgZWwuc3R5bGUub3BhY2l0eSA9IChpID09PSBoYWxmICYmIGRlbHRhIDwgMCkgPyAxIC0gdHdlZW4gOiAxO1xuXG4gICAgLy8gbGVmdCBzaWRlXG4gICAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIgLSBpKV07XG4gICAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAgICcgdHJhbnNsYXRlWCgnICsgKC1zaGlmdCArICgtZGltICogaSAtIGRlbHRhKSAvIDIpICsgJ3B4KScgK1xuICAgICAgJyB0cmFuc2xhdGVaKCcgKyBkaXN0ICsgJ3B4KScgK1xuICAgICAgJyByb3RhdGVZKCcgKyAtYW5nbGUgKyAnZGVnKSc7XG4gICAgZWwuc3R5bGUuekluZGV4ID0gLWk7XG4gICAgZWwuc3R5bGUub3BhY2l0eSA9IChpID09PSBoYWxmICYmIGRlbHRhID4gMCkgPyAxIC0gdHdlZW4gOiAxO1xuICB9XG5cbiAgLy8gY2VudGVyXG4gIGVsID0gaW1hZ2VzW3dyYXAoY2VudGVyKV07XG4gIGVsLnN0eWxlW3hmb3JtXSA9IGFsaWdubWVudCArXG4gICAgJyB0cmFuc2xhdGVYKCcgKyAoLWRlbHRhIC8gMikgKyAncHgpJyArXG4gICAgJyB0cmFuc2xhdGVYKCcgKyAoZGlyICogc2hpZnQgKiB0d2VlbikgKyAncHgpJyArXG4gICAgJyB0cmFuc2xhdGVaKCcgKyAoZGlzdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAnIHJvdGF0ZVkoJyArIChkaXIgKiBhbmdsZSAqIHR3ZWVuKSArICdkZWcpJztcbiAgZWwuc3R5bGUuekluZGV4ID0gMDtcbiAgZWwuc3R5bGUub3BhY2l0eSA9IDE7XG59XG5cbmZ1bmN0aW9uIHRyYWNrKCkge1xuICB2YXIgbm93LCBlbGFwc2VkLCBkZWx0YSwgdjtcblxuICBub3cgPSBEYXRlLm5vdygpO1xuICBlbGFwc2VkID0gbm93IC0gdGltZXN0YW1wO1xuICB0aW1lc3RhbXAgPSBub3c7XG4gIGRlbHRhID0gb2Zmc2V0IC0gZnJhbWU7XG4gIGZyYW1lID0gb2Zmc2V0O1xuXG4gIHYgPSAxMDAwICogZGVsdGEgLyAoMSArIGVsYXBzZWQpO1xuICB2ZWxvY2l0eSA9IDAuOCAqIHYgKyAwLjIgKiB2ZWxvY2l0eTtcbn1cblxuZnVuY3Rpb24gYXV0b1Njcm9sbCgpIHtcbiAgdmFyIGVsYXBzZWQsIGRlbHRhO1xuXG4gIGlmIChhbXBsaXR1ZGUpIHtcbiAgICBlbGFwc2VkID0gRGF0ZS5ub3coKSAtIHRpbWVzdGFtcDtcbiAgICBkZWx0YSA9IGFtcGxpdHVkZSAqIE1hdGguZXhwKC1lbGFwc2VkIC8gdGltZUNvbnN0YW50KTtcbiAgICBpZiAoZGVsdGEgPiA0IHx8IGRlbHRhIDwgLTQpIHtcbiAgICAgIHNjcm9sbCh0YXJnZXQgLSBkZWx0YSk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgfSBlbHNlICB7XG4gICAgICBzY3JvbGwodGFyZ2V0KTtcbiAgICAgIGNoYW5nZWQoZ2V0QWN0aXZlSW5kZXgoKSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRhcChlKSB7XG4gIHByZXNzZWQgPSB0cnVlO1xuICByZWZlcmVuY2UgPSB4cG9zKGUpO1xuXG4gIHZlbG9jaXR5ID0gYW1wbGl0dWRlID0gMDtcbiAgZnJhbWUgPSBvZmZzZXQ7XG4gIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gIHN0YXJ0dGltZXN0YW1wID0gdGltZXN0YW1wO1xuICBjbGVhckludGVydmFsKHRpY2tlcik7XG4gIHRpY2tlciA9IHNldEludGVydmFsKHRyYWNrLCAxMDApO1xuXG4gIC8vIGFsbG93IHRvdWNoIGRldmljZXMgdG8gaGFuZGxlIGNsaWNrIGV2ZW50IGJ1dCBkb250IGFsbG93IGRyYWdnaW5nIG9uIGRlc2t0b3BzXG4gIGlmIChlLnR5cGUgPT0gJ21vdXNlZG93bicpIGUucHJldmVudERlZmF1bHQoKTtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgLy8gYWxsb3cgdG91Y2ggZGV2aWNlcyB0byBoYW5kbGUgY2xpY2sgZXZlbnQgYnV0IGRvbnQgYWxsb3cgZHJhZ2dpbmcgb24gZGVza3RvcHNcbiAgaWYgKGUudHlwZSA9PSAnbW91c2Vkb3duJykgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBkcmFnKGUpIHtcbiAgdmFyIHgsIGRlbHRhO1xuICBpZiAocHJlc3NlZCkge1xuICAgIHggPSB4cG9zKGUpO1xuICAgIGRlbHRhID0gcmVmZXJlbmNlIC0geDtcbiAgICBpZiAoZGVsdGEgPiAyIHx8IGRlbHRhIDwgLTIpIHtcbiAgICAgIHJlZmVyZW5jZSA9IHg7XG4gICAgICBzY3JvbGwob2Zmc2V0ICsgZGVsdGEpO1xuICAgIH1cbiAgfVxuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVsZWFzZShlKSB7XG4gIHByZXNzZWQgPSBmYWxzZTtcblxuICBjbGVhckludGVydmFsKHRpY2tlcik7XG4gIHRhcmdldCA9IG9mZnNldDtcbiAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgaWYgKHZlbG9jaXR5ID4gMTAgfHwgdmVsb2NpdHkgPCAtMTApIHtcbiAgICBhbXBsaXR1ZGUgPSAwLjkgKiB2ZWxvY2l0eTtcbiAgICB0YXJnZXQgPSBvZmZzZXQgKyBhbXBsaXR1ZGU7XG4gICAgdGFyZ2V0ID0gTWF0aC5yb3VuZCh0YXJnZXQgLyBkaW0pICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAodGltZXN0YW1wIC0gc3RhcnR0aW1lc3RhbXAgPiB0YXBNYXhDb25zdGFudCkgeyAvLyBTbmFwIHRvIG5lYXJlc3QgZWxlbWVudFxuICAgIC8vIGNvbnNvbGUubG9nKCdCQUJBJyk7XG4gICAgLy8gaW5pdGlhbGl6ZShpbWFnZXNJbml0LCBvcmlnaW5hbENvbnRlbnQsIG9yaWdpbmFsT3B0aW9ucyk7XG4gICAgLy8gc2Nyb2xsKHRhcmdldCk7XG4gICAgdGFyZ2V0ID0gTWF0aC5yb3VuZCh0YXJnZXQgLyBkaW0pICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlS2V5KGUpIHtcbiAgaWYgKCFwcmVzc2VkICYmICh0YXJnZXQgPT09IG9mZnNldCkpIHtcbiAgICAvLyBTcGFjZSBvciBQYWdlRG93biBvciBSaWdodEFycm93IG9yIERvd25BcnJvd1xuICAgIGlmIChbMzIsIDM0LCAzOSwgNDBdLmluZGV4T2YoZS53aGljaCkgPj0gMCkge1xuICAgICAgdGFyZ2V0ID0gb2Zmc2V0ICsgZGltO1xuICAgIH1cbiAgICAvLyBQYWdlVXAgb3IgTGVmdEFycm93IG9yIFVwQXJyb3dcbiAgICBpZiAoWzMzLCAzNywgMzhdLmluZGV4T2YoZS53aGljaCkgPj0gMCkge1xuICAgICAgdGFyZ2V0ID0gb2Zmc2V0IC0gZGltO1xuICAgIH1cbiAgICBpZiAob2Zmc2V0ICE9PSB0YXJnZXQpIHtcbiAgICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICAgIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxvd1RvKHRvKSB7XG4gIHZhciBjZW50ZXJJbmRleCA9IGdldEFjdGl2ZUluZGV4KCk7XG4gIGlmICh0byA9PSBjZW50ZXJJbmRleCkge1xuICAgIG9uQWN0aXZlQ2xpY2soY2VudGVySW5kZXgpO1xuICB9IGVsc2Uge1xuICAgIHZhciBvZmZzZXRQb3NpdGlvbjtcbiAgICBpZiAodG8gLSBjZW50ZXJJbmRleCA+IGNvdW50LzIpIG9mZnNldFBvc2l0aW9uID0gKHRvIC0gY2VudGVySW5kZXgpIC0gY291bnQ7XG4gICAgZWxzZSBpZiAodG8gLSBjZW50ZXJJbmRleCA8PSAtY291bnQvMikgb2Zmc2V0UG9zaXRpb24gPSAodG8gLSBjZW50ZXJJbmRleCkgKyBjb3VudDtcbiAgICBlbHNlIG9mZnNldFBvc2l0aW9uID0gdG8gLSBjZW50ZXJJbmRleDtcbiAgICB0YXJnZXQgPSBvZmZzZXQgKyBvZmZzZXRQb3NpdGlvbiAqIGRpbTtcbiAgICBhbXBsaXR1ZGUgPSB0YXJnZXQgLSBvZmZzZXQ7XG4gICAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0QWN0aXZlKHRvKSB7XG4gIHNjcm9sbChkaW0gKiB0byk7XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZUluZGV4KCkge1xuICB2YXIgY2VudGVySW5kZXggPSBjZW50ZXIgJSBjb3VudDtcbiAgd2hpbGUgKGNlbnRlckluZGV4IDwgMCkgY2VudGVySW5kZXggKz0gY291bnQ7XG4gIHJldHVybiBjZW50ZXJJbmRleDtcbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlRWxlbWVudCgpIHtcbiAgcmV0dXJuIGltYWdlc1tnZXRBY3RpdmVJbmRleCgpXTtcbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlSWQoKSB7XG4gIHJldHVybiBpbWFnZXNbZ2V0QWN0aXZlSW5kZXgoKV0uaWQ7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZWQodG8pIHtcbiAgaWYgKG9sZEFjdGl2ZUluZGV4ICE9IHRvKSB7XG4gICAgb25DaGFuZ2UodG8sIG9sZEFjdGl2ZUluZGV4KTtcbiAgICBvbGRBY3RpdmVJbmRleCA9IHRvO1xuICB9XG59XG5cbnhmb3JtID0gJ3RyYW5zZm9ybSc7XG5bJ3dlYmtpdCcsICdNb3onLCAnTycsICdtcyddLmV2ZXJ5KGZ1bmN0aW9uIChwcmVmaXgpIHtcbiAgdmFyIGUgPSBwcmVmaXggKyAnVHJhbnNmb3JtJztcbiAgaWYgKHR5cGVvZiBkb2N1bWVudC5ib2R5LnN0eWxlW2VdICE9PSAndW5kZWZpbmVkJykge1xuICAgIHhmb3JtID0gZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHNjcm9sbCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICBmbG93VG86IGZsb3dUbyxcbiAgc2V0QWN0aXZlOiBzZXRBY3RpdmUsXG4gIGdldEFjdGl2ZUlkOiBnZXRBY3RpdmVJZCxcbiAgZ2V0QWN0aXZlRWxlbWVudDogZ2V0QWN0aXZlRWxlbWVudCxcbiAgZ2V0QWN0aXZlSW5kZXg6IGdldEFjdGl2ZUluZGV4XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodGFnTmFtZSwgbWF4SGVpZ2h0LCBtYXhXaWR0aCkge1xuICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gIHZhciBzdHIgPSBcIlxcXG4gICAgLmNvdmVyZmxvdyB7XFxcbiAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcXFxuICAgICAgICBwZXJzcGVjdGl2ZTogMTAwMHB4O1xcXG4gICAgICAgIC13ZWJraXQtcGVyc3BlY3RpdmU6IDEwMDBweDtcXFxuICAgICAgICB0cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkO1xcXG4gICAgICAgIC13ZWJraXQtdHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDtcXFxuICAgIH1cXFxuICAgIFxcXG4gICAgLmNvdmVyZmxvdyBcIiArIHRhZ05hbWUgKyBcIiB7XCIgK1xuICAgICgobWF4SGVpZ2h0KSA/IFwiICAgaGVpZ2h0IDogXCIgKyBtYXhIZWlnaHQgKyBcInB4O1wiIDogXCJcIikgK1xuICAgICgobWF4V2lkdGgpID8gXCIgICB3aWR0aCA6IFwiICsgbWF4V2lkdGggKyBcInB4O1wiIDogXCJcIikgK1xuICAgIFwiICAgcG9zaXRpb246IGFic29sdXRlO1xcXG4gICAgICAgIHRvcDogMDtcXFxuICAgICAgICBsZWZ0OiAwO1xcXG4gICAgICAgIG9wYWNpdHk6IDA7XFxcbiAgICAgICAgYm9yZGVyOiBub25lO1xcXG4gICAgfVxcXG4gIFwiO1xuICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHIpKTtcbiAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG59XG4iLCIvKlxuICogcmFmLmpzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbmdyeW1hbi9yYWYuanNcbiAqXG4gKiBvcmlnaW5hbCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyXG4gKiBpbnNwaXJlZCBmcm9tIHBhdWxfaXJpc2ggZ2lzdCBhbmQgcG9zdFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBuZ3J5bWFuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cblxuKGZ1bmN0aW9uKHdpbmRvdykge1xuXHR2YXIgbGFzdFRpbWUgPSAwLFxuXHRcdHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXSxcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lLFxuXHRcdGkgPSB2ZW5kb3JzLmxlbmd0aDtcblxuXHQvLyB0cnkgdG8gdW4tcHJlZml4IGV4aXN0aW5nIHJhZlxuXHR3aGlsZSAoLS1pID49IDAgJiYgIXJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbaV0gKyAnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG5cdH1cblxuXHQvLyBwb2x5ZmlsbCB3aXRoIHNldFRpbWVvdXQgZmFsbGJhY2tcblx0Ly8gaGVhdmlseSBpbnNwaXJlZCBmcm9tIEBkYXJpdXMgZ2lzdCBtb2Q6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL3BhdWxpcmlzaC8xNTc5NjcxI2NvbW1lbnQtODM3OTQ1XG5cdGlmICghcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICFjYW5jZWxBbmltYXRpb25GcmFtZSkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgbm93ID0gK0RhdGUubm93KCksXG5cdFx0XHRcdG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcblx0XHRcdHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTtcblx0XHRcdH0sIG5leHRUaW1lIC0gbm93KTtcblx0XHR9O1xuXG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG5cdH1cblxuXHQvLyBleHBvcnQgdG8gd2luZG93XG5cdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNhbmNlbEFuaW1hdGlvbkZyYW1lO1xufSh3aW5kb3cpKTtcbiJdfQ==
