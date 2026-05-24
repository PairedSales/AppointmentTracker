package com.example.appraisaltracker

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {
  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    
    val webView = WebView(this)
    webView.webViewClient = WebViewClient()
    webView.settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
    }
    webView.loadUrl("http://100.118.3.30:3000/?readonly=true")
    
    setContentView(webView)
  }
}
