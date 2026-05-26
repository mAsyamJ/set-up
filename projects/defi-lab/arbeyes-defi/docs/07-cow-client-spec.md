# 07 — `cow_client.rs` Spec

A thin, resilient reqwest wrapper over the orderbook API. Knows nothing about scoring;
it fetches and deserializes. Resilience (retry, backoff, 429, endpoint fallback) lives
here so the rest of the engine sees clean `Result`s.

## Struct

```rust
pub struct CowClient {
    http: reqwest::Client,
    base_url: String,          // e.g. https://api.cow.fi/mainnet
    auction_access: AuctionAccess, // Live | FallbackCompetitionOnly
    max_concurrency: usize,    // semaphore permits, default 4
    sem: tokio::sync::Semaphore,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AuctionAccess { Live, FallbackCompetitionOnly }
```

`reqwest::Client` is built once with: `timeout(8s)`, `connect_timeout(3s)`,
`pool_idle_timeout(30s)`, `user_agent("rust-searcher-lab/cow-shadow")`, rustls TLS.

## Methods

```rust
impl CowClient {
    pub async fn get_current_auction(&self) -> Result<AuctionSnapshot, CowError>;
    pub async fn get_solver_competition_latest(&self) -> Result<SolverCompetition, CowError>;
    pub async fn get_solver_competition(&self, auction_id: u64) -> Result<SolverCompetition, CowError>;
    pub async fn get_order(&self, uid: &str) -> Result<CowOrder, CowError>;
    pub async fn get_quote(&self, req: &QuoteRequest) -> Result<QuoteResponse, CowError>;
    pub async fn get_native_price(&self, token: Address) -> Result<U256, CowError>;
}
```

> Confirm the exact paths against the pinned openapi before coding. Expected:
> `/api/v1/auction`, `/api/v1/solver_competition/{id}`, `/api/v1/solver_competition/latest`,
> `/api/v1/orders/{uid}`, `/api/v1/quote`, `/api/v1/token/{token}/native_price`. Prefer
> `/api/v2/solver_competition/...` if the pinned spec documents it.

## Errors

```rust
#[derive(Debug, thiserror::Error)]
pub enum CowError {
    #[error("http status {0}")] Status(reqwest::StatusCode),
    #[error("rate limited")] RateLimited,
    #[error("permissioned endpoint (401/403)")] Permissioned,
    #[error("decode: {0}")] Decode(String),
    #[error("transport: {0}")] Transport(#[from] reqwest::Error),
    #[error("timeout")] Timeout,
}
```

## Retry / backoff policy

A generic `send_with_retry` wraps every GET/POST:

- Acquire a semaphore permit (bounded concurrency).
- On **429** → `RateLimited`: exponential backoff with full jitter, base 500ms,
  factor 2, cap 30s, max 5 attempts. Honor `Retry-After` if present.
- On **5xx** or transport/timeout: same backoff, max 3 attempts.
- On **401/403**: return `Permissioned` immediately (no retry). The caller decides
  fallback.
- On **2xx**: deserialize; on serde failure return `Decode` with the raw body truncated
  to 512 chars for logging.

Pseudocode:

```rust
async fn send_with_retry<T: DeserializeOwned>(&self, build: impl Fn() -> reqwest::RequestBuilder)
  -> Result<T, CowError>
{
    let _permit = self.sem.acquire().await.unwrap();
    let mut attempt = 0;
    loop {
        attempt += 1;
        let resp = build().send().await;
        match classify(resp) {
            Ok(body) => return decode::<T>(body),
            Err(CowError::Permissioned) => return Err(CowError::Permissioned),
            Err(e @ (CowError::RateLimited | CowError::Status(_) | CowError::Timeout | CowError::Transport(_)))
                if attempt < max_attempts(&e) => {
                    let delay = backoff_with_jitter(attempt);
                    tracing::warn!(?e, attempt, ?delay, "retrying cow request");
                    metrics::counter!("cow_api_errors").increment(1);
                    tokio::time::sleep(delay).await;
                }
            Err(e) => return Err(e),
        }
    }
}
```

## Permissioned-endpoint fallback (critical)

`get_current_auction` may return `Permissioned`. The **listener** (see `08`/`15`) must
treat live-auction access as optional:

```rust
match client.get_current_auction().await {
    Ok(a) => process_live(a).await,
    Err(CowError::Permissioned) => {
        tracing::info!("/auction permissioned; running in FallbackCompetitionOnly mode");
        client.set_access(AuctionAccess::FallbackCompetitionOnly);
        // gate + grading proceed purely from solver_competition/latest
    }
    Err(e) => { tracing::warn!(?e, "auction fetch failed"); }
}
```

The **scorer validation gate depends only on `get_solver_competition*`**, which is
public. Live auction input is an enhancement, never a dependency for the gate.

## Timeouts & cadence (config-driven)

| Setting | Default | Notes |
|---------|---------|-------|
| request timeout | 8s | per HTTP call |
| auction poll interval | 3s | live mode only |
| competition poll interval | 12s | picks up settlements |
| max concurrency | 4 | per-host in-flight cap |
| backoff base / cap | 500ms / 30s | full jitter |

## Test strategy

- **Mock server** (`wiremock` or `httpmock`): assert correct paths/params, that 429
  triggers backoff (use a fake clock or assert attempt count), that 401/403 yields
  `Permissioned` without retry, that malformed JSON yields `Decode`.
- **Fixture decode tests**: real captured JSON bodies (see `16`) deserialize into the
  `06` structs without loss.
- **No network in CI**: all client tests hit the mock; live calls are a separate,
  manually-run integration test gated behind an env flag.
