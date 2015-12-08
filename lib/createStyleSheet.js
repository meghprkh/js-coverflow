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
        -webkit-box-reflect: below 0 -webkit-gradient(linear, left top, left bottom,from(transparent), color-stop(70%, transparent), to(rgba(255,255,255,0.4)));\
    }\
  ";
  style.appendChild(document.createTextNode(str));
  document.head.appendChild(style);
}
