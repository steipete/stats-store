#!/bin/bash

# Test script for appcast proxy endpoint
# This demonstrates how Sparkle would call the proxy endpoint

echo "Testing appcast proxy endpoint..."
echo "================================"

# Test 1: GitHub-based appcast (regular) - using standard Sparkle parameters
echo -e "\n1. Testing GitHub appcast (regular) with appName:"
echo "URL: http://localhost:3000/api/v1/appcast/appcast.xml"
curl -X GET "http://localhost:3000/api/v1/appcast/appcast.xml?appName=Vibe%20Tunnel&appVersion=123&osVersion=14.0&cputype=16777228&model=MacBookPro17,1&ncpu=8&lang=en&ramMB=16384" \
  -H "Accept: application/xml" \
  -H "User-Agent: Vibe Tunnel/1.0.0 Sparkle/2.0.0" \
  -w "\nHTTP Status: %{http_code}\n"

# Test 2: GitHub-based appcast (prerelease) - using legacy bundleIdentifier
echo -e "\n\n2. Testing GitHub appcast (prerelease) with bundleIdentifier:"
echo "URL: http://localhost:3000/api/v1/appcast/appcast-prerelease.xml"
curl -X GET "http://localhost:3000/api/v1/appcast/appcast-prerelease.xml?bundleIdentifier=com.amantus.vibetunnel&bundleShortVersionString=1.0.0-beta&osVersion=14.0&cputype=16777228&model=MacBookPro17,1&ncpu=8&lang=en&ramMB=16384" \
  -H "Accept: application/xml" \
  -H "User-Agent: Vibe Tunnel/1.0.0-beta Sparkle/2.0.0" \
  -w "\nHTTP Status: %{http_code}\n"

# Test 3: Direct domain appcast
echo -e "\n\n3. Testing direct domain appcast:"
echo "URL: http://localhost:3000/api/v1/appcast/appcast.xml"
curl -X GET "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.anothergreatpp&bundleShortVersionString=2.0.0&osVersion=14.0&cputype=16777223&model=Mac13,2&ncpu=10&lang=en&ramMB=32768" \
  -H "Accept: application/xml" \
  -H "User-Agent: Another Great App/2.0.0 Sparkle/2.0.0" \
  -w "\nHTTP Status: %{http_code}\n"

# Test 4: Testing with only User-Agent (no query params - most common case)
echo -e "\n\n4. Testing with only User-Agent (no query params):"
curl -X GET "http://localhost:3000/api/v1/appcast/appcast.xml" \
  -H "Accept: application/xml" \
  -H "User-Agent: Vibe Tunnel/1.2.0 Sparkle/2.0.0" \
  -w "\nHTTP Status: %{http_code}\n"

# Test 5: Unknown app (should fail)
echo -e "\n\n5. Testing unknown app (should return 404):"
curl -X GET "http://localhost:3000/api/v1/appcast/appcast.xml?appName=UnknownApp&appVersion=1.0" \
  -H "Accept: application/xml" \
  -H "User-Agent: UnknownApp/1.0 Sparkle/2.0.0" \
  -w "\nHTTP Status: %{http_code}\n"

# Test 6: Missing User-Agent and params (should fail)
echo -e "\n\n6. Testing missing User-Agent and params (should return 400):"
curl -X GET "http://localhost:3000/api/v1/appcast/appcast.xml" \
  -H "Accept: application/xml" \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\nURL patterns that will be generated:"
echo "===================================="
echo "GitHub: https://github.com/owner/repo -> https://raw.githubusercontent.com/owner/repo/refs/heads/main/appcast.xml"
echo "Direct: https://example.com/updates -> https://example.com/updates/appcast.xml"
echo "Direct: mydomain.com -> https://mydomain.com/appcast.xml"

echo -e "\n\nUser-Agent parsing examples:"
echo "============================"
echo "MyApp/2.1.3 Sparkle/2.0.0 -> appName: MyApp, appVersion: 2.1.3, sparkleVersion: 2.0.0"
echo "MyApp/2.1.3 -> appName: MyApp, appVersion: 2.1.3, sparkleVersion: undefined"
