(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.coverflow = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/coverflow.js');

},{"./lib/coverflow.js":2}],2:[function(require,module,exports){
'use strict';

require('./raf.lib.js');

var count, images, dim, offset, center, angle, dist, shift,
    pressed, reference, amplitude, target, velocity, timeConstant,
    xform, frame, timestamp, ticker, oldActiveIndex, starttimestamp, tapMaxConstant,
    activeClick, onChange;

function initialize(container, options) {
  options = options || {};
  pressed = false;
  oldActiveIndex = 0;
  timeConstant = options.timeConstant || 250; // ms
  tapMaxConstant = options.tapMaxConstant || 150; // ms
  dim = options.dim || 200;
  offset = target = 0;
  reference = amplitude = velocity = frame = undefined;
  angle = options.angle || -60;
  dist = options.angle || -150;
  shift = options.shift || 10;
  activeClick = options.activeClick || function () {};
  onChange = options.onChange || function () {};
  container = (typeof container === 'string') ? document.getElementById(container) : container;
  count = container.children.length;
  images = [];
  while (images.length < count) images.push(container.children.item(images.length));
  images.map(function (el, index) {
    el.onclick = function (e) {
      flowTo(index);
      e.preventDefault();
      e.stopPropagation();
    };
  });
  scroll(offset);
  container.className += ' coverflow';
  setupEvents(container);
}

function setupEvents(view) {
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

  alignment = 'translateX(' + (window.innerWidth - dim) / 2 + 'px) ';
  alignment += 'translateY(' + (window.innerHeight - dim) / 2 + 'px)';

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
    activeClick(centerIndex);
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
  getActiveId: getActiveId,
  getActiveElement: getActiveElement,
  getActiveIndex: getActiveIndex
};

},{"./raf.lib.js":3}],3:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb3ZlcmZsb3cuanMiLCJsaWIvcmFmLmxpYi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2NvdmVyZmxvdy5qcycpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCcuL3JhZi5saWIuanMnKTtcblxudmFyIGNvdW50LCBpbWFnZXMsIGRpbSwgb2Zmc2V0LCBjZW50ZXIsIGFuZ2xlLCBkaXN0LCBzaGlmdCxcbiAgICBwcmVzc2VkLCByZWZlcmVuY2UsIGFtcGxpdHVkZSwgdGFyZ2V0LCB2ZWxvY2l0eSwgdGltZUNvbnN0YW50LFxuICAgIHhmb3JtLCBmcmFtZSwgdGltZXN0YW1wLCB0aWNrZXIsIG9sZEFjdGl2ZUluZGV4LCBzdGFydHRpbWVzdGFtcCwgdGFwTWF4Q29uc3RhbnQsXG4gICAgYWN0aXZlQ2xpY2ssIG9uQ2hhbmdlO1xuXG5mdW5jdGlvbiBpbml0aWFsaXplKGNvbnRhaW5lciwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgcHJlc3NlZCA9IGZhbHNlO1xuICBvbGRBY3RpdmVJbmRleCA9IDA7XG4gIHRpbWVDb25zdGFudCA9IG9wdGlvbnMudGltZUNvbnN0YW50IHx8IDI1MDsgLy8gbXNcbiAgdGFwTWF4Q29uc3RhbnQgPSBvcHRpb25zLnRhcE1heENvbnN0YW50IHx8IDE1MDsgLy8gbXNcbiAgZGltID0gb3B0aW9ucy5kaW0gfHwgMjAwO1xuICBvZmZzZXQgPSB0YXJnZXQgPSAwO1xuICByZWZlcmVuY2UgPSBhbXBsaXR1ZGUgPSB2ZWxvY2l0eSA9IGZyYW1lID0gdW5kZWZpbmVkO1xuICBhbmdsZSA9IG9wdGlvbnMuYW5nbGUgfHwgLTYwO1xuICBkaXN0ID0gb3B0aW9ucy5hbmdsZSB8fCAtMTUwO1xuICBzaGlmdCA9IG9wdGlvbnMuc2hpZnQgfHwgMTA7XG4gIGFjdGl2ZUNsaWNrID0gb3B0aW9ucy5hY3RpdmVDbGljayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgb25DaGFuZ2UgPSBvcHRpb25zLm9uQ2hhbmdlIHx8IGZ1bmN0aW9uICgpIHt9O1xuICBjb250YWluZXIgPSAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29udGFpbmVyKSA6IGNvbnRhaW5lcjtcbiAgY291bnQgPSBjb250YWluZXIuY2hpbGRyZW4ubGVuZ3RoO1xuICBpbWFnZXMgPSBbXTtcbiAgd2hpbGUgKGltYWdlcy5sZW5ndGggPCBjb3VudCkgaW1hZ2VzLnB1c2goY29udGFpbmVyLmNoaWxkcmVuLml0ZW0oaW1hZ2VzLmxlbmd0aCkpO1xuICBpbWFnZXMubWFwKGZ1bmN0aW9uIChlbCwgaW5kZXgpIHtcbiAgICBlbC5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIGZsb3dUbyhpbmRleCk7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH07XG4gIH0pO1xuICBzY3JvbGwob2Zmc2V0KTtcbiAgY29udGFpbmVyLmNsYXNzTmFtZSArPSAnIGNvdmVyZmxvdyc7XG4gIHNldHVwRXZlbnRzKGNvbnRhaW5lcik7XG59XG5cbmZ1bmN0aW9uIHNldHVwRXZlbnRzKHZpZXcpIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cub250b3VjaHN0YXJ0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRhcCk7XG4gICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBkcmFnKTtcbiAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgcmVsZWFzZSk7XG4gIH1cbiAgdmlldy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0YXApO1xuICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGRyYWcpO1xuICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCByZWxlYXNlKTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZUtleSk7XG59XG5cbmZ1bmN0aW9uIHhwb3MoZSkge1xuICAvLyB0b3VjaCBldmVudFxuICBpZiAoZS50YXJnZXRUb3VjaGVzICYmIChlLnRhcmdldFRvdWNoZXMubGVuZ3RoID49IDEpKSB7XG4gICAgcmV0dXJuIGUudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRYO1xuICB9XG5cbiAgLy8gbW91c2UgZXZlbnRcbiAgcmV0dXJuIGUuY2xpZW50WDtcbn1cblxuZnVuY3Rpb24gd3JhcCh4KSB7XG4gIHJldHVybiAoeCA+PSBjb3VudCkgPyAoeCAlIGNvdW50KSA6ICh4IDwgMCkgPyB3cmFwKGNvdW50ICsgKHggJSBjb3VudCkpIDogeDtcbn1cblxuZnVuY3Rpb24gc2Nyb2xsKHgpIHtcbiAgdmFyIGksIGhhbGYsIGRlbHRhLCBkaXIsIHR3ZWVuLCBlbCwgYWxpZ25tZW50O1xuXG4gIG9mZnNldCA9ICh0eXBlb2YgeCA9PT0gJ251bWJlcicpID8geCA6IG9mZnNldDtcbiAgY2VudGVyID0gTWF0aC5mbG9vcigob2Zmc2V0ICsgZGltIC8gMikgLyBkaW0pO1xuICBkZWx0YSA9IG9mZnNldCAtIGNlbnRlciAqIGRpbTtcbiAgZGlyID0gKGRlbHRhIDwgMCkgPyAxIDogLTE7XG4gIHR3ZWVuID0gLWRpciAqIGRlbHRhICogMiAvIGRpbTtcblxuICBhbGlnbm1lbnQgPSAndHJhbnNsYXRlWCgnICsgKHdpbmRvdy5pbm5lcldpZHRoIC0gZGltKSAvIDIgKyAncHgpICc7XG4gIGFsaWdubWVudCArPSAndHJhbnNsYXRlWSgnICsgKHdpbmRvdy5pbm5lckhlaWdodCAtIGRpbSkgLyAyICsgJ3B4KSc7XG5cbiAgLy8gY2VudGVyXG4gIGVsID0gaW1hZ2VzW3dyYXAoY2VudGVyKV07XG4gIGVsLnN0eWxlW3hmb3JtXSA9IGFsaWdubWVudCArXG4gICAgJyB0cmFuc2xhdGVYKCcgKyAoLWRlbHRhIC8gMikgKyAncHgpJyArXG4gICAgJyB0cmFuc2xhdGVYKCcgKyAoZGlyICogc2hpZnQgKiB0d2VlbikgKyAncHgpJyArXG4gICAgJyB0cmFuc2xhdGVaKCcgKyAoZGlzdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAnIHJvdGF0ZVkoJyArIChkaXIgKiBhbmdsZSAqIHR3ZWVuKSArICdkZWcpJztcbiAgZWwuc3R5bGUuekluZGV4ID0gMDtcbiAgZWwuc3R5bGUub3BhY2l0eSA9IDE7XG5cbiAgaGFsZiA9IGNvdW50ID4+IDE7XG4gIGZvciAoaSA9IDE7IGkgPD0gaGFsZjsgKytpKSB7XG4gICAgLy8gcmlnaHQgc2lkZVxuICAgIGVsID0gaW1hZ2VzW3dyYXAoY2VudGVyICsgaSldO1xuICAgIGVsLnN0eWxlW3hmb3JtXSA9IGFsaWdubWVudCArXG4gICAgICAnIHRyYW5zbGF0ZVgoJyArIChzaGlmdCArIChkaW0gKiBpIC0gZGVsdGEpIC8gMikgKyAncHgpJyArXG4gICAgICAnIHRyYW5zbGF0ZVooJyArIGRpc3QgKyAncHgpJyArXG4gICAgICAnIHJvdGF0ZVkoJyArIGFuZ2xlICsgJ2RlZyknO1xuICAgIGVsLnN0eWxlLnpJbmRleCA9IC1pO1xuICAgIGVsLnN0eWxlLm9wYWNpdHkgPSAoaSA9PT0gaGFsZiAmJiBkZWx0YSA8IDApID8gMSAtIHR3ZWVuIDogMTtcblxuICAgIC8vIGxlZnQgc2lkZVxuICAgIGVsID0gaW1hZ2VzW3dyYXAoY2VudGVyIC0gaSldO1xuICAgIGVsLnN0eWxlW3hmb3JtXSA9IGFsaWdubWVudCArXG4gICAgICAnIHRyYW5zbGF0ZVgoJyArICgtc2hpZnQgKyAoLWRpbSAqIGkgLSBkZWx0YSkgLyAyKSArICdweCknICtcbiAgICAgICcgdHJhbnNsYXRlWignICsgZGlzdCArICdweCknICtcbiAgICAgICcgcm90YXRlWSgnICsgLWFuZ2xlICsgJ2RlZyknO1xuICAgIGVsLnN0eWxlLnpJbmRleCA9IC1pO1xuICAgIGVsLnN0eWxlLm9wYWNpdHkgPSAoaSA9PT0gaGFsZiAmJiBkZWx0YSA+IDApID8gMSAtIHR3ZWVuIDogMTtcbiAgfVxuXG4gIC8vIGNlbnRlclxuICBlbCA9IGltYWdlc1t3cmFwKGNlbnRlcildO1xuICBlbC5zdHlsZVt4Zm9ybV0gPSBhbGlnbm1lbnQgK1xuICAgICcgdHJhbnNsYXRlWCgnICsgKC1kZWx0YSAvIDIpICsgJ3B4KScgK1xuICAgICcgdHJhbnNsYXRlWCgnICsgKGRpciAqIHNoaWZ0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgdHJhbnNsYXRlWignICsgKGRpc3QgKiB0d2VlbikgKyAncHgpJyArXG4gICAgJyByb3RhdGVZKCcgKyAoZGlyICogYW5nbGUgKiB0d2VlbikgKyAnZGVnKSc7XG4gIGVsLnN0eWxlLnpJbmRleCA9IDA7XG4gIGVsLnN0eWxlLm9wYWNpdHkgPSAxO1xufVxuXG5mdW5jdGlvbiB0cmFjaygpIHtcbiAgdmFyIG5vdywgZWxhcHNlZCwgZGVsdGEsIHY7XG5cbiAgbm93ID0gRGF0ZS5ub3coKTtcbiAgZWxhcHNlZCA9IG5vdyAtIHRpbWVzdGFtcDtcbiAgdGltZXN0YW1wID0gbm93O1xuICBkZWx0YSA9IG9mZnNldCAtIGZyYW1lO1xuICBmcmFtZSA9IG9mZnNldDtcblxuICB2ID0gMTAwMCAqIGRlbHRhIC8gKDEgKyBlbGFwc2VkKTtcbiAgdmVsb2NpdHkgPSAwLjggKiB2ICsgMC4yICogdmVsb2NpdHk7XG59XG5cbmZ1bmN0aW9uIGF1dG9TY3JvbGwoKSB7XG4gIHZhciBlbGFwc2VkLCBkZWx0YTtcblxuICBpZiAoYW1wbGl0dWRlKSB7XG4gICAgZWxhcHNlZCA9IERhdGUubm93KCkgLSB0aW1lc3RhbXA7XG4gICAgZGVsdGEgPSBhbXBsaXR1ZGUgKiBNYXRoLmV4cCgtZWxhcHNlZCAvIHRpbWVDb25zdGFudCk7XG4gICAgaWYgKGRlbHRhID4gNCB8fCBkZWx0YSA8IC00KSB7XG4gICAgICBzY3JvbGwodGFyZ2V0IC0gZGVsdGEpO1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGF1dG9TY3JvbGwpO1xuICAgIH0gZWxzZSAge1xuICAgICAgc2Nyb2xsKHRhcmdldCk7XG4gICAgICBjaGFuZ2VkKGdldEFjdGl2ZUluZGV4KCkpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0YXAoZSkge1xuICBwcmVzc2VkID0gdHJ1ZTtcbiAgcmVmZXJlbmNlID0geHBvcyhlKTtcblxuICB2ZWxvY2l0eSA9IGFtcGxpdHVkZSA9IDA7XG4gIGZyYW1lID0gb2Zmc2V0O1xuICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICBzdGFydHRpbWVzdGFtcCA9IHRpbWVzdGFtcDtcbiAgY2xlYXJJbnRlcnZhbCh0aWNrZXIpO1xuICB0aWNrZXIgPSBzZXRJbnRlcnZhbCh0cmFjaywgMTAwKTtcblxuICAvLyBhbGxvdyB0b3VjaCBkZXZpY2VzIHRvIGhhbmRsZSBjbGljayBldmVudCBidXQgZG9udCBhbGxvdyBkcmFnZ2luZyBvbiBkZXNrdG9wc1xuICBpZiAoZS50eXBlID09ICdtb3VzZWRvd24nKSBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIC8vIGFsbG93IHRvdWNoIGRldmljZXMgdG8gaGFuZGxlIGNsaWNrIGV2ZW50IGJ1dCBkb250IGFsbG93IGRyYWdnaW5nIG9uIGRlc2t0b3BzXG4gIGlmIChlLnR5cGUgPT0gJ21vdXNlZG93bicpIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZHJhZyhlKSB7XG4gIHZhciB4LCBkZWx0YTtcbiAgaWYgKHByZXNzZWQpIHtcbiAgICB4ID0geHBvcyhlKTtcbiAgICBkZWx0YSA9IHJlZmVyZW5jZSAtIHg7XG4gICAgaWYgKGRlbHRhID4gMiB8fCBkZWx0YSA8IC0yKSB7XG4gICAgICByZWZlcmVuY2UgPSB4O1xuICAgICAgc2Nyb2xsKG9mZnNldCArIGRlbHRhKTtcbiAgICB9XG4gIH1cbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlbGVhc2UoZSkge1xuICBwcmVzc2VkID0gZmFsc2U7XG5cbiAgY2xlYXJJbnRlcnZhbCh0aWNrZXIpO1xuICB0YXJnZXQgPSBvZmZzZXQ7XG4gIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gIGlmICh2ZWxvY2l0eSA+IDEwIHx8IHZlbG9jaXR5IDwgLTEwKSB7XG4gICAgYW1wbGl0dWRlID0gMC45ICogdmVsb2NpdHk7XG4gICAgdGFyZ2V0ID0gb2Zmc2V0ICsgYW1wbGl0dWRlO1xuICAgIHRhcmdldCA9IE1hdGgucm91bmQodGFyZ2V0IC8gZGltKSAqIGRpbTtcbiAgICBhbXBsaXR1ZGUgPSB0YXJnZXQgLSBvZmZzZXQ7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGF1dG9TY3JvbGwpO1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKHRpbWVzdGFtcCAtIHN0YXJ0dGltZXN0YW1wID4gdGFwTWF4Q29uc3RhbnQpIHsgLy8gU25hcCB0byBuZWFyZXN0IGVsZW1lbnRcbiAgICAvLyBjb25zb2xlLmxvZygnQkFCQScpO1xuICAgIC8vIGluaXRpYWxpemUoaW1hZ2VzSW5pdCwgb3JpZ2luYWxDb250ZW50LCBvcmlnaW5hbE9wdGlvbnMpO1xuICAgIC8vIHNjcm9sbCh0YXJnZXQpO1xuICAgIHRhcmdldCA9IE1hdGgucm91bmQodGFyZ2V0IC8gZGltKSAqIGRpbTtcbiAgICBhbXBsaXR1ZGUgPSB0YXJnZXQgLSBvZmZzZXQ7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGF1dG9TY3JvbGwpO1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUtleShlKSB7XG4gIGlmICghcHJlc3NlZCAmJiAodGFyZ2V0ID09PSBvZmZzZXQpKSB7XG4gICAgLy8gU3BhY2Ugb3IgUGFnZURvd24gb3IgUmlnaHRBcnJvdyBvciBEb3duQXJyb3dcbiAgICBpZiAoWzMyLCAzNCwgMzksIDQwXS5pbmRleE9mKGUud2hpY2gpID49IDApIHtcbiAgICAgIHRhcmdldCA9IG9mZnNldCArIGRpbTtcbiAgICB9XG4gICAgLy8gUGFnZVVwIG9yIExlZnRBcnJvdyBvciBVcEFycm93XG4gICAgaWYgKFszMywgMzcsIDM4XS5pbmRleE9mKGUud2hpY2gpID49IDApIHtcbiAgICAgIHRhcmdldCA9IG9mZnNldCAtIGRpbTtcbiAgICB9XG4gICAgaWYgKG9mZnNldCAhPT0gdGFyZ2V0KSB7XG4gICAgICBhbXBsaXR1ZGUgPSB0YXJnZXQgLSBvZmZzZXQ7XG4gICAgICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGF1dG9TY3JvbGwpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZsb3dUbyh0bykge1xuICB2YXIgY2VudGVySW5kZXggPSBnZXRBY3RpdmVJbmRleCgpO1xuICBpZiAodG8gPT0gY2VudGVySW5kZXgpIHtcbiAgICBhY3RpdmVDbGljayhjZW50ZXJJbmRleCk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG9mZnNldFBvc2l0aW9uO1xuICAgIGlmICh0byAtIGNlbnRlckluZGV4ID4gY291bnQvMikgb2Zmc2V0UG9zaXRpb24gPSAodG8gLSBjZW50ZXJJbmRleCkgLSBjb3VudDtcbiAgICBlbHNlIGlmICh0byAtIGNlbnRlckluZGV4IDw9IC1jb3VudC8yKSBvZmZzZXRQb3NpdGlvbiA9ICh0byAtIGNlbnRlckluZGV4KSArIGNvdW50O1xuICAgIGVsc2Ugb2Zmc2V0UG9zaXRpb24gPSB0byAtIGNlbnRlckluZGV4O1xuICAgIHRhcmdldCA9IG9mZnNldCArIG9mZnNldFBvc2l0aW9uICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhdXRvU2Nyb2xsKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRBY3RpdmVJbmRleCgpIHtcbiAgdmFyIGNlbnRlckluZGV4ID0gY2VudGVyICUgY291bnQ7XG4gIHdoaWxlIChjZW50ZXJJbmRleCA8IDApIGNlbnRlckluZGV4ICs9IGNvdW50O1xuICByZXR1cm4gY2VudGVySW5kZXg7XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZUVsZW1lbnQoKSB7XG4gIHJldHVybiBpbWFnZXNbZ2V0QWN0aXZlSW5kZXgoKV07XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZUlkKCkge1xuICByZXR1cm4gaW1hZ2VzW2dldEFjdGl2ZUluZGV4KCldLmlkO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VkKHRvKSB7XG4gIGlmIChvbGRBY3RpdmVJbmRleCAhPSB0bykge1xuICAgIG9uQ2hhbmdlKHRvLCBvbGRBY3RpdmVJbmRleCk7XG4gICAgb2xkQWN0aXZlSW5kZXggPSB0bztcbiAgfVxufVxuXG54Zm9ybSA9ICd0cmFuc2Zvcm0nO1xuWyd3ZWJraXQnLCAnTW96JywgJ08nLCAnbXMnXS5ldmVyeShmdW5jdGlvbiAocHJlZml4KSB7XG4gIHZhciBlID0gcHJlZml4ICsgJ1RyYW5zZm9ybSc7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQuYm9keS5zdHlsZVtlXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB4Zm9ybSA9IGU7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBzY3JvbGwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgZmxvd1RvOiBmbG93VG8sXG4gIGdldEFjdGl2ZUlkOiBnZXRBY3RpdmVJZCxcbiAgZ2V0QWN0aXZlRWxlbWVudDogZ2V0QWN0aXZlRWxlbWVudCxcbiAgZ2V0QWN0aXZlSW5kZXg6IGdldEFjdGl2ZUluZGV4XG59O1xuIiwiLypcbiAqIHJhZi5qc1xuICogaHR0cHM6Ly9naXRodWIuY29tL25ncnltYW4vcmFmLmpzXG4gKlxuICogb3JpZ2luYWwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlclxuICogaW5zcGlyZWQgZnJvbSBwYXVsX2lyaXNoIGdpc3QgYW5kIHBvc3RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgbmdyeW1hblxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG5cbihmdW5jdGlvbih3aW5kb3cpIHtcblx0dmFyIGxhc3RUaW1lID0gMCxcblx0XHR2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J10sXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSxcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSxcblx0XHRpID0gdmVuZG9ycy5sZW5ndGg7XG5cblx0Ly8gdHJ5IHRvIHVuLXByZWZpeCBleGlzdGluZyByYWZcblx0d2hpbGUgKC0taSA+PSAwICYmICFyZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1tpXSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuXHR9XG5cblx0Ly8gcG9seWZpbGwgd2l0aCBzZXRUaW1lb3V0IGZhbGxiYWNrXG5cdC8vIGhlYXZpbHkgaW5zcGlyZWQgZnJvbSBAZGFyaXVzIGdpc3QgbW9kOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9wYXVsaXJpc2gvMTU3OTY3MSNjb21tZW50LTgzNzk0NVxuXHRpZiAoIXJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0dmFyIG5vdyA9ICtEYXRlLm5vdygpLFxuXHRcdFx0XHRuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG5cdFx0XHRyZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7XG5cdFx0XHR9LCBuZXh0VGltZSAtIG5vdyk7XG5cdFx0fTtcblxuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuXHR9XG5cblx0Ly8gZXhwb3J0IHRvIHdpbmRvd1xuXHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjYW5jZWxBbmltYXRpb25GcmFtZTtcbn0od2luZG93KSk7XG4iXX0=
