// tests/api_online_tests.rs
//
// Integration tests that exercise the Axum router end-to-end. Requires Redis
// (same env as redis_tests.rs). Does NOT cover endpoints that forward to the
// Engine (`/executeMove`, `/reqBotMove`) — those are skipped per scope.
//
// We use `axum::http::Request` + `tower::ServiceExt::oneshot` to hit the app
// in-process, so no real port is bound.

mod common;

use axum::body::{Body, to_bytes};
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use serial_test::serial;
use tower::ServiceExt;

use common::{build_test_router, cleanup_match, random_id, test_pool};

/// Issue a POST with a JSON body and return (status, json).
async fn post_json(
    app: axum::Router,
    path: &str,
    body: Value,
) -> (StatusCode, Value) {
    let req = Request::builder()
        .method("POST")
        .uri(path)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .expect("build request");

    let res = app.oneshot(req).await.expect("router oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000).await.expect("read body");
    let value: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, value)
}

async fn get_json(app: axum::Router, path: &str) -> (StatusCode, Value) {
    let req = Request::builder()
        .method("GET")
        .uri(path)
        .body(Body::empty())
        .expect("build request");

    let res = app.oneshot(req).await.expect("router oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000).await.expect("read body");
    let value: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, value)
}

// ---------------------------------------------------------------------------
//  /createMatch + /joinMatch — random pool
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_create_random_then_join() {
    let pool = test_pool().await;

    // Create (random, empty match_id).
    let (status, body) = post_json(
        build_test_router().await,
        "/createMatch",
        json!({
            "match_id": "",
            "match_password": "",
            "player1id": "alice_http",
            "size": 5,
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["turn_number"], 0);
    let match_id = body["match_id"].as_str().expect("match_id").to_string();
    assert!(!match_id.is_empty());

    // Join (also random).
    let (status, body) = post_json(
        build_test_router().await,
        "/joinMatch",
        json!({
            "match_id": "",
            "match_password": "",
            "player2id": "bob_http",
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["match_id"], match_id);
    assert_eq!(body["turn_number"], 1);

    cleanup_match(&pool, &match_id).await;
}

#[tokio::test]
#[serial]
async fn test_http_join_random_when_empty_returns_500_with_no_match_msg() {
    // The Rust handler maps MatchError::NoMatchesAvailable to 500 with the
    // Display text. The frontend uses /no match/i to detect it.
    let (status, body) = post_json(
        build_test_router().await,
        "/joinMatch",
        json!({
            "match_id": "",
            "match_password": "",
            "player2id": "lonely_player",
        }),
    ).await;

    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    // The body is a plain string (not JSON) for the error branch.
    let as_text = body.as_str().unwrap_or("").to_lowercase();
    let json_str = body.to_string().to_lowercase();
    let haystack = if as_text.is_empty() { json_str } else { as_text };
    assert!(haystack.contains("no match"),
            "expected 'No match' in error body, got {}", haystack);
}

// ---------------------------------------------------------------------------
//  /createMatch + /joinMatch — private room + password
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_private_match_correct_password_joins() {
    let pool = test_pool().await;
    let id = random_id();

    let (status, _) = post_json(
        build_test_router().await,
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "hunter2",
            "player1id": "host_http",
            "size": 5,
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);

    let (status, body) = post_json(
        build_test_router().await,
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "hunter2",
            "player2id": "guest_http",
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["match_id"], id);
    assert_eq!(body["turn_number"], 1);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_private_match_wrong_password_rejected() {
    let pool = test_pool().await;
    let id = random_id();

    post_json(
        build_test_router().await,
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "correct",
            "player1id": "host_http",
            "size": 5,
        }),
    ).await;

    let (status, _) = post_json(
        build_test_router().await,
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "wrong",
            "player2id": "guest_http",
        }),
    ).await;

    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR,
               "wrong password should yield 500 from the handler");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_private_match_empty_password_rejected() {
    // Regression for the bug we fixed: joining a password-protected match
    // with "" as password must not pass through.
    let pool = test_pool().await;
    let id = random_id();

    post_json(
        build_test_router().await,
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "abc",
            "player1id": "host_http",
            "size": 5,
        }),
    ).await;

    let (status, _) = post_json(
        build_test_router().await,
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "",
            "player2id": "sneaky",
        }),
    ).await;

    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR,
               "empty password against a protected match must not succeed");

    cleanup_match(&pool, &id).await;
}

// ---------------------------------------------------------------------------
//  /matchStatus/:id
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_match_status_waiting_then_ready() {
    let pool = test_pool().await;
    let id = random_id();

    // Create private.
    post_json(
        build_test_router().await,
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_st",
            "size": 4,
        }),
    ).await;

    // Before anyone joins: waiting.
    let (status, body) = get_json(
        build_test_router().await,
        &format!("/matchStatus/{}", id),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "waiting");
    assert_eq!(body["ready"], false);
    assert_eq!(body["player1id"], "host_st");
    assert_eq!(body["player2id"], "waiting");

    // Join.
    post_json(
        build_test_router().await,
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_st",
        }),
    ).await;

    // After join: active and ready.
    let (status, body) = get_json(
        build_test_router().await,
        &format!("/matchStatus/{}", id),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "active");
    assert_eq!(body["ready"], true);
    assert_eq!(body["player1id"], "host_st");
    assert_eq!(body["player2id"], "guest_st");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_match_status_nonexistent_is_404() {
    let (status, _) = get_json(
        build_test_router().await,
        "/matchStatus/definitely_not_a_real_match_xyz",
    ).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ---------------------------------------------------------------------------
//  /matchTurnInfo/:id
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_match_turn_info_stamps_on_join() {
    let pool = test_pool().await;
    let id = random_id();

    post_json(
        build_test_router().await,
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_ti",
            "size": 4,
        }),
    ).await;

    post_json(
        build_test_router().await,
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_ti",
        }),
    ).await;

    let (status, body) = get_json(
        build_test_router().await,
        &format!("/matchTurnInfo/{}", id),
    ).await;
    assert_eq!(status, StatusCode::OK);

    assert_eq!(body["turn"], 0, "fresh match should be on turn 0");
    assert_eq!(body["turn_duration_ms"], 10_000);

    let turn_started = body["turn_started_at"].as_u64().expect("turn_started_at");
    let now_server = body["now_server"].as_u64().expect("now_server");
    assert!(turn_started > 0);
    assert!(now_server >= turn_started);
    // join was seconds ago at most; server time shouldn't lag behind the
    // stamp by more than a few seconds.
    assert!(now_server - turn_started < 10_000,
            "now_server - turn_started_at unexpectedly large: {}ms", now_server - turn_started);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_match_turn_info_nonexistent_is_404() {
    let (status, _) = get_json(
        build_test_router().await,
        "/matchTurnInfo/nonexistent_match_zzz",
    ).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ---------------------------------------------------------------------------
//  /requestOnlineGameUpdate
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_request_online_update_returns_board_on_match() {
    // P2 asking on turn 0 should immediately get the board (because the YEN
    // starts with turn == 0 and the backend returns as soon as yen.turn ==
    // payload.turn_number). We use this rather than turn_number: 1 because
    // that would block up to ~20 s waiting for P1 to move.
    let pool = test_pool().await;
    let id = random_id();

    post_json(
        build_test_router().await,
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_ru",
            "size": 4,
        }),
    ).await;
    post_json(
        build_test_router().await,
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_ru",
        }),
    ).await;

    let (status, body) = post_json(
        build_test_router().await,
        "/requestOnlineGameUpdate",
        json!({
            "match_id": id,
            "turn_number": 0,
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["match_id"], id);
    assert!(body["board_status"].is_object());
    assert_eq!(body["board_status"]["turn"], 0);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_request_online_update_nonexistent_is_404() {
    let (status, _) = post_json(
        build_test_router().await,
        "/requestOnlineGameUpdate",
        json!({
            "match_id": "nonexistent_ru_zzz",
            "turn_number": 0,
        }),
    ).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}