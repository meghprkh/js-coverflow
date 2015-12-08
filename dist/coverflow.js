(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.coverflow = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/coverflow.js');

},{"./lib/coverflow.js":2}],2:[function(require,module,exports){
'use strict';

require('./raf.lib.js');

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
  dim = options.dim || 200;
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
  maxHeight = options.maxWidth || maxWidth;
  container.className += ' coverflow';
  container.style.height = maxHeight;
  viewHeight = maxHeight;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9jb3ZlcmZsb3cuanMiLCJsaWIvcmFmLmxpYi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9jb3ZlcmZsb3cuanMnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9yYWYubGliLmpzJyk7XG5cbnZhciBjb3VudCwgaW1hZ2VzLCBkaW0sIG9mZnNldCwgY2VudGVyLCBhbmdsZSwgZGlzdCwgc2hpZnQsXG4gICAgcHJlc3NlZCwgcmVmZXJlbmNlLCBhbXBsaXR1ZGUsIHRhcmdldCwgdmVsb2NpdHksIHRpbWVDb25zdGFudCxcbiAgICB4Zm9ybSwgZnJhbWUsIHRpbWVzdGFtcCwgdGlja2VyLCBvbGRBY3RpdmVJbmRleCwgc3RhcnR0aW1lc3RhbXAsIHRhcE1heENvbnN0YW50LFxuICAgIG9uQWN0aXZlQ2xpY2ssIG9uQ2hhbmdlLCB2aWV3LCB2aWV3SGVpZ2h0O1xuXG5mdW5jdGlvbiBpbml0aWFsaXplKGNvbnRhaW5lciwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgcHJlc3NlZCA9IGZhbHNlO1xuICBvbGRBY3RpdmVJbmRleCA9IDA7XG4gIHRpbWVDb25zdGFudCA9IG9wdGlvbnMudGltZUNvbnN0YW50IHx8IDI1MDsgLy8gbXNcbiAgdGFwTWF4Q29uc3RhbnQgPSBvcHRpb25zLnRhcE1heENvbnN0YW50IHx8IDE1MDsgLy8gbXNcbiAgZGltID0gb3B0aW9ucy5kaW0gfHwgMjAwO1xuICBvZmZzZXQgPSB0YXJnZXQgPSAwO1xuICByZWZlcmVuY2UgPSBhbXBsaXR1ZGUgPSB2ZWxvY2l0eSA9IGZyYW1lID0gdW5kZWZpbmVkO1xuICBhbmdsZSA9IG9wdGlvbnMuYW5nbGUgfHwgLTYwO1xuICBkaXN0ID0gb3B0aW9ucy5hbmdsZSB8fCAtMTUwO1xuICBzaGlmdCA9IG9wdGlvbnMuc2hpZnQgfHwgMTA7XG4gIG9uQWN0aXZlQ2xpY2sgPSBvcHRpb25zLm9uQWN0aXZlQ2xpY2sgfHwgZnVuY3Rpb24gKCkge307XG4gIG9uQ2hhbmdlID0gb3B0aW9ucy5vbkNoYW5nZSB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgY29udGFpbmVyID0gKHR5cGVvZiBjb250YWluZXIgPT09ICdzdHJpbmcnKSA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcikgOiBjb250YWluZXI7XG4gIGNvdW50ID0gY29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aDtcbiAgaW1hZ2VzID0gW107XG4gIHdoaWxlIChpbWFnZXMubGVuZ3RoIDwgY291bnQpIGltYWdlcy5wdXNoKGNvbnRhaW5lci5jaGlsZHJlbi5pdGVtKGltYWdlcy5sZW5ndGgpKTtcbiAgdmFyIG1heEhlaWdodCA9IDAsIG1heFdpZHRoID0gMDtcbiAgaW1hZ2VzLm1hcChmdW5jdGlvbiAoZWwsIGluZGV4KSB7XG4gICAgZWwub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICBmbG93VG8oaW5kZXgpO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9O1xuICAgIG1heEhlaWdodCA9IG1heEhlaWdodCA+IGVsLnNjcm9sbEhlaWdodCA/IG1heEhlaWdodCA6IGVsLnNjcm9sbEhlaWdodDtcbiAgICBtYXhXaWR0aCA9IG1heFdpZHRoID4gZWwuc3R5bGUud2lkdGggPyBtYXhXaWR0aCA6IGVsLnN0eWxlLndpZHRoO1xuICB9KTtcbiAgbWF4SGVpZ2h0ID0gb3B0aW9ucy5tYXhIZWlnaHQgfHwgbWF4SGVpZ2h0O1xuICBtYXhIZWlnaHQgPSBvcHRpb25zLm1heFdpZHRoIHx8IG1heFdpZHRoO1xuICBjb250YWluZXIuY2xhc3NOYW1lICs9ICcgY292ZXJmbG93JztcbiAgY29udGFpbmVyLnN0eWxlLmhlaWdodCA9IG1heEhlaWdodDtcbiAgdmlld0hlaWdodCA9IG1heEhlaWdodDtcbiAgdmlldyA9IGNvbnRhaW5lcjtcbiAgc2Nyb2xsKG9mZnNldCk7XG4gIHNldHVwRXZlbnRzKGNvbnRhaW5lcik7XG59XG5cbmZ1bmN0aW9uIHNldHVwRXZlbnRzKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdy5vbnRvdWNoc3RhcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgdmlldy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdGFwKTtcbiAgICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGRyYWcpO1xuICAgIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCByZWxlYXNlKTtcbiAgfVxuICB2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRhcCk7XG4gIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZyk7XG4gIHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHJlbGVhc2UpO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlS2V5KTtcbn1cblxuZnVuY3Rpb24geHBvcyhlKSB7XG4gIC8vIHRvdWNoIGV2ZW50XG4gIGlmIChlLnRhcmdldFRvdWNoZXMgJiYgKGUudGFyZ2V0VG91Y2hlcy5sZW5ndGggPj0gMSkpIHtcbiAgICByZXR1cm4gZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFg7XG4gIH1cblxuICAvLyBtb3VzZSBldmVudFxuICByZXR1cm4gZS5jbGllbnRYO1xufVxuXG5mdW5jdGlvbiB3cmFwKHgpIHtcbiAgcmV0dXJuICh4ID49IGNvdW50KSA/ICh4ICUgY291bnQpIDogKHggPCAwKSA/IHdyYXAoY291bnQgKyAoeCAlIGNvdW50KSkgOiB4O1xufVxuXG5mdW5jdGlvbiBzY3JvbGwoeCkge1xuICB2YXIgaSwgaGFsZiwgZGVsdGEsIGRpciwgdHdlZW4sIGVsLCBhbGlnbm1lbnQ7XG5cbiAgb2Zmc2V0ID0gKHR5cGVvZiB4ID09PSAnbnVtYmVyJykgPyB4IDogb2Zmc2V0O1xuICBjZW50ZXIgPSBNYXRoLmZsb29yKChvZmZzZXQgKyBkaW0gLyAyKSAvIGRpbSk7XG4gIGRlbHRhID0gb2Zmc2V0IC0gY2VudGVyICogZGltO1xuICBkaXIgPSAoZGVsdGEgPCAwKSA/IDEgOiAtMTtcbiAgdHdlZW4gPSAtZGlyICogZGVsdGEgKiAyIC8gZGltO1xuXG4gIGFsaWdubWVudCA9ICd0cmFuc2xhdGVYKCcgKyAodmlldy5jbGllbnRXaWR0aCAtIGRpbSkgLyAyICsgJ3B4KSAnO1xuICBhbGlnbm1lbnQgKz0gJ3RyYW5zbGF0ZVkoJyArICh2aWV3SGVpZ2h0IC0gZGltKSAvIDIgKyAncHgpJztcblxuICAvLyBjZW50ZXJcbiAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIpXTtcbiAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArICgtZGVsdGEgLyAyKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVgoJyArIChkaXIgKiBzaGlmdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAnIHRyYW5zbGF0ZVooJyArIChkaXN0ICogdHdlZW4pICsgJ3B4KScgK1xuICAgICcgcm90YXRlWSgnICsgKGRpciAqIGFuZ2xlICogdHdlZW4pICsgJ2RlZyknO1xuICBlbC5zdHlsZS56SW5kZXggPSAwO1xuICBlbC5zdHlsZS5vcGFjaXR5ID0gMTtcblxuICBoYWxmID0gY291bnQgPj4gMTtcbiAgZm9yIChpID0gMTsgaSA8PSBoYWxmOyArK2kpIHtcbiAgICAvLyByaWdodCBzaWRlXG4gICAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIgKyBpKV07XG4gICAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAgICcgdHJhbnNsYXRlWCgnICsgKHNoaWZ0ICsgKGRpbSAqIGkgLSBkZWx0YSkgLyAyKSArICdweCknICtcbiAgICAgICcgdHJhbnNsYXRlWignICsgZGlzdCArICdweCknICtcbiAgICAgICcgcm90YXRlWSgnICsgYW5nbGUgKyAnZGVnKSc7XG4gICAgZWwuc3R5bGUuekluZGV4ID0gLWk7XG4gICAgZWwuc3R5bGUub3BhY2l0eSA9IChpID09PSBoYWxmICYmIGRlbHRhIDwgMCkgPyAxIC0gdHdlZW4gOiAxO1xuXG4gICAgLy8gbGVmdCBzaWRlXG4gICAgZWwgPSBpbWFnZXNbd3JhcChjZW50ZXIgLSBpKV07XG4gICAgZWwuc3R5bGVbeGZvcm1dID0gYWxpZ25tZW50ICtcbiAgICAgICcgdHJhbnNsYXRlWCgnICsgKC1zaGlmdCArICgtZGltICogaSAtIGRlbHRhKSAvIDIpICsgJ3B4KScgK1xuICAgICAgJyB0cmFuc2xhdGVaKCcgKyBkaXN0ICsgJ3B4KScgK1xuICAgICAgJyByb3RhdGVZKCcgKyAtYW5nbGUgKyAnZGVnKSc7XG4gICAgZWwuc3R5bGUuekluZGV4ID0gLWk7XG4gICAgZWwuc3R5bGUub3BhY2l0eSA9IChpID09PSBoYWxmICYmIGRlbHRhID4gMCkgPyAxIC0gdHdlZW4gOiAxO1xuICB9XG5cbiAgLy8gY2VudGVyXG4gIGVsID0gaW1hZ2VzW3dyYXAoY2VudGVyKV07XG4gIGVsLnN0eWxlW3hmb3JtXSA9IGFsaWdubWVudCArXG4gICAgJyB0cmFuc2xhdGVYKCcgKyAoLWRlbHRhIC8gMikgKyAncHgpJyArXG4gICAgJyB0cmFuc2xhdGVYKCcgKyAoZGlyICogc2hpZnQgKiB0d2VlbikgKyAncHgpJyArXG4gICAgJyB0cmFuc2xhdGVaKCcgKyAoZGlzdCAqIHR3ZWVuKSArICdweCknICtcbiAgICAnIHJvdGF0ZVkoJyArIChkaXIgKiBhbmdsZSAqIHR3ZWVuKSArICdkZWcpJztcbiAgZWwuc3R5bGUuekluZGV4ID0gMDtcbiAgZWwuc3R5bGUub3BhY2l0eSA9IDE7XG59XG5cbmZ1bmN0aW9uIHRyYWNrKCkge1xuICB2YXIgbm93LCBlbGFwc2VkLCBkZWx0YSwgdjtcblxuICBub3cgPSBEYXRlLm5vdygpO1xuICBlbGFwc2VkID0gbm93IC0gdGltZXN0YW1wO1xuICB0aW1lc3RhbXAgPSBub3c7XG4gIGRlbHRhID0gb2Zmc2V0IC0gZnJhbWU7XG4gIGZyYW1lID0gb2Zmc2V0O1xuXG4gIHYgPSAxMDAwICogZGVsdGEgLyAoMSArIGVsYXBzZWQpO1xuICB2ZWxvY2l0eSA9IDAuOCAqIHYgKyAwLjIgKiB2ZWxvY2l0eTtcbn1cblxuZnVuY3Rpb24gYXV0b1Njcm9sbCgpIHtcbiAgdmFyIGVsYXBzZWQsIGRlbHRhO1xuXG4gIGlmIChhbXBsaXR1ZGUpIHtcbiAgICBlbGFwc2VkID0gRGF0ZS5ub3coKSAtIHRpbWVzdGFtcDtcbiAgICBkZWx0YSA9IGFtcGxpdHVkZSAqIE1hdGguZXhwKC1lbGFwc2VkIC8gdGltZUNvbnN0YW50KTtcbiAgICBpZiAoZGVsdGEgPiA0IHx8IGRlbHRhIDwgLTQpIHtcbiAgICAgIHNjcm9sbCh0YXJnZXQgLSBkZWx0YSk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgfSBlbHNlICB7XG4gICAgICBzY3JvbGwodGFyZ2V0KTtcbiAgICAgIGNoYW5nZWQoZ2V0QWN0aXZlSW5kZXgoKSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRhcChlKSB7XG4gIHByZXNzZWQgPSB0cnVlO1xuICByZWZlcmVuY2UgPSB4cG9zKGUpO1xuXG4gIHZlbG9jaXR5ID0gYW1wbGl0dWRlID0gMDtcbiAgZnJhbWUgPSBvZmZzZXQ7XG4gIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gIHN0YXJ0dGltZXN0YW1wID0gdGltZXN0YW1wO1xuICBjbGVhckludGVydmFsKHRpY2tlcik7XG4gIHRpY2tlciA9IHNldEludGVydmFsKHRyYWNrLCAxMDApO1xuXG4gIC8vIGFsbG93IHRvdWNoIGRldmljZXMgdG8gaGFuZGxlIGNsaWNrIGV2ZW50IGJ1dCBkb250IGFsbG93IGRyYWdnaW5nIG9uIGRlc2t0b3BzXG4gIGlmIChlLnR5cGUgPT0gJ21vdXNlZG93bicpIGUucHJldmVudERlZmF1bHQoKTtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgLy8gYWxsb3cgdG91Y2ggZGV2aWNlcyB0byBoYW5kbGUgY2xpY2sgZXZlbnQgYnV0IGRvbnQgYWxsb3cgZHJhZ2dpbmcgb24gZGVza3RvcHNcbiAgaWYgKGUudHlwZSA9PSAnbW91c2Vkb3duJykgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBkcmFnKGUpIHtcbiAgdmFyIHgsIGRlbHRhO1xuICBpZiAocHJlc3NlZCkge1xuICAgIHggPSB4cG9zKGUpO1xuICAgIGRlbHRhID0gcmVmZXJlbmNlIC0geDtcbiAgICBpZiAoZGVsdGEgPiAyIHx8IGRlbHRhIDwgLTIpIHtcbiAgICAgIHJlZmVyZW5jZSA9IHg7XG4gICAgICBzY3JvbGwob2Zmc2V0ICsgZGVsdGEpO1xuICAgIH1cbiAgfVxuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVsZWFzZShlKSB7XG4gIHByZXNzZWQgPSBmYWxzZTtcblxuICBjbGVhckludGVydmFsKHRpY2tlcik7XG4gIHRhcmdldCA9IG9mZnNldDtcbiAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgaWYgKHZlbG9jaXR5ID4gMTAgfHwgdmVsb2NpdHkgPCAtMTApIHtcbiAgICBhbXBsaXR1ZGUgPSAwLjkgKiB2ZWxvY2l0eTtcbiAgICB0YXJnZXQgPSBvZmZzZXQgKyBhbXBsaXR1ZGU7XG4gICAgdGFyZ2V0ID0gTWF0aC5yb3VuZCh0YXJnZXQgLyBkaW0pICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAodGltZXN0YW1wIC0gc3RhcnR0aW1lc3RhbXAgPiB0YXBNYXhDb25zdGFudCkgeyAvLyBTbmFwIHRvIG5lYXJlc3QgZWxlbWVudFxuICAgIC8vIGNvbnNvbGUubG9nKCdCQUJBJyk7XG4gICAgLy8gaW5pdGlhbGl6ZShpbWFnZXNJbml0LCBvcmlnaW5hbENvbnRlbnQsIG9yaWdpbmFsT3B0aW9ucyk7XG4gICAgLy8gc2Nyb2xsKHRhcmdldCk7XG4gICAgdGFyZ2V0ID0gTWF0aC5yb3VuZCh0YXJnZXQgLyBkaW0pICogZGltO1xuICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlS2V5KGUpIHtcbiAgaWYgKCFwcmVzc2VkICYmICh0YXJnZXQgPT09IG9mZnNldCkpIHtcbiAgICAvLyBTcGFjZSBvciBQYWdlRG93biBvciBSaWdodEFycm93IG9yIERvd25BcnJvd1xuICAgIGlmIChbMzIsIDM0LCAzOSwgNDBdLmluZGV4T2YoZS53aGljaCkgPj0gMCkge1xuICAgICAgdGFyZ2V0ID0gb2Zmc2V0ICsgZGltO1xuICAgIH1cbiAgICAvLyBQYWdlVXAgb3IgTGVmdEFycm93IG9yIFVwQXJyb3dcbiAgICBpZiAoWzMzLCAzNywgMzhdLmluZGV4T2YoZS53aGljaCkgPj0gMCkge1xuICAgICAgdGFyZ2V0ID0gb2Zmc2V0IC0gZGltO1xuICAgIH1cbiAgICBpZiAob2Zmc2V0ICE9PSB0YXJnZXQpIHtcbiAgICAgIGFtcGxpdHVkZSA9IHRhcmdldCAtIG9mZnNldDtcbiAgICAgIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxvd1RvKHRvKSB7XG4gIHZhciBjZW50ZXJJbmRleCA9IGdldEFjdGl2ZUluZGV4KCk7XG4gIGlmICh0byA9PSBjZW50ZXJJbmRleCkge1xuICAgIG9uQWN0aXZlQ2xpY2soY2VudGVySW5kZXgpO1xuICB9IGVsc2Uge1xuICAgIHZhciBvZmZzZXRQb3NpdGlvbjtcbiAgICBpZiAodG8gLSBjZW50ZXJJbmRleCA+IGNvdW50LzIpIG9mZnNldFBvc2l0aW9uID0gKHRvIC0gY2VudGVySW5kZXgpIC0gY291bnQ7XG4gICAgZWxzZSBpZiAodG8gLSBjZW50ZXJJbmRleCA8PSAtY291bnQvMikgb2Zmc2V0UG9zaXRpb24gPSAodG8gLSBjZW50ZXJJbmRleCkgKyBjb3VudDtcbiAgICBlbHNlIG9mZnNldFBvc2l0aW9uID0gdG8gLSBjZW50ZXJJbmRleDtcbiAgICB0YXJnZXQgPSBvZmZzZXQgKyBvZmZzZXRQb3NpdGlvbiAqIGRpbTtcbiAgICBhbXBsaXR1ZGUgPSB0YXJnZXQgLSBvZmZzZXQ7XG4gICAgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYXV0b1Njcm9sbCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlSW5kZXgoKSB7XG4gIHZhciBjZW50ZXJJbmRleCA9IGNlbnRlciAlIGNvdW50O1xuICB3aGlsZSAoY2VudGVySW5kZXggPCAwKSBjZW50ZXJJbmRleCArPSBjb3VudDtcbiAgcmV0dXJuIGNlbnRlckluZGV4O1xufVxuXG5mdW5jdGlvbiBnZXRBY3RpdmVFbGVtZW50KCkge1xuICByZXR1cm4gaW1hZ2VzW2dldEFjdGl2ZUluZGV4KCldO1xufVxuXG5mdW5jdGlvbiBnZXRBY3RpdmVJZCgpIHtcbiAgcmV0dXJuIGltYWdlc1tnZXRBY3RpdmVJbmRleCgpXS5pZDtcbn1cblxuZnVuY3Rpb24gY2hhbmdlZCh0bykge1xuICBpZiAob2xkQWN0aXZlSW5kZXggIT0gdG8pIHtcbiAgICBvbkNoYW5nZSh0bywgb2xkQWN0aXZlSW5kZXgpO1xuICAgIG9sZEFjdGl2ZUluZGV4ID0gdG87XG4gIH1cbn1cblxueGZvcm0gPSAndHJhbnNmb3JtJztcblsnd2Via2l0JywgJ01veicsICdPJywgJ21zJ10uZXZlcnkoZnVuY3Rpb24gKHByZWZpeCkge1xuICB2YXIgZSA9IHByZWZpeCArICdUcmFuc2Zvcm0nO1xuICBpZiAodHlwZW9mIGRvY3VtZW50LmJvZHkuc3R5bGVbZV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgeGZvcm0gPSBlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgc2Nyb2xsKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gIGZsb3dUbzogZmxvd1RvLFxuICBnZXRBY3RpdmVJZDogZ2V0QWN0aXZlSWQsXG4gIGdldEFjdGl2ZUVsZW1lbnQ6IGdldEFjdGl2ZUVsZW1lbnQsXG4gIGdldEFjdGl2ZUluZGV4OiBnZXRBY3RpdmVJbmRleFxufTtcbiIsIi8qXG4gKiByYWYuanNcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9uZ3J5bWFuL3JhZi5qc1xuICpcbiAqIG9yaWdpbmFsIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXJcbiAqIGluc3BpcmVkIGZyb20gcGF1bF9pcmlzaCBnaXN0IGFuZCBwb3N0XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzIG5ncnltYW5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuXG4oZnVuY3Rpb24od2luZG93KSB7XG5cdHZhciBsYXN0VGltZSA9IDAsXG5cdFx0dmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddLFxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUsXG5cdFx0aSA9IHZlbmRvcnMubGVuZ3RoO1xuXG5cdC8vIHRyeSB0byB1bi1wcmVmaXggZXhpc3RpbmcgcmFmXG5cdHdoaWxlICgtLWkgPj0gMCAmJiAhcmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbaV0gKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1tpXSArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcblx0fVxuXG5cdC8vIHBvbHlmaWxsIHdpdGggc2V0VGltZW91dCBmYWxsYmFja1xuXHQvLyBoZWF2aWx5IGluc3BpcmVkIGZyb20gQGRhcml1cyBnaXN0IG1vZDogaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vcGF1bGlyaXNoLzE1Nzk2NzEjY29tbWVudC04Mzc5NDVcblx0aWYgKCFyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIWNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRcdHZhciBub3cgPSArRGF0ZS5ub3coKSxcblx0XHRcdFx0bmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuXHRcdFx0cmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGxhc3RUaW1lID0gbmV4dFRpbWUpO1xuXHRcdFx0fSwgbmV4dFRpbWUgLSBub3cpO1xuXHRcdH07XG5cblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcblx0fVxuXG5cdC8vIGV4cG9ydCB0byB3aW5kb3dcblx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZTtcblx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG59KHdpbmRvdykpO1xuIl19
