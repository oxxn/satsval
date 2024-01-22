use axum::{extract::Query, extract::State, response::Html, routing::get, Router};
use maud::{html, Markup, DOCTYPE};
use serde::Deserialize;
use std::sync::{Arc, Mutex};
use tower_http::services::ServeFile;
mod utils;
use reqwest;
use serde_json;

const MAX_MONEY: f64 = 21_000_000.0;

#[derive(Clone)]
struct AppState {
    exchange_rate: f64,
}

#[derive(Deserialize)]
struct CurrencyAmount {
    amount: String,
    currency: String, // 'BTC' or 'USD'
}

fn currency_input_markup(btc_value: &str, usd_value: &str) -> Markup {
    html! {
        fieldset role="group" {
            input
                id="btc"
                name="amount"
                type="text"
                hx-trigger="input, keyup, every 3s"
                hx-get="/convert_currency"
                hx-vals=r#"{"currency": "BTC"}"#
                hx-target="#currency-converter"
                hx-swap="innerHTML"
                hx-on:mousedown="this.select(); event.preventDefault();"
                hx-on:onmouseup="event.preventDefault();"
                value=(btc_value) {}
            input
                type="text"
                value="BTC"
                readonly {}
        }
        fieldset role="group" {
            input
                id="usd"
                name="amount"
                type="text"
                hx-trigger="input, keyup"
                hx-get="/convert_currency"
                hx-vals=r#"{"currency": "USD"}"#
                hx-target="#currency-converter"
                hx-swap="innerHTML"
                hx-on:mousedown="this.select(); event.preventDefault();"
                hx-on:onmouseup="event.preventDefault();"
                value=(usd_value) {}
            input
                type="text"
                readonly
                value="USD" {}
        }
    }
}

async fn convert_currency(
    State(state): State<Arc<Mutex<AppState>>>,
    cur_amt: Query<CurrencyAmount>,
) -> Html<String> {
    let exchange_rate = state.lock().unwrap().exchange_rate;
    let mut cleaned_amount = String::new();
    let mut decimal_found = false;

    for ch in cur_amt.amount.chars() {
        if ch.is_numeric() {
            cleaned_amount.push(ch);
        } else if ch == '.' && !decimal_found {
            cleaned_amount.push(ch);
            decimal_found = true;
        }
    }

    let amount = cleaned_amount.parse::<f64>().unwrap_or(0.0);

    let (btc_value, usd_value) = match cur_amt.currency.as_str() {
        "BTC" => {
            let btc = if amount > MAX_MONEY {
                MAX_MONEY
            } else {
                amount
            };
            let usd = btc * exchange_rate;
            if amount > MAX_MONEY {
                ("21,000,000".to_string(), utils::format_with_commas(usd, 2))
            } else {
                (
                    utils::truncate_decimal_part(&cur_amt.amount.clone()),
                    utils::format_with_commas(usd, 2),
                )
            }
        }
        "USD" => {
            let mut btc = amount / exchange_rate;
            btc = if btc > MAX_MONEY { MAX_MONEY } else { btc };

            (utils::format_with_commas(btc, 8), cur_amt.amount.clone())
        }
        _ => ("0".to_string(), "0".to_string()),
    };

    Html(currency_input_markup(&btc_value, &usd_value).into_string())
}

async fn root(state: State<Arc<Mutex<AppState>>>) -> Html<String> {
    let exchange_rate = state.lock().unwrap().exchange_rate;
    let markup = html! {
        (DOCTYPE)
        head {
            meta charset="utf-8" {}
            meta name="viewport" content="width=device-width, initial-scale=1" {}
            script src="/static/htmx.min.js" {}
            link rel="stylesheet" href="/static/pico.min.css" {}
            style {("
                nav {
                    padding-top: var(--pico-spacing);
                }
                input[type='text'] {
                    font-size: 80px !important;
                    height: 110px !important;
                }
                input[readonly] {
                    font-size: 80px !important;
                    height: 110px !important;
                    width: 4.1ch !important;
                }
           ")}
        }
        body {
            nav class="container-fluid" {
                h1 {"SATSVAL"}
            }
            main class="container" {
                div id="currency-converter" {
                    (currency_input_markup("1", &exchange_rate.to_string()))
                }
            }
        }
    };

    Html(markup.into_string())
}

async fn fetch_exchange_rate(state: Arc<Mutex<AppState>>) -> () {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3));
    loop {
        interval.tick().await;
        let url = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
        let client = reqwest::Client::new();
        let res = client.get(url).send().await.unwrap();

        let json: serde_json::Value = res.json().await.unwrap();
        let rate = json["data"]["rates"]["USD"]
            .as_str()
            .unwrap_or("0")
            .parse()
            .unwrap_or(0.0);

        let mut state = state.lock().unwrap();
        state.exchange_rate = rate;
    }
}

#[tokio::main]
async fn main() {
    let state = Arc::new(Mutex::new(AppState { exchange_rate: 0.0 }));

    let state_clone = state.clone();
    tokio::spawn(async move {
        fetch_exchange_rate(state_clone).await;
    });

    let app = Router::new()
        .route("/", get(root))
        .route("/convert_currency", get(convert_currency))
        .with_state(state)
        .nest_service(
            "/static/htmx.min.js",
            ServeFile::new("./static/htmx.min.js"),
        )
        .nest_service(
            "/static/pico.min.css",
            ServeFile::new("./static/pico.min.css"),
        );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
