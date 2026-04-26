const { withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_NAME = "com.browserprofiles.cookies";

const MODULE_KT = `package ${PACKAGE_NAME}

import android.webkit.CookieManager
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = ProfileCookieModule.NAME)
class ProfileCookieModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "ProfileCookieManager"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun clearAll(useWebKit: Boolean, promise: Promise) {
        try {
            val cm = CookieManager.getInstance()
            cm.removeAllCookies { success ->
                cm.flush()
                promise.resolve(success)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun get(url: String, useWebKit: Boolean, promise: Promise) {
        try {
            val cm = CookieManager.getInstance()
            val raw = cm.getCookie(url) ?: ""
            val result = Arguments.createMap()
            if (raw.isNotBlank()) {
                raw.split(";").forEach { pair ->
                    val kv = pair.trim().split("=", limit = 2)
                    if (kv.size == 2) {
                        val name = kv[0].trim()
                        val value = kv[1].trim()
                        val cookie = Arguments.createMap()
                        cookie.putString("name", name)
                        cookie.putString("value", value)
                        cookie.putString("domain", extractDomain(url))
                        cookie.putString("path", "/")
                        cookie.putBoolean("httpOnly", false)
                        cookie.putBoolean("secure", url.startsWith("https"))
                        result.putMap(name, cookie)
                    }
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun set(url: String, cookie: ReadableMap, useWebKit: Boolean, promise: Promise) {
        try {
            val cm = CookieManager.getInstance()
            val name = cookie.getString("name") ?: return promise.resolve(false)
            val value = cookie.getString("value") ?: ""
            val domain = cookie.getString("domain") ?: ""
            val p = cookie.getString("path") ?: "/"
            val expires = if (cookie.hasKey("expires")) cookie.getString("expires") ?: "" else ""
            val httpOnly = if (cookie.hasKey("httpOnly")) cookie.getBoolean("httpOnly") else false
            val secure = if (cookie.hasKey("secure")) cookie.getBoolean("secure") else false

            val sb = StringBuilder("$name=$value")
            if (domain.isNotEmpty()) sb.append("; Domain=$domain")
            sb.append("; Path=$p")
            if (expires.isNotEmpty()) sb.append("; Expires=$expires")
            if (httpOnly) sb.append("; HttpOnly")
            if (secure) sb.append("; Secure")

            cm.setCookie(url, sb.toString())
            cm.flush()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    private fun extractDomain(url: String): String {
        return try { java.net.URL(url).host } catch (e: Exception) { url }
    }
}
`;

const PACKAGE_KT = `package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ProfileCookiePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(ProfileCookieModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

module.exports = function withProfileCookies(config) {
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const root = modConfig.modRequest.platformProjectRoot;
      const pkgDir = PACKAGE_NAME.replace(/\./g, "/");
      const srcDir = path.join(root, "app/src/main/java", pkgDir);
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, "ProfileCookieModule.kt"), MODULE_KT, "utf8");
      fs.writeFileSync(path.join(srcDir, "ProfileCookiePackage.kt"), PACKAGE_KT, "utf8");
      return modConfig;
    },
  ]);

  config = withMainApplication(config, (modConfig) => {
    const content = modConfig.modResults.contents;
    const importLine = `import ${PACKAGE_NAME}.ProfileCookiePackage;`;
    const importLineKt = `import ${PACKAGE_NAME}.ProfileCookiePackage`;
    const pkgLine = "new ProfileCookiePackage()";
    const pkgLineKt = "ProfileCookiePackage()";

    if (content.includes("ProfileCookiePackage")) {
      return modConfig;
    }

    let updated = content;
    if (content.includes("import java.util.List;")) {
      updated = updated.replace("import java.util.List;", `import java.util.List;\n${importLine}`);
    } else if (content.includes("import java.util.Arrays;")) {
      updated = updated.replace("import java.util.Arrays;", `import java.util.Arrays;\n${importLine}`);
    } else if (content.includes("import com.facebook.react.ReactPackage")) {
      updated = updated.replace(
        "import com.facebook.react.ReactPackage",
        `${importLineKt}\nimport com.facebook.react.ReactPackage`
      );
    }

    if (updated.includes("packages.add(new MainReactPackage())")) {
      updated = updated.replace(
        "packages.add(new MainReactPackage())",
        `packages.add(new MainReactPackage());\n      packages.add(${pkgLine})`
      );
    } else if (updated.includes("PackageList(this).packages")) {
      updated = updated.replace(
        "PackageList(this).packages",
        `PackageList(this).packages.also { it.add(${pkgLineKt}) }`
      );
    }

    modConfig.modResults.contents = updated;
    return modConfig;
  });

  return config;
};
