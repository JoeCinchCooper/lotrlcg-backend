#!/usr/bin/env bash
# Usage: ADMIN_SECRET=<secret> API_URL=<url> bash scripts/smoke.sh
# Example: ADMIN_SECRET=my-secret API_URL=https://abc123.execute-api.us-east-1.amazonaws.com bash scripts/smoke.sh

set -euo pipefail

: "${API_URL:?API_URL is required}"
: "${ADMIN_SECRET:?ADMIN_SECRET is required}"

PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS: $label"
    ((PASS++))
  else
    echo "  FAIL: $label — expected '$expected', got '$actual'"
    ((FAIL++))
  fi
}

echo "=== Smoke tests against $API_URL ==="

echo ""
echo "--- Health ---"
status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
check "GET /health → 200" "200" "$status"

echo ""
echo "--- Published feed (no auth required) ---"
resp=$(curl -s "$API_URL/posts")
status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/posts")
check "GET /posts → 200" "200" "$status"

# Confirm draft not in feed
if echo "$resp" | grep -q '"draft"'; then
  echo "  FAIL: GET /posts — draft post found in feed (sparse GSI broken)"
  ((FAIL++))
else
  echo "  PASS: GET /posts — no drafts in feed (sparse GSI working)"
  ((PASS++))
fi

echo ""
echo "--- Write without token → 401 ---"
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/posts" \
  -H "Content-Type: application/json" \
  -d '{"slug":"test","title":"T","body":"B","status":"draft","tags":[]}')
check "POST /posts without auth → 401" "401" "$status"

echo ""
echo "--- Create post (auth required) ---"
post_resp=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -d '{
    "slug":"smoke-test-post",
    "title":"Smoke Test Post",
    "body":"<p>This is a smoke test.</p><script>alert(1)</script>",
    "status":"published",
    "tags":["test"]
  }')
post_body=$(echo "$post_resp" | head -n1)
status=$(echo "$post_resp" | tail -n1)
check "POST /posts with auth → 201" "201" "$status"

# Confirm XSS stripped
if echo "$post_body" | grep -q '<script>'; then
  echo "  FAIL: POST /posts — <script> tag found in response body (XSS not stripped)"
  ((FAIL++))
else
  echo "  PASS: POST /posts — <script> tag stripped from body"
  ((PASS++))
fi

# Extract post id for subsequent requests
post_id=$(echo "$post_body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [[ -n "$post_id" ]]; then
  echo ""
  echo "--- Get post by id ---"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/posts/$post_id")
  check "GET /posts/$post_id → 200" "200" "$status"

  echo ""
  echo "--- Add comment (auth required) ---"
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/posts/$post_id/comments" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_SECRET" \
    -d '{"authorName":"Smoke Tester","body":"Great post!"}')
  check "POST /posts/$post_id/comments → 201" "201" "$status"

  echo ""
  echo "--- List comments ---"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/posts/$post_id/comments")
  check "GET /posts/$post_id/comments → 200" "200" "$status"

  echo ""
  echo "--- Delete post ---"
  status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/posts/$post_id" \
    -H "Authorization: Bearer $ADMIN_SECRET")
  check "DELETE /posts/$post_id → 204" "204" "$status"
fi

echo ""
echo "--- Media upload URL ---"
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/media/upload-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -d '{"contentType":"image/png","filename":"test.png"}')
check "POST /media/upload-url → 200" "200" "$status"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]]
