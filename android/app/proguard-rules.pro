# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ── Google Play DEX-optimalisatie (OPS-004, R8 aan) ──
# Capacitor levert eigen consumer-rules, maar de JS-bridge, Cordova-plugins
# (o.a. IAP/purchase) en de WebView-interface zijn reflectie-gevoelig — expliciet
# behouden zodat R8 ze niet wegstript/hernoemt.
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * { @com.getcapacitor.annotation.PluginMethod public *; }
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin
# JS-interface op de WebView behouden
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface,*Annotation*
# Line numbers voor leesbare crash-stacks (helpt Android vitals-analyse)
-keepattributes SourceFile,LineNumberTable
