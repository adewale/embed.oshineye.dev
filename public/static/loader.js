(function () {
  "use strict";

  var EMBED_ORIGIN = "https://embeds.oshineye.dev";
  var MESSAGE_TYPE = "embeds.oshineye.resize";

  // Find the current script tag (the one that loaded this file)
  var scripts = document.getElementsByTagName("script");
  var currentScript = scripts[scripts.length - 1];

  var slug = currentScript.getAttribute("data-slug");
  var targetId = currentScript.getAttribute("data-target");
  var theme = currentScript.getAttribute("data-theme") || "light";

  if (!slug || !targetId) {
    console.error(
      "[embeds.oshineye] loader.js requires data-slug and data-target attributes."
    );
    return;
  }

  var target = document.getElementById(targetId);
  if (!target) {
    console.error(
      "[embeds.oshineye] Target element not found: #" + targetId
    );
    return;
  }

  // Create iframe
  var iframe = document.createElement("iframe");
  iframe.src = EMBED_ORIGIN + "/v1/" + slug + "?theme=" + encodeURIComponent(theme);
  iframe.style.width = "100%";
  iframe.style.border = "none";
  iframe.style.display = "block";
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("title", slug + " embed");

  target.appendChild(iframe);

  // Listen for resize messages from the embed
  window.addEventListener("message", function (event) {
    if (event.origin !== EMBED_ORIGIN) {
      return;
    }

    var data = event.data;
    if (data && data.type === MESSAGE_TYPE && typeof data.height === "number") {
      iframe.style.height = data.height + "px";
    }
  });
})();
