package simulations;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Load test for the authentication flow.
 *
 * Each virtual user:
 *   1. Fetches a CSRF token  (GET  /api/csrf-token)
 *   2. Attempts registration (POST /api/register)  — unique email per user
 *   3. Attempts login        (POST /api/login)     — with wrong password (401 expected)
 *
 * The CSRF cookie is managed automatically by Gatling's cookie jar.
 * The csrfToken value is extracted from the JSON body and sent as X-CSRF-Token.
 *
 * NOTE: register calls the upstream auth service. If it is not running,
 *       expect HTTP 500 from the gateway — the assertions allow for this.
 *
 * Run: mvn gatling:test -Dgatling.simulationClass=simulations.AuthSimulation
 *      Override target host: -DbaseUrl=http://localhost:3000
 */
public class AuthSimulation extends Simulation {

    private static final String BASE_URL =
            System.getProperty("baseUrl", "http://localhost:3000");

    HttpProtocolBuilder httpProtocol = http
            .baseUrl(BASE_URL)
            .acceptHeader("application/json")
            .contentTypeHeader("application/json")
            .disableFollowRedirect();

    // ── Shared CSRF fetch chain ───────────────────────────────────────────────

    ChainBuilder fetchCsrf = exec(
            http("GET /api/csrf-token")
                .get("/api/csrf-token")
                .check(status().is(200))
                .check(jsonPath("$.csrfToken").saveAs("csrfToken"))
    );

    // ── Scenarios ─────────────────────────────────────────────────────────────

    ScenarioBuilder registrationScenario = scenario("Registration Flow")
            .exec(fetchCsrf)
            .pause(1)
            .exec(session -> session.set("userIndex", session.userId()))
            .exec(
                http("POST /api/register")
                    .post("/api/register")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(session ->
                        "{\"email\":\"loaduser" + session.getLong("userIndex") + "@test.com\"," +
                        "\"username\":\"LoadUser" + session.getLong("userIndex") + "\"," +
                        "\"password\":\"TestPass123!\"}"
                    ))
                    // 201 success, 409 duplicate, 400 validation error, 500 auth service unreachable
                    .check(status().in(201, 200, 400, 409, 500))
            );

    ScenarioBuilder loginScenario = scenario("Login Flow")
            .exec(fetchCsrf)
            .pause(1)
            .exec(
                http("POST /api/login (wrong password)")
                    .post("/api/login")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(
                        "{\"email\":\"loadtest@example.com\",\"password\":\"wrongpassword\"}"
                    ))
                    // 401 invalid credentials, 500 auth service unreachable
                    .check(status().in(401, 500))
            );

    ScenarioBuilder logoutScenario = scenario("Logout (no session)")
            .exec(fetchCsrf)
            .pause(1)
            .exec(
                http("POST /api/logout (no session)")
                    .post("/api/logout")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .check(status().in(200, 401))
            );

    // ── Load profile ──────────────────────────────────────────────────────────

    {
        setUp(
            registrationScenario.injectOpen(
                rampUsers(20).during(20)
            ),
            loginScenario.injectOpen(
                atOnceUsers(10),
                rampUsers(50).during(30)
            ),
            logoutScenario.injectOpen(
                rampUsers(20).during(20)
            )
        )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(5000),
            global().successfulRequests().percent().gt(95.0)
        );
    }
}
