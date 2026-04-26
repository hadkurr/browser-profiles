import { Fingerprint } from "@/types";

export function buildFingerprintJS(fp: Fingerprint): string {
  return `
(function() {
  try {
    // Navigator overrides
    var nav = navigator;
    function def(prop, val) {
      try {
        Object.defineProperty(nav, prop, { get: function() { return val; }, configurable: true });
      } catch(e) {}
    }
    def('userAgent', ${JSON.stringify(fp.userAgent)});
    def('platform', ${JSON.stringify(fp.platform)});
    def('language', ${JSON.stringify(fp.language)});
    def('languages', [${JSON.stringify(fp.language)}, 'en']);

    // Screen overrides
    function defS(prop, val) {
      try {
        Object.defineProperty(screen, prop, { get: function() { return val; }, configurable: true });
      } catch(e) {}
    }
    defS('width', ${fp.screenWidth});
    defS('height', ${fp.screenHeight});
    defS('availWidth', ${fp.screenWidth});
    defS('availHeight', ${fp.screenHeight - 40});
    defS('colorDepth', ${fp.colorDepth});
    defS('pixelDepth', ${fp.colorDepth});

    // WebGL fingerprint
    var origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return ${JSON.stringify(fp.webglVendor)};
      if (param === 37446) return ${JSON.stringify(fp.webglRenderer)};
      return origGetParam.call(this, param);
    };
    var origGetParam2 = WebGL2RenderingContext && WebGL2RenderingContext.prototype.getParameter;
    if (origGetParam2) {
      WebGL2RenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return ${JSON.stringify(fp.webglVendor)};
        if (param === 37446) return ${JSON.stringify(fp.webglRenderer)};
        return origGetParam2.call(this, param);
      };
    }

    ${
      fp.canvasNoise
        ? `
    // Canvas noise
    var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      var ctx = this.getContext('2d');
      if (ctx) {
        var imgData = ctx.getImageData(0, 0, this.width, this.height);
        for (var i = 0; i < imgData.data.length; i += 100) {
          imgData.data[i] = imgData.data[i] ^ 1;
        }
        ctx.putImageData(imgData, 0, 0);
      }
      return origToDataURL.call(this, type);
    };
    `
        : ""
    }
  } catch(e) { console.warn('[BPM] fingerprint error', e); }
  true;
})();
  `.trim();
}
