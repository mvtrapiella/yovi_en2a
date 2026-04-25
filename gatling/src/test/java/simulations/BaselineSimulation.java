package simulations;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Baseline load test for public endpoints that require no authentication.
 *
 * Scenarios:
 *   - CSRF token generation  (GET /api/csrf-token)
 *   - Unauthenticated session check (GET /api/me → expects 401)
 *
 * Run: mvn gatling:test -Dgatling.simulationClass=simulations.BaselineSimulation
 *      Override target host: -DbaseUrl=http://localhost:3000
 */
public class BaselineSimulation extends Simulation {

    private static final String BASE_URL =
            System.getProperty("baseUrl", "http://localhost:3000");

    HttpProtocolBuilder httpProtocol = http
            .baseUrl(BASE_URL)
            .acceptHeader("application/json")
            .contentTypeHeader("application/json")
            .disableFollowRedirect();

    // ── Scenarios ────────────────────────────────────────────────────────────

    ScenarioBuilder csrfScenario = scenario("CSRF Token Generation")
            .exec(
                http("GET /api/csrf-token")
                    .get("/api/csrf-token")
                    .check(status().is(200))
                    .check(jsonPath("$.csrfToken").exists())
            );

    ScenarioBuilder sessionCheckScenario = scenario("Unauthenticated Session Check")
            .exec(
                http("GET /api/me (no session)")
                    .get("/api/me")
                    .check(status().is(401))
            );

    // ── Load profile ─────────────────────────────────────────────────────────

    {
        setUp(
            csrfScenario.injectOpen(
                atOnceUsers(20),
                rampUsers(100).during(30)
            ),
            sessionCheckScenario.injectOpen(
                atOnceUsers(20),
                rampUsers(100).during(30)
            )
        )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(2000),
            global().successfulRequests().percent().gt(99.0)
        );
    }
}
